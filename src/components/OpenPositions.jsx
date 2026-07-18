import { ArrowUpRight, ArrowDownRight, Loader2, Pencil, Trash2, LogOut } from 'lucide-react'
import { calcUnrealizedPnl, calcUnrealizedResult, fmtUSD, fmtPct, fmtPrice } from '../utils/calculations'
import AssetLogo from './AssetLogo'

const CATEGORIES = [
  { key: 'Ações', color: 'text-accent-blue', border: 'border-accent-blue/30', bg: 'bg-accent-blue/5' },
  { key: 'Cripto', color: 'text-accent-gold', border: 'border-accent-gold/30', bg: 'bg-accent-gold/5' },
  { key: 'Commodities', color: 'text-accent-green', border: 'border-accent-green/30', bg: 'bg-accent-green/5' },
  { key: 'Índices', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
]

export default function OpenPositions({ trades, prices, onEdit, onDelete, onSell, onViewAsset }) {
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
      <div className="card flex flex-wrap gap-6">
        <div>
          <span className="stat-label">Posições Abertas</span>
          <p className="stat-value">{positions.length}</p>
        </div>
        <div>
          <span className="stat-label">Capital Alocado (Aberto)</span>
          <p className="stat-value">{fmtUSD(totalAporte)}</p>
        </div>
        <div>
          <span className="stat-label">PnL Não-Realizado</span>
          <p className={`stat-value ${totalUnrealized >= 0 ? 'positive' : 'negative'}`}>
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
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            <span className="text-text-muted">
                              Aporte: <span className="font-mono">{fmtUSD(p.aporte)}</span>
                            </span>
                            <span className={`font-mono font-semibold ${
                              pnl == null ? 'text-text-muted' : pnl >= 0 ? 'positive' : 'negative'
                            }`}>
                              {fmtPct(pnl)} {result != null ? `(${fmtUSD(result)})` : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                  {/* Subtotal da categoria */}
                  <div className="border-t border-border/50 pt-2 mt-2">
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
