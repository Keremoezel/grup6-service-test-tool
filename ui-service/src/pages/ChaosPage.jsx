import { useState, useEffect, useCallback } from 'react'
import { chaosClient, TARGET_SERVICE_NAME, TARGET_VIDEO_URL } from '../api/apiClient'
import { useChaosWebSocket } from '../hooks/useChaosWebSocket'
import {
  Card, CardHeader, Button, Badge, ChaosTypeBadge, Slider,
  Empty, Divider, Label, StatusDot
} from '../components/ui'

// ─── Kill flash overlay ───────────────────────────────────────────────────────
function KillFlash({ show }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-50 animate-ping"
      style={{ background: 'rgba(220,38,38,0.06)', animationDuration: '0.4s', animationIterationCount: '3' }} />
  )
}

// ─── Chaos action card ────────────────────────────────────────────────────────
function ActionCard({ title, subtitle, accentColor, children, action }) {
  const borders = {
    red:    'border-red-200 bg-red-50/30',
    amber:  'border-amber-200 bg-amber-50/30',
    orange: 'border-orange-200 bg-orange-50/30',
  }
  return (
    <div className={`rounded-xl border p-5 ${borders[accentColor] || 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <span className="text-xs text-gray-500">{subtitle}</span>
      </div>
      <Divider className="my-4" />
      <div className="space-y-4">
        {children}
      </div>
      <div className="mt-5">
        {action}
      </div>
    </div>
  )
}

// ─── Live probe indicator ─────────────────────────────────────────────────────
function LiveProbe() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const probe = useCallback(async () => {
    setLoading(true)
    const t0 = Date.now()
    try {
      const r = await fetch(`${TARGET_VIDEO_URL}/api/videos`, { signal: AbortSignal.timeout(6000) })
      setResult({ status: r.status, latency: Date.now() - t0, ok: r.ok })
    } catch {
      setResult({ status: 0, latency: Date.now() - t0, ok: false })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { probe(); const t = setInterval(probe, 8000); return () => clearInterval(t) }, [probe])

  const statusVariant = !result ? 'default'
    : result.status === 200 ? 'green'
    : result.status === 503 ? 'red'
    : 'amber'

  const statusLabel = !result ? 'Checking…'
    : result.status === 0 ? 'Unreachable'
    : `HTTP ${result.status}`

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <Label>Live Probe</Label>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">GET {TARGET_VIDEO_URL}/api/videos</p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <div className="text-right">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              <p className="text-[10px] text-gray-400 mt-1 font-mono text-right">{result.latency}ms</p>
            </div>
          )}
          <Button
            variant="secondary" size="sm" onClick={probe} loading={loading}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
          >
            Probe
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Active chaos state banner ────────────────────────────────────────────────
function ChaosStateBanner({ chaosState }) {
  if (!chaosState || chaosState.error) return null
  const { killed, delayMs, errorRate } = chaosState
  if (!killed && !delayMs && !errorRate) return null

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl border border-amber-200 bg-amber-50">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span className="text-xs font-medium text-amber-800">Active chaos on target-video-service:</span>
      {killed && <Badge variant="red" dot pulse>Killed — returning 503</Badge>}
      {delayMs > 0 && <Badge variant="amber">{delayMs}ms delay active</Badge>}
      {errorRate > 0 && <Badge variant="orange">{errorRate}% error injection</Badge>}
    </div>
  )
}

// ─── Events table ─────────────────────────────────────────────────────────────
function EventsTable({ events, newEventId, onRefresh, onClear }) {
  return (
    <Card padding={false}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Attack History</p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{events.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={onRefresh}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>}>
            Refresh
          </Button>
          {events.length > 0 && (
            <Button variant="ghost" size="xs" onClick={onClear}
              className="text-red-600 hover:bg-red-50 hover:text-red-700">
              Clear all
            </Button>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <Empty icon="⬡" title="No attacks yet" description="Use the controls above to inject chaos" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Time</th>
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Type</th>
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Result</th>
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Latency</th>
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Message</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}
                  className={`border-b border-gray-50 transition-colors ${newEventId === ev.id ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-5 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleTimeString('en-US')}
                  </td>
                  <td className="py-3 px-3"><ChaosTypeBadge type={ev.chaosType} /></td>
                  <td className="py-3 px-3">
                    {ev.success
                      ? <span className="text-green-600 text-xs font-medium">Hit</span>
                      : <span className="text-red-500 text-xs font-medium">Miss</span>}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-gray-500">{ev.durationMs}ms</td>
                  <td className="py-3 px-3 text-xs text-gray-500 max-w-xs truncate">{ev.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChaosPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState({})
  const [killFlash, setKillFlash] = useState(false)
  const [newEventId, setNewEventId] = useState(null)
  const [chaosState, setChaosState] = useState(null)

  const [killTtl, setKillTtl] = useState(30)
  const [delayMs, setDelayMs] = useState(2000)
  const [delayTtl, setDelayTtl] = useState(30)
  const [errorRate, setErrorRate] = useState(50)
  const [errorTtl, setErrorTtl] = useState(30)

  const fetchState = async () => {
    try { const r = await chaosClient.targetStatus(); setChaosState(r.data) }
    catch { setChaosState({ error: true }) }
  }

  const handleWsEvent = useCallback((event) => {
    setEvents(prev => prev.some(e => e.id === event.id) ? prev : [event, ...prev])
    setNewEventId(event.id)
    setTimeout(() => setNewEventId(null), 2000)
    if (event.chaosType === 'KILL') {
      setKillFlash(true); setTimeout(() => setKillFlash(false), 1500)
    }
    setTimeout(fetchState, 800)
  }, [])

  const { connected } = useChaosWebSocket(handleWsEvent)

  const fetchEvents = async () => {
    try { const r = await chaosClient.getStatus(); setEvents([...r.data].reverse()) } catch {}
  }

  useEffect(() => {
    fetchEvents(); fetchState()
    const t = setInterval(fetchState, 4000)
    return () => clearInterval(t)
  }, [])

  const handleAction = async (type) => {
    setLoading(p => ({ ...p, [type]: true }))
    try {
      const actions = {
        kill:  () => chaosClient.killService(TARGET_SERVICE_NAME, killTtl),
        delay: () => chaosClient.delayService(TARGET_SERVICE_NAME, delayMs, delayTtl),
        error: () => chaosClient.injectError(TARGET_SERVICE_NAME, errorRate, errorTtl),
      }
      await actions[type]()
      if (!connected) await fetchEvents()
      setTimeout(fetchState, 600)
    } finally {
      setLoading(p => ({ ...p, [type]: false }))
    }
  }

  const handleReset = async () => {
    try { await chaosClient.reset(); setEvents([]); setTimeout(fetchState, 600) } catch {}
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <KillFlash show={killFlash} />

      <LiveProbe />
      <ChaosStateBanner chaosState={chaosState} />

      {/* Action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kill */}
        <ActionCard
          title="Kill Service"
          subtitle="Returns 503 for all requests"
          accentColor="red"
          action={
            <Button variant="danger" className="w-full" loading={loading.kill}
              onClick={() => handleAction('kill')}
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}>
              {loading.kill ? 'Killing…' : `Kill for ${killTtl}s`}
            </Button>
          }
        >
          <Slider label="Duration (TTL)" value={killTtl} onChange={setKillTtl}
            min={5} max={120} unit="s" accentColor="#dc2626" />
        </ActionCard>

        {/* Delay */}
        <ActionCard
          title="Inject Delay"
          subtitle="Adds latency to every request"
          accentColor="amber"
          action={
            <Button variant="secondary" className="w-full text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
              loading={loading.delay} onClick={() => handleAction('delay')}
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>
              {loading.delay ? 'Injecting…' : `Inject ${delayMs}ms for ${delayTtl}s`}
            </Button>
          }
        >
          <Slider label="Delay" value={delayMs} onChange={setDelayMs}
            min={100} max={10000} step={100} unit="ms" accentColor="#d97706" />
          <Slider label="Duration (TTL)" value={delayTtl} onChange={setDelayTtl}
            min={5} max={120} unit="s" accentColor="#6b7280" />
        </ActionCard>

        {/* Error */}
        <ActionCard
          title="Inject Errors"
          subtitle="HTTP 500 responses at given rate"
          accentColor="orange"
          action={
            <Button variant="secondary" className="w-full text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100"
              loading={loading.error} onClick={() => handleAction('error')}
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}>
              {loading.error ? 'Injecting…' : `Inject ${errorRate}% errors for ${errorTtl}s`}
            </Button>
          }
        >
          <Slider label="Error Rate" value={errorRate} onChange={setErrorRate}
            min={1} max={100} unit="%" accentColor="#ea580c" />
          <Slider label="Duration (TTL)" value={errorTtl} onChange={setErrorTtl}
            min={5} max={120} unit="s" accentColor="#6b7280" />
        </ActionCard>
      </div>

      {/* Restore */}
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={handleReset}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>}>
          Restore Normal Operation
        </Button>
      </div>

      <EventsTable
        events={events}
        newEventId={newEventId}
        onRefresh={fetchEvents}
        onClear={handleReset}
      />
    </div>
  )
}