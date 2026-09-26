import { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Loader2, Pencil, Trash2, LogOut, Camera } from 'lucide-react'
import { calcUnrealizedPnl, calcUnrealizedResult, fmtUSD, fmtPct, fmtPrice, parseLocalDate, localDateString } from '../utils/calculations'
import AssetLogo from './AssetLogo'

const CATEGORIES = [
  { key: 'Ações', color: 'text-accent-blue', border: 'sm:border-accent-blue/30', bg: 'sm:bg-accent-blue/5' },
  { key: 'Cripto', color: 'text-accent-gold', border: 'sm:border-accent-gold/30', bg: 'sm:bg-accent-gold/5' },
  { key: 'Commodities', color: 'text-accent-green', border: 'sm:border-accent-green/30', bg: 'sm:bg-accent-green/5' },
  { key: 'Índices', color: 'text-purple-400', border: 'sm:border-purple-500/30', bg: 'sm:bg-purple-500/5' },
]

const CAT_COLORS = {
  'Ações': { text: '#1e80ff', border: 'rgba(30,128,255,0.3)', bg: 'rgba(30,128,255,0.05)' },
  'Cripto': { text: '#f0b90b', border: 'rgba(240,185,11,0.3)', bg: 'rgba(240,185,11,0.05)' },
  'Commodities': { text: '#0ecb81', border: 'rgba(14,203,129,0.3)', bg: 'rgba(14,203,129,0.05)' },
  'Índices': { text: '#a855f7', border: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.05)' },
}

// ─── Export offscreen 1920×1080 ─────────────────────────

