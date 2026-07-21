import { useState, useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Filter, Plus, Download, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtUSD, fmtPct, fmtPrice, fmtDate } from '../utils/calculations'
import AssetLogo from './AssetLogo'
import DateInput from './DateInput'

const CATEGORIES = ['Todos', 'Ações', 'Cripto', 'Commodities', 'Índices']
const STATUSES = ['Todos', 'Fechada', 'Aberta']
const PAGE_SIZE = 50

const COLUMNS = [
  { key: 'dataEntrada',  label: 'Data Entrada', align: 'left' },
  { key: 'dataSaida',    label: 'Data Saída',   align: 'left' },
  { key: 'ativo',        label: 'Ativo',        align: 'left' },
  { key: 'categoria',    label: 'Cat.',         align: 'left' },
  { key: 'operacao',     label: 'Op.',          align: 'center' },
  { key: 'precoEntrada', label: 'Entrada',      align: 'right' },
  { key: 'precoSaida',   label: 'Saída',        align: 'right' },
  { key: 'pnlPercent',   label: 'PnL %',        align: 'right' },
  { key: 'aporte',       label: 'Aporte',       align: 'right' },
  { key: 'resultado',    label: 'Resultado',    align: 'right' },
  { key: 'duracao',      label: 'Dias',         align: 'right' },
  { key: 'status',       label: 'Status',       align: 'center' },
  { key: '_actions',     label: 'Ações',        align: 'center', sortable: false },
]

function compareValues(a, b, key) {
  const va = a[key]
  const vb = b[key]
  if (va == null && vb == null) return 0
  if (va == null) return -1
  if (vb == null) return 1
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va).localeCompare(String(vb))
}

export default function TradeHistory({ trades, onEdit, onDelete, onNew, onExport, prices, onViewAsset }) {
  const [catFilter, setCatFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState('dataEntrada')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let result = [...trades]
    if (catFilter !== 'Todos') result = result.filter(t => t.categoria === catFilter)
    if (statusFilter !== 'Todos') result = result.filter(t => t.status === statusFilter)
    if (dateFrom) result = result.filter(t => t.dataEntrada && t.dataEntrada >= dateFrom)
    if (dateTo) result = result.filter(t => t.dataEntrada && t.dataEntrada <= dateTo)
    result.sort((a, b) => {
      const cmp = compareValues(a, b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [trades, catFilter, statusFilter, dateFrom, dateTo, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const getExitPrice = (t) => {
    if (t.precoSaida) return { value: fmtPrice(t.precoSaida), live: false }
    if (t.status === 'Aberta' && prices) {
      const ticker = t.ativo
      const currentPrice = prices[ticker] ?? prices[ticker?.toUpperCase()] ?? prices[ticker?.toLowerCase()]
      if (currentPrice != null) return { value: fmtPrice(currentPrice), live: true }
    }
    return { value: '—', live: false }
  }

  return (
    <div className="space-y-4">
      {/* Filters + new button */}
      <div className="card flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-text-muted" />
        <div className="flex gap-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCatFilter(c); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                catFilter === c
                  ? 'bg-accent-gold/15 text-accent-gold'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="text-border">|</span>
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {s === 'Todos' ? 'Todos' : s === 'Fechada' ? 'Fechados' : 'Abertos'}
            </button>
          ))}
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-xs">De:</span>
          <div className="w-36">
            <DateInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1) }} placeholder="Início" />
          </div>
          <span className="text-text-muted text-xs">Até:</span>
          <div className="w-36">
            <DateInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1) }} placeholder="Fim" />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-text-muted hover:text-accent-red transition-colors"
              title="Limpar datas"
            >
              Limpar
            </button>
          )}
        </div>
        <span className="text-text-muted text-xs ml-auto">{filtered.length} trades</span>
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
          title="Exportar todos os dados para Excel"
        >
          <Download className="w-3 h-3" /> Exportar
        </button>
        <button
          onClick={onNew}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 transition-colors"
        >
          <Plus className="w-3 h-3" /> Novo
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-border">
              {COLUMNS.map(col => {
                const sortable = col.sortable !== false
                const isActive = sortKey === col.key
                const alignCls = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                return (
                  <th
                    key={col.key}
                    className={`${alignCls} py-3 px-2 ${col.key === '_actions' ? 'w-20' : ''} ${sortable ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''}`}
                    onClick={sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortable && isActive && (
                        <span className="text-accent-gold text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paged.map((t, i) => {
              const exit = getExitPrice(t)
              return (
                <tr key={t.id || i} className="border-b border-border/30 hover:bg-bg-hover/20 transition-colors group">
                  <td className="py-2.5 px-2 text-text-secondary text-xs font-mono">
                    {fmtDate(t.dataEntrada)}
                  </td>
                  <td className="py-2.5 px-2 text-text-secondary text-xs font-mono">
                    {fmtDate(t.dataSaida)}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <AssetLogo ticker={t.ativo} categoria={t.categoria} size={20} />
                      <button
                        onClick={() => onViewAsset?.(t.ativo)}
                        className="font-semibold font-mono hover:text-accent-gold transition-colors"
                      >
                        {t.ativo}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-text-muted text-xs">{t.categoria}</td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={t.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                        {t.operacao === 'LONG' ? (
                          <><ArrowUpRight className="w-3 h-3 mr-0.5" />L</>
                        ) : (
                          <><ArrowDownRight className="w-3 h-3 mr-0.5" />S</>
                        )}
                      </span>
                      {t.comentario && (
                        <span className="text-[10px] text-text-muted max-w-[60px] truncate" title={t.comentario}>
                          {t.comentario}
                        </span>
                      )}
                      {t.operando === false && (
                        <span className="text-[9px] text-text-muted bg-bg-hover px-1 rounded" title="Não operando">👁</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-text-secondary v-usd">
                    {fmtPrice(t.precoEntrada)}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-mono v-usd ${exit.live ? 'text-accent-gold' : ''}`}>
                    {exit.value}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-mono font-semibold ${
                    t.pnlPercent == null ? '' : t.pnlPercent >= 0 ? 'positive' : 'negative'
                  }`}>
                    {fmtPct(t.pnlPercent)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-text-secondary v-usd">
                    {fmtUSD(t.aporte)}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-mono font-semibold v-usd ${
                    t.resultado == null ? '' : t.resultado >= 0 ? 'positive' : 'negative'
                  }`}>
                    {fmtUSD(t.resultado)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-text-muted">
                    {t.duracao ?? '—'}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`text-xs font-medium ${
                      t.status === 'Aberta' ? 'text-accent-gold' : 'text-text-muted'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-accent-blue transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-accent-red transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-3 mt-1 px-2 pb-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:bg-bg-hover"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-text-muted text-xs">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:bg-bg-hover"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
