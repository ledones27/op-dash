import { useState, useEffect } from 'react'
import Modal from './Modal'
import DateInput from './DateInput'
import TickerSearch from './TickerSearch'

const CATEGORIES = ['Ações', 'Cripto', 'Commodities', 'Índices']

const emptyForm = {
  categoria: 'Ações',
  dataEntrada: '',
  ativo: '',
  precoEntrada: '',
  operacao: 'LONG',
  aporte: '',
  dataSaida: '',
  precoSaida: '',
  operando: false,
  comentario: '',
}

export default function TradeForm({ open, onClose, onSave, editTrade }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showExit, setShowExit] = useState(false)

  const isEdit = !!editTrade

  useEffect(() => {
    if (editTrade) {
      setForm({
        categoria: editTrade.categoria || 'Ações',
        dataEntrada: editTrade.dataEntrada || '',
        ativo: editTrade.ativo || '',
        precoEntrada: editTrade.precoEntrada ?? '',
        operacao: editTrade.operacao || 'LONG',
        aporte: editTrade.aporte ?? '',
        dataSaida: editTrade.dataSaida || '',
        precoSaida: editTrade.precoSaida ?? '',
        operando: editTrade.operando ?? false,
        comentario: editTrade.comentario || '',
      })
      setShowExit(!!(editTrade.dataSaida || editTrade.precoSaida))
    } else {
      setForm({ ...emptyForm, dataEntrada: new Date().toISOString().split('T')[0] })
      setShowExit(false)
    }
    setError('')
  }, [editTrade, open])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.ativo.trim()) return setError('Ativo é obrigatório')
    if (!form.dataEntrada) return setError('Data de entrada é obrigatória')
    if (!form.precoEntrada || Number(form.precoEntrada) <= 0) return setError('Preço de entrada inválido')
    if (!form.aporte || Number(form.aporte) <= 0) return setError('Aporte é obrigatório')

    if (showExit) {
      if (form.dataSaida && !form.precoSaida) return setError('Preço de saída é obrigatório quando há data de saída')
      if (form.precoSaida && !form.dataSaida) return setError('Data de saída é obrigatória quando há preço de saída')
    }

    setSaving(true)
    try {
      const payload = {
        ...(isEdit ? { id: editTrade.id } : {}),
        categoria: form.categoria,
        dataEntrada: form.dataEntrada,
        ativo: form.ativo.toUpperCase().trim(),
        precoEntrada: Number(form.precoEntrada),
        operacao: form.operacao,
        aporte: Number(form.aporte),
        operando: form.operando,
        comentario: form.comentario.trim() || null,
      }

      if (showExit && form.dataSaida && form.precoSaida) {
        payload.dataSaida = form.dataSaida
        payload.precoSaida = Number(form.precoSaida)
      } else if (showExit === false && isEdit) {
        // If user collapsed exit section while editing, clear exit data
        payload.dataSaida = null
        payload.precoSaida = null
      }

      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors text-sm'
  const labelClass = 'block text-xs text-text-secondary font-medium mb-1.5'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Entrada' : 'Novo Trade'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Categoria + Operação */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Categoria</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)} className={inputClass}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Operação</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set('operacao', 'LONG')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  form.operacao === 'LONG'
                    ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                    : 'bg-bg-primary border border-border text-text-secondary hover:border-accent-green/30'
                }`}
              >
                LONG
              </button>
              <button
                type="button"
                onClick={() => set('operacao', 'SHORT')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  form.operacao === 'SHORT'
                    ? 'bg-accent-red/20 text-accent-red border border-accent-red/40'
                    : 'bg-bg-primary border border-border text-text-secondary hover:border-accent-red/30'
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Ativo + Aporte */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Ativo (ticker)</label>
            <TickerSearch
              value={form.ativo}
              onChange={v => set('ativo', v)}
              categoria={form.categoria}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Aporte ($)</label>
            <input
              type="number"
              step="any"
              value={form.aporte}
              onChange={e => set('aporte', e.target.value)}
              placeholder="ex: 500"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 3: Entrada */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Data Entrada</label>
            <DateInput
              value={form.dataEntrada}
              onChange={v => set('dataEntrada', v)}
              placeholder="Selecione a data"
            />
          </div>
          <div>
            <label className={labelClass}>Preço Entrada</label>
            <input
              type="number"
              step="any"
              value={form.precoEntrada}
              onChange={e => set('precoEntrada', e.target.value)}
              placeholder="ex: 4331.00"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 4: Saída (toggle) */}
        <div>
          <button
            type="button"
            onClick={() => setShowExit(v => !v)}
            className="text-xs text-accent-gold hover:text-accent-gold/80 transition-colors"
          >
            {showExit ? '▾ Ocultar saída' : '▸ Adicionar dados de saída'}
          </button>
        </div>

        {showExit && (
          <div className="grid grid-cols-2 gap-3 border border-border/50 rounded-lg p-3 bg-bg-card/30">
            <div>
              <label className={labelClass}>Data Saída</label>
              <DateInput
                value={form.dataSaida}
                onChange={v => set('dataSaida', v)}
                placeholder="Selecione a data"
              />
            </div>
            <div>
              <label className={labelClass}>Preço Saída</label>
              <input
                type="number"
                step="any"
                value={form.precoSaida}
                onChange={e => set('precoSaida', e.target.value)}
                placeholder="ex: 4500.00"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Row 5: Operando + Comentário */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => set('operando', !form.operando)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                form.operando
                  ? 'bg-accent-gold border-accent-gold text-bg-primary'
                  : 'border-border hover:border-text-muted'
              }`}
            >
              {form.operando && <span className="text-xs font-bold">✓</span>}
            </button>
            <label className="text-sm text-text-secondary cursor-pointer" onClick={() => set('operando', !form.operando)}>
              Operando
            </label>
          </div>
        </div>

        <div>
          <label className={labelClass}>Comentário (opcional)</label>
          <input
            type="text"
            value={form.comentario}
            onChange={e => set('comentario', e.target.value)}
            placeholder="Ex: Entrada em suporte de fibo 0.618"
            className={inputClass}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-accent-red text-sm bg-accent-red/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-accent-gold text-bg-primary hover:bg-accent-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar Trade'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
