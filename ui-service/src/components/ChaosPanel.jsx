import { useState, useEffect, useCallback } from 'react'
import { chaosClient } from '../api/apiClient'
import { useChaosWebSocket } from '../hooks/useChaosWebSocket'
import toast from 'react-hot-toast'
import { Skull, Clock, AlertTriangle, Trash2, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react'

function ChaosTypeBadge({ type }) {
  const styles = {
    KILL: 'bg-red-900/60 text-red-300 border-red-700',
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
      <div className="absolute inset-0 bg-red-600/20 animate-ping" style={{ animationDuration: '0.4s', animationIterationCount: 3 }} />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
    </div>
  )
}

export default function ChaosPanel() {
  const [serviceName, setServiceName] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState({})
  const [killFlash, setKillFlash] = useState(false)
  const [newEventId, setNewEventId] = useState(null)

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
  }, [])

  const { connected } = useChaosWebSocket(handleWsEvent)

  const fetchEvents = async () => {
    try {
      const res = await chaosClient.getStatus()
      setEvents([...res.data].reverse())
    } catch {
      toast.error('Chaos service unreachable')
    }
  }

  useEffect(() => { fetchEvents() }, [])

  const handleAction = async (type) => {
    if (!serviceName.trim()) { toast.error('Enter a service name'); return }
    setLoading(prev => ({ ...prev, [type]: true }))
    const labels = { kill: '💀 Killing service...', delay: '⏱ Injecting delay...', error: '⚠️ Injecting error...' }
    const toastId = toast.loading(labels[type])
    try {
      const actions = {
        kill: () => chaosClient.killService(serviceName),
        delay: () => chaosClient.delayService(serviceName),
        error: () => chaosClient.injectError(serviceName),
      }
      const res = await actions[type]()
      toast.success(res.data.message, { id: toastId })
      if (!connected) await fetchEvents()
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
      toast.success('All chaos events cleared')
    } catch {
      toast.error('Reset failed')
    }
  }

  return (
    <div className="space-y-6">
      <KillFlash show={killFlash} />

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-red-400" /> Chaos Panel
          </h2>
          <p className="text-gray-500 text-sm mt-1">Simulate service failures and chaos scenarios</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
          connected
            ? 'bg-green-900/40 text-green-300 border-green-700'
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? 'Live Stream' : 'Connecting...'}
        </div>
      </div>

      {/* Action Controls */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block font-medium">Target Service Name</label>
          <input
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-gray-600 transition-all"
            placeholder="e.g. payment-service, user-api, order-service..."
            value={serviceName}
            onChange={e => setServiceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAction('kill')}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* KILL */}
          <button
            className="group relative flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 active:scale-95 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/30"
            onClick={() => handleAction('kill')}
            disabled={loading.kill}
          >
            <Skull size={16} className="group-hover:animate-bounce" />
            {loading.kill ? 'Killing...' : 'Kill Service'}
          </button>

          {/* DELAY */}
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-amber-900/30"
            onClick={() => handleAction('delay')}
            disabled={loading.delay}
          >
            <Clock size={16} />
            {loading.delay ? 'Injecting...' : 'Inject Delay'}
          </button>

          {/* ERROR */}
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-700 hover:bg-orange-600 active:scale-95 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-orange-900/30"
            onClick={() => handleAction('error')}
            disabled={loading.error}
          >
            <AlertTriangle size={16} />
            {loading.error ? 'Injecting...' : 'Inject Error'}
          </button>
        </div>

        <p className="text-xs text-gray-600">
          💡 <strong className="text-gray-500">Kill</strong> simulates a service crash (70% success) ·
          <strong className="text-gray-500"> Delay</strong> injects 1–5s latency ·
          <strong className="text-gray-500"> Error</strong> throws a random exception
        </p>
      </div>

      {/* Cascade Warning */}
      {events.some(e => e.chaosType === 'KILL' && e.serviceName === 'security-service') && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/20 px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="text-red-300 font-semibold text-sm">⚡ Cascade Failure Active</p>
            <p className="text-red-400/70 text-xs mt-0.5">security-service was killed — Report panel will return empty security data. Check the Report tab to observe the impact.</p>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2">
            Chaos Events
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{events.length}</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={fetchEvents} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs border border-gray-700 transition-all">
              <RefreshCw size={11} /> Refresh
            </button>
            {events.length > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg text-xs border border-red-800 transition-all">
                <Trash2 size={11} /> Clear All
              </button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Skull size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No chaos events yet</p>
            <p className="text-xs mt-1 text-gray-700">Enter a service name above and trigger an action</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800 text-xs uppercase tracking-wider">
                  <th className="text-left pb-3 pr-4">Time</th>
                  <th className="text-left pb-3 pr-4">Service</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Result</th>
                  <th className="text-left pb-3 pr-4">Duration</th>
                  <th className="text-left pb-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr
                    key={event.id}
                    className={`border-b border-gray-800/50 transition-all duration-500 ${
                      newEventId === event.id
                        ? 'bg-indigo-900/20 border-indigo-700/30'
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap text-xs font-mono">
                      {new Date(event.timestamp).toLocaleTimeString('en-US')}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-indigo-300">{event.serviceName}</td>
                    <td className="py-2.5 pr-4"><ChaosTypeBadge type={event.chaosType} /></td>
                    <td className="py-2.5 pr-4">
                      {event.success
                        ? <span className="text-green-400 font-semibold text-xs">✓ Success</span>
                        : <span className="text-red-400 font-semibold text-xs">✗ Failed</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs font-mono">{event.durationMs}ms</td>
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
