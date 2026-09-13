import { useRef, useCallback } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar } from 'lucide-react'

export default function DateInput({ value, onChange, placeholder, autoFocus, clearable }) {
  const dateValue = value ? new Date(value + 'T12:00:00') : null
  const wrapRef = useRef(null)

  const handleChange = (date) => {
    if (!date) {
      onChange('')
      return
    }
    const y = date.getFullYear()
    if (y < 1900 || y > 2100 || isNaN(y)) return
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${d}`)
  }

  const handleKeyDown = useCallback((e) => {
    const input = wrapRef.current?.querySelector('input')
    if (!input || e.target !== input) return

    if (!/^\d$/.test(e.key)) return

    e.preventDefault()
    e.stopPropagation()

    const digits = (input.value || '').replace(/\D/g, '')
    if (digits.length >= 8) return

    const newDigits = digits + e.key
    let masked = ''
    for (let i = 0; i < newDigits.length; i++) {
      if (i === 2 || i === 4) masked += '/'
      masked += newDigits[i]
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    nativeSetter.call(input, masked)
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, [])

  return (
    <div className="relative" ref={wrapRef} onKeyDownCapture={handleKeyDown}>
      <DatePicker
        selected={dateValue}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder || 'dd/mm/aaaa'}
        autoFocus={autoFocus}
        className="w-full px-3 py-2.5 pr-9 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors text-sm font-mono"
        calendarClassName="op-calendar"
        showPopperArrow={false}
        isClearable={!!clearable}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={10}
        scrollableYearDropdown
      />
      {!(clearable && dateValue) && (
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      )}
    </div>
  )
}
