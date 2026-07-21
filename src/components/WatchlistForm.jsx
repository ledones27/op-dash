import { useState, useEffect } from 'react'
import Modal from './Modal'
import TickerSearch from './TickerSearch'

const CATEGORIES = ['Ações', 'Cripto', 'Commodities', 'Índices']

export default function WatchlistForm({ open, onClose, onSave, editItem }) {
  const [categoria, setCategoria] = useState('Ações')
  const [ativo, setAtivo] = useState('')
  const [operacao, setOperacao] = useState('')
  const [operando, setOperando] = useState(true)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!editItem

  useEffect(() => {
    if (editItem) {
      setCategoria(editItem.categoria || 'Ações')
      setAtivo(editItem.ativo || '')
      setOperacao(editItem.operacao || '')
      setOperando(editItem.operando ?? true)
      setComentario(editItem.comentario || '')
    } else {
      setCategoria('Ações')
      setAtivo('')
      setOperacao('')
      setOperando(true)
      setComentario('')
    }
    setError('')
  }, [editItem, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ativo.trim()) return setError('Ativo é obrigatório')

    setSaving(true)
    setError('')
    try {
      await onSave({
        ...(isEditing && { id: editItem.id, oldCategoria: editItem.categoria }),
        categoria,
        ativo: ativo.toUpperCase().trim(),
        operacao: operacao || null,
        operando,
        comentario: comentario.trim() || null,
      })
      setAtivo('')
      setOperacao('')
      setComentario('')
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
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar Item' : 'Adicionar à Watchlist'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputClass}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Ativo (ticker)</label>
          <TickerSearch value={ativo} onChange={setAtivo} categoria={categoria} autoFocus />
        </div>

        <div>
          <label className={labelClass}>Direção (opcional)</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setOperacao(operacao === 'LONG' ? '' : 'LONG')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                operacao === 'LONG' ? 'bg-accent-green/20 text-accent-green border border-accent-green/40' : 'bg-bg-primary border border-border text-text-secondary'}`}>
              LONG
            </button>
            <button type="button" onClick={() => setOperacao(operacao === 'SHORT' ? '' : 'SHORT')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                operacao === 'SHORT' ? 'bg-accent-red/20 text-accent-red border border-accent-red/40' : 'bg-bg-primary border border-border text-text-secondary'}`}>
              SHORT
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Comentário (opcional)</label>
          <input type="text" value={comentario} onChange={e => setComentario(e.target.value)}
            placeholder="Ex: Aguardando pullback" className={inputClass} />
        </div>

        {error && <p className="text-accent-red text-sm bg-accent-red/10 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition-colors">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-accent-gold text-bg-primary hover:bg-accent-gold/90 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
