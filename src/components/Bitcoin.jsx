import { useState, useEffect, useMemo, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { fmtDate } from '../utils/calculations'
import { computeBtcEquity } from '../services/btcService'
import DateInput from './DateInput'
import Modal from './Modal'

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

function fmtBanca(value) {
  if (value == null) return '—'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtBancaFull(value) {
  if (value == null) return '—'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function BtcTradeForm({ open, onClose, onSave, editTrade }) {
  const [dataEntrada, setDataEntrada] = useState('')
  const [dataSaida, setDataSaida] = useState('')
  const [precoEntrada, setPrecoEntrada] = useState('')
  const [precoSaida, setPrecoSaida] = useState('')

  const isEditing = !!editTrade

  useEffect(() => {
    if (editTrade) {
      setDataEntrada(editTrade.dataEntrada || '')
      setDataSaida(editTrade.dataSaida || '')
      setPrecoEntrada(editTrade.precoEntrada?.toString() || '')
      setPrecoSaida(editTrade.precoSaida?.toString() || '')
    } else {
      setDataEntrada('')
      setDataSaida('')
      setPrecoEntrada('')
      setPrecoSaida('')
    }
  }, [editTrade, open])

  const pe = parseFloat(precoEntrada) || 0
  const ps = parseFloat(precoSaida) || 0
  const pctPreview = pe > 0 && ps > 0 ? ((ps - pe) / pe * 100) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    let percentual = editTrade?.percentual ?? 0
    if (dataSaida && pe > 0 && ps > 0) {
      percentual = Math.round(((ps - pe) / pe) * 10000) / 100
    } else if (!dataSaida) {
      percentual = 0
    }

    const data = {
      ...(editTrade ? { id: editTrade.id } : {}),
      dataEntrada,
      dataSaida: dataSaida || null,
      percentual,
      precoEntrada: pe || null,
      precoSaida: dataSaida && ps ? ps : null,
    }
    await onSave(data)
    onClose()
  }

  if (!open) return null

  const inputClass = "w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold"

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar / Fechar Trade BTC' : 'Nova Entrada BTC'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Data Entrada</label>
            <DateInput value={dataEntrada} onChange={setDataEntrada} placeholder="Entrada" />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">BTC Entrada (USD)</label>
            <input
              type="number"
              step="0.01"
              value={precoEntrada}
              onChange={e => setPrecoEntrada(e.target.value)}
              className={inputClass}
              placeholder="Ex: 97500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Data Saída</label>
            <DateInput value={dataSaida} onChange={setDataSaida} placeholder="Opcional" clearable />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">BTC Saída (USD)</label>
            <input
              type="number"
              step="0.01"
              value={precoSaida}
              onChange={e => setPrecoSaida(e.target.value)}
              className={inputClass}
              placeholder="Ex: 105000"
              disabled={!dataSaida}
            />
          </div>
        </div>
        {dataSaida && pctPreview != null && (
          <p className={`text-sm font-mono font-semibold ${pctPreview >= 0 ? 'positive' : 'negative'}`}>
            Resultado: {pctPreview >= 0 ? '+' : ''}{pctPreview.toFixed(2)}%
          </p>
        )}
        <button
          type="submit"
          disabled={!dataEntrada}
          className="w-full py-2.5 rounded-lg bg-accent-gold text-bg-primary font-semibold text-sm hover:bg-accent-gold/90 transition-colors disabled:opacity-50"
        >
          {isEditing ? 'Salvar' : dataSaida ? 'Registrar Trade' : 'Registrar Entrada'}
        </button>
      </form>
    </Modal>
  )
}

export default function Bitcoin({ btcTrades, onAdd, onEdit, onDelete, isGuest }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)
  const [scaleType, setScaleType] = useState('linear')
  const tableContainerRef = useRef(null)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [simCapital, setSimCapital] = useState('')

  const simActive = simCapital !== '' && parseFloat(simCapital) > 0
  const rangeActive = rangeFrom || rangeTo

  const computed = useMemo(() => {
    const capital = simActive ? parseFloat(simCapital) : undefined
    return computeBtcEquity(btcTrades, capital)
  }, [btcTrades, simActive, simCapital])

  const chartSource = useMemo(() => {
    if (!rangeActive) return computed
    const filtered = computed.filter(t => {
      const d = t.dataSaida || t.dataEntrada
      if (rangeFrom && d < rangeFrom) return false
      if (rangeTo && d > rangeTo) return false
      return true
    })
    return filtered
  }, [computed, rangeActive, rangeFrom, rangeTo])

  const chartData = useMemo(() =>
    chartSource.map(t => ({
      ...t,
      label: t.dataSaida ? fmtDate(t.dataSaida, { day: '2-digit', month: 'short', year: '2-digit' }) : '',
    })),
  [chartSource])

  const lastBanca = chartSource.at(-1)?.banca ?? 0

  const isLog = scaleType === 'log'
  const allBancas = chartData.map(d => d.banca)
  const minBanca = Math.min(...allBancas)
  const maxBanca = Math.max(...allBancas)

  let domainMin, domainMax
  if (isLog) {
    domainMin = Math.max(1, minBanca * 0.8)
    domainMax = maxBanca * 1.2
  } else {
    const pad = (maxBanca - minBanca) * 0.05
    domainMin = Math.max(0, minBanca - pad)
    domainMax = maxBanca + pad
  }

  const scaleButtonClass = (active) =>
    `px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-accent-gold text-bg-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
    }`

  const handleOpenNew = () => {
    setEditingTrade(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (trade) => {
    setEditingTrade(trade)
    setFormOpen(true)
  }

  const handleSave = async (data) => {
    if (data.id) {
      await onEdit(data.id, data)
    } else {
      await onAdd(data)
    }
  }

  useEffect(() => {
    const el = tableContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [computed])

  return (
    <div className="space-y-4">
      {/* Trade table */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-text-secondary">Histórico de Trades</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-muted whitespace-nowrap">Capital Inicial</label>
              <input
                type="number"
                step="0.01"
                value={simCapital}
                onChange={e => setSimCapital(e.target.value)}
                placeholder="$1.000"
                className="w-28 px-2 py-1.5 rounded-lg bg-bg-primary border border-border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold font-mono"
              />
              {simActive && (
                <button
                  onClick={() => setSimCapital('')}
                  className="text-[10px] text-text-muted hover:text-accent-red transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            {onAdd && !isGuest && (
              <button
                onClick={handleOpenNew}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 transition-colors"
              >
                <Plus className="w-3 h-3" /> Novo
              </button>
            )}
          </div>
        </div>
        <div ref={tableContainerRef} className="overflow-x-auto overflow-y-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-card z-10">
              <tr className="text-text-muted text-xs uppercase border-b border-border">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-left py-3 px-2">Entrada</th>
                <th className="text-right py-3 px-2">BTC Ent.</th>
                <th className="text-left py-3 px-2">Saída</th>
                <th className="text-right py-3 px-2">BTC Saí.</th>
                <th className="text-right py-3 px-2">%</th>
                <th className="text-right py-3 px-2">$ Inicial</th>
                <th className="text-right py-3 px-2">PnL</th>
                <th className="text-right py-3 px-2">Banca</th>
                {onEdit && <th className="text-center py-3 px-2 w-20">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {computed.map((t, i) => {
                const isOpen = !t.dataSaida
                return (
                <tr key={t.id || i} className="border-b border-border/30 hover:bg-bg-hover/20 transition-colors group">
                  <td className="py-2.5 px-2 text-text-muted font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2 text-text-secondary text-xs font-mono">{fmtDate(t.dataEntrada)}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-text-muted">
                    {t.precoEntrada ? `$${t.precoEntrada.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-text-secondary text-xs font-mono">
                    {isOpen ? <span className="text-accent-gold text-xs font-semibold">Aberta</span> : fmtDate(t.dataSaida)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-text-muted">
                    {t.precoSaida ? `$${t.precoSaida.toLocaleString()}` : '—'}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-mono font-semibold ${
                    isOpen ? 'text-text-muted' : t.percentual > 0 ? 'positive' : t.percentual < 0 ? 'negative' : 'text-text-muted'
                  }`}>
                    {isOpen ? '—' : `${t.percentual > 0 ? '+' : ''}${t.percentual.toFixed(2)}%`}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-text-secondary v-usd">{fmtBanca(t.inicial)}</td>
                  <td className={`py-2.5 px-2 text-right font-mono v-usd ${isOpen ? 'text-text-muted' : t.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {isOpen ? '—' : `${t.pnl >= 0 ? '+' : ''}${fmtBanca(t.pnl)}`}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-accent-gold v-usd">
                    {isOpen ? '—' : fmtBanca(t.banca)}
                  </td>
                  {onEdit && (
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-accent-blue transition-colors"
                          title={isOpen ? 'Fechar' : 'Editar'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
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
        </div>
      </div>

      {/* Equity Curve */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-secondary">Equity Curve — BTC</h3>
            <div className="flex gap-0.5 bg-bg-primary rounded-md p-0.5 border border-border">
              <button onClick={() => setScaleType('linear')} className={scaleButtonClass(scaleType === 'linear')}>
                Linear
              </button>
              <button onClick={() => setScaleType('log')} className={scaleButtonClass(scaleType === 'log')}>
                Log
              </button>
            </div>
          </div>
          <span className="stat-value text-lg text-accent-gold">{fmtBanca(lastBanca)}</span>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-border/40">
          <div className="flex items-end gap-2">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">De</label>
              <DateInput value={rangeFrom} onChange={setRangeFrom} placeholder="Início" clearable />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Até</label>
              <DateInput value={rangeTo} onChange={setRangeTo} placeholder="Fim" clearable />
            </div>
          </div>
          {rangeActive && (
            <button
              onClick={() => { setRangeFrom(''); setRangeTo('') }}
              className="px-3 py-2.5 text-xs text-text-muted hover:text-accent-red transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradientBtc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0b90b" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f0b90b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis dataKey="label" tick={{ fill: '#848e9c', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                scale={isLog ? 'log' : 'linear'}
                domain={[domainMin, domainMax]}
                allowDataOverflow
                tick={{ fill: '#848e9c', fontSize: 11 }}
                tickFormatter={fmtBanca}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v) => [fmtBancaFull(v), 'Banca']}
                labelFormatter={l => l}
              />
              <Area
                type="monotone"
                dataKey="banca"
                stroke="#f0b90b"
                strokeWidth={2.5}
                fill="url(#gradientBtc)"
                dot={false}
                activeDot={{ r: 4, fill: '#f0b90b' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">Nenhum trade ainda.</p>
        )}
      </div>

      <BtcTradeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTrade(null) }}
        onSave={handleSave}
        editTrade={editingTrade}
      />
    </div>
  )
}
