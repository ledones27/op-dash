export default function StatCard({ label, value, sub, colorClass, icon: Icon, isUsd, className = '' }) {
  return (
    <div className={`card flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="stat-label">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-text-muted" />}
      </div>
      <span className={`stat-value ${colorClass || ''} ${isUsd ? 'v-usd' : ''}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted mt-1">{sub}</span>}
    </div>
  )
}
