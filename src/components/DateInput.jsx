import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar } from 'lucide-react'

/**
 * Input de data com calendário visual.
 * value/onChange trabalham com string "YYYY-MM-DD".
 */
export default function DateInput({ value, onChange, placeholder, autoFocus }) {
  const dateValue = value ? new Date(value + 'T12:00:00') : null

  const handleChange = (date) => {
    if (!date) {
      onChange('')
      return
    }
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${d}`)
  }

  return (
    <div className="relative">
      <DatePicker
        selected={dateValue}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder || 'dd/mm/aaaa'}
        autoFocus={autoFocus}
        className="w-full px-3 py-2.5 pr-9 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors text-sm font-mono"
        calendarClassName="op-calendar"
        showPopperArrow={false}
        isClearable={false}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={10}
        scrollableYearDropdown
      />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
    </div>
  )
}
