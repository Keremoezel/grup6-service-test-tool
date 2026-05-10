import { useEffect, useState } from 'react'
import { chaosClient, securityClient, reportClient, schedulerClient } from '../api/apiClient'
import { Activity, Shield, FileText, RefreshCw, Zap, Play, Square, Timer } from 'lucide-react'
import toast from 'react-hot-toast'

function StatCard({ title, value, subtitle, color, icon: Icon }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

function HealthBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const label = score >= 70 ? 'Saglikli' : score >= 40 ? 'Dikkat' : 'Kritik'
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-gray-300">Genel Sistem Sagligi</span>
        <span className={`text-sm font-bold ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {label} — {score}/100
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-4">
        <div className={`${color} h-4 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function ServiceStatus({ label, client }) {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    client.health().then(() => setStatus('up')).catch(() => setStatus('down'))
  }, [])
  const dot = status === 'up' ? 'bg-green-500' : status === 'down' ? 'bg-red-500' : 'bg-amber-500'
  const text = status === 'up' ? 'Calisıyor' : status === 'down' ? 'Erisilemez' : 'Kontrol...'
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-300 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot} ${status === 'checking' ? 'animate-pulse' : ''}`} />
        <span className={`text-xs font-medium ${status === 'up' ? 'text-green-400' : status === 'down' ? 'text-red-400' : 'text-amber-400'}`}>{text}</span>
      </div>
    </div>
  )
}

function SchedulerControl() {
  const [schedulerStatus, setSchedulerStatus] = useState({ enabled: false, intervalSeconds: 60, lastRunAt: null })
  const [interval, setInterval_] = useState(60)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await schedulerClient.status()
      setSchedulerStatus(res.data)
    } catch {
      // report servisi hazir degilse sessizce gec
    }
  }

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleStart = async () => {
    setLoading(true)
    try {
      await schedulerClient.start(interval)
      toast.success(`Otomatik testler baslatildi (her ${interval}sn)`)
      await fetchStatus()
    } catch {
      toast.error('Zamanlayici baslatılamadi')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await schedulerClient.stop()
      toast.success('Otomatik testler durduruldu')
      await fetchStatus()
    } catch {
      toast.error('Zamanlayici durdurulamadi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Timer size={16} className="text-indigo-400" />
        <h3 className="font-semibold text-gray-300">Otomatik Test Zamanlayici</h3>
        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
          schedulerStatus.enabled
            ? 'bg-green-900/50 text-green-300 border border-green-700'
            : 'bg-gray-800 text-gray-500 border border-gray-700'
        }`}>
          {schedulerStatus.enabled ? '● Aktif' : '○ Durdu'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Aralik (saniye)</label>
          <input
            type="number"
            min="10"
            max="3600"
            className="input text-sm py-1.5"
            value={interval}
            onChange={e => setInterval_(Number(e.target.value))}
            disabled={schedulerStatus.enabled}
          />
        </div>
        {!schedulerStatus.enabled ? (
          <button className="btn-primary flex items-center gap-2 mt-5 whitespace-nowrap" onClick={handleStart} disabled={loading}>
            <Play size={14} /> Baslat
          </button>
        ) : (
          <button className="btn-danger flex items-center gap-2 mt-5 whitespace-nowrap" onClick={handleStop} disabled={loading}>
            <Square size={14} /> Durdur
          </button>
        )}
      </div>

      {schedulerStatus.enabled && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>Aralik: <span className="text-gray-400">{schedulerStatus.intervalSeconds} saniye</span></p>
          <p>Son calistirma: <span className="text-gray-400">{
            schedulerStatus.lastRunAt === 'Henuz calistirilmadi'
              ? 'Bekleniyor...'
              : new Date(schedulerStatus.lastRunAt).toLocaleTimeString('tr-TR')
          }</span></p>
          <p className="text-indigo-400 animate-pulse">Chaos + Security testleri otomatik yurutüluyor...</p>
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
      setLastUpdate(new Date().toLocaleTimeString('tr-TR'))
    } catch {
      // servisler hazir degilse sessizce gec
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">10 saniyede bir otomatik guncellenir</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && <span className="text-gray-500 text-xs">Son: {lastUpdate}</span>}
          <button onClick={fetchStats} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Toplam Chaos Olayi" value={stats?.chaosTotalEvents ?? 0} subtitle="Kill / Delay / Error" color="bg-red-900/40 text-red-300" icon={Zap} />
        <StatCard title="Guvenlik Taramasi" value={stats?.securityTotalScans ?? 0} subtitle="Toplam tarama sayisi" color="bg-indigo-900/40 text-indigo-300" icon={Shield} />
        <StatCard title="Kritik Acik" value={stats?.criticalVulnerabilities ?? 0} subtitle="Tum taramalarda" color="bg-orange-900/40 text-orange-300" icon={Activity} />
        <StatCard title="Ort. Guvenlik Skoru" value={stats ? `${stats.securityAverageScore}/100` : '—'} subtitle="Yuksek = guvenli" color="bg-green-900/40 text-green-300" icon={FileText} />
      </div>

      {stats && <HealthBar score={stats.overallHealthScore ?? 0} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Servis Durumlari</h3>
          <ServiceStatus label="Chaos Service (8081)" client={chaosClient} />
          <ServiceStatus label="Security Service (8082)" client={securityClient} />
          <ServiceStatus label="Report Service (8083)" client={reportClient} />
        </div>
        <SchedulerControl />
      </div>
    </div>
  )
}
