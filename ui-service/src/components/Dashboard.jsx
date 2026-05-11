import { useEffect, useState } from 'react'
import { chaosClient, securityClient, reportClient, schedulerClient } from '../api/apiClient'
import { Activity, Shield, FileText, RefreshCw, Zap, Play, Square, Timer, Server, AlertTriangle } from 'lucide-react'
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

function ServiceStatusDot({ label, client, port }) {
  const [status, setStatus] = useState('checking')

  const check = () => {
    setStatus('checking')
    client.health()
      .then(() => setStatus('up'))
      .catch(() => setStatus('down'))
  }

  useEffect(() => {
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])

  const isUp = status === 'up'
  const isDown = status === 'down'

  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-xl border transition-all duration-500 ${
      isDown ? 'border-red-500/40 bg-red-950/20' : isUp ? 'border-gray-800 bg-gray-800/30' : 'border-gray-800 bg-gray-800/20'
    }`}>
      <div className="flex items-center gap-3">
        <Server size={15} className={isDown ? 'text-red-400' : isUp ? 'text-indigo-400' : 'text-gray-600'} />
        <div>
          <p className="text-gray-200 text-sm font-medium">{label}</p>
          <p className="text-gray-600 text-xs">:{port}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isDown && <AlertTriangle size={13} className="text-red-400 animate-pulse" />}
        <span className={`w-2.5 h-2.5 rounded-full ${
          isUp ? 'bg-green-500' : isDown ? 'bg-red-500 animate-pulse' : 'bg-amber-500 animate-pulse'
        }`} />
        <span className={`text-xs font-semibold ${
          isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-amber-400'
        }`}>
          {isUp ? 'Online' : isDown ? 'Unreachable' : 'Checking...'}
        </span>
      </div>
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
          <p className="text-indigo-400 animate-pulse">⚡ Chaos + Security tests running automatically...</p>
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
          <p className="text-gray-500 text-sm mt-1">Auto-refreshes every 10 seconds</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && <span className="text-gray-600 text-xs">Last: {lastUpdate}</span>}
          <button onClick={fetchStats} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-all border border-gray-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Chaos Events" value={stats?.chaosTotalEvents ?? 0} subtitle="Kill / Delay / Error" colorClass="bg-red-900/40 text-red-300" icon={Zap} alert={(stats?.chaosTotalEvents ?? 0) > 5} />
        <StatCard title="Security Scans" value={stats?.securityTotalScans ?? 0} subtitle="Total scans run" colorClass="bg-indigo-900/40 text-indigo-300" icon={Shield} />
        <StatCard title="Critical Vulnerabilities" value={stats?.criticalVulnerabilities ?? 0} subtitle="Across all scans" colorClass="bg-orange-900/40 text-orange-300" icon={Activity} alert={(stats?.criticalVulnerabilities ?? 0) > 0} />
        <StatCard title="Avg. Security Score" value={stats ? `${stats.securityAverageScore}/100` : '—'} subtitle="Higher = safer" colorClass="bg-green-900/40 text-green-300" icon={FileText} />
      </div>

      {stats && <HealthBar score={stats.overallHealthScore ?? 0} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
          <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Server size={15} className="text-indigo-400" /> Service Status
          </h3>
          <div className="space-y-2">
            <ServiceStatusDot label="Chaos Service" client={chaosClient} port="8081" />
            <ServiceStatusDot label="Security Service" client={securityClient} port="8082" />
            <ServiceStatusDot label="Report Service" client={reportClient} port="8083" />
          </div>
        </div>
        <SchedulerControl />
      </div>
    </div>
  )
}
