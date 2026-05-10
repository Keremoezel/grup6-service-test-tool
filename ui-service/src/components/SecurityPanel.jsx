import { useState, useEffect } from 'react'
import { securityClient } from '../api/apiClient'
import toast from 'react-hot-toast'
import { Shield, Search, RefreshCw, Lock, Globe } from 'lucide-react'

function SeverityBadge({ severity }) {
  const cls = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }
  return <span className={cls[severity] || 'badge-low'}>{severity}</span>
}

function RiskBadge({ risk }) {
  const colors = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-amber-400',
    LOW: 'text-green-400',
  }
  return <span className={`font-bold ${colors[risk] || 'text-gray-400'}`}>{risk}</span>
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="60" y="65" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-gray-400 text-sm -mt-2">Guvenlik Skoru</span>
    </div>
  )
}

function ScanCard({ scan }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-indigo-400 shrink-0" />
          <div>
            <p className="font-semibold text-gray-200">{scan.serviceName}</p>
            <p className="text-gray-500 text-xs">{new Date(scan.timestamp).toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreGauge score={scan.score} />
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Risk Seviyesi</p>
            <RiskBadge risk={scan.overallRisk} />
            <p className="text-xs text-gray-500 mt-1">{scan.vulnerabilities?.length ?? 0} acik</p>
          </div>
        </div>
      </div>

      {open && scan.vulnerabilities?.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
          {scan.vulnerabilities.map((v, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={v.severity} />
                <span className="text-xs text-gray-400 font-mono">{v.type}</span>
              </div>
              <p className="text-gray-300 text-sm">{v.description}</p>
              <p className="text-gray-500 text-xs">💡 {v.recommendation}</p>
            </div>
          ))}
        </div>
      )}
      {open && scan.vulnerabilities?.length === 0 && (
        <p className="mt-3 text-green-400 text-sm border-t border-gray-800 pt-3">✓ Guvenlik acigi bulunamadi</p>
      )}
    </div>
  )
}

export default function SecurityPanel() {
  const [serviceName, setServiceName] = useState('')
  const [scans, setScans] = useState([])
  const [scanning, setScanning] = useState(false)
  const [sslHost, setSslHost] = useState('')
  const [sslResult, setSslResult] = useState(null)
  const [portHost, setPortHost] = useState('')
  const [portResult, setPortResult] = useState(null)

  const fetchScans = async () => {
    try {
      const res = await securityClient.getAllScans()
      setScans([...res.data].reverse())
    } catch {
      toast.error('Security servisi erisilemez')
    }
  }

  useEffect(() => { fetchScans() }, [])

  const handleScan = async () => {
    if (!serviceName.trim()) { toast.error('Servis adi girin'); return }
    setScanning(true)
    const id = toast.loading('Guvenlik taramasi calistiriliyor...')
    try {
      await securityClient.runScan(serviceName)
      toast.success('Tarama tamamlandi', { id })
      await fetchScans()
    } catch {
      toast.error('Tarama basarisiz', { id })
    } finally {
      setScanning(false)
    }
  }

  const handleSslCheck = async () => {
    if (!sslHost.trim()) { toast.error('Host girin'); return }
    const id = toast.loading('SSL kontrol ediliyor...')
    try {
      const res = await securityClient.checkSsl(sslHost)
      setSslResult(res.data)
      toast.success('SSL kontrolu tamamlandi', { id })
    } catch {
      toast.error('SSL kontrolu basarisiz', { id })
    }
  }

  const handlePortCheck = async () => {
    if (!portHost.trim()) { toast.error('Host girin'); return }
    const id = toast.loading('Portlar taranıyor...')
    try {
      const res = await securityClient.checkPorts(portHost)
      setPortResult(res.data)
      toast.success('Port taramasi tamamlandi', { id })
    } catch {
      toast.error('Port taramasi basarisiz', { id })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Panel</h2>
        <p className="text-gray-500 text-sm mt-1">Guvenlik acigi taramasi ve kontroller</p>
      </div>

      {/* Tarama */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2">
          <Shield size={16} className="text-indigo-400" /> Guvenlik Taramasi
        </h3>
        <div className="flex gap-3">
          <input
            className="input"
            placeholder="Servis adi (orn: api-gateway)"
            value={serviceName}
            onChange={e => setServiceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <button className="btn-primary flex items-center gap-2 whitespace-nowrap" onClick={handleScan} disabled={scanning}>
            <Search size={16} />
            {scanning ? 'Taranıyor...' : 'Tara'}
          </button>
        </div>
      </div>

      {/* SSL ve Port Kontrol */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2">
            <Lock size={16} className="text-green-400" /> SSL Kontrol
          </h3>
          <input className="input" placeholder="Host (orn: example.com)" value={sslHost} onChange={e => setSslHost(e.target.value)} />
          <button className="btn-primary w-full" onClick={handleSslCheck}>Kontrol Et</button>
          {sslResult && (
            <div className="bg-gray-800/50 rounded-xl p-3 text-sm space-y-1">
              <p><span className="text-gray-500">SSL Gecerli:</span> <span className={sslResult.sslValid ? 'text-green-400' : 'text-red-400'}>{sslResult.sslValid ? '✓ Evet' : '✗ Hayir'}</span></p>
              <p><span className="text-gray-500">HTTPS Yonlendirme:</span> <span className={sslResult.httpsRedirect ? 'text-green-400' : 'text-amber-400'}>{sslResult.httpsRedirect ? 'Var' : 'Yok'}</span></p>
              <p><span className="text-gray-500">TLS Surumu:</span> <span className="text-gray-300">{sslResult.tlsVersion}</span></p>
              <p><span className="text-gray-500">Kalan Gun:</span> <span className="text-gray-300">{sslResult.certificateDaysRemaining} gun</span></p>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2">
            <Globe size={16} className="text-amber-400" /> Port Tarama
          </h3>
          <input className="input" placeholder="Host (orn: myserver.com)" value={portHost} onChange={e => setPortHost(e.target.value)} />
          <button className="btn-primary w-full" onClick={handlePortCheck}>Tara</button>
          {portResult && (
            <div className="space-y-1">
              {portResult.ports?.map(p => (
                <div key={p.port} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-gray-400 font-mono">{p.port} <span className="text-gray-600">({p.service})</span></span>
                  <div className="flex items-center gap-2">
                    <span className={p.open ? 'text-amber-400' : 'text-gray-600'}>{p.open ? 'Acik' : 'Kapali'}</span>
                    {p.open && <span className={`badge-${p.risk === 'HIGH' ? 'high' : 'low'}`}>{p.risk}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tarama gecmisi */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-300">
            Tarama Gecmisi
            <span className="ml-2 text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{scans.length}</span>
          </h3>
          <button onClick={fetchScans} className="btn-secondary flex items-center gap-1 text-xs py-1 px-2">
            <RefreshCw size={12} /> Yenile
          </button>
        </div>
        {scans.length === 0 ? (
          <div className="card text-center py-10 text-gray-600">
            <Shield size={36} className="mx-auto mb-3 opacity-30" />
            <p>Henuz guvenlik taramasi yapilmadi</p>
          </div>
        ) : (
          scans.map(scan => <ScanCard key={scan.scanId} scan={scan} />)
        )}
      </div>
    </div>
  )
}
