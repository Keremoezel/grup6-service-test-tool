// ─── Shared UI primitives ──────────────────────────────────────────────────

// Badge
export function Badge({ children, variant = 'default', size = 'sm', dot = false, pulse = false }) {
  const base = 'inline-flex items-center gap-1.5 font-mono font-medium rounded-full border'
  const sizes = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-[11px] px-2.5 py-1',
    md: 'text-xs px-3 py-1',
  }
  const variants = {
    default:  'bg-gray-100 border-gray-200 text-gray-600',
    blue:     'bg-blue-50 border-blue-200 text-blue-700',
    red:      'bg-red-50 border-red-200 text-red-700',
    amber:    'bg-amber-50 border-amber-200 text-amber-700',
    orange:   'bg-orange-50 border-orange-200 text-orange-700',
    green:    'bg-green-50 border-green-200 text-green-700',
    outline:  'bg-white border-gray-200 text-gray-600',
  }
  const dotColors = {
    default: 'bg-gray-400', blue: 'bg-blue-500', red: 'bg-red-500',
    amber: 'bg-amber-500', orange: 'bg-orange-500', green: 'bg-green-500', outline: 'bg-gray-400',
  }
  return (
    <span className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      )}
      {children}
    </span>
  )
}

// Button
export function Button({ children, variant = 'primary', size = 'md', className = '', loading = false, icon, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-sans font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg'
  const sizes = {
    xs: 'h-7 px-3 text-xs',
    sm: 'h-8 px-3.5 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
  }
  const variants = {
    primary:   'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200 shadow-card',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-200',
    outline:   'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:ring-gray-200',
    blue:      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  )
}

// Card
export function Card({ children, className = '', padding = true, hover = false }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-card ${hover ? 'transition-shadow hover:shadow-card-hover' : ''} ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

// Section header inside a card
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between mb-5 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// Divider
export function Divider({ className = '' }) {
  return <hr className={`border-gray-100 ${className}`} />
}

// Spinner
export function Spinner({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="23.562" opacity="0.3" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10" strokeDashoffset="0" />
    </svg>
  )
}

// Status indicator
export function StatusDot({ status, label }) {
  const map = {
    up:       { cls: 'bg-green-500', label: label || 'Online' },
    down:     { cls: 'bg-red-500 animate-pulse', label: label || 'Offline' },
    checking: { cls: 'bg-amber-400 animate-pulse', label: label || 'Checking' },
    warning:  { cls: 'bg-amber-400', label: label || 'Warning' },
  }
  const s = map[status] || map.checking
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${s.cls}`} />
      {label !== false && <span className="text-xs text-gray-500">{s.label}</span>}
    </div>
  )
}

// Empty state
export function Empty({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-3xl mb-3 opacity-25">{icon}</div>}
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  )
}

// Section label (small uppercase label)
export function Label({ children, className = '' }) {
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-widest text-gray-400 ${className}`}>
      {children}
    </span>
  )
}

// Stat block used in summary rows
export function StatItem({ label, value, color = 'text-gray-900', subtext }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold font-mono tabular-nums ${color}`}>{value ?? '—'}</p>
      {subtext && <p className="text-[11px] text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  )
}

// Slider with label
export function Slider({ label, value, onChange, min, max, step = 1, unit, accentColor = '#2563eb' }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-600">{label}</label>
        <span className="text-xs font-mono font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer"
        style={{ accentColor }}
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// Severity badge for vulnerabilities
export function SeverityBadge({ severity }) {
  const map = {
    CRITICAL: { variant: 'red',    label: 'Critical' },
    HIGH:     { variant: 'orange', label: 'High' },
    MEDIUM:   { variant: 'amber',  label: 'Medium' },
    LOW:      { variant: 'blue',   label: 'Low' },
  }
  const s = map[severity] || { variant: 'default', label: severity }
  return <Badge variant={s.variant} size="xs">{s.label}</Badge>
}

// Chaos type badge
export function ChaosTypeBadge({ type }) {
  const map = {
    KILL:  { variant: 'red',    icon: '⬡', label: 'Kill' },
    DELAY: { variant: 'amber',  icon: '◷', label: 'Delay' },
    ERROR: { variant: 'orange', icon: '△', label: 'Error' },
  }
  const s = map[type] || { variant: 'default', icon: '?', label: type }
  return <Badge variant={s.variant} size="xs">{s.icon} {s.label}</Badge>
}

// Progress bar
export function ProgressBar({ value, max = 100, colorClass, thin = false }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const color = colorClass ||
    (pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500')
  return (
    <div className={`w-full rounded-full bg-gray-100 overflow-hidden ${thin ? 'h-1.5' : 'h-2.5'}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Ring score
export function ScoreRing({ score, size = 80 }) {
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const textSize = size * 0.22
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f3f5" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
        <text x={size/2} y={size/2 + textSize * 0.35}
          textAnchor="middle" fill="#212529"
          fontSize={textSize} fontFamily="DM Mono, monospace" fontWeight="500">
          {score}
        </text>
      </svg>
    </div>
  )
}

// Toast hook-friendly container (minimal, inline)
export function ToastList({ toasts }) {
  const typeStyle = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error:   'border-red-200 bg-red-50 text-red-800',
    loading: 'border-blue-200 bg-blue-50 text-blue-800',
    info:    'border-gray-200 bg-white text-gray-700',
  }
  const typeIcon = { success: '✓', error: '✕', loading: '…', info: 'i' }
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 min-w-[280px] max-w-[360px]">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-dropdown text-sm animate-slide-up ${typeStyle[t.type] || typeStyle.info}`}
        >
          <span className="font-semibold mt-0.5 shrink-0">{typeIcon[t.type]}</span>
          <span className="flex-1 leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}