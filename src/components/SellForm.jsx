import { useState, useEffect } from 'react'
import Modal from './Modal'
import DateInput from './DateInput'
import { fmtPrice, localDateString } from '../utils/calculations'

export default function SellForm({ open, onClose, onSave, trade }) {
  const [dataSaida, setDataSaida] = useState(localDateString)
  const [precoSaida, setPrecoSaida] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setDataSaida(localDateString())
      setPrecoSaida('')
      setError('')
    }
  }, [open, trade?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!dataSaida) return setError('Data de saída é obrigatória')
    if (!precoSaida || Number(precoSaida) <= 0) return setError('Preço de saída inválido')

    setSaving(true)
    try {
      await onSave(trade.id, {
        dataSaida,
        precoSaida: Number(precoSaida),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!trade) return null

  const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors text-sm'
  const labelClass = 'block text-xs text-text-secondary font-medium mb-1.5'

  return (
    <Modal open={open} onClose={onClose} title="Fechar Posição" mobileFullScreen flat>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info do trade */}
        <div className="border-b border-border pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono font-bold">{trade.ativo}</span>
            <span className={trade.operacao === 'LONG' ? 'badge-long' : 'badge-short'}>
              {trade.operacao}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Entrada: <span className="font-mono text-text-secondary">{fmtPrice(trade.precoEntrada)}</span></span>
            <span>{trade.dataEntrada}</span>
          </div>
        </div>

        {/* Campos de saída */}
        <div>
          <label className={labelClass}>Data de Saída</label>
          <DateInput
            value={dataSaida}
            onChange={setDataSaida}
            placeholder="Selecione a data"
          />
        </div>

        <div>
          <label className={labelClass}>Preço de Saída</label>
          <input
            type="number"
            step="any"
            value={precoSaida}
            onChange={e => setPrecoSaida(e.target.value)}
            placeholder="Ex: 4500.00"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-accent-red text-sm bg-accent-red/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-accent-red text-white hover:bg-accent-red/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Fechar Posição'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
