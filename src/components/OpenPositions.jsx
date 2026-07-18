import { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Loader2, Pencil, Trash2, LogOut, Camera } from 'lucide-react'
import { calcUnrealizedPnl, calcUnrealizedResult, fmtUSD, fmtPct, fmtPrice } from '../utils/calculations'
import AssetLogo from './AssetLogo'

const CATEGORIES = [
  { key: 'Ações', color: 'text-accent-blue', border: 'border-accent-blue/30', bg: 'bg-accent-blue/5' },
  { key: 'Cripto', color: 'text-accent-gold', border: 'border-accent-gold/30', bg: 'bg-accent-gold/5' },
  { key: 'Commodities', color: 'text-accent-green', border: 'border-accent-green/30', bg: 'bg-accent-green/5' },
  { key: 'Índices', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
]

const CAT_COLORS = {
  'Ações': { text: '#1e80ff', border: 'rgba(30,128,255,0.3)', bg: 'rgba(30,128,255,0.05)' },
  'Cripto': { text: '#f0b90b', border: 'rgba(240,185,11,0.3)', bg: 'rgba(240,185,11,0.05)' },
  'Commodities': { text: '#0ecb81', border: 'rgba(14,203,129,0.3)', bg: 'rgba(14,203,129,0.05)' },
  'Índices': { text: '#a855f7', border: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.05)' },
}

// ─── Export offscreen 1920×1080 ─────────────────────────

function buildExportDOM(positions, prices) {
  const W = 1920, H = 1080
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Agrupar — só categorias com posições
  const grouped = {}
  for (const cat of CATEGORIES) grouped[cat.key] = []
  for (const p of positions) {
    if (grouped[p.categoria]) grouped[p.categoria].push(p)
  }
  const activeCats = CATEGORIES.filter(cat => grouped[cat.key].length > 0)
  const colCount = activeCats.length || 1

  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'fixed', left: '-9999px', top: '0',
    width: `${W}px`, height: `${H}px`,
    background: '#0a0e17', fontFamily: "'Inter', system-ui, sans-serif",
    color: '#eaecef', display: 'flex', flexDirection: 'column',
    padding: '32px 40px', boxSizing: 'border-box',
  })

  // ─── Header ───
  const header = document.createElement('div')
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '28px', flexShrink: '0',
  })

  const left = document.createElement('div')
  left.style.display = 'flex'
  left.style.alignItems = 'center'
  left.style.gap = '14px'

  const badge = document.createElement('div')
  Object.assign(badge.style, {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(240,185,11,0.15)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: '#f0b90b', fontWeight: '800', fontSize: '16px',
  })
  badge.textContent = 'OP'

  const title = document.createElement('div')
  const t1 = document.createElement('div')
  Object.assign(t1.style, { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' })
  t1.textContent = 'Posições Abertas'
  const t2 = document.createElement('div')
  Object.assign(t2.style, { fontSize: '13px', color: '#848e9c', marginTop: '2px' })
  t2.textContent = `${positions.length} posições · ${dateStr} às ${timeStr}`
  title.append(t1, t2)
  left.append(badge, title)

  const right = document.createElement('div')
  Object.assign(right.style, { fontSize: '13px', color: '#848e9c', textAlign: 'right' })
  right.textContent = 'Operações Dashboard'
  header.append(left, right)
  root.appendChild(header)

  // ─── Grid 4 colunas ───
  const grid = document.createElement('div')
  Object.assign(grid.style, {
    display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`,
    gap: '16px', flex: '1', minHeight: '0',
  })

  for (const cat of activeCats) {
    const catPositions = (grouped[cat.key] || []).sort((a, b) => a.ativo.localeCompare(b.ativo))
    const colors = CAT_COLORS[cat.key]

    const col = document.createElement('div')
    Object.assign(col.style, {
      background: '#111827', border: `1px solid ${colors.border}`,
      borderRadius: '12px', padding: '16px', display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
    })

    // Category header
    const catHeader = document.createElement('div')
    Object.assign(catHeader.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '12px', flexShrink: '0',
    })
    const catName = document.createElement('span')
    Object.assign(catName.style, { fontSize: '14px', fontWeight: '600', color: colors.text })
    catName.textContent = cat.key
    const catCount = document.createElement('span')
    Object.assign(catCount.style, { fontSize: '12px', color: '#848e9c' })
    catCount.textContent = `${catPositions.length} pos.`
    catHeader.append(catName, catCount)
    col.appendChild(catHeader)

    {
      const list = document.createElement('div')
      list.style.display = 'flex'
      list.style.flexDirection = 'column'
      list.style.gap = '8px'
      list.style.overflow = 'hidden'

      for (const p of catPositions) {
        const currentPrice = prices[p.ativo]
        const pnl = calcUnrealizedPnl(p, currentPrice)
        const days = p.dataEntrada
          ? Math.floor((Date.now() - new Date(p.dataEntrada).getTime()) / 86400000)
          : p.duracao

        const card = document.createElement('div')
        Object.assign(card.style, {
          background: colors.bg, borderRadius: '8px',
          padding: '10px 12px',
        })

        // Row 1: Ticker + Badge + Days
        const row1 = document.createElement('div')
        Object.assign(row1.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '6px',
        })
        const row1Left = document.createElement('div')
        row1Left.style.display = 'flex'
        row1Left.style.alignItems = 'center'
        row1Left.style.gap = '8px'

        const ticker = document.createElement('span')
        Object.assign(ticker.style, {
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontWeight: '700', fontSize: '14px',
        })
        ticker.textContent = p.ativo

        const opBadge = document.createElement('span')
        const isLong = p.operacao === 'LONG'
        Object.assign(opBadge.style, {
          fontSize: '11px', fontWeight: '600', padding: '2px 7px',
          borderRadius: '4px',
          background: isLong ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)',
          color: isLong ? '#0ecb81' : '#f6465d',
        })
        opBadge.textContent = isLong ? '↑ L' : '↓ S'

        row1Left.append(ticker, opBadge)

        const daysSpan = document.createElement('span')
        Object.assign(daysSpan.style, {
          fontFamily: 'monospace', fontSize: '12px', color: '#848e9c',
        })
        daysSpan.textContent = `${days}d`

        row1.append(row1Left, daysSpan)

        // Row 2: Prices
        const row2 = document.createElement('div')
        Object.assign(row2.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '12px', marginBottom: '4px',
        })
        const priceSpan = document.createElement('span')
        Object.assign(priceSpan.style, { fontFamily: 'monospace', color: '#848e9c' })
        const entryStr = fmtPrice(p.precoEntrada)
        const currentStr = currentPrice ? fmtPrice(currentPrice) : '...'
        priceSpan.innerHTML = `${entryStr} <span style="margin:0 4px;color:#5e6673">→</span> <span style="color:#eaecef">${currentStr}</span>`
        row2.appendChild(priceSpan)

        // Row 3: PnL %
        const row3 = document.createElement('div')
        Object.assign(row3.style, {
          display: 'flex', justifyContent: 'flex-end',
          fontSize: '13px', fontFamily: 'monospace', fontWeight: '600',
          color: pnl == null ? '#848e9c' : pnl >= 0 ? '#0ecb81' : '#f6465d',
        })
        row3.textContent = fmtPct(pnl)

        card.append(row1, row2, row3)
        list.appendChild(card)
      }
      col.appendChild(list)
    }

    grid.appendChild(col)
  }

  root.appendChild(grid)
  return root
}

export default function OpenPositions({ trades, prices, onEdit, onDelete, onSell, onViewAsset }) {
  const [exporting, setExporting] = useState(false)

  const handleExportImage = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const positions = trades.filter(t => t.status === 'Aberta')

      // Criar layout off-screen 1920×1080
      const exportEl = buildExportDOM(positions, prices)
      document.body.appendChild(exportEl)

      // Pequeno delay para o browser renderizar
      await new Promise(r => setTimeout(r, 50))

      const canvas = await html2canvas(exportEl, {
        width: 1920, height: 1080,
        backgroundColor: '#0a0e17',
        scale: 1,
        useCORS: true,
        logging: false,
      })

      document.body.removeChild(exportEl)

      const link = document.createElement('a')
      link.download = `Posicoes_Abertas_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export error:', err)
    } finally {
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
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="card flex flex-wrap items-center gap-6">
        <div>
          <span className="stat-label">Posições Abertas</span>
          <p className="stat-value">{positions.length}</p>
        </div>
        <div>
          <span className="stat-label">Capital Alocado (Aberto)</span>
          <p className="stat-value v-usd">{fmtUSD(totalAporte)}</p>
        </div>
        <div>
          <span className="stat-label">PnL Não-Realizado</span>
          <p className={`stat-value v-usd ${totalUnrealized >= 0 ? 'positive' : 'negative'}`}>
            {positionsWithPrice > 0 ? fmtUSD(totalUnrealized) : '—'}
          </p>
        </div>
        {positionsWithPrice > 0 && totalAporte > 0 && (
          <div>
            <span className="stat-label">ROI Não-Realizado</span>
            <p className={`stat-value ${totalUnrealized >= 0 ? 'positive' : 'negative'}`}>
              {fmtPct(totalUnrealized / totalAporte)}
            </p>
          </div>
        )}
        <button
          onClick={handleExportImage}
          disabled={exporting}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-blue/15 text-accent-blue text-sm font-semibold hover:bg-accent-blue/25 transition-colors disabled:opacity-50"
          title="Exportar como imagem 1920×1080"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Colunas por categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map(cat => {
          const catPositions = grouped[cat.key] || []
          const catAporte = catPositions.reduce((s, p) => s + (p.aporte || 0), 0)

          return (
            <div key={cat.key} className={`card border ${cat.border}`}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${cat.color}`}>{cat.key}</h3>
                <span className="text-xs text-text-muted">{catPositions.length} pos.</span>
              </div>

              {catPositions.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-4">Nenhuma posição</p>
              ) : (
                <div className="space-y-2">
                  {catPositions
                    .sort((a, b) => a.ativo.localeCompare(b.ativo))
                    .map((p, i) => {
                      const currentPrice = prices[p.ativo]
                      const pnl = calcUnrealizedPnl(p, currentPrice)
                      const result = calcUnrealizedResult(p, currentPrice)
                      const days = p.dataEntrada
                        ? Math.floor((Date.now() - new Date(p.dataEntrada).getTime()) / 86400000)
                        : p.duracao

                      return (
                        <div
                          key={p.id || i}
                          className={`rounded-lg px-3 py-2.5 ${cat.bg} group hover:bg-bg-hover/40 transition-colors`}
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
                            </div>
                            <div data-no-export className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onSell(p)}
                                className="p-1 rounded hover:bg-accent-gold/20 text-text-muted hover:text-accent-gold transition-colors"
                                title="Fechar posição"
                              >
                                <LogOut className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onEdit(p)}
                                className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-blue transition-colors"
                                title="Editar entrada"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDelete(p)}
                                className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-red transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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
                  <div className="border-t border-border/50 pt-2 mt-2 v-usd">
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
