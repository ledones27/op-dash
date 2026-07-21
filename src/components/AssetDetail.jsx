import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, DollarSign, Target, Clock } from 'lucide-react'
import { calcUnrealizedPnl, calcUnrealizedResult, fmtUSD, fmtPct, fmtPrice, fmtDate, parseLocalDate } from '../utils/calculations'
import AssetLogo, { getAssetName } from './AssetLogo'

const tooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: 8,
    fontSize: 12,
    color: '#eaecef',
  },
}

export default function AssetDetail({ ticker, trades, prices, onBack }) {
  // Filtrar trades deste ativo
  const assetTrades = useMemo(() =>
    trades
      .filter(t => t.ativo === ticker)
      .sort((a, b) => (a.dataEntrada || '').localeCompare(b.dataEntrada || '')),
    [trades, ticker]
  )

  const categoria = assetTrades[0]?.categoria || ''
  const currentPrice = prices[ticker]

  // Nome da empresa (pode carregar com delay do cache Finnhub)
  const [assetName, setAssetName] = useState(getAssetName(ticker))
  useEffect(() => {
    if (assetName) return
    const interval = setInterval(() => {
      const name = getAssetName(ticker)
      if (name) { setAssetName(name); clearInterval(interval) }
    }, 500)
    return () => clearInterval(interval)
  }, [ticker, assetName])

  // Separar abertas e fechadas
  const openTrades = assetTrades.filter(t => t.status === 'Aberta')
  const closedTrades = assetTrades.filter(t => t.status === 'Fechada')

  // Stats gerais
  const stats = useMemo(() => {
    const totalTrades = closedTrades.length
    const wins = closedTrades.filter(t => (t.resultado || 0) > 0).length
    const losses = closedTrades.filter(t => (t.resultado || 0) < 0).length
    const winRate = totalTrades > 0 ? wins / totalTrades : 0
    const totalResult = closedTrades.reduce((s, t) => s + (t.resultado || 0), 0)
    const totalAporte = closedTrades.reduce((s, t) => s + (t.aporte || 0), 0)
    const avgDuration = totalTrades > 0
      ? closedTrades.reduce((s, t) => s + (t.duracao || 0), 0) / totalTrades
      : 0

    // Capital aberto
    const openCapital = openTrades.reduce((s, t) => s + (t.aporte || 0), 0)
    const unrealizedTotal = openTrades.reduce((s, t) => {
      const r = calcUnrealizedResult(t, currentPrice)
      return s + (r || 0)
    }, 0)

    return {
      totalTrades, wins, losses, winRate,
      totalResult, totalAporte, avgDuration,
      openCapital, unrealizedTotal, openCount: openTrades.length,
    }
  }, [closedTrades, openTrades, currentPrice])

  // Equity curve do ativo
  const equityData = useMemo(() => {
    let cum = 0
    return closedTrades
      .filter(t => t.dataSaida && t.resultado != null)
      .sort((a, b) => a.dataSaida.localeCompare(b.dataSaida))
      .map(t => {
        cum += t.resultado
        return {
          date: t.dataSaida,
          label: fmtDate(t.dataSaida, { day: '2-digit', month: 'short' }),
          resultado: t.resultado,
          acumulado: Math.round(cum * 100) / 100,
        }
      })
  }, [closedTrades])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AssetLogo ticker={ticker} categoria={categoria} size={40} />
          <div>
            <h2 className="text-xl font-bold font-mono">{ticker}</h2>
            {assetName && <p className="text-sm text-text-secondary">{assetName}</p>}
            <span className="text-xs text-text-muted">{categoria}</span>
          </div>
          {currentPrice != null && (
            <div className="ml-auto text-right">
              <p className="text-lg font-mono font-bold text-accent-gold v-usd">{fmtPrice(currentPrice)}</p>
              <span className="text-xs text-text-muted">Preço atual</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <DollarSign className="w-4 h-4 text-accent-gold mx-auto mb-1" />
          <p className={`stat-value text-lg v-usd ${stats.totalResult >= 0 ? 'positive' : 'negative'}`}>
            {fmtUSD(stats.totalResult)}
          </p>
          <span className="stat-label">Resultado Total</span>
        </div>
        <div className="card text-center">
          <Target className="w-4 h-4 text-accent-blue mx-auto mb-1" />
          <p className="stat-value text-lg">{fmtPct(stats.winRate)}</p>
          <span className="stat-label">Win Rate ({stats.wins}W / {stats.losses}L)</span>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-4 h-4 text-accent-green mx-auto mb-1" />
          <p className={`stat-value text-lg v-usd ${stats.unrealizedTotal >= 0 ? 'positive' : 'negative'}`}>
            {stats.openCount > 0 ? fmtUSD(stats.unrealizedTotal) : '—'}
          </p>
          <span className="stat-label">PnL Aberto ({stats.openCount} pos.)</span>
        </div>
        <div className="card text-center">
          <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="stat-value text-lg">{Math.round(stats.avgDuration)}d</p>
          <span className="stat-label">Duração Média</span>
        </div>
      </div>

      {/* Equity Curve do ativo */}
      {equityData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-secondary">Resultado Acumulado — {ticker}</h3>
            <span className={`stat-value text-lg v-usd ${equityData.at(-1)?.acumulado >= 0 ? 'positive' : 'negative'}`}>
              {fmtUSD(equityData.at(-1)?.acumulado)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="gradAsset" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ecb81" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ecb81" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis dataKey="label" tick={{ fill: '#848e9c', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={v => fmtUSD(v)} />
              <Area type="monotone" dataKey="acumulado" stroke="#0ecb81" strokeWidth={2} fill="url(#gradAsset)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resultado por trade */}
      {equityData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Resultado por Trade</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={equityData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis dataKey="label" tick={{ fill: '#848e9c', fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#848e9c', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={v => fmtUSD(v)} />
              <Bar dataKey="resultado" radius={[2, 2, 0, 0]}>
                {equityData.map((e, i) => (
                  <Cell key={i} fill={e.resultado >= 0 ? '#0ecb81' : '#f6465d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Posições abertas */}
      {openTrades.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Posições Abertas</h3>
          <div className="space-y-2">
            {openTrades.map((t, i) => {
              const pnl = calcUnrealizedPnl(t, currentPrice)
              const result = calcUnrealizedResult(t, currentPrice)
              const days = t.dataEntrada
                ? Math.floor((Date.now() - parseLocalDate(t.dataEntrada).getTime()) / 86400000)
                : 0
              return (
                <div key={t.id || i} className="rounded-lg px-4 py-3 bg-bg-primary border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={t.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                        {t.operacao === 'LONG' ? <><ArrowUpRight className="w-3 h-3 mr-0.5" />LONG</> : <><ArrowDownRight className="w-3 h-3 mr-0.5" />SHORT</>}
                      </span>
                      <span className="text-xs text-text-muted font-mono">{t.dataEntrada}</span>
                    </div>
                    <span className="text-xs text-text-muted">{days}d</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-text-muted v-usd">
                      <span className="font-mono">{fmtPrice(t.precoEntrada)}</span>
                      <span className="mx-1">→</span>
                      {currentPrice ? (
                        <span className="font-mono text-accent-gold">{fmtPrice(currentPrice)}</span>
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin text-text-muted inline" />
                      )}
                    </span>
                    <div className="text-right">
                      <span className={`font-mono font-semibold ${pnl == null ? 'text-text-muted' : pnl >= 0 ? 'positive' : 'negative'}`}>
                        {fmtPct(pnl)}
                      </span>
                      {result != null && (
                        <span className={`ml-2 font-mono text-xs v-usd ${result >= 0 ? 'positive' : 'negative'}`}>
                          ({fmtUSD(result)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted mt-1 v-usd">Aporte: <span className="font-mono">{fmtUSD(t.aporte)}</span></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Histórico de trades fechados */}
      {closedTrades.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Histórico de Trades Fechados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs uppercase border-b border-border">
                  <th className="text-left py-2 pr-2">Entrada</th>
                  <th className="text-left py-2 px-2">Saída</th>
                  <th className="text-center py-2 px-2">Op.</th>
                  <th className="text-right py-2 px-2">Preço Ent.</th>
                  <th className="text-right py-2 px-2">Preço Saída</th>
                  <th className="text-right py-2 px-2">PnL %</th>
                  <th className="text-right py-2 px-2">Aporte</th>
                  <th className="text-right py-2 px-2">Resultado</th>
                  <th className="text-right py-2 pl-2">Dias</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades
                  .sort((a, b) => (b.dataSaida || '').localeCompare(a.dataSaida || ''))
                  .map((t, i) => (
                    <tr key={t.id || i} className="border-b border-border/30 hover:bg-bg-hover/20">
                      <td className="py-2 pr-2 text-text-secondary text-xs font-mono">
                        {fmtDate(t.dataEntrada)}
                      </td>
                      <td className="py-2 px-2 text-text-secondary text-xs font-mono">
                        {fmtDate(t.dataSaida)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={t.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
                          {t.operacao === 'LONG' ? 'L' : 'S'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary v-usd">{fmtPrice(t.precoEntrada)}</td>
                      <td className="py-2 px-2 text-right font-mono v-usd">{fmtPrice(t.precoSaida)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-semibold ${(t.pnlPercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {fmtPct(t.pnlPercent)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary v-usd">{fmtUSD(t.aporte)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-semibold v-usd ${(t.resultado || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {fmtUSD(t.resultado)}
                      </td>
                      <td className="py-2 pl-2 text-right font-mono text-text-muted">{t.duracao ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {assetTrades.length === 0 && (
        <div className="card text-text-muted text-center py-12">Nenhum trade encontrado para {ticker}.</div>
      )}
    </div>
  )
}
