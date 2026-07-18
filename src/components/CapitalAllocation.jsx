import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import { buildCapitalTimeline, fmtUSD } from '../utils/calculations'
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

export default function CapitalAllocation({ allTrades, openPositions }) {
  const { timeline, peakCapital } = buildCapitalTimeline(allTrades)

  // Capital atualmente alocado (posições abertas)
  const currentCapital = openPositions.reduce((sum, t) => sum + (t.aporte || 0), 0)

  // Posições abertas por categoria
  const byCat = {}
  for (const t of openPositions) {
    const cat = Object.entries(allTrades.reduce((acc, tr) => acc, {}))
    // Simples: contar aporte por nome de categoria
  }

  const chartData = timeline.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Capital em Aberto"
          value={fmtUSD(currentCapital)}
          icon={DollarSign}
        />
        <StatCard
          label="Pico Histórico"
          value={fmtUSD(peakCapital)}
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

      {/* Capital over time */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Capital Alocado ao Longo do Tempo</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
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
            <ReferenceLine y={peakCapital} stroke="#f0b90b" strokeDasharray="5 5" />
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
          Linha dourada = pico histórico ({fmtUSD(peakCapital)})
        </p>
      </div>
    </div>
  )
}
