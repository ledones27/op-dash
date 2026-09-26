import { useState, useMemo, useRef, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Filter, Plus, Download, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
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

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function TradeHistory({ trades, onEdit, onDelete, onNew, onExport, prices, onViewAsset }) {
  const hasActions = !!(onEdit || onDelete)
  const columns = hasActions ? COLUMNS : COLUMNS.filter(c => c.key !== '_actions')
  const [catFilter, setCatFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exitMonth, setExitMonth] = useState('')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const periodRef = useRef(null)
  const [corretoraFilter, setCorretoraFilter] = useState(new Set())
  const [operandoOnly, setOperandoOnly] = useState(false)
  const [sortKey, setSortKey] = useState('dataEntrada')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!periodOpen) return
    const handleClick = (e) => {
      if (!periodRef.current?.contains(e.target)) {
        setPeriodOpen(false)
        setMonthPickerOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPeriodOpen(false)
        setMonthPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [periodOpen])

  const exitMonthAsDate = exitMonth ? new Date(exitMonth + '-15T12:00:00') : null
  const hasEntryPeriod = !!(dateFrom || dateTo)
  const hasPeriodFilter = hasEntryPeriod || !!exitMonth
  const shortDate = (value) => value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(2, 4)}` : '…'
  const periodLabel = hasEntryPeriod && exitMonth
    ? 'Entrada + saída'
    : hasEntryPeriod
      ? `Entrada: ${shortDate(dateFrom)}–${shortDate(dateTo)}`
      : exitMonth
        ? `Saída: ${MONTH_NAMES[Number(exitMonth.slice(5, 7)) - 1]}/${exitMonth.slice(0, 4)}`
        : 'Período'

  const handleMonthSelect = (date) => {
    if (!date) { setExitMonth(''); setPage(1); setMonthPickerOpen(false); return }
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    setExitMonth(`${y}-${m}`)
    setPage(1)
    setMonthPickerOpen(false)
  }

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
    if (exitMonth) result = result.filter(t => t.dataSaida && t.dataSaida.startsWith(exitMonth))
    if (corretoraFilter.size > 0) result = result.filter(t => corretoraFilter.has(t.corretora))
    if (operandoOnly) result = result.filter(t => t.operando === true)
    result.sort((a, b) => {
      const cmp = compareValues(a, b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [trades, catFilter, statusFilter, dateFrom, dateTo, exitMonth, corretoraFilter, operandoOnly, sortKey, sortDir])

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
      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-3">
          <h2 className="text-sm font-semibold text-text-primary">Histórico</h2>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <span className="text-text-muted text-xs mr-1">{filtered.length} {filtered.length === 1 ? 'trade' : 'trades'}</span>
            {onExport && (
              <button
                onClick={() => onExport(filtered, { catFilter, statusFilter, dateFrom, dateTo, exitMonth })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
                title="Exportar trades filtrados para Excel"
              >
                <Download className="w-3 h-3" /> Exportar
              </button>
            )}
            {onNew && (
              <button
                onClick={onNew}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 transition-colors"
              >
                <Plus className="w-3 h-3" /> Novo
              </button>
            )}
          </div>
        </div>
        {/* Categoria e status */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1">
            <Filter className="w-4 h-4 text-text-muted mr-1 shrink-0" />
            <span className="text-[11px] text-text-muted mr-1">Categoria</span>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { setCatFilter(c); setPage(1) }}
                aria-pressed={catFilter === c}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  catFilter === c
                    ? 'bg-accent-gold/15 text-accent-gold'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-border hidden lg:inline">|</span>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-text-muted mr-1">Status</span>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                aria-pressed={statusFilter === s}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-accent-blue/15 text-accent-blue'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {s === 'Todos' ? 'Todos' : s === 'Fechada' ? 'Fechados' : 'Abertos'}
              </button>
            ))}
          </div>
        </div>
        {/* Corretoras, Operando e período */}
        <div className="flex flex-wrap items-center gap-1 border-t border-border/50 pt-3">
          <span className="text-[11px] text-text-muted mr-1">Corretora</span>
          {[
            { name: 'Quantfury', active: 'bg-emerald-500/15 text-emerald-400' },
            { name: 'Hyperliquid', active: 'bg-white/10 text-white' },
            { name: 'Binance', active: 'bg-yellow-500/15 text-yellow-400' },
            { name: 'Outra', active: 'bg-gray-500/15 text-gray-400' },
          ].map(b => (
            <button
              key={b.name}
              onClick={() => { setCorretoraFilter(prev => { const next = new Set(prev); if (next.has(b.name)) next.delete(b.name); else next.add(b.name); return next }); setPage(1) }}
              aria-pressed={corretoraFilter.has(b.name)}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                corretoraFilter.has(b.name)
                  ? b.active
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {b.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setOperandoOnly(v => !v); setPage(1) }}
            aria-pressed={operandoOnly}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              operandoOnly
                ? 'bg-accent-gold/15 text-accent-gold'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            Operando
          </button>
          <div className="relative ml-auto" ref={periodRef}>
            <button
              type="button"
              onClick={() => { setPeriodOpen(v => !v); setMonthPickerOpen(false) }}
              aria-expanded={periodOpen}
              aria-controls="history-period-panel"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                hasPeriodFilter
                  ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/40'
                  : 'bg-bg-primary text-text-secondary border-border hover:bg-bg-hover'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {periodLabel}
              <ChevronDown className={`w-3 h-3 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
            </button>
            {periodOpen && (
              <div
                id="history-period-panel"
                className="absolute right-0 top-full mt-2 z-50 bg-bg-card border border-border rounded-xl shadow-xl p-4"
                style={{ width: 'min(380px, calc(100vw - 48px))' }}
              >
                <div className="text-xs font-semibold text-text-primary mb-2">Data de entrada</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-text-muted min-w-0">
                    De
                    <DateInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1) }} placeholder="Início" />
                  </label>
                  <label className="text-[11px] text-text-muted min-w-0">
                    Até
                    <DateInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1) }} placeholder="Fim" />
                  </label>
                </div>
                <div className="border-t border-border/50 mt-4 pt-3">
                  <div className="text-xs font-semibold text-text-primary mb-2">Mês de saída</div>
                  <button
                    type="button"
                    onClick={() => setMonthPickerOpen(v => !v)}
                    aria-expanded={monthPickerOpen}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${
                      exitMonth
                        ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/40'
                        : 'bg-bg-primary text-text-secondary border-border hover:bg-bg-hover'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    {exitMonth
                      ? `${MONTH_NAMES[Number(exitMonth.slice(5, 7)) - 1]} ${exitMonth.slice(0, 4)}`
                      : 'Selecionar mês'
                    }
                  </button>
                  {monthPickerOpen && (
                    <div className="mt-2 bg-bg-card border border-border rounded-xl p-2">
                      <DatePicker
                        inline
                        selected={exitMonthAsDate}
                        onChange={handleMonthSelect}
                        showMonthYearPicker
                        dateFormat="MM/yyyy"
                        calendarClassName="op-calendar"
                      />
                    </div>
                  )}
                </div>
                {hasPeriodFilter && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(''); setDateTo(''); setExitMonth(''); setMonthPickerOpen(false); setPage(1) }}
                    className="mt-4 text-xs text-text-muted hover:text-accent-red transition-colors"
                  >
                    Limpar filtros de data
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-border">
              {columns.map(col => {
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
                  <td className="py-2.5 px-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={t.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                        {t.operacao === 'LONG' ? (
                          <><ArrowUpRight className="w-3 h-3 mr-0.5" />L</>
                        ) : (
                          <><ArrowDownRight className="w-3 h-3 mr-0.5" />S</>
                        )}
                      </span>
                      {t.operando && (
                        <img src="/check-operando.png" alt="Operando" className="w-3.5 h-3.5" title="Operando" />
                      )}
                      {t.corretora && (
                        <span className={`text-xs font-bold ${
                          t.corretora === 'Quantfury' ? 'text-emerald-400' :
                          t.corretora === 'Binance' ? 'text-yellow-400' :
                          'text-white'
                        }`} title={t.corretora}>{t.corretora[0]}</span>
                      )}
                      {t.comentario && (
                        <span className="text-text-muted cursor-help" title={t.comentario}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-text-secondary">
                    {fmtPrice(t.precoEntrada)}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-mono ${exit.live ? 'text-accent-gold' : ''}`}>
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
                  {(onEdit || onDelete) && (
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                      <button
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-accent-blue transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      )}
                      {onDelete && (
                      <button
                        onClick={() => onDelete(t)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-accent-red transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      )}
                    </div>
                  </td>
                  )}
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
