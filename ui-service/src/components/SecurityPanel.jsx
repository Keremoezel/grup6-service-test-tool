import { useState, useEffect } from 'react'
import { securityClient } from '../api/apiClient'
import toast from 'react-hot-toast'
import { Shield, Search, RefreshCw, Lock, Globe, ChevronDown, ChevronUp } from 'lucide-react'

function SeverityBadge({ severity }) {
  const cls = {
    CRITICAL: 'bg-red-900/60 text-red-300 border-red-700',
    HIGH: 'bg-orange-900/60 text-orange-300 border-orange-700',
    MEDIUM: 'bg-amber-900/60 text-amber-300 border-amber-700',
    LOW: 'bg-blue-900/60 text-blue-300 border-blue-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cls[severity] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {severity}
    </span>
  )
}

function RiskBadge({ risk }) {
  const colors = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-amber-400',
    LOW: 'text-green-400',
  }
  return <span className={`font-bold text-sm ${colors[risk] || 'text-gray-400'}`}>{risk}</span>
}

function ScoreRing({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="48" cy="48" r="40" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="48" y="54" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-gray-500 text-xs -mt-1">Score</span>
    </div>
  )
}

function ScanCard({ scan }) {
  const [open, setOpen] = useState(false)
  const critCount = scan.vulnerabilities?.filter(v => v.severity === 'CRITICAL').length ?? 0

  return (
    <div className={`rounded-2xl border mb-3 transition-all duration-300 ${critCount > 0 ? 'border-red-500/30 bg-red-950/10' : 'border-gray-800 bg-gray-900/60'}`}>
      <div className="flex items-center justify-between cursor-pointer p-4" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <Shield size={18} className={critCount > 0 ? 'text-red-400' : 'text-indigo-400'} />
          <div>
            <p className="font-semibold text-gray-200">{scan.serviceName}</p>
            <p className="text-gray-600 text-xs">{new Date(scan.timestamp).toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={scan.score} />
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 mb-1">Risk Level</p>
            <RiskBadge risk={scan.overallRisk} />
            <p className="text-xs text-gray-600 mt-1">{scan.vulnerabilities?.length ?? 0} findings</p>
          </div>
          {open ? <ChevronUp size={16} className="text-gray-600" /> : <ChevronDown size={16} className="text-gray-600" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3">
          {scan.vulnerabilities?.length > 0 ? (
            <div className="space-y-2">
              {scan.vulnerabilities.map((v, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={v.severity} />
                    <span className="text-xs text-gray-500 font-mono">{v.type}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{v.description}</p>
                  <p className="text-gray-600 text-xs mt-1">💡 {v.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-400 text-sm flex items-center gap-2">
              <span className="text-green-500">✓</span> No vulnerabilities found — clean scan
            </p>
          )}
        </div>
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
      toast.error('Security service unreachable')
    }
  }

  useEffect(() => { fetchScans() }, [])

  const handleScan = async () => {
    if (!serviceName.trim()) { toast.error('Enter a service name'); return }
    setScanning(true)
    const id = toast.loading('🔍 Running vulnerability scan...')
    try {
      await securityClient.runScan(serviceName)
      toast.success('Scan completed', { id })
      await fetchScans()
    } catch {
      toast.error('Scan failed', { id })
    } finally { setScanning(false) }
  }

  const handleSslCheck = async () => {
    if (!sslHost.trim()) { toast.error('Enter a hostname'); return }
    const id = toast.loading('🔒 Checking SSL...')
    try {
      const res = await securityClient.checkSsl(sslHost)
      setSslResult(res.data)
      toast.success('SSL check complete', { id })
    } catch { toast.error('SSL check failed', { id }) }
  }

  const handlePortCheck = async () => {
    if (!portHost.trim()) { toast.error('Enter a hostname'); return }
    const id = toast.loading('🌐 Scanning ports...')
    try {
      const res = await securityClient.checkPorts(portHost)
      setPortResult(res.data)
      toast.success('Port scan complete', { id })
    } catch { toast.error('Port scan failed', { id }) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield size={22} className="text-indigo-400" /> Security Panel
        </h2>
        <p className="text-gray-500 text-sm mt-1">Vulnerability scanning and security checks</p>
      </div>

      {/* Scan */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
          <Shield size={15} className="text-indigo-400" /> Vulnerability Scan
        </h3>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600 transition-all"
            placeholder="Service name (e.g. api-gateway, auth-service)"
            value={serviceName}
            onChange={e => setServiceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap active:scale-95"
            onClick={handleScan} disabled={scanning}
          >
            <Search size={15} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
        <p className="text-xs text-gray-600">Checks for OPEN_PORT, WEAK_CONFIG, SSL_ISSUE, AUTH_MISSING · Scores from 0–100</p>
      </div>

      {/* SSL & Port */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
            <Lock size={15} className="text-green-400" /> SSL Certificate Check
          </h3>
          <input
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 placeholder-gray-600 transition-all"
            placeholder="Hostname (e.g. example.com)"
            value={sslHost}
            onChange={e => setSslHost(e.target.value)}
          />
          <button className="w-full py-2 bg-green-800 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95" onClick={handleSslCheck}>
            Check SSL
          </button>
          {sslResult && (
            <div className="bg-gray-800/50 rounded-xl p-3 text-sm space-y-1.5">
              <p className="flex justify-between"><span className="text-gray-500">Valid SSL</span> <span className={sslResult.sslValid ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{sslResult.sslValid ? '✓ Yes' : '✗ No'}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">HTTPS Redirect</span> <span className={sslResult.httpsRedirect ? 'text-green-400' : 'text-amber-400'}>{sslResult.httpsRedirect ? 'Enabled' : 'Disabled'}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">TLS Version</span> <span className="text-gray-300">{sslResult.tlsVersion}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">Cert Expiry</span> <span className="text-gray-300">{sslResult.certificateDaysRemaining} days</span></p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
            <Globe size={15} className="text-amber-400" /> Port Scanner
          </h3>
          <input
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder-gray-600 transition-all"
            placeholder="Hostname (e.g. myserver.com)"
            value={portHost}
            onChange={e => setPortHost(e.target.value)}
          />
          <button className="w-full py-2 bg-amber-800 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95" onClick={handlePortCheck}>
            Scan Ports
          </button>
          {portResult && (
            <div className="space-y-1.5">
              {portResult.ports?.map(p => (
                <div key={p.port} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-400 font-mono">{p.port} <span className="text-gray-600">({p.service})</span></span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${p.open ? 'text-amber-400' : 'text-gray-600'}`}>{p.open ? 'OPEN' : 'CLOSED'}</span>
                    {p.open && <span className={`text-xs px-1.5 py-0.5 rounded border ${p.risk === 'HIGH' ? 'bg-orange-900/50 text-orange-300 border-orange-700' : 'bg-blue-900/50 text-blue-300 border-blue-700'}`}>{p.risk}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2">
            Scan History
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{scans.length}</span>
          </h3>
          <button onClick={fetchScans} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs border border-gray-700 transition-all">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        {scans.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 text-center py-14 text-gray-600">
            <Shield size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No security scans yet</p>
            <p className="text-xs mt-1 text-gray-700">Enter a service name above and click Run Scan</p>
          </div>
        ) : (
          scans.map(scan => <ScanCard key={scan.scanId} scan={scan} />)
        )}
      </div>
    </div>
  )
}
