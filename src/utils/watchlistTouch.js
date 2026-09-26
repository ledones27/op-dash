// Non-passive touch listeners stop the browser's native long-press feedback.
// Since touchstart is cancelled, forward vertical drags and momentum ourselves.
export function bindWatchlistTouch(root, { onHold, onTap }) {
  let gesture = null
  let timer
  let frame
  const stop = () => { clearTimeout(timer); cancelAnimationFrame(frame) }
  const cancel = () => { stop(); gesture = null }
  const start = (event) => {
    stop()
    if (event.touches.length !== 1) { gesture = null; return }
    const card = event.target.closest('.watchlist-touch-card')
    if (!card || !root.contains(card)) return
    event.preventDefault()
    const touch = event.touches[0]
    gesture = { card, id: touch.identifier, x: touch.clientX, y: touch.clientY, lastY: touch.clientY, time: performance.now(), velocity: 0, moved: false, held: false }
    if (card.dataset.actionable === 'true') {
      timer = setTimeout(() => {
        if (!gesture || gesture.moved) return
        gesture.held = true
        onHold(card.dataset.watchKey)
      }, 500)
    }
  }
  const move = (event) => {
    if (!gesture) return
    if (event.touches.length !== 1) { cancel(); return }
    const touch = Array.from(event.touches).find(t => t.identifier === gesture.id)
    if (!touch) return
    event.preventDefault()
    const now = performance.now()
    if (Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) > 20) {
      gesture.moved = true
      clearTimeout(timer)
    }
    if (gesture.moved) {
      const delta = gesture.lastY - touch.clientY
      window.scrollBy({ top: delta, behavior: 'instant' })
      gesture.velocity = delta / Math.max(8, now - gesture.time)
    }
    gesture.lastY = touch.clientY
    gesture.time = now
  }
  const end = (event) => {
    if (!gesture) return
    event.preventDefault()
    clearTimeout(timer)
    const finished = gesture
    gesture = null
    if (!finished.moved && !finished.held) { onTap(finished.card); return }
    if (!finished.moved || performance.now() - finished.time > 100) return
    let velocity = Math.max(-2.5, Math.min(2.5, finished.velocity))
    let last = performance.now()
    const glide = (now) => {
      const elapsed = Math.min(32, now - last)
      last = now
      const before = window.scrollY
      window.scrollBy({ top: velocity * elapsed, behavior: 'instant' })
      velocity *= Math.exp(-elapsed / 180)
      if (Math.abs(velocity) > 0.02 && window.scrollY !== before) frame = requestAnimationFrame(glide)
    }
    frame = requestAnimationFrame(glide)
  }
  const context = (event) => {
    if (event.target.closest('.watchlist-touch-card')) event.preventDefault()
  }
  const options = { passive: false, capture: true }
  const handlers = { touchstart: start, touchmove: move, touchend: end, touchcancel: cancel, contextmenu: context }
  for (const [name, handler] of Object.entries(handlers)) root.addEventListener(name, handler, options)
  return () => {
    cancel()
    for (const [name, handler] of Object.entries(handlers)) root.removeEventListener(name, handler, options)
  }
}
