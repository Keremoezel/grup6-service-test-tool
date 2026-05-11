import { useEffect, useState } from 'react'
import { chaosClient, securityClient, reportClient, schedulerClient, TARGET_VIDEO_URL } from '../api/apiClient'
import { Activity, Shield, FileText, RefreshCw, Zap, Play, Square, Timer, Server, AlertTriangle, Globe, Skull, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

function StatCard({ title, value, subtitle, colorClass, icon: Icon, alert }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border ${alert ? 'border-red-500/50 bg-red-950/20' : 'border-gray-800 bg-gray-900/60'} backdrop-blur-sm transition-all duration-300`}>
      {alert && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value ?? '—'}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

function HealthBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Degraded' : 'Critical'
  const textColor = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-gray-300 flex items-center gap-2">
          <Activity size={16} className={textColor} /> System Health Score
        </span>
        <span className={`text-sm font-bold ${textColor}`}>
          {label} — {score}/100
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-4">
        <div
          className={`${color} h-4 rounded-full transition-all duration-1000 relative overflow-hidden`}
          style={{ width: `${score}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ── Target Video Service live status card ─────────────────────────────────────
function TargetServiceStatus() {
  const [data, setData] = useState(null)
  const [httpStatus, setHttpStatus] = useState('checking') // 'up' | 'down' | 'checking'

  const fetchStatus = async () => {
    try {
      const res = await chaosClient.targetStatus()
      setData(res.data)
      setHttpStatus(res.data?.error ? 'down' : 'up')
    } catch {
      setData(null)
      setHttpStatus('down')
    }
  }

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 5000)
    return () => clearInterval(t)
  }, [])

  const isKilled = data?.killed === true
  const hasDelay = (data?.delayMs ?? 0) > 0
  const hasError = (data?.errorRate ?? 0) > 0
  const chaosActive = isKilled || hasDelay || hasError
  const isUp = httpStatus === 'up' && !isKilled

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-500 ${
      isKilled
        ? 'border-red-500/60 bg-red-950/20'
        : chaosActive
        ? 'border-amber-500/40 bg-amber-950/10'
        : 'border-gray-800 bg-gray-900/60'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2">
          <Globe size={15} className="text-indigo-400" /> Target — VOIDSCREEN
        </h3>
        <a
          href={TARGET_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
        >
          {TARGET_VIDEO_URL.replace('http://', '')}
        </a>
      </div>

      {/* Main status row */}
      <div className={`flex items-center justify-between py-3 px-4 rounded-xl border mb-3 transition-all duration-500 ${
        isKilled ? 'border-red-500/40 bg-red-950/20' : 'border-gray-700 bg-gray-800/40'
      }`}>
        <div className="flex items-center gap-3">
          <Server size={15} className={isKilled ? 'text-red-400' : isUp ? 'text-indigo-400' : 'text-gray-600'} />
          <div>
            <p className="text-gray-200 text-sm font-medium">target-video-service</p>
            <p className="text-gray-600 text-xs">Nuxt 3 · Video Streaming Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isKilled && <Skull size={14} className="text-red-400 animate-pulse" />}
          <span className={`w-2.5 h-2.5 rounded-full ${
            isKilled ? 'bg-red-500 animate-pulse'
            : isUp ? 'bg-green-500'
            : httpStatus === 'checking' ? 'bg-amber-500 animate-pulse'
            : 'bg-red-500 animate-pulse'
          }`} />
          <span className={`text-xs font-semibold ${
            isKilled ? 'text-red-400'
            : isUp ? 'text-green-400'
            : httpStatus === 'checking' ? 'text-amber-400'
            : 'text-red-400'
          }`}>
            {isKilled ? 'KILLED' : isUp ? 'Online' : httpStatus === 'checking' ? 'Checking...' : 'Unreachable'}
          </span>
        </div>
      </div>

      {/* Active chaos indicators */}
      {data && !data.error && (
        <div className="grid grid-cols-3 gap-2">
          {/* Delay */}
          <div className={`rounded-xl px-3 py-2 border text-center transition-all ${
            hasDelay ? 'border-amber-500/40 bg-amber-950/20' : 'border-gray-800 bg-gray-800/20'
          }`}>
            <Clock size={14} className={`mx-auto mb-1 ${hasDelay ? 'text-amber-400' : 'text-gray-700'}`} />
            <p className={`text-xs font-semibold ${hasDelay ? 'text-amber-300' : 'text-gray-700'}`}>
              {hasDelay ? `${data.delayMs}ms` : 'No Delay'}
            </p>
            <p className="text-gray-700 text-xs">Delay</p>
          </div>
          {/* Error Rate */}
          <div className={`rounded-xl px-3 py-2 border text-center transition-all ${
            hasError ? 'border-orange-500/40 bg-orange-950/20' : 'border-gray-800 bg-gray-800/20'
          }`}>
            <AlertTriangle size={14} className={`mx-auto mb-1 ${hasError ? 'text-orange-400' : 'text-gray-700'}`} />
            <p className={`text-xs font-semibold ${hasError ? 'text-orange-300' : 'text-gray-700'}`}>
              {hasError ? `${data.errorRate}%` : '0%'}
            </p>
            <p className="text-gray-700 text-xs">Error Rate</p>
          </div>
          {/* Kill */}
          <div className={`rounded-xl px-3 py-2 border text-center transition-all ${
            isKilled ? 'border-red-500/40 bg-red-950/20' : 'border-gray-800 bg-gray-800/20'
          }`}>
            <Skull size={14} className={`mx-auto mb-1 ${isKilled ? 'text-red-400 animate-pulse' : 'text-gray-700'}`} />
            <p className={`text-xs font-semibold ${isKilled ? 'text-red-300' : 'text-gray-700'}`}>
              {isKilled ? 'ACTIVE' : 'None'}
            </p>
            <p className="text-gray-700 text-xs">Kill</p>
          </div>
        </div>
      )}

      {/* Unreachable fallback */}
      {(!data || data.error) && (
        <div className="flex items-center gap-2 text-xs text-red-400/70 mt-1">
          <AlertTriangle size={12} />
          <span>Cannot reach target — check if pnpm run dev is running on port 4000</span>
        </div>
      )}
    </div>
  )
}

