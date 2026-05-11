import { useState, useEffect, useCallback } from 'react'
import { chaosClient, TARGET_SERVICE_NAME, TARGET_VIDEO_URL } from '../api/apiClient'
import { useChaosWebSocket } from '../hooks/useChaosWebSocket'
import toast from 'react-hot-toast'
import { Skull, Clock, AlertTriangle, Trash2, RefreshCw, Wifi, WifiOff, Zap, Globe, RotateCcw, Activity } from 'lucide-react'

function ChaosTypeBadge({ type }) {
  const styles = {
    KILL:  'bg-red-900/60 text-red-300 border-red-700',
    DELAY: 'bg-amber-900/60 text-amber-300 border-amber-700',
    ERROR: 'bg-orange-900/60 text-orange-300 border-orange-700',
  }
  const icons = { KILL: '💀', DELAY: '⏱', ERROR: '⚠️' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1 ${styles[type] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {icons[type]} {type}
    </span>
  )
}

function KillFlash({ show }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="absolute inset-0 bg-red-600/25 animate-ping" style={{ animationDuration: '0.4s', animationIterationCount: 3 }} />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
    </div>
  )
}

// ── Live response viewer — shows what /api/videos returns right now ────────────
function LiveResponseViewer() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const check = async () => {
    setLoading(true)
    const t0 = Date.now()
    try {
      const res = await fetch(`${TARGET_VIDEO_URL}/api/videos`, { signal: AbortSignal.timeout(6000) })
      const body = await res.json()
      setResult({ status: res.status, ok: res.ok, latency: Date.now() - t0, body })
    } catch (e) {
      setResult({ status: 0, ok: false, latency: Date.now() - t0, body: { error: e.message } })
    } finally {
      setLoading(false)
      setLastChecked(new Date().toLocaleTimeString('en-US'))
    }
  }

  useEffect(() => {
    check()
    const t = setInterval(check, 5000)
    return () => clearInterval(t)
  }, [])

  const statusColor = !result ? 'text-gray-600'
    : result.status === 200 ? 'text-green-400'
    : result.status === 503 ? 'text-red-400'
    : result.status === 500 ? 'text-orange-400'
    : 'text-amber-400'

  const statusLabel = !result ? '—'
    : result.status === 0 ? 'UNREACHABLE'
    : `HTTP ${result.status}`

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
          <Activity size={14} className="text-indigo-400" />
          Live Response — <span className="font-mono text-xs text-gray-500">GET /api/videos</span>
        </h3>
        <div className="flex items-center gap-3">
          {lastChecked && <span className="text-gray-700 text-xs">{lastChecked}</span>}
          <span className={`font-bold text-sm ${statusColor}`}>{statusLabel}</span>
          {result && <span className="text-gray-600 text-xs font-mono">{result.latency}ms</span>}
          <button onClick={check} disabled={loading} className="p-1 hover:bg-gray-800 rounded-lg transition-all">
            <RefreshCw size={12} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`rounded-xl p-3 font-mono text-xs overflow-auto max-h-32 border ${
        result?.status === 503 ? 'bg-red-950/20 border-red-900/40 text-red-300'
        : result?.status === 500 ? 'bg-orange-950/20 border-orange-900/40 text-orange-300'
        : 'bg-gray-800/50 border-gray-700/50 text-gray-400'
      }`}>
        {loading && !result ? (
          <span className="text-gray-600">Fetching...</span>
        ) : result ? (
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(result.body, null, 2).slice(0, 400)}
            {JSON.stringify(result.body).length > 400 ? '\n... (truncated)' : ''}
          </pre>
        ) : null}
      </div>
      <p className="text-xs text-gray-700 mt-2">Auto-refreshes every 5s — stay here to see chaos effects without opening localhost:4000</p>
    </div>
  )
}

