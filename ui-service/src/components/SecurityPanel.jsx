import { useState, useEffect } from 'react'
import { securityClient, TARGET_VIDEO_URL } from '../api/apiClient'
import toast from 'react-hot-toast'
import { Shield, Search, RefreshCw, Lock, Globe, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react'

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

function ScoreRing({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="48" y="54" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-gray-500 text-xs -mt-1">Score</span>
    </div>
  )
}

function ScanCard({ scan }) {
  const [open, setOpen] = useState(false)
  const critCount = scan.vulnerabilities?.filter(v => v.severity === 'CRITICAL').length ?? 0
  const riskColor = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-amber-400', LOW: 'text-green-400' }
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
            <span className={`font-bold text-sm ${riskColor[scan.overallRisk] || 'text-gray-400'}`}>{scan.overallRisk}</span>
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

// ── Real-time vulnerability probe of the actual target service ────────────────
function RealVulnProbe() {
  const [findings, setFindings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const probe = async () => {
    setLoading(true)
    const results = []

    // 1. AUTH_MISSING — /api/debug accessible without auth?
    try {
      const r = await fetch(`${TARGET_VIDEO_URL}/api/debug`, { signal: AbortSignal.timeout(5000) })
      if (r.ok) {
        const body = await r.json()
        results.push({
          severity: 'CRITICAL',
          type: 'AUTH_MISSING',
          endpoint: '/api/debug',
          status: r.status,
          description: 'Debug endpoint is publicly accessible without authentication.',
          detail: `Exposed: adminSecret=${body.secrets?.adminSecret ?? '?'}, dbPassword=${body.secrets?.dbPassword ?? '?'}`,
          recommendation: 'Add authentication middleware to /api/debug or remove it in production.',
        })
      }
    } catch { /* timeout / network */ }

    // 2. CORS_OPEN — Access-Control-Allow-Origin: *?
    try {
      const r = await fetch(`${TARGET_VIDEO_URL}/api/videos`, { signal: AbortSignal.timeout(5000) })
      const cors = r.headers.get('access-control-allow-origin')
      if (cors === '*') {
        results.push({
          severity: 'HIGH',
          type: 'CORS_OPEN',
          endpoint: '/api/videos',
          status: r.status,
          description: 'API allows cross-origin requests from ANY domain (Access-Control-Allow-Origin: *).',
          detail: `Header: Access-Control-Allow-Origin: ${cors}`,
          recommendation: 'Restrict CORS to specific trusted origins instead of wildcard.',
        })
      }
    } catch { /* timeout */ }

    // 3. INFO_DISCLOSURE — /api/health exposes internal chaos state?
    try {
      const r = await fetch(`${TARGET_VIDEO_URL}/api/health`, { signal: AbortSignal.timeout(5000) })
      if (r.ok) {
        const body = await r.json()
        if (body.chaos !== undefined) {
          results.push({
            severity: 'MEDIUM',
            type: 'INFO_DISCLOSURE',
            endpoint: '/api/health',
            status: r.status,
            description: 'Health endpoint discloses internal chaos state and uptime.',
            detail: `Exposed: uptime=${body.uptime}, chaos.active=${body.chaos?.active}, killed=${body.chaos?.killed}`,
            recommendation: 'Remove sensitive internal state from public health endpoints.',
          })
        }
      }
    } catch { /* timeout */ }

    // 4. WEAK_CONFIG — Check if service is actually reachable (open port)
    try {
      const r = await fetch(`${TARGET_VIDEO_URL}/`, { signal: AbortSignal.timeout(5000) })
      results.push({
        severity: 'LOW',
        type: 'OPEN_PORT',
        endpoint: '/',
        status: r.status,
        description: 'Service is publicly reachable on port 4000 with no network-level protection.',
        detail: `HTTP ${r.status} — Server accessible without VPN or firewall',`,
        recommendation: 'In production, restrict direct port access via firewall / load balancer.',
      })
    } catch { /* unreachable */ }

    setFindings(results)
    setLastChecked(new Date().toLocaleTimeString('en-US'))
    setLoading(false)
  }

  useEffect(() => { probe() }, [])

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  const sorted = findings ? [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) : []
  const score = findings
    ? Math.max(0, 100 - sorted.reduce((acc, f) => acc + (f.severity === 'CRITICAL' ? 40 : f.severity === 'HIGH' ? 20 : f.severity === 'MEDIUM' ? 10 : 5), 0))
    : null

  return (
    <div className="rounded-2xl border border-indigo-900/40 bg-indigo-950/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-200 flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" /> Live Vulnerability Probe
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Direct HTTP probes against <span className="text-indigo-400 font-mono">{TARGET_VIDEO_URL}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && <span className="text-gray-700 text-xs">{lastChecked}</span>}
          {score !== null && (
            <div className={`text-lg font-bold ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {score}/100
            </div>
          )}
          <button onClick={probe} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50">
            <Search size={12} className={loading ? 'animate-pulse' : ''} />
            {loading ? 'Probing...' : 'Re-scan'}
          </button>
        </div>
      </div>

      {/* Findings */}
      {findings === null ? (
        <div className="text-center py-8 text-gray-600 text-sm">Running probe...</div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center gap-2 text-green-400 text-sm py-4">
          <CheckCircle size={16} /> Target service is unreachable — cannot probe (check if pnpm run dev is running)
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((f, i) => (
            <div key={i} className={`rounded-xl p-4 border ${
              f.severity === 'CRITICAL' ? 'bg-red-950/20 border-red-800/50' :
              f.severity === 'HIGH' ? 'bg-orange-950/15 border-orange-800/40' :
              f.severity === 'MEDIUM' ? 'bg-amber-950/15 border-amber-800/40' :
              'bg-gray-800/30 border-gray-700/40'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-xs font-mono text-gray-500">{f.type}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    f.status >= 500 ? 'bg-red-900/30 text-red-400 border-red-800' :
                    f.status >= 200 ? 'bg-green-900/30 text-green-400 border-green-800' :
                    'bg-gray-800 text-gray-500 border-gray-700'
                  }`}>HTTP {f.status}</span>
                </div>
                <span className="text-gray-600 text-xs font-mono shrink-0">{f.endpoint}</span>
              </div>
              <p className="text-gray-300 text-sm mb-1">{f.description}</p>
              {f.detail && (
                <p className="text-gray-500 text-xs font-mono bg-black/20 rounded px-2 py-1 mb-1">{f.detail}</p>
              )}
              <p className="text-gray-600 text-xs">💡 {f.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SecurityPanel() {
  const [serviceName, setServiceName] = useState('target-video-service')
  const [scans, setScans] = useState([])
  const [scanning, setScanning] = useState(false)
  const [sslHost, setSslHost] = useState('localhost')
  const [sslResult, setSslResult] = useState(null)
  const [portHost, setPortHost] = useState('localhost')
  const [portResult, setPortResult] = useState(null)

  const fetchScans = async () => {
    try {
      const res = await securityClient.getAllScans()
      setScans([...res.data].reverse())
    } catch { toast.error('Security service unreachable') }
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
    } catch { toast.error('Scan failed', { id }) }
    finally { setScanning(false) }
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
        <p className="text-gray-500 text-sm mt-1">
          Real HTTP probes + simulated scans on <span className="text-indigo-400 font-mono text-xs">target-video-service</span>
        </p>
      </div>

      {/* ── REAL LIVE PROBE — actual HTTP findings ─────────────────────────── */}
      <RealVulnProbe />

      {/* ── Simulated scan (security-service) ─────────────────────────────── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
          <Shield size={15} className="text-indigo-400" /> Deep Scan (security-service)
          <span className="text-xs text-gray-600 font-normal ml-1">— simulated CVSS-style scoring</span>
        </h3>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600 transition-all"
            placeholder="Service name (e.g. target-video-service)"
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
        <p className="text-xs text-gray-600">Checks OPEN_PORT, WEAK_CONFIG, SSL_ISSUE, AUTH_MISSING · Scores 0–100</p>
      </div>

      {/* SSL & Port */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
            <Lock size={15} className="text-green-400" /> SSL Certificate Check
          </h3>
          <input
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 placeholder-gray-600"
            placeholder="Hostname (e.g. example.com)"
            value={sslHost}
            onChange={e => setSslHost(e.target.value)}
          />
          <button className="w-full py-2 bg-green-800 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95" onClick={handleSslCheck}>
            Check SSL
          </button>
          {sslResult && (
            <div className="bg-gray-800/50 rounded-xl p-3 text-sm space-y-1.5">
              <p className="flex justify-between"><span className="text-gray-500">Valid SSL</span><span className={sslResult.sslValid ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{sslResult.sslValid ? '✓ Yes' : '✗ No'}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">HTTPS Redirect</span><span className={sslResult.httpsRedirect ? 'text-green-400' : 'text-amber-400'}>{sslResult.httpsRedirect ? 'Enabled' : 'Disabled'}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">TLS Version</span><span className="text-gray-300">{sslResult.tlsVersion}</span></p>
              <p className="flex justify-between"><span className="text-gray-500">Cert Expiry</span><span className="text-gray-300">{sslResult.certificateDaysRemaining} days</span></p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm">
            <Globe size={15} className="text-amber-400" /> Port Scanner
          </h3>
          <input
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder-gray-600"
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
            Scan History <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{scans.length}</span>
          </h3>
          <button onClick={fetchScans} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs border border-gray-700">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        {scans.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 text-center py-14 text-gray-600">
            <Shield size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No deep scans yet — click Run Scan above</p>
          </div>
        ) : (
          scans.map(scan => <ScanCard key={scan.scanId} scan={scan} />)
        )}
      </div>
    </div>
  )
}
