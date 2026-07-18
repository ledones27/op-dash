import { schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as XLSX from 'xlsx'

// ─── Scheduled: todo dia à meia-noite BRT (03:00 UTC) ────

export const handler = schedule('0 3 * * *', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const resendKey = process.env.RESEND_API_KEY
  const emailTo = process.env.BACKUP_EMAIL || 'ledlemos.e.u@gmail.com'

  if (!supabaseUrl || !supabaseKey || !resendKey) {
    console.error('Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or RESEND_API_KEY')
    return { statusCode: 500, body: 'Missing config' }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const resend = new Resend(resendKey)

    // ─── Buscar dados ─────────────────────────────────────
    const [tradesRes, watchRes] = await Promise.all([
      supabase.from('trades').select('*').order('data_entrada', { ascending: true }),
      supabase.from('watchlist').select('*').order('created_at', { ascending: true }),
    ])

    if (tradesRes.error) throw tradesRes.error
    if (watchRes.error) throw watchRes.error

    const trades = tradesRes.data.map(dbToTrade)
    const watchlist = groupWatchlist(watchRes.data)

    // ─── Gerar Excel ──────────────────────────────────────
    const buffer = generateExcel(trades, watchlist)

    // ─── Enviar email ─────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const filename = `Operacoes_Backup_${today}.xlsx`

    const totalTrades = trades.length
    const openTrades = trades.filter(t => t.status === 'Aberta').length
    const closedTrades = totalTrades - openTrades
    const totalResult = trades
      .filter(t => t.status === 'Fechada')
      .reduce((s, t) => s + (t.resultado || 0), 0)

    await resend.emails.send({
      from: 'Operações Backup <onboarding@resend.dev>',
      to: emailTo,
      subject: `Backup Operações — ${today}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #f0b90b;">Backup Diário — Operações</h2>
          <p>Resumo do dia <strong>${today}</strong>:</p>
          <ul>
            <li><strong>${totalTrades}</strong> trades totais (${openTrades} abertos, ${closedTrades} fechados)</li>
            <li>Resultado acumulado: <strong>$${totalResult.toFixed(2)}</strong></li>
          </ul>
          <p>O arquivo Excel completo está em anexo.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Enviado automaticamente pelo sistema Operações Dashboard.</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: buffer.toString('base64'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    })

    console.log(`Backup enviado para ${emailTo} — ${filename}`)
    return { statusCode: 200, body: 'Backup sent' }
  } catch (err) {
    console.error('Erro no backup:', err)
    return { statusCode: 500, body: err.message }
  }
})

// ─── Helpers ──────────────────────────────────────────────

function dbToTrade(row) {
  const entry = Number(row.preco_entrada)
  const exit = row.preco_saida ? Number(row.preco_saida) : null
  const aporte = Number(row.aporte)
  const isLong = row.operacao === 'LONG'

  let pnlPercent = null
  let resultado = null
  if (exit != null) {
    pnlPercent = isLong ? (exit - entry) / entry : (entry - exit) / entry
    resultado = pnlPercent * aporte
  }

  let duracao = null
  const d1 = row.data_entrada ? new Date(row.data_entrada) : null
  const d2 = row.data_saida ? new Date(row.data_saida) : null
  if (d1 && d2) {
    duracao = Math.round((d2 - d1) / 86400000)
  } else if (d1) {
    duracao = Math.round((Date.now() - d1.getTime()) / 86400000)
  }

  return {
    categoria: row.categoria,
    dataEntrada: row.data_entrada,
    ativo: row.ativo,
    precoEntrada: entry,
    operacao: row.operacao,
    dataSaida: row.data_saida || null,
    precoSaida: exit,
    pnlPercent,
    status: row.status || (exit != null ? 'Fechada' : 'Aberta'),
    aporte,
    resultado,
    duracao,
  }
}

function groupWatchlist(data) {
  const grouped = { 'Ações': [], 'Cripto': [], 'Commodities': [], 'Índices': [] }
  for (const item of data) {
    if (grouped[item.categoria]) {
      grouped[item.categoria].push({ ativo: item.ativo, operacao: item.operacao })
    }
  }
  return grouped
}

function generateExcel(trades, watchlist) {
  const wb = XLSX.utils.book_new()
  const categories = ['Ações', 'Cripto', 'Commodities', 'Índices']

  const tradeHeaders = [
    'Data Entrada', 'Ativo', 'Preço Entrada', 'Operação',
    'Data Saída', 'Preço Saída', 'PnL %', 'Status',
    'Aporte', 'Resultado', 'Duração (dias)',
  ]

  const tradeToRow = (t) => [
    t.dataEntrada || '', t.ativo || '', t.precoEntrada ?? '',
    t.operacao || '', t.dataSaida || '', t.precoSaida ?? '',
    t.pnlPercent != null ? t.pnlPercent : '', t.status || '',
    t.aporte ?? '', t.resultado != null ? Math.round(t.resultado * 100) / 100 : '',
    t.duracao ?? '',
  ]

  // Abas por categoria
  for (const cat of categories) {
    const catTrades = trades
      .filter(t => t.categoria === cat)
      .sort((a, b) => (a.dataEntrada || '').localeCompare(b.dataEntrada || ''))

    const data = [tradeHeaders, ...catTrades.map(tradeToRow)]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 8 },
      { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 9 },
      { wch: 10 }, { wch: 12 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, cat)
  }

  // Aba Resultado
  const resultados = calcResultados(trades, categories)
  const resultHeaders = [
    'Categoria', 'Trades Fechados', 'Trades Abertos', 'Vitórias', 'Derrotas',
    'Win Rate', 'Média Ganho %', 'Média Perda %', 'Payoff Ratio', 'Profit Factor',
    'Resultado Total', 'Capital Alocado', 'ROI', 'Expectância', 'Duração Média (dias)',
  ]
  const resultRows = resultados.map(r => [
    r.categoria, r.tradesFechados, r.tradesAbertos, r.vitorias, r.derrotas,
    r.winRate ?? '', r.mediaGanho ?? '', r.mediaPerda ?? '',
    r.payoffRatio != null ? Math.round(r.payoffRatio * 100) / 100 : '',
    r.profitFactor != null ? Math.round(r.profitFactor * 100) / 100 : '',
    r.resultadoTotal != null ? Math.round(r.resultadoTotal * 100) / 100 : '',
    r.capitalAlocado ?? '', r.roi ?? '',
    r.expectancia != null ? Math.round(r.expectancia * 100) / 100 : '',
    r.duracaoMedia != null ? Math.round(r.duracaoMedia * 10) / 10 : '',
  ])
  const wsResult = XLSX.utils.aoa_to_sheet([resultHeaders, ...resultRows])
  XLSX.utils.book_append_sheet(wb, wsResult, 'Resultado')

  // Aba Watchlist
  const watchHeaders = ['Categoria', 'Ativo', 'Direção']
  const watchRows = []
  for (const cat of categories) {
    const items = (watchlist[cat] || []).sort((a, b) => a.ativo.localeCompare(b.ativo))
    for (const item of items) {
      watchRows.push([cat, item.ativo, item.operacao || ''])
    }
  }
  const wsWatch = XLSX.utils.aoa_to_sheet([watchHeaders, ...watchRows])
  XLSX.utils.book_append_sheet(wb, wsWatch, 'Watchlist')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

function calcResultados(trades, categories) {
  const closed = trades.filter(t => t.status === 'Fechada')
  const open = trades.filter(t => t.status === 'Aberta')
  const rows = []

  for (const cat of categories) {
    const catClosed = closed.filter(t => t.categoria === cat)
    const catOpen = open.filter(t => t.categoria === cat)
    const wins = catClosed.filter(t => (t.resultado ?? 0) > 0)
    const losses = catClosed.filter(t => (t.resultado ?? 0) <= 0)

    const totalWin = wins.reduce((s, t) => s + (t.resultado || 0), 0)
    const totalLoss = Math.abs(losses.reduce((s, t) => s + (t.resultado || 0), 0))
    const resultadoTotal = catClosed.reduce((s, t) => s + (t.resultado || 0), 0)
    const capitalFechado = catClosed.reduce((s, t) => s + (t.aporte || 0), 0)

    rows.push({
      categoria: cat,
      tradesFechados: catClosed.length,
      tradesAbertos: catOpen.length,
      vitorias: wins.length,
      derrotas: losses.length,
      winRate: catClosed.length > 0 ? wins.length / catClosed.length : null,
      mediaGanho: wins.length > 0 ? wins.reduce((s, t) => s + (t.pnlPercent || 0), 0) / wins.length : null,
      mediaPerda: losses.length > 0 ? losses.reduce((s, t) => s + (t.pnlPercent || 0), 0) / losses.length : null,
      payoffRatio: null,
      profitFactor: totalLoss > 0 ? totalWin / totalLoss : null,
      resultadoTotal,
      capitalAlocado: [...catClosed, ...catOpen].reduce((s, t) => s + (t.aporte || 0), 0),
      roi: capitalFechado > 0 ? resultadoTotal / capitalFechado : null,
      expectancia: catClosed.length > 0 ? resultadoTotal / catClosed.length : null,
      duracaoMedia: catClosed.length > 0 ? catClosed.reduce((s, t) => s + (t.duracao || 0), 0) / catClosed.length : null,
    })
  }

  // TOTAL
  const allWins = closed.filter(t => (t.resultado ?? 0) > 0)
  const allLosses = closed.filter(t => (t.resultado ?? 0) <= 0)
  const totalWin = allWins.reduce((s, t) => s + (t.resultado || 0), 0)
  const totalLoss = Math.abs(allLosses.reduce((s, t) => s + (t.resultado || 0), 0))
  const totalResult = closed.reduce((s, t) => s + (t.resultado || 0), 0)
  const totalCapClosed = closed.reduce((s, t) => s + (t.aporte || 0), 0)

  rows.push({
    categoria: 'TOTAL',
    tradesFechados: closed.length,
    tradesAbertos: open.length,
    vitorias: allWins.length,
    derrotas: allLosses.length,
    winRate: closed.length > 0 ? allWins.length / closed.length : null,
    mediaGanho: allWins.length > 0 ? allWins.reduce((s, t) => s + (t.pnlPercent || 0), 0) / allWins.length : null,
    mediaPerda: allLosses.length > 0 ? allLosses.reduce((s, t) => s + (t.pnlPercent || 0), 0) / allLosses.length : null,
    payoffRatio: null,
    profitFactor: totalLoss > 0 ? totalWin / totalLoss : null,
    resultadoTotal: totalResult,
    capitalAlocado: trades.reduce((s, t) => s + (t.aporte || 0), 0),
    roi: totalCapClosed > 0 ? totalResult / totalCapClosed : null,
    expectancia: closed.length > 0 ? totalResult / closed.length : null,
    duracaoMedia: closed.length > 0 ? closed.reduce((s, t) => s + (t.duracao || 0), 0) / closed.length : null,
  })

  return rows
}