// ── Live chaos state badge ────────────────────────────────────────────────────
function TargetStateBadge({ chaosState }) {
  if (!chaosState || chaosState.error) return null
  const { killed, delayMs, errorRate } = chaosState
  if (!killed && !delayMs && !errorRate) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border bg-green-900/30 text-green-300 border-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Normal
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {killed && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-red-900/50 text-red-300 border-red-700 animate-pulse">💀 KILLED</span>}
      {delayMs > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-amber-900/50 text-amber-300 border-amber-700">⏱ {delayMs}ms delay</span>}
      {errorRate > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-orange-900/50 text-orange-300 border-orange-700">⚠️ {errorRate}% errors</span>}
    </div>
  )
}

// ── Slider with label ─────────────────────────────────────────────────────────
function ParamSlider({ label, value, onChange, min, max, step = 1, unit, color = 'indigo' }) {
  const colorMap = {
    red: 'accent-red-500',
    amber: 'accent-amber-500',
    orange: 'accent-orange-500',
    indigo: 'accent-indigo-500',
  }
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-500">{label}</label>
        <span className="text-xs font-mono font-semibold text-gray-300">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full bg-gray-700 ${colorMap[color]} cursor-pointer`}
      />
      <div className="flex justify-between text-gray-700 text-xs mt-0.5">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function ChaosPanel() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState({})
  const [killFlash, setKillFlash] = useState(false)
  const [newEventId, setNewEventId] = useState(null)
  const [chaosState, setChaosState] = useState(null)

  // Params — user controls these
  const [killTtl, setKillTtl] = useState(30)
  const [delayMs, setDelayMs] = useState(2000)
  const [delayTtl, setDelayTtl] = useState(30)
  const [errorRate, setErrorRate] = useState(50)
  const [errorTtl, setErrorTtl] = useState(30)

  const fetchChaosState = async () => {
    try {
      const res = await chaosClient.targetStatus()
      setChaosState(res.data)
    } catch { setChaosState({ error: true }) }
  }

  const handleWsEvent = useCallback((event) => {
    setEvents(prev => {
      if (prev.some(e => e.id === event.id)) return prev
      return [event, ...prev]
    })
    setNewEventId(event.id)
    setTimeout(() => setNewEventId(null), 2000)
    if (event.chaosType === 'KILL') {
      setKillFlash(true)
      setTimeout(() => setKillFlash(false), 1500)
    }
    setTimeout(fetchChaosState, 800)
  }, [])

  const { connected } = useChaosWebSocket(handleWsEvent)

  const fetchEvents = async () => {
    try {
      const res = await chaosClient.getStatus()
      setEvents([...res.data].reverse())
    } catch { toast.error('Chaos service unreachable') }
  }

  useEffect(() => {
    fetchEvents()
    fetchChaosState()
    const t = setInterval(fetchChaosState, 4000)
    return () => clearInterval(t)
  }, [])

  const handleAction = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }))
    const toastId = toast.loading(`Injecting ${type} into target-video-service...`)
    try {
      const actions = {
        kill:  () => chaosClient.killService(TARGET_SERVICE_NAME, killTtl),
        delay: () => chaosClient.delayService(TARGET_SERVICE_NAME, delayMs, delayTtl),
        error: () => chaosClient.injectError(TARGET_SERVICE_NAME, errorRate, errorTtl),
      }
      const res = await actions[type]()
      toast.success(res.data.message, { id: toastId, duration: 4000 })
      if (!connected) await fetchEvents()
      setTimeout(fetchChaosState, 600)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed', { id: toastId })
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleReset = async () => {
    try {
      await chaosClient.reset()
      setEvents([])
      toast.success('All chaos cleared — target-video-service restored')
      setTimeout(fetchChaosState, 600)
    } catch { toast.error('Reset failed') }
  }

  return (
    <div className="space-y-6">
      <KillFlash show={killFlash} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-red-400" /> Chaos Panel
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Real attack injection into{' '}
            <span className="text-indigo-400 font-mono text-xs">target-video-service</span>
          </p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
          connected ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? 'Live Stream' : 'Connecting...'}
        </div>
      </div>

      {/* Target info + live state */}
      <div className="rounded-2xl border border-indigo-900/40 bg-indigo-950/10 p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-indigo-900/30">
          <Globe size={20} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-200 font-semibold text-sm">VOIDSCREEN · target-video-service</p>
          <p className="text-gray-600 text-xs font-mono truncate">{TARGET_VIDEO_URL}</p>
        </div>
        <TargetStateBadge chaosState={chaosState} />
      </div>

      {/* ── KILL ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-900/30 bg-gray-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-red-300 flex items-center gap-2 text-sm">
            <Skull size={15} /> Kill Service
          </h3>
          <span className="text-xs text-gray-600">Returns 503 for all requests</span>
        </div>
        <ParamSlider label="Duration (TTL)" value={killTtl} onChange={setKillTtl} min={5} max={120} unit="s" color="red" />
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-700 hover:bg-red-600 active:scale-95 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-red-900/30"
          onClick={() => handleAction('kill')} disabled={loading.kill}
        >
          <Skull size={16} className={loading.kill ? 'animate-bounce' : ''} />
          {loading.kill ? 'Killing...' : `Kill for ${killTtl}s`}
        </button>
      </div>

      {/* ── DELAY ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-900/30 bg-gray-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-amber-300 flex items-center gap-2 text-sm">
            <Clock size={15} /> Inject Delay
          </h3>
          <span className="text-xs text-gray-600">Slows every request</span>
        </div>
        <div className="flex gap-4">
          <ParamSlider label="Delay" value={delayMs} onChange={setDelayMs} min={100} max={10000} step={100} unit="ms" color="amber" />
          <ParamSlider label="Duration (TTL)" value={delayTtl} onChange={setDelayTtl} min={5} max={120} unit="s" color="indigo" />
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber-900/30"
          onClick={() => handleAction('delay')} disabled={loading.delay}
        >
          <Clock size={16} />
          {loading.delay ? 'Injecting...' : `Inject ${delayMs}ms for ${delayTtl}s`}
        </button>
      </div>

      {/* ── ERROR ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-orange-900/30 bg-gray-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-orange-300 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} /> Inject Errors
          </h3>
          <span className="text-xs text-gray-600">Random 500 responses</span>
        </div>
        <div className="flex gap-4">
          <ParamSlider label="Error Rate" value={errorRate} onChange={setErrorRate} min={1} max={100} unit="%" color="orange" />
          <ParamSlider label="Duration (TTL)" value={errorTtl} onChange={setErrorTtl} min={5} max={120} unit="s" color="indigo" />
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-700 hover:bg-orange-600 active:scale-95 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-orange-900/30"
          onClick={() => handleAction('error')} disabled={loading.error}
        >
          <AlertTriangle size={16} />
          {loading.error ? 'Injecting...' : `Inject ${errorRate}% errors for ${errorTtl}s`}
        </button>
      </div>

      {/* Restore */}
      <button
        className="w-full flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-semibold rounded-xl transition-all"
        onClick={handleReset}
      >
        <RotateCcw size={15} /> Restore Normal Operation
      </button>

      {/* Live response — stays in UI, no need to open localhost:4000 */}
      <LiveResponseViewer />

      {/* Kill cascade warning */}
      {chaosState?.killed && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/20 px-5 py-4 flex items-start gap-3">
          <Skull size={18} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="text-red-300 font-semibold text-sm">💀 Service Killed — Cascade Failure Active</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              target-video-service returning 503 for all requests. Auto-recovers after TTL, or click Restore.
            </p>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2">
            Attack History
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{events.length}</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={fetchEvents} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs border border-gray-700">
              <RefreshCw size={11} /> Refresh
            </button>
            {events.length > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg text-xs border border-red-800">
                <Trash2 size={11} /> Clear All
              </button>
            )}
          </div>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Skull size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No attacks yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800 text-xs uppercase tracking-wider">
                  <th className="text-left pb-3 pr-4">Time</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Result</th>
                  <th className="text-left pb-3 pr-4">ms</th>
                  <th className="text-left pb-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} className={`border-b border-gray-800/50 transition-all duration-500 ${
                    newEventId === event.id ? 'bg-indigo-900/20' : 'hover:bg-gray-800/30'
                  }`}>
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap text-xs font-mono">
                      {new Date(event.timestamp).toLocaleTimeString('en-US')}
                    </td>
                    <td className="py-2.5 pr-4"><ChaosTypeBadge type={event.chaosType} /></td>
                    <td className="py-2.5 pr-4">
                      {event.success
                        ? <span className="text-green-400 font-semibold text-xs">✓ Hit</span>
                        : <span className="text-red-400 font-semibold text-xs">✗ Miss</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600 text-xs font-mono">{event.durationMs}</td>
                    <td className="py-2.5 text-gray-500 text-xs max-w-xs truncate">{event.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
