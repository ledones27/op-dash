import { Fragment, useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { bindWatchlistTouch } from '../utils/watchlistTouch'
import { ArrowUpRight, ArrowDownRight, Eye, Plus, Pencil, MessageSquare, Trash2 } from 'lucide-react'

const CATEGORY_LABELS = {
  'Ações': { color: 'text-accent-blue', bg: 'sm:bg-accent-blue/10' },
  'Cripto': { color: 'text-accent-gold', bg: 'sm:bg-accent-gold/10' },
  'Commodities': { color: 'text-accent-green', bg: 'sm:bg-accent-green/10' },
  'Índices': { color: 'text-purple-400', bg: 'sm:bg-purple-500/10' },
}

export default function Watchlist({ watchlist, onAdd, onEdit, onRemove }) {
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const press = useRef({ timer: null, suppressClick: false, active: false, x: 0, y: 0 })
  const pendingAction = useRef(null)
  const rootRef = useRef(null)
  useEffect(() => () => clearTimeout(press.current.timer), [])
  const hasWatchlist = !!watchlist
  useEffect(() => {
    if (!rootRef.current) return
    return bindWatchlistTouch(rootRef.current, {
      onHold: setSelected,
      onTap: (card) => { press.current.suppressClick = false; card.click() },
    })
  }, [hasWatchlist])

  const stopPress = () => {
    clearTimeout(press.current.timer)
    press.current.active = false
  }
  const startPress = (point, key, actionable) => {
    stopPress()
    press.current = { timer: null, suppressClick: false, active: true, x: point.clientX, y: point.clientY }
    if (actionable) {
      press.current.timer = setTimeout(() => {
        press.current.suppressClick = true
        setSelected(key)
      }, 500)
    }
  }
  const movePress = (point) => {
    if (press.current.active && Math.hypot(point.clientX - press.current.x, point.clientY - press.current.y) > 20) {
      stopPress()
      press.current.suppressClick = true
    }
  }
  const showDetails = (item, categoria) => {
    if (press.current.suppressClick) { press.current.suppressClick = false; return }
    setSelected(null)
    setDetails({ ...item, categoria })
  }
  const actFromDetails = (action) => {
    pendingAction.current = action
    setDetails(null)
  }
  const finishClosingDetails = () => {
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }
  if (!watchlist) return null

  const hasItems = Object.values(watchlist).some(list => list.length > 0)

  return (
    <div ref={rootRef} className="-mx-4 space-y-6 sm:mx-0 sm:space-y-4">
      {/* Header com botão de adicionar */}
      <div className="flex items-center justify-between border-b border-border px-4 pb-4 sm:px-5">
        <h2 className="text-sm font-semibold text-text-secondary">Pré-Entradas por Categoria</h2>
        {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
        )}
      </div>

      {!hasItems ? (
        <div className="border-b border-border text-center py-12 text-text-muted">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Watchlist vazia — nenhum ativo em pré-entrada.</p>
        </div>
      ) : (
        <div className="watchlist-categories grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-0 lg:grid-cols-4">
          {Object.entries(watchlist).map(([cat, items]) => {
            const sortedItems = [...items].sort((a, b) => a.ativo.localeCompare(b.ativo))
            const style = CATEGORY_LABELS[cat] || { color: 'text-text-primary', bg: 'sm:bg-bg-hover' }

            return (
              <div key={cat} className="min-w-0 border-b border-border p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <h3 className={`text-sm font-semibold ${style.color}`}>
                    Pré {cat}
                  </h3>
                  <span className="text-xs text-text-muted">
                    {items.length} {items.length === 1 ? 'ativo' : 'ativos'}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-text-muted text-xs pt-3">Nenhum ativo</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 pt-3 sm:grid-cols-2 sm:gap-y-0 sm:pt-0">
                    {sortedItems.map((item, i) => (
                      <Fragment key={item.id || i}>
                      <div className={`relative min-w-0 self-start rounded-lg border bg-bg-card sm:hidden ${selected === `${cat}-${item.id || i}` ? 'border-accent-gold/50' : 'border-border'}`}>
                        <button
                          type="button"
                          onClick={() => showDetails(item, cat)}
                          data-watch-key={`${cat}-${item.id || i}`}
                          data-actionable={!!(item.id && (onEdit || onRemove))}
                          onPointerDown={(event) => {
                            if (event.pointerType !== 'touch' && event.button === 0) {
                              event.preventDefault()
                              event.currentTarget.setPointerCapture(event.pointerId)
                              startPress(event, `${cat}-${item.id || i}`, item.id && (onEdit || onRemove))
                            }
                          }}
                          onPointerMove={(event) => { if (event.pointerType !== 'touch') movePress(event) }}
                          onPointerUp={(event) => { if (event.pointerType !== 'touch') stopPress() }}
                          onPointerCancel={(event) => { if (event.pointerType !== 'touch') { stopPress(); press.current.suppressClick = true } }}
                          onContextMenuCapture={(event) => { event.preventDefault(); event.stopPropagation() }}
                          aria-haspopup="dialog"
                          aria-label={`Detalhes de ${item.ativo}`}
                          className="watchlist-touch-card flex w-full min-w-0 touch-pan-y select-none flex-col items-center gap-2 px-1 py-3"
                        >
                          <span className="w-full break-words text-center font-mono text-xs font-semibold">{item.ativo}</span>
                          <span className={`${item.operacao ? (item.operacao === 'SHORT' ? 'badge-short' : 'badge-long') : 'inline-flex items-center px-2 py-0.5 text-text-muted'} text-[10px]`}>
                            {item.operacao && (item.operacao === 'SHORT' ? <ArrowDownRight className="mr-0.5 h-3 w-3" /> : <ArrowUpRight className="mr-0.5 h-3 w-3" />)}
                            {item.operacao || '—'}
                          </span>
                          <span className="flex min-h-4 items-center justify-center gap-2">
                            {item.corretora && <span title={item.corretora} className={`text-xs font-bold ${item.corretora === 'Quantfury' ? 'text-emerald-400' : item.corretora === 'Binance' ? 'text-yellow-400' : 'text-text-secondary'}`}>{item.corretora[0]}</span>}
                            {item.comentario && <MessageSquare className="h-3.5 w-3.5 text-text-muted" />}
                            {item.operando && <img src="/check-operando.png" alt="Operando" className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                        {selected === `${cat}-${item.id || i}` && (
                          <div className="absolute inset-x-0 bottom-0 top-8 flex items-center justify-center rounded-b-lg bg-bg-card/95">
                            <button type="button" onClick={() => setSelected(null)} aria-label={`Fechar ações de ${item.ativo}`} className="absolute inset-0 rounded-b-lg" />
                            <div className="relative flex items-center justify-center gap-1">
                              {item.id && onEdit && <button type="button" onClick={() => onEdit({ ...item, categoria: cat })} aria-label={`Editar ${item.ativo}`} className="rounded p-2 text-accent-gold"><Pencil className="h-4 w-4" /></button>}
                              {item.id && onRemove && <button type="button" onClick={() => onRemove(item.id, cat, item.ativo)} aria-label={`Excluir ${item.ativo}`} className="rounded p-2 text-accent-red"><Trash2 className="h-4 w-4" /></button>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        key={item.id || i}
                        className="group relative hidden min-w-0 flex-col border-b border-border/70 bg-transparent p-3 transition-colors hover:bg-bg-hover/40 sm:flex"
                      >
                        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                          <span className="w-full break-words font-mono font-semibold text-sm">{item.ativo}</span>
                          {item.operacao ? (
                            <span className={item.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                              {item.operacao === 'LONG' ? (
                                <><ArrowUpRight className="w-3 h-3 mr-0.5" />LONG</>
                              ) : (
                                <><ArrowDownRight className="w-3 h-3 mr-0.5" />SHORT</>
                              )}
                            </span>
                          ) : <span className="text-xs text-text-muted">—</span>}
                          <div className="flex min-h-4 items-center justify-center gap-2">
                          {item.operando && (
                            <img src="/check-operando.png" alt="Pré-entrada" className="w-3.5 h-3.5" title="Pré-entrada" />
                          )}
                          {item.corretora && (
                            <span className={`text-xs font-bold ${
                              item.corretora === 'Quantfury' ? 'text-emerald-400' :
                              item.corretora === 'Binance' ? 'text-yellow-400' :
                              'text-white'
                            }`} title={item.corretora}>{item.corretora[0]}</span>
                          )}
                          {item.comentario && (
                            <span className="text-text-muted cursor-help" title={item.comentario}>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </span>
                          )}
                          </div>
                        </div>
                        {item.id && (onEdit || onRemove) && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            {onEdit && (
                            <button
                              onClick={() => onEdit({ ...item, categoria: cat })}
                              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-gold transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            )}
                            {onRemove && (
                            <button
                              onClick={() => onRemove(item.id, cat, item.ativo)}
                              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent-red transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            )}
                          </div>
                        )}
                      </div>
                      </Fragment>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <Modal open={!!details} onClose={() => setDetails(null)} onAfterClose={finishClosingDetails} title={details?.ativo || 'Detalhes do ativo'}>
        {details && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div><dt className="mb-1 text-xs text-text-muted">Ativo</dt><dd className="break-words font-mono font-semibold">{details.ativo}</dd></div>
              <div><dt className="mb-1 text-xs text-text-muted">Categoria</dt><dd>{details.categoria}</dd></div>
              <div><dt className="mb-1 text-xs text-text-muted">Operação</dt><dd>{details.operacao ? <span className={details.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>{details.operacao}</span> : 'Não definida'}</dd></div>
              <div><dt className="mb-1 text-xs text-text-muted">Corretora</dt><dd>{details.corretora || 'Não informada'}</dd></div>
              <div className="col-span-2"><dt className="mb-1 text-xs text-text-muted">Pré-entrada / Operando</dt><dd className="flex items-center gap-2">{details.operando && <img src="/check-operando.png" alt="" className="h-4 w-4" />}{details.operando ? 'Marcado' : 'Não marcado'}</dd></div>
            </dl>
            {details.comentario && (
              <div className="border-t border-border pt-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs text-text-muted"><MessageSquare className="h-3.5 w-3.5" />Comentário</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{details.comentario}</p>
              </div>
            )}
            {details.id && (onEdit || onRemove) && (
              <div className="flex gap-2 border-t border-border pt-4">
                {onEdit && <button type="button" onClick={() => actFromDetails(() => onEdit(details))} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-gold/15 px-3 py-2.5 text-sm font-medium text-accent-gold"><Pencil className="h-4 w-4" />Editar</button>}
                {onRemove && <button type="button" onClick={() => actFromDetails(() => onRemove(details.id, details.categoria, details.ativo))} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-red/15 px-3 py-2.5 text-sm font-medium text-accent-red"><Trash2 className="h-4 w-4" />Excluir</button>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
