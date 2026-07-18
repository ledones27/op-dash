import * as XLSX from 'xlsx'

/**
 * Exporta todos os trades e resultados para um arquivo .xlsx
 * com a mesma estrutura do arquivo original:
 * Abas: Ações, Cripto, Commodities, Índices, Resultado
 */
export function exportToExcel(trades, resultados, watchlist) {
  const wb = XLSX.utils.book_new()

  // Cabeçalhos das abas de trades
  const tradeHeaders = [
    'Data Entrada',
    'Ativo',
    'Preço Entrada',
    'Operação',
    'Data Saída',
    'Preço Saída',
    'PnL %',
    'Status',
    'Aporte',
    'Resultado',
    'Duração (dias)',
  ]

  // Converter trade para linha do Excel
  const tradeToRow = (t) => [
    t.dataEntrada || '',
    t.ativo || '',
    t.precoEntrada ?? '',
    t.operacao || '',
    t.dataSaida || '',
    t.precoSaida ?? '',
    t.pnlPercent != null ? t.pnlPercent : '',
    t.status || '',
    t.aporte ?? '',
    t.resultado != null ? Math.round(t.resultado * 100) / 100 : '',
    t.duracao ?? '',
  ]

  // Agrupar trades por categoria
  const categories = ['Ações', 'Cripto', 'Commodities', 'Índices']

  for (const cat of categories) {
    const catTrades = trades
      .filter(t => t.categoria === cat)
      .sort((a, b) => (a.dataEntrada || '').localeCompare(b.dataEntrada || ''))

    const data = [tradeHeaders, ...catTrades.map(tradeToRow)]
    const ws = XLSX.utils.aoa_to_sheet(data)

    // Formatar colunas
    ws['!cols'] = [
      { wch: 12 }, // Data Entrada
      { wch: 10 }, // Ativo
      { wch: 14 }, // Preço Entrada
      { wch: 8 },  // Operação
      { wch: 12 }, // Data Saída
      { wch: 14 }, // Preço Saída
      { wch: 10 }, // PnL %
      { wch: 9 },  // Status
      { wch: 10 }, // Aporte
      { wch: 12 }, // Resultado
      { wch: 14 }, // Duração
    ]

    // Formatar PnL % como porcentagem
    for (let r = 1; r <= catTrades.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 6 })]
      if (cell && typeof cell.v === 'number') {
        cell.z = '0.00%'
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, cat)
  }

  // Aba Resultado
  const resultHeaders = [
    'Categoria',
    'Trades Fechados',
    'Trades Abertos',
    'Vitórias',
    'Derrotas',
    'Win Rate',
    'Média Ganho %',
    'Média Perda %',
    'Payoff Ratio',
    'Profit Factor',
    'Resultado Total',
    'Capital Alocado',
    'ROI',
    'Expectância',
    'Duração Média (dias)',
  ]

  const resultRows = resultados.map(r => [
    r.categoria,
    r.tradesFechados ?? '',
    r.tradesAbertos ?? '',
    r.vitorias ?? '',
    r.derrotas ?? '',
    r.winRate != null ? r.winRate : '',
    r.mediaGanho != null ? r.mediaGanho : '',
    r.mediaPerda != null ? r.mediaPerda : '',
    r.payoffRatio != null ? Math.round(r.payoffRatio * 100) / 100 : '',
    r.profitFactor != null ? Math.round(r.profitFactor * 100) / 100 : '',
    r.resultadoTotal != null ? Math.round(r.resultadoTotal * 100) / 100 : '',
    r.capitalAlocado ?? '',
    r.roi != null ? r.roi : '',
    r.expectancia != null ? Math.round(r.expectancia * 100) / 100 : '',
    r.duracaoMedia != null ? Math.round(r.duracaoMedia * 10) / 10 : '',
  ])

  const resultData = [resultHeaders, ...resultRows]
  const wsResult = XLSX.utils.aoa_to_sheet(resultData)

  wsResult['!cols'] = [
    { wch: 14 }, // Categoria
    { wch: 15 }, // Trades Fechados
    { wch: 14 }, // Trades Abertos
    { wch: 10 }, // Vitórias
    { wch: 10 }, // Derrotas
    { wch: 10 }, // Win Rate
    { wch: 14 }, // Média Ganho
    { wch: 14 }, // Média Perda
    { wch: 12 }, // Payoff
    { wch: 13 }, // Profit Factor
    { wch: 15 }, // Resultado Total
    { wch: 15 }, // Capital Alocado
    { wch: 10 }, // ROI
    { wch: 12 }, // Expectância
    { wch: 16 }, // Duração Média
  ]

  // Formatar porcentagens
  for (let r = 1; r <= resultRows.length; r++) {
    for (const c of [5, 6, 7, 12]) { // Win Rate, Média Ganho, Média Perda, ROI
      const cell = wsResult[XLSX.utils.encode_cell({ r, c })]
      if (cell && typeof cell.v === 'number') {
        cell.z = '0.00%'
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, wsResult, 'Resultado')

  // Aba Watchlist
  if (watchlist) {
    const watchHeaders = ['Categoria', 'Ativo', 'Direção']
    const watchRows = []

    for (const cat of categories) {
      const items = watchlist[cat] || []
      const sorted = [...items].sort((a, b) => a.ativo.localeCompare(b.ativo))
      for (const item of sorted) {
        watchRows.push([cat, item.ativo, item.operacao || ''])
      }
    }

    const watchData = [watchHeaders, ...watchRows]
    const wsWatch = XLSX.utils.aoa_to_sheet(watchData)
    wsWatch['!cols'] = [
      { wch: 14 }, // Categoria
      { wch: 12 }, // Ativo
      { wch: 10 }, // Direção
    ]
    XLSX.utils.book_append_sheet(wb, wsWatch, 'Watchlist')
  }

  // Gerar e baixar
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Operacoes_Backup_${today}.xlsx`)
}
