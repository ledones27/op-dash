import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid, ReferenceLine,
} from 'recharts'
import { buildEquityCurve, buildCapitalTimeline, fmtUSD } from '../utils/calculations'
import StatCard from './StatCard'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

const tooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: 8,
    fontSize: 12,
    color: '#eaecef',
  },
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
  return d.toISOString().slice(0, 10)
}

export default function EquityCurve({ allTrades, openPositions = [] }) {
  const [period, setPeriod] = useState('1M')

  const cutoff = useMemo(() => {
    const opt = PERIOD_OPTIONS.find(p => p.key === period)
    return getDateCutoff(opt?.days)
  }, [period])

  // Full data (unfiltered)
  const curveAll = useMemo(() => buildEquityCurve(allTrades), [allTrades])
  const capitalAll = useMemo(() => buildCapitalTimeline(allTrades), [allTrades])

  // Filtered equity curve data
  const curve = useMemo(() => {
    if (!cutoff) return curveAll
    return curveAll.filter(d => d.date >= cutoff)
  }, [curveAll, cutoff])

  // Filtered capital timeline data
  const capitalData = useMemo(() => {
    if (!cutoff) return capitalAll
    const filtered = capitalAll.timeline.filter(d => d.date >= cutoff)
    return { timeline: filtered, peakCapital: capitalAll.peakCapital }
  }, [capitalAll, cutoff])

  if (curveAll.length === 0) {
    return <div className="card text-text-muted text-center py-12">Nenhum trade fechado ainda.</div>
  }

  // Format dates for equity chart
  const chartData = curve.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }))

  // Format dates for capital chart
  const capitalChartData = capitalData.timeline.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }))

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.acumulado)) : 0
  const minVal = chartData.length > 0 ? Math.min(...chartData.map(d => d.acumulado)) : 0

  // Capital stats (always from current open positions, not filtered)
  const currentCapital = openPositions.reduce((sum, t) => sum + (t.aporte || 0), 0)

  return (
    <div className="space-y-4">
      {/* Period filter buttons */}
      <div className="flex justify-end">
        <div className="flex gap-1 bg-bg-card rounded-lg p-1 border border-border">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.key
                  ? 'bg-accent-gold text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equity Curve */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary">Resultado Acumulado</h3>
          <span className={`stat-value text-lg ${curve.at(-1)?.acumulado >= 0 ? 'positive' : 'negative'}`}>
            {fmtUSD(curve.at(-1)?.acumulado)}
          </span>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ecb81" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ecb81" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#848e9c', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#848e9c', fontSize: 11 }}
                tickFormatter={v => `$${v}`}
                domain={[Math.min(0, minVal - 50), maxVal + 50]}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, name) => name === 'acumulado' ? [fmtUSD(v), 'Acumulado'] : [fmtUSD(v), 'Trade']}
                labelFormatter={l => l}
              />
              <Area
                type="monotone"
                dataKey="acumulado"
                stroke="#0ecb81"
                strokeWidth={2}
                fill="url(#gradientGreen)"
                dot={false}
                activeDot={{ r: 4, fill: '#0ecb81' }}
              />
            </AreaChart>
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
              <YAxis tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                {...tooltipStyle}
                formatter={v => fmtUSD(v)}
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
          />
          <StatCard
            label="Pico Histórico"
            value={fmtUSD(capitalAll.peakCapital)}
            icon={TrendingUp}
            colorClass="text-accent-gold"
          />
          <StatCard
            label="Posições Abertas"
            value={openPositions.length}
            icon={AlertTriangle}
          />
          <StatCard
            label="Aporte Médio"
            value={fmtUSD(openPositions.length > 0 ? currentCapital / openPositions.length : 0)}
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
                  <YAxis tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={v => [fmtUSD(v), 'Capital']}
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
                Linha dourada = pico histórico ({fmtUSD(capitalAll.peakCapital)})
              </p>
            </>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">Sem dados neste período.</p>
          )}
        </div>
      </div>
    </div>
  )
}