function buildExportDOM(positions, prices) {
  const W = 1920
  const PAD_X = 42
  const PAD_TOP = 34
  const PAD_BOTTOM = 28
  const GAP = 10
  const HEADER_HEIGHT = 106
  const FOOTER_HEIGHT = 25
  const H = Math.max(1080, PAD_TOP + PAD_BOTTOM + HEADER_HEIGHT + 16 + FOOTER_HEIGHT + Math.ceil(positions.length / 7) * 122)
  const contentW = W - PAD_X * 2
  const contentH = H - PAD_TOP - PAD_BOTTOM - HEADER_HEIGHT - 16 - FOOTER_HEIGHT

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Ordenar: por categoria (ordem CATEGORIES) depois por ativo
  const catOrder = {}
  CATEGORIES.forEach((c, i) => { catOrder[c.key] = i })
  const sorted = [...positions].sort((a, b) => {
    const co = (catOrder[a.categoria] ?? 99) - (catOrder[b.categoria] ?? 99)
    return co !== 0 ? co : a.ativo.localeCompare(b.ativo)
  })

  const n = sorted.length
  // Equilibra legibilidade, proporção do card e espaços vazios para cada quantidade.
  let bestCols = 1, bestRows = Math.max(1, n)
  let bestWaste = Infinity
  for (let c = 1; c <= Math.min(n, 7); c++) {
    const r = Math.ceil(n / c)
    const cellW = (contentW - (c - 1) * GAP) / c
    const cellH = (contentH - (r - 1) * GAP) / r
    const emptySlots = c * r - n
    const waste = Math.abs(cellW / cellH - 3.5) + emptySlots * 0.35
    if (cellW >= 245 && cellH >= 112 && waste < bestWaste) {
      bestWaste = waste
      bestCols = c
      bestRows = r
    }
  }
  const cellW = Math.floor((contentW - (bestCols - 1) * GAP) / bestCols)
  const cellH = Math.floor((contentH - (bestRows - 1) * GAP) / bestRows)
  const compact = cellH < 135
  const dense = cellW < 340
  const spacious = cellH > 180

  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'fixed', left: '-9999px', top: '0',
    width: `${W}px`, height: `${H}px`,
    background: '#080d17', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: '#eaecef', display: 'flex', flexDirection: 'column',
    padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`, boxSizing: 'border-box',
  })

  // ─── Header ───
  const header = document.createElement('div')
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: `${HEADER_HEIGHT}px`, marginBottom: '16px', flexShrink: '0',
    borderBottom: '1px solid #263247',
  })

  const hLeft = document.createElement('div')
  hLeft.style.display = 'flex'
  hLeft.style.alignItems = 'center'
  hLeft.style.gap = '19px'

  const logo = document.createElement('img')
  logo.src = '/logo1.webp'
  logo.alt = 'OP'
  Object.assign(logo.style, { position: 'relative', top: '7px', width: 'auto', height: '76px', objectFit: 'contain' })

  const titleBlock = document.createElement('div')
  const eyebrow = document.createElement('div')
  Object.assign(eyebrow.style, {
    color: '#eebd19', fontSize: '13px', fontWeight: '800',
    letterSpacing: '0.17em', textTransform: 'uppercase', marginBottom: '5px',
  })
  eyebrow.textContent = 'Visão da carteira'
  const t1 = document.createElement('div')
  Object.assign(t1.style, { fontSize: '31px', fontWeight: '700', lineHeight: '1.06', letterSpacing: '-0.045em' })
  t1.textContent = 'Posições abertas'
  const t2 = document.createElement('div')
  Object.assign(t2.style, { fontSize: '15px', color: '#92a0b5', marginTop: '7px' })
  t2.textContent = `Retrato das posições · exportado em ${dateStr} às ${timeStr}`
  titleBlock.append(eyebrow, t1, t2)
  hLeft.append(logo, titleBlock)

  const summary = document.createElement('div')
  Object.assign(summary.style, { display: 'flex', alignItems: 'center', gap: '10px' })
  const summaryItems = [
    { count: n, label: n === 1 ? 'posição' : 'posições', color: '#f6c526', bg: '#1b1a17', border: '#745c18' },
    ...CATEGORIES.map(cat => ({
      count: sorted.filter(p => p.categoria === cat.key).length,
      label: cat.key,
      color: CAT_COLORS[cat.key].text,
      bg: '#101928', border: '#29364a',
    })).filter(item => item.count > 0),
  ]
  for (const item of summaryItems) {
    const chip = document.createElement('div')
    Object.assign(chip.style, {
      minWidth: '128px', height: '57px', border: `1px solid ${item.border}`,
      borderTop: `2px solid ${item.color}`, borderRadius: '11px',
      background: item.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '0 8px', boxSizing: 'border-box',
    })
    const number = document.createElement('b')
    Object.assign(number.style, { position: 'relative', top: '-11px', color: item.color === '#f6c526' ? item.color : '#f5f7fb', fontFamily: 'monospace', fontSize: '22px', lineHeight: '1' })
    number.textContent = item.count
    const label = document.createElement('span')
    Object.assign(label.style, { position: 'relative', top: '-11px', color: '#8998ac', fontSize: '12px', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' })
    label.textContent = item.label
    chip.append(number, label)
    summary.appendChild(chip)
  }

  header.append(hLeft, summary)
  root.appendChild(header)

  // ─── Grid de cards ───
  const grid = document.createElement('div')
  Object.assign(grid.style, {
    display: 'grid',
    gridTemplateColumns: `repeat(${bestCols}, minmax(0, ${n <= 8 ? Math.min(cellW, 850) + 'px' : '1fr'}))`,
    gridTemplateRows: `repeat(${bestRows}, minmax(0, ${n <= 8 ? Math.min(cellH, 220) + 'px' : '1fr'}))`,
    gap: `${GAP}px`,
    flex: '1', minHeight: '0', justifyContent: 'center', alignContent: 'center',
  })

  for (const p of sorted) {
    const colors = CAT_COLORS[p.categoria] || CAT_COLORS['Ações']
    const currentPrice = prices[p.ativo]
    const pnl = calcUnrealizedPnl(p, currentPrice)
    const days = p.dataEntrada
      ? Math.round((parseLocalDate(localDateString()).getTime() - parseLocalDate(p.dataEntrada).getTime()) / 86400000)
      : p.duracao
    const pnlColor = pnl == null ? '#a4b0c2' : pnl >= 0 ? '#17d6aa' : '#ff5872'
    const isLong = p.operacao === 'LONG'

    const card = document.createElement('div')
    Object.assign(card.style, {
      position: 'relative', background: '#111b2b', borderRadius: '12px',
      border: '1px solid #263247', borderLeft: `3px solid ${colors.text}`,
      padding: spacious ? '20px 22px' : dense ? '10px 12px' : '14px 17px 13px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxSizing: 'border-box', overflow: 'hidden', minWidth: '0',
    })

    // Topo: ticker, operação, categoria e duração
    const row1 = document.createElement('div')
    Object.assign(row1.style, {
      position: 'relative', top: '-11px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '8px', minWidth: '0',
    })
    const r1Left = document.createElement('div')
    r1Left.style.display = 'flex'
    r1Left.style.alignItems = 'center'
    r1Left.style.gap = dense ? '6px' : '10px'
    r1Left.style.minWidth = '0'

    const ticker = document.createElement('span')
    Object.assign(ticker.style, {
      fontFamily: 'monospace', fontWeight: '700',
      fontSize: spacious ? '27px' : dense ? '17px' : '21px', whiteSpace: 'nowrap',
    })
    ticker.textContent = p.ativo

    const opBadge = document.createElement('span')
    Object.assign(opBadge.style, {
      position: 'relative', top: '11px',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: '4px', flexShrink: '0', boxSizing: 'border-box',
      height: spacious ? '29px' : dense ? '22px' : '25px',
      fontSize: spacious ? '14px' : dense ? '10px' : '11px',
      fontWeight: '700', padding: dense ? '0 6px' : '0 8px',
      borderRadius: '5px', lineHeight: '1', whiteSpace: 'nowrap',
      background: isLong ? '#103d3a' : '#472235',
      color: isLong ? '#28daae' : '#ff6679',
    })
    const opArrow = document.createElement('span')
    opArrow.style.position = 'relative'
    opArrow.style.top = '-7px'
    opArrow.textContent = isLong ? '↑' : '↓'
    const opLabel = document.createElement('span')
    opLabel.style.position = 'relative'
    opLabel.style.top = '-7px'
    opLabel.textContent = isLong ? 'LONG' : 'SHORT'
    opBadge.append(opArrow, opLabel)

    r1Left.append(ticker, opBadge)

    const meta = document.createElement('span')
    Object.assign(meta.style, {
      position: 'relative', top: '5px',
      color: '#8190a5', fontSize: spacious ? '15px' : '12px',
      whiteSpace: 'nowrap', flexShrink: '0',
    })
    const categoryDot = document.createElement('span')
    Object.assign(categoryDot.style, {
      position: 'relative', top: '6px',
      display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
      background: colors.text, marginRight: '5px', verticalAlign: '1px',
    })
    meta.appendChild(categoryDot)
    const duration = days === 0 ? 'Hoje' : days == null ? '—' : `${days}d`
    meta.appendChild(document.createTextNode(dense ? duration : `${p.categoria} · ${duration}`))
    row1.append(r1Left, meta)

    // Rodapé: preços de entrada e atual, mais PnL em destaque
    const row2 = document.createElement('div')
    Object.assign(row2.style, {
      display: 'flex', alignItems: dense ? 'stretch' : 'end',
      justifyContent: 'space-between', gap: dense ? '3px' : '12px',
      borderTop: '1px solid #263247', paddingTop: dense ? '5px' : '8px',
      flexDirection: dense ? 'column' : 'row', minWidth: '0',
    })
    const pricesRow = document.createElement('div')
    Object.assign(pricesRow.style, { display: 'flex', alignItems: 'end', gap: dense ? '5px' : '10px', minWidth: '0' })
    const makeQuote = (labelText, valueText, isCurrent) => {
      const quote = document.createElement('span')
      Object.assign(quote.style, { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '0' })
      const label = document.createElement('small')
      Object.assign(label.style, {
        color: '#708099', fontSize: dense ? '9px' : spacious ? '12px' : '10px',
        fontWeight: '700', letterSpacing: '0.1em', lineHeight: '1',
      })
      label.textContent = labelText
      const value = document.createElement('span')
      Object.assign(value.style, {
        color: isCurrent ? '#e8edf5' : '#98a7ba',
        fontFamily: isCurrent && valueText === 'Sem cotação' ? 'inherit' : 'monospace',
        fontSize: dense ? '12px' : spacious ? '20px' : '15px',
        fontWeight: isCurrent ? '600' : '400', whiteSpace: 'nowrap',
      })
      value.textContent = valueText
      quote.append(label, value)
      return quote
    }
    const arrow = document.createElement('span')
    Object.assign(arrow.style, { color: '#5f7088', fontSize: '14px', paddingBottom: '1px' })
    arrow.textContent = '→'
    pricesRow.append(
      makeQuote('ENTRADA', fmtPrice(p.precoEntrada), false),
      arrow,
      makeQuote('ATUAL', currentPrice != null ? fmtPrice(currentPrice) : 'Sem cotação', true),
    )

    const pnlSpan = document.createElement('span')
    Object.assign(pnlSpan.style, {
      fontFamily: 'monospace', fontWeight: '800',
      fontSize: dense ? '18px' : spacious ? '30px' : '22px',
      color: pnlColor, whiteSpace: 'nowrap', alignSelf: dense ? 'end' : 'auto',
    })
    pnlSpan.textContent = pnl == null ? '—' : fmtPct(pnl)

    row2.append(pricesRow, pnlSpan)
    card.append(row1, row2)

    grid.appendChild(card)
  }

  root.appendChild(grid)
  const footer = document.createElement('div')
  Object.assign(footer.style, {
    height: `${FOOTER_HEIGHT}px`, flexShrink: '0', display: 'flex',
    alignItems: 'end', justifyContent: 'space-between',
    color: '#607089', fontSize: '11px', letterSpacing: '0.02em',
  })
  const footerLeft = document.createElement('span')
  footerLeft.textContent = 'Posições abertas · preços exibidos na exportação'
  const footerRight = document.createElement('span')
  footerRight.textContent = 'OPERAÇÕES · PAINEL DE POSIÇÕES'
  footer.append(footerLeft, footerRight)
  root.appendChild(footer)
  return root
}

export default function OpenPositions({ trades, prices, onEdit, onDelete, onSell, onViewAsset }) {
  const [exporting, setExporting] = useState(false)

  const handleExportImage = async () => {
    if (exporting) return
    setExporting(true)
    let exportEl
    try {
      const html2canvas = (await import('html2canvas')).default
      const positions = trades.filter(t => t.status === 'Aberta')

      exportEl = buildExportDOM(positions, prices)
      document.body.appendChild(exportEl)
      await Promise.all([
        exportEl.querySelector('img')?.decode().catch(() => {}),
        document.fonts.ready,
      ])

      const canvas = await html2canvas(exportEl, {
        width: exportEl.clientWidth, height: exportEl.clientHeight,
        backgroundColor: '#080d17',
        scale: 1,
        useCORS: true,
        logging: false,
      })

      const link = document.createElement('a')
      link.download = `Posicoes_Abertas_${localDateString()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      exportEl?.remove()
      setExporting(false)
    }
  }

  const positions = trades.filter(t => t.status === 'Aberta')

  // Agrupar por categoria
  const grouped = {}
  for (const cat of CATEGORIES) grouped[cat.key] = []
  for (const p of positions) {
    if (grouped[p.categoria]) grouped[p.categoria].push(p)
  }

  // Totais
  let totalAporte = 0
  let totalUnrealized = 0
  let positionsWithPrice = 0

  for (const p of positions) {
    totalAporte += p.aporte || 0
    const result = calcUnrealizedResult(p, prices[p.ativo])
    if (result != null) {
      totalUnrealized += result
      positionsWithPrice++
    }
  }

  return (
    <div className="-mx-4 space-y-6 sm:mx-0 sm:space-y-4">
      {/* Summary bar */}
      <div className="positions-summary grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 border-b border-border p-4 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:p-5">
        <div className="order-1 flex items-center gap-1 sm:block">
          <span className="stat-label mt-0 w-[76px] leading-tight sm:mt-1 sm:w-auto sm:leading-normal">Posições Abertas</span>
          <p className="stat-value text-xl sm:text-2xl">{positions.length}</p>
        </div>
        <div className="order-3 col-span-2 border-t border-border pt-3 sm:order-2 sm:col-auto sm:border-0 sm:pt-0">
          <span className="stat-label">Capital Alocado (Aberto)</span>
          <p className="stat-value v-usd text-xl sm:text-2xl">{fmtUSD(totalAporte)}</p>
        </div>
        <div className="order-4 sm:order-3">
          <span className="stat-label">PnL Não-Realizado</span>
          <p className={`stat-value v-usd text-xl sm:text-2xl ${totalUnrealized >= 0 ? 'positive' : 'negative'}`}>
            {positionsWithPrice > 0 ? fmtUSD(totalUnrealized) : '—'}
          </p>
        </div>
        {positionsWithPrice > 0 && totalAporte > 0 && (
          <div className="order-5 sm:order-4">
            <span className="stat-label">ROI Não-Realizado</span>
            <p className={`stat-value text-xl sm:text-2xl ${totalUnrealized >= 0 ? 'positive' : 'negative'}`}>
              {fmtPct(totalUnrealized / totalAporte)}
            </p>
          </div>
        )}
        <button
          onClick={handleExportImage}
          disabled={exporting}
          className="order-2 justify-self-end flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-blue/15 text-accent-blue text-sm font-semibold hover:bg-accent-blue/25 transition-colors disabled:opacity-50 sm:order-5 sm:ml-auto"
          title="Exportar como imagem 1920×1080"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Colunas por categoria */}
      <div className="positions-categories grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-0 lg:grid-cols-4">
        {CATEGORIES.map(cat => {
          const catPositions = grouped[cat.key] || []
          const catAporte = catPositions.reduce((s, p) => s + (p.aporte || 0), 0)

          return (
            <div key={cat.key} className="border-b border-border p-4 sm:p-5">
              {/* Category header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-2">
                <h3 className={`text-sm font-semibold ${cat.color}`}>{cat.key}</h3>
                <span className="text-xs text-text-muted">{catPositions.length} pos.</span>
              </div>

              {catPositions.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-4">Nenhuma posição</p>
              ) : (
                <div>
                  {[...catPositions]
                    .sort((a, b) => a.ativo.localeCompare(b.ativo))
                    .map((p, i) => {
                      const currentPrice = prices[p.ativo]
                      const pnl = calcUnrealizedPnl(p, currentPrice)
                      const result = calcUnrealizedResult(p, currentPrice)
                      const days = p.dataEntrada
                        ? Math.floor((Date.now() - parseLocalDate(p.dataEntrada).getTime()) / 86400000)
                        : p.duracao

                      return (
                        <div
                          key={p.id || i}
                          className="group border-b border-border/70 py-3 last:border-b-0 hover:bg-bg-hover/40 transition-colors sm:px-3 sm:py-2.5"
                        >
                          {/* Linha 1: Ativo + Operação + Ações */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <AssetLogo ticker={p.ativo} categoria={p.categoria} size={22} />
                              <button
                                onClick={() => onViewAsset?.(p.ativo)}
                                className="font-mono font-bold text-sm hover:text-accent-gold transition-colors"
                              >
                                {p.ativo}
                              </button>
                              <span className={p.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                                {p.operacao === 'LONG' ? (
                                  <><ArrowUpRight className="w-3 h-3 mr-0.5" />L</>
                                ) : (
                                  <><ArrowDownRight className="w-3 h-3 mr-0.5" />S</>
                                )}
                              </span>
                              {(p.operando || p.corretora || p.comentario) && (
                                <div className="flex items-center gap-2">
                                  {p.operando && (
                                    <img src="/check-operando.png" alt="Operando" className="w-3.5 h-3.5" title="Operando" />
                                  )}
                                  {p.corretora && (
                                    <span className={`text-xs font-bold ${
                                      p.corretora === 'Quantfury' ? 'text-emerald-400' :
                                      p.corretora === 'Binance' ? 'text-yellow-400' :
                                      'text-white'
                                    }`} title={p.corretora}>{p.corretora[0]}</span>
                                  )}
                                  {p.comentario && (
                                    <span className="text-text-muted cursor-help" title={p.comentario}>
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {(onSell || onEdit || onDelete) && (
                            <div data-no-export className="flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                              {onSell && (
                              <button
                                onClick={() => onSell(p)}
                                className="p-1 rounded hover:bg-accent-gold/20 text-text-muted hover:text-accent-gold transition-colors"
                                title="Fechar posição"
                              >
                                <LogOut className="w-3 h-3" />
                              </button>
                              )}
                              {onEdit && (
                              <button
                                onClick={() => onEdit(p)}
                                className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-blue transition-colors"
                                title="Editar entrada"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              )}
                              {onDelete && (
                              <button
                                onClick={() => onDelete(p)}
                                className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-red transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              )}
                            </div>
                            )}
                          </div>

                          {/* Linha 2: Preços */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-muted font-mono">
                              {fmtPrice(p.precoEntrada)}
                              <span className="mx-1">→</span>
                              {currentPrice ? (
                                <span className="text-text-primary">{fmtPrice(currentPrice)}</span>
                              ) : (
                                <Loader2 className="w-3 h-3 animate-spin text-text-muted inline" />
                              )}
                            </span>
                            <span className="text-text-muted font-mono">{days}d</span>
                          </div>

                          {/* Linha 3: PnL */}
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-text-muted v-usd">
                              Aporte: <span className="font-mono">{fmtUSD(p.aporte)}</span>
                            </span>
                            <span className={`font-mono font-semibold ${
                              pnl == null ? 'text-text-muted' : pnl >= 0 ? 'positive' : 'negative'
                            }`}>
                              {fmtPct(pnl)}{result != null && <span className="v-usd"> ({fmtUSD(result)})</span>}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                  {/* Subtotal da categoria */}
                  <div className="pt-2 v-usd sm:mt-2">
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>Capital:</span>
                      <span className="font-mono font-medium">{fmtUSD(catAporte)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
