import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, destructive }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirmar'}>
      <div className="text-center mb-5">
        <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
          destructive ? 'bg-accent-red/15' : 'bg-accent-gold/15'
        }`}>
          <AlertTriangle className={`w-6 h-6 ${destructive ? 'text-accent-red' : 'text-accent-gold'}`} />
        </div>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            destructive
              ? 'bg-accent-red/20 text-accent-red hover:bg-accent-red/30'
              : 'bg-accent-gold text-bg-primary hover:bg-accent-gold/90'
          }`}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  )
}
