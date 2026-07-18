import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from 'recharts'
import { Target, TrendingUp, DollarSign, Clock, Award, Percent } from 'lucide-react'
import StatCard from './StatCard'
import { fmtUSD, fmtPct } from '../utils/calculations'

const COLORS = {
  'Ações': '#1e80ff',
  'Cripto': '#f0b90b',
  'Commodities': '#0ecb81',
  'Índices': '#a855f7',
}

const tooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: 8,
    fontSize: 12,
    color: '#eaecef',
  },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
}

export default function Overview({ resultados, openPositions, prices }) {
  if (!resultados) return null

  const total = resultados.find(r => r.categoria === 'TOTAL')
  const categories = resultados.filter(r => r.categoria !== 'TOTAL')

  // Stats top-level
  const stats = [
    {
      label: 'Resultado Total',
      value: fmtUSD(total?.resultadoTotal),
      colorClass: total?.resultadoTotal >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      isUsd: true,
    },
    {
      label: 'Win Rate',
      value: fmtPct(total?.winRate),
      sub: `${total?.vitorias}V / ${total?.derrotas}D`,
      colorClass: 'text-accent-gold',
      icon: Target,
    },
    {
      label: 'Profit Factor',
      value: total?.profitFactor?.toFixed(2) ?? '—',
      colorClass: 'text-accent-blue',
      icon: TrendingUp,
    },
    {
      label: 'Expectância',
      value: fmtUSD(total?.expectancia),
      sub: 'por trade',
      icon: Award,
      isUsd: true,
    },
    {
      label: 'Capital Alocado',
      value: fmtUSD(total?.capitalAlocado),
      sub: `${total?.tradesFechados + total?.tradesAbertos} trades total`,
      icon: DollarSign,
      isUsd: true,
    },
    {
      label: 'Duração Média',
      value: `${Math.round(total?.duracaoMedia ?? 0)}d`,
      icon: Clock,
    },
  ]

  // Win Rate por categoria (bar chart)
  const winRateData = categories.map(c => ({
    name: c.categoria,
    winRate: Math.round((c.winRate ?? 0) * 100),
    fill: COLORS[c.categoria] || '#666',
  }))

  // Alocação de capital (pie)
  const allocationData = categories
    .filter(c => c.capitalAlocado > 0)
    .map(c => ({
      name: c.categoria,
      value: c.capitalAlocado,
      fill: COLORS[c.categoria],
    }))

  // Resultado por categoria (bar)
  const resultData = categories.map(c => ({
    name: c.categoria,
    resultado: Math.round((c.resultadoTotal ?? 0) * 100) / 100,
    fill: COLORS[c.categoria],
  }))

  // Payoff e Profit Factor por categoria
  const pfData = categories
    .filter(c => c.profitFactor != null)
    .map(c => ({
      name: c.categoria,
      profitFactor: Math.round((c.profitFactor ?? 0) * 100) / 100,
      payoff: Math.round((c.payoffRatio ?? 0) * 100) / 100,
    }))

  return (
    <div className="space-y-6">
      {/* Stat cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Win Rate por categoria */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Win Rate por Categoria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={winRateData} layout="vertical" barSize={20}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#eaecef', fontSize: 12 }} width={90} />
              <Tooltip {...tooltipStyle} formatter={v => `${v}%`} />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {winRateData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Capital allocation */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Alocação de Capital</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {allocationData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={v => fmtUSD(v)} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#848e9c' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Resultado por categoria */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Resultado por Categoria ($)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resultData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: '#848e9c', fontSize: 11 }} />
              <YAxis tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={v => fmtUSD(v)} />
              <Bar dataKey="resultado" radius={[4, 4, 0, 0]}>
                {resultData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de resultados detalhada */}
      <div className="card overflow-x-auto">
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Resumo por Categoria</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-border">
              <th className="text-left py-3 pr-4">Categoria</th>
              <th className="text-right py-3 px-2">Fechados</th>
              <th className="text-right py-3 px-2">Abertos</th>
              <th className="text-center py-3 px-2">V / D</th>
              <th className="text-right py-3 px-2">Win Rate</th>
              <th className="text-right py-3 px-2">Méd. Ganho</th>
              <th className="text-right py-3 px-2">Méd. Perda</th>
              <th className="text-right py-3 px-2">Payoff</th>
              <th className="text-right py-3 px-2">PF</th>
              <th className="text-right py-3 px-2">Resultado</th>
              <th className="text-right py-3 px-2">Capital</th>
              <th className="text-right py-3 px-2">ROI</th>
              <th className="text-right py-3 px-2">Expectância</th>
              <th className="text-right py-3 pl-2">Duração Méd.</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r, i) => {
              const isTotal = r.categoria === 'TOTAL'
              return (
                <tr
                  key={i}
                  className={`border-b border-border/50 ${isTotal ? 'font-semibold bg-bg-hover/30' : 'hover:bg-bg-hover/20'}`}
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      {!isTotal && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: COLORS[r.categoria] }}
                        />
                      )}
                      {r.categoria}
                    </span>
                  </td>
                  <td className="text-right py-3 px-2 font-mono">{r.tradesFechados}</td>
                  <td className="text-right py-3 px-2 font-mono">{r.tradesAbertos}</td>
                  <td className="text-center py-3 px-2 font-mono">
                    <span className="positive">{r.vitorias}</span>
                    <span className="text-text-muted"> / </span>
                    <span className="negative">{r.derrotas}</span>
                  </td>
                  <td className="text-right py-3 px-2 font-mono">{fmtPct(r.winRate)}</td>
                  <td className="text-right py-3 px-2 font-mono positive">{fmtPct(r.mediaGanho)}</td>
                  <td className="text-right py-3 px-2 font-mono negative">{fmtPct(r.mediaPerda)}</td>
                  <td className="text-right py-3 px-2 font-mono">{r.payoffRatio?.toFixed(2) ?? '—'}</td>
                  <td className="text-right py-3 px-2 font-mono text-accent-blue">{r.profitFactor?.toFixed(2) ?? '—'}</td>
                  <td className={`text-right py-3 px-2 font-mono v-usd ${r.resultadoTotal >= 0 ? 'positive' : 'negative'}`}>
                    {fmtUSD(r.resultadoTotal)}
                  </td>
                  <td className="text-right py-3 px-2 font-mono v-usd">{fmtUSD(r.capitalAlocado)}</td>
                  <td className="text-right py-3 px-2 font-mono">{fmtPct(r.roi)}</td>
                  <td className="text-right py-3 px-2 font-mono v-usd">{fmtUSD(r.expectancia)}</td>
                  <td className="text-right py-3 pl-2 font-mono">
                    {r.duracaoMedia != null ? `${Math.round(r.duracaoMedia)}d` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
