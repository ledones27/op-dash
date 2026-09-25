import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  ComposedChart, AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid, ReferenceLine, Legend,
} from 'recharts'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { buildEquityCurve, buildCapitalTimeline, fmtUSD, fmtDate, localDateString } from '../utils/calculations'
import StatCard from './StatCard'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

const CAT_COLORS = {
  acoes: '#1e80ff',
  cripto: '#f0b90b',
  commodities: '#0ecb81',
  indices: '#a855f7',
}
const CAT_LABELS = {
  acoes: 'Ações',
  cripto: 'Cripto',
  commodities: 'Commodities',
  indices: 'Índices',
}
const CAT_KEYS = Object.keys(CAT_COLORS)

const tooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: 8,
    fontSize: 12,
    color: '#eaecef',
  },
  labelStyle: { color: '#eaecef' },
  itemStyle: { color: '#eaecef' },
}

const PERIOD_OPTIONS = [
  { key: '7D', label: '7D', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'Tudo', days: null },
]

function getDateCutoff(days) {
  if (days == null) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return localDateString(d)
}

export default function EquityCurve({ allTrades, openPositions = [] }) {
  const [period, setPeriod] = useState('1M')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarRef = useRef(null)

  useEffect(() => {
    if (!calendarOpen) return
    const handleClick = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setCalendarOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [calendarOpen])
  const [scaleType, setScaleType] = useState('linear')
  const [autoScale, setAutoScale] = useState(true)
  const [showTotal, setShowTotal] = useState(true)
  const [visibleCats, setVisibleCats] = useState(new Set())
  const [corretoraFilter, setCorretoraFilter] = useState(new Set())
  const [operandoOnly, setOperandoOnly] = useState(false)

  const toggleCat = useCallback((key) => {
    setVisibleCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toDateStr = (d) => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : ''
  const toDate = (s) => s ? new Date(s + 'T12:00:00') : null

  const handleRangeChange = (dates) => {
    const [start, end] = dates
    setCustomFrom(toDateStr(start))
    setCustomTo(toDateStr(end))
    if (start && end) setCalendarOpen(false)
  }

  const isCustomPeriod = period === 'CUSTOM'

  const cutoff = useMemo(() => {
    if (isCustomPeriod) return customFrom || null
    const opt = PERIOD_OPTIONS.find(p => p.key === period)
    return getDateCutoff(opt?.days)
  }, [period, isCustomPeriod, customFrom])

  const cutoffEnd = isCustomPeriod ? customTo : null

  const matchesFilters = useCallback(t =>
    (corretoraFilter.size === 0 || corretoraFilter.has(t.corretora)) &&
    (!operandoOnly || t.operando === true),
  [corretoraFilter, operandoOnly])
  const baseTrades = useMemo(() => allTrades.filter(matchesFilters), [allTrades, matchesFilters])
  const filteredOpenPositions = useMemo(() => openPositions.filter(matchesFilters), [openPositions, matchesFilters])

  // Full data (unfiltered)
  const curveAll = useMemo(() => buildEquityCurve(baseTrades), [baseTrades])
  const capitalAll = useMemo(() => buildCapitalTimeline(baseTrades), [baseTrades])

  // Filtered equity curve data
  const curve = useMemo(() => {
    let data = curveAll
    if (cutoff) data = data.filter(d => d.date >= cutoff)
    if (cutoffEnd) data = data.filter(d => d.date <= cutoffEnd)
    return data
  }, [curveAll, cutoff, cutoffEnd])

  // Filtered capital timeline data
  const capitalData = useMemo(() => {
    let filtered = capitalAll.timeline
    if (cutoff) filtered = filtered.filter(d => d.date >= cutoff)
    if (cutoffEnd) filtered = filtered.filter(d => d.date <= cutoffEnd)
    return { timeline: filtered, peakCapital: capitalAll.peakCapital }
  }, [capitalAll, cutoff, cutoffEnd])

  const noData = curveAll.length === 0

  // Format dates for equity chart
  const chartData = curve.map(d => ({
    ...d,
    label: fmtDate(d.date, { day: '2-digit', month: 'short' }),
  }))

  // Format dates for capital chart
  const capitalChartData = capitalData.timeline.map(d => ({
    ...d,
    label: fmtDate(d.date, { day: '2-digit', month: 'short' }),
  }))

  // For log scale, shift values so minimum is positive
  const isLog = scaleType === 'log'
  const allVals = chartData.length > 0
    ? chartData.flatMap(d => {
        const vals = []
        if (showTotal) vals.push(d.acumulado)
        for (const k of CAT_KEYS) if (visibleCats.has(k)) vals.push(d[k])
        if (vals.length === 0) vals.push(d.acumulado)
        return vals
      })
    : [0]
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)

  let logOffset = 0
  let processedData = chartData
  if (isLog) {
    logOffset = rawMin <= 0 ? Math.abs(rawMin) + 1 : 0
    processedData = chartData.map(d => {
      const shifted = { ...d, acumulado: d.acumulado + logOffset }
      for (const k of CAT_KEYS) {
        shifted[k] = (d[k] || 0) + logOffset
      }
      return shifted
    })
  }

  const padding = Math.max(50, (rawMax - rawMin) * 0.05)
  let domainMin, domainMax
  if (isLog) {
    domainMin = 1
    domainMax = rawMax + logOffset + padding
  } else if (autoScale) {
    domainMin = rawMin - padding
    domainMax = rawMax + padding
  } else {
    domainMin = Math.min(0, rawMin - padding)
    domainMax = rawMax + padding
  }

  const formatYTick = (v) => {
    const real = isLog ? v - logOffset : v
    return `$${Math.round(real)}`
  }

  const formatTooltipValue = (v, name) => {
    const real = isLog ? v - logOffset : v
    const label = name === 'acumulado' ? 'Total' : (CAT_LABELS[name] || name)
    return [<span className="v-usd">{fmtUSD(real)}</span>, label]
  }

  // Capital atual das posições abertas que correspondem aos filtros ativos
  const currentCapital = filteredOpenPositions.reduce((sum, t) => sum + (t.aporte || 0), 0)

  const scaleButtonClass = (active) =>
    `px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-accent-gold text-bg-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
    }`

  return (
    <div className="space-y-4">
      {/* Period filter buttons */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1 mr-auto">
          {[
            { name: 'Quantfury', active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
            { name: 'Hyperliquid', active: 'bg-white/10 text-white border-white/30' },
            { name: 'Binance', active: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
            { name: 'Outra', active: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
          ].map(b => (
            <button
              key={b.name}
              onClick={() => setCorretoraFilter(prev => {
                const next = new Set(prev)
                if (next.has(b.name)) next.delete(b.name)
                else next.add(b.name)
                return next
              })}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors border ${
                corretoraFilter.has(b.name)
                  ? b.active
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-transparent'
              }`}
            >
              {b.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOperandoOnly(v => !v)}
            aria-pressed={operandoOnly}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors border ${
              operandoOnly
                ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-transparent'
            }`}
          >
            Operando
          </button>
        </div>
        {isCustomPeriod && customFrom && (
          <span className="text-xs text-text-muted">
            {fmtDate(customFrom, { day: '2-digit', month: 'short', year: 'numeric' })}
            {customTo && ` — ${fmtDate(customTo, { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </span>
        )}
        <div className="flex gap-1 bg-bg-card rounded-lg p-1 border border-border w-full sm:w-auto">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { setPeriod(opt.key); setCalendarOpen(false) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                period === opt.key && !isCustomPeriod
                  ? 'bg-accent-gold text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => { if (!calendarOpen) setPeriod('CUSTOM'); setCalendarOpen(v => !v) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isCustomPeriod
                  ? 'bg-accent-gold text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
              title="Período personalizado"
            >
              📅
            </button>
            {calendarOpen && (
              <div ref={calendarRef} className="absolute right-0 top-full mt-2 z-50 bg-bg-card border border-border rounded-xl shadow-lg p-3">
                <DatePicker
                  selectsRange
                  inline
                  startDate={toDate(customFrom)}
                  endDate={toDate(customTo)}
                  onChange={handleRangeChange}
                  calendarClassName="op-calendar"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={5}
                  scrollableYearDropdown
                />
                {(customFrom || customTo) && (
                  <div className="flex justify-end mt-2 pt-2 border-t border-border">
                    <button
                      onClick={() => { setCustomFrom(''); setCustomTo(''); setPeriod('1M'); setCalendarOpen(false) }}
                      className="text-xs text-text-muted hover:text-accent-red transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {noData && (
        <div className="card text-text-muted text-center py-12">Nenhum trade fechado para os filtros selecionados.</div>
      )}

      {!noData && (
      <>
      {/* Equity Curve */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-secondary">Resultado Acumulado</h3>
            <div className="flex gap-0.5 bg-bg-primary rounded-md p-0.5 border border-border">
              <button onClick={() => setScaleType('linear')} className={scaleButtonClass(scaleType === 'linear')}>
                Linear
              </button>
              <button onClick={() => setScaleType('log')} className={scaleButtonClass(scaleType === 'log')}>
                Log
              </button>
            </div>
            <button onClick={() => setAutoScale(v => !v)} className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              autoScale
                ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/40'
                : 'text-text-secondary hover:text-text-primary border-border hover:bg-bg-hover'
            }`}>
              Auto
            </button>
          </div>
          <span className={`stat-value text-lg v-usd ${curve.at(-1)?.acumulado >= 0 ? 'positive' : 'negative'}`}>
            {fmtUSD(curve.at(-1)?.acumulado)}
          </span>
        </div>

        {/* Custom legend with toggle */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={() => setShowTotal(v => !v)}
            className={`flex items-center gap-1.5 transition-opacity ${showTotal ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
          >
            <span className="w-3 h-0.5 rounded bg-white inline-block" style={{ height: 2.5 }} />
            <span className="text-xs font-medium" style={{ color: showTotal ? '#ffffff' : undefined }}>Total</span>
          </button>
          {CAT_KEYS.map(key => {
            const active = visibleCats.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleCat(key)}
                className={`flex items-center gap-1.5 transition-opacity ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              >
                <span
                  className="w-3 h-0.5 rounded inline-block"
                  style={{ backgroundColor: CAT_COLORS[key], height: 2 }}
                />
                <span className="text-xs font-medium" style={{ color: active ? CAT_COLORS[key] : undefined }}>
                  {CAT_LABELS[key]}
                </span>
              </button>
            )
          })}
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={processedData}>
              <defs>
                <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#848e9c', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                className="privacy-y-axis"
                scale={isLog ? 'log' : 'linear'}
                domain={[domainMin, domainMax]}
                allowDataOverflow
                tick={{ fill: '#848e9c', fontSize: 11 }}
                tickFormatter={formatYTick}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={formatTooltipValue}
                labelFormatter={l => l}
              />
              {showTotal && (
              <Area
                type="monotone"
                dataKey="acumulado"
                stroke="#ffffff"
                strokeWidth={2.5}
                fill="url(#gradientTotal)"
                dot={false}
                activeDot={{ r: 4, fill: '#ffffff' }}
              />
              )}
              {CAT_KEYS.map(key => (
                visibleCats.has(key) && (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CAT_COLORS[key]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: CAT_COLORS[key] }}
                  />
                )
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">Sem dados neste período.</p>
        )}
      </div>

      {/* Individual trade results bar chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Resultado por Trade (cronológico)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis dataKey="label" tick={{ fill: '#848e9c', fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis className="privacy-y-axis" tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                {...tooltipStyle}
                formatter={v => <span className="v-usd">{fmtUSD(v)}</span>}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.ativo || ''}
              />
              <Bar dataKey="resultado" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.resultado >= 0 ? '#0ecb81' : '#f6465d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">Sem dados neste período.</p>
        )}
      </div>

      {/* Capital Allocation Section */}
      <div className="border-t border-border pt-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-4">Capital Alocado</h2>

        {/* Capital Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Capital em Aberto"
            value={fmtUSD(currentCapital)}
            icon={DollarSign}
            isUsd
          />
          <StatCard
            label="Pico Histórico"
            value={fmtUSD(capitalAll.peakCapital)}
            icon={TrendingUp}
            colorClass="text-accent-gold"
            isUsd
          />
          <StatCard
            label="Posições Abertas"
            value={filteredOpenPositions.length}
            icon={AlertTriangle}
          />
          <StatCard
            label="Aporte Médio"
            value={fmtUSD(filteredOpenPositions.length > 0 ? currentCapital / filteredOpenPositions.length : 0)}
            isUsd
          />
        </div>

        {/* Capital over time chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Capital Alocado ao Longo do Tempo</h3>
          {capitalChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={capitalChartData}>
                  <defs>
                    <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e80ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1e80ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                  <XAxis dataKey="label" tick={{ fill: '#848e9c', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis className="privacy-y-axis" tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={v => [<span className="v-usd">{fmtUSD(v)}</span>, 'Capital']}
                  />
                  <ReferenceLine y={capitalAll.peakCapital} stroke="#f0b90b" strokeDasharray="5 5" />
                  <Area
                    type="stepAfter"
                    dataKey="capital"
                    stroke="#1e80ff"
                    strokeWidth={2}
                    fill="url(#gradientBlue)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-text-muted mt-2">
                Linha dourada = pico histórico (<span className="v-usd">{fmtUSD(capitalAll.peakCapital)}</span>)
              </p>
            </>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">Sem dados neste período.</p>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
