import { ArrowUpRight, ArrowDownRight, Eye, Plus, Pencil, X } from 'lucide-react'

const CATEGORY_LABELS = {
  'Ações': { color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  'Cripto': { color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
  'Commodities': { color: 'text-accent-green', bg: 'bg-accent-green/10' },
  'Índices': { color: 'text-purple-400', bg: 'bg-purple-500/10' },
}

export default function Watchlist({ watchlist, onAdd, onEdit, onRemove }) {
  if (!watchlist) return null

  const hasItems = Object.values(watchlist).some(list => list.length > 0)

  return (
    <div className="space-y-4">
      {/* Header com botão de adicionar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">Pré-Entradas por Categoria</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {!hasItems ? (
        <div className="card text-center py-12 text-text-muted">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Watchlist vazia — nenhum ativo em pré-entrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(watchlist).map(([cat, items]) => {
            const sortedItems = [...items].sort((a, b) => a.ativo.localeCompare(b.ativo))
            const style = CATEGORY_LABELS[cat] || { color: 'text-text-primary', bg: 'bg-bg-hover' }

            return (
              <div key={cat} className="card">
                <h3 className={`text-sm font-semibold mb-3 ${style.color}`}>
                  Pré {cat}
                </h3>
                {items.length === 0 ? (
                  <p className="text-text-muted text-xs">Nenhum ativo</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedItems.map((item, i) => (
                      <div
                        key={item.id || i}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg ${style.bg} group`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{item.ativo}</span>
                          {item.operacao && (
                            <span className={item.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                              {item.operacao === 'LONG' ? (
                                <><ArrowUpRight className="w-3 h-3 mr-0.5" />LONG</>
                              ) : (
                                <><ArrowDownRight className="w-3 h-3 mr-0.5" />SHORT</>
                              )}
                            </span>
                          )}
                        </div>
                        {item.id && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => onEdit({ ...item, categoria: cat })}
                              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-gold transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRemove(item.id, cat, item.ativo)}
                              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-red transition-colors"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
