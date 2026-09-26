import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, onAfterClose, title, children, wide, mobileFullScreen = false, flat = false }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const afterCloseRef = useRef(onAfterClose)
  afterCloseRef.current = onAfterClose
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const modalId = `modal-${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.history.pushState({ ...window.history.state, modalId }, '')
    const handleBack = () => {
      if (window.history.state?.modalId !== modalId) closeRef.current()
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') closeRef.current()
    }
    window.addEventListener('popstate', handleBack)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('popstate', handleBack)
      window.removeEventListener('keydown', handleKey)
      if (window.history.state?.modalId === modalId) {
        if (afterCloseRef.current) {
          window.addEventListener('popstate', () => afterCloseRef.current?.(), { once: true })
        }
        window.history.back()
      } else {
        afterCloseRef.current?.()
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div style={{ margin: 0 }} className={`fixed inset-0 z-[100] flex items-center justify-center ${mobileFullScreen ? 'p-0 sm:p-4' : 'p-4'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className={`${flat ? 'flat-form-dialog' : ''} relative bg-bg-card shadow-2xl w-full flex flex-col overflow-hidden ${mobileFullScreen
        ? `h-dvh max-h-dvh max-w-none rounded-none border-0 sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border sm:border-border ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`
        : `max-h-[90vh] rounded-xl border border-border ${wide ? 'max-w-2xl' : 'max-w-md'}`}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className={`min-h-0 overflow-y-auto px-5 py-4 ${mobileFullScreen ? 'flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