function SchedulerControl() {
  const [schedulerStatus, setSchedulerStatus] = useState({ enabled: false, intervalSeconds: 60, lastRunAt: null })
  const [intervalSec, setIntervalSec] = useState(60)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await schedulerClient.status()
      setSchedulerStatus(res.data)
    } catch { }
  }

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 5000)
    return () => clearInterval(t)
  }, [])

  const handleStart = async () => {
    setLoading(true)
    try {
      await schedulerClient.start(intervalSec)
      toast.success(`Auto-tests started (every ${intervalSec}s)`)
      await fetchStatus()
    } catch {
      toast.error('Failed to start scheduler')
    } finally { setLoading(false) }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await schedulerClient.stop()
      toast.success('Auto-tests stopped')
      await fetchStatus()
    } catch {
      toast.error('Failed to stop scheduler')
    } finally { setLoading(false) }
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Timer size={16} className="text-indigo-400" />
        <h3 className="font-semibold text-gray-300">Auto Test Scheduler</h3>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
          schedulerStatus.enabled
            ? 'bg-green-900/50 text-green-300 border-green-700 animate-pulse'
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          {schedulerStatus.enabled ? '● Running' : '○ Stopped'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Interval (seconds)</label>
          <input
            type="number" min="10" max="3600"
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            value={intervalSec}
            onChange={e => setIntervalSec(Number(e.target.value))}
            disabled={schedulerStatus.enabled}
          />
        </div>
        {!schedulerStatus.enabled ? (
          <button className="flex items-center gap-2 mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap" onClick={handleStart} disabled={loading}>
            <Play size={14} /> Start
          </button>
        ) : (
          <button className="flex items-center gap-2 mt-5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap" onClick={handleStop} disabled={loading}>
            <Square size={14} /> Stop
          </button>
        )}
      </div>

      {schedulerStatus.enabled && (
        <div className="text-xs text-gray-500 space-y-1 border-t border-gray-800 pt-3">
          <p>Interval: <span className="text-gray-400">{schedulerStatus.intervalSeconds}s</span></p>
          <p>Last run: <span className="text-gray-400">{
            schedulerStatus.lastRunAt === 'Henuz calistirilmadi' || !schedulerStatus.lastRunAt
              ? 'Waiting...'
              : new Date(schedulerStatus.lastRunAt).toLocaleTimeString('en-US')
          }</span></p>
          <p className="text-indigo-400 animate-pulse">⚡ Chaos + Security tests running automatically on target-video-service...</p>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchStats = async () => {
    try {
      const res = await reportClient.getStats()
      setStats(res.data)
      setLastUpdate(new Date().toLocaleTimeString('en-US'))
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchStats()
    const t = setInterval(fetchStats, 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">
            Monitoring <span className="text-indigo-400 font-mono text-xs">target-video-service</span> — refreshes every 10s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && <span className="text-gray-600 text-xs">Last: {lastUpdate}</span>}
          <button onClick={fetchStats} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-all border border-gray-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Chaos Attacks" value={stats?.chaosTotalEvents ?? 0} subtitle="Kill / Delay / Error on target" colorClass="bg-red-900/40 text-red-300" icon={Zap} alert={(stats?.chaosTotalEvents ?? 0) > 5} />
        <StatCard title="Security Scans" value={stats?.securityTotalScans ?? 0} subtitle="Scans run on target" colorClass="bg-indigo-900/40 text-indigo-300" icon={Shield} />
        <StatCard title="Critical Vulnerabilities" value={stats?.criticalVulnerabilities ?? 0} subtitle="Found in target service" colorClass="bg-orange-900/40 text-orange-300" icon={Activity} alert={(stats?.criticalVulnerabilities ?? 0) > 0} />
        <StatCard title="Avg. Security Score" value={stats ? `${stats.securityAverageScore}/100` : '—'} subtitle="Higher = safer" colorClass="bg-green-900/40 text-green-300" icon={FileText} />
      </div>

      {stats && <HealthBar score={stats.overallHealthScore ?? 0} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Target service live status — replaces old "Service Status" box */}
        <TargetServiceStatus />
        <SchedulerControl />
      </div>
    </div>
  )
}
