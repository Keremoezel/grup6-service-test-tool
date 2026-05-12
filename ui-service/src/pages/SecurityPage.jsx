import { useState, useEffect } from 'react'
import { securityClient, TARGET_VIDEO_URL } from '../api/apiClient'
import {
  Card, CardHeader, Button, Badge, SeverityBadge, ScoreRing,
  Empty, Divider, Label, Spinner
} from '../components/ui'

// ─── Finding row ──────────────────────────────────────────────────────────────
function FindingItem({ finding }) {
  const borderColor = {
    CRITICAL: 'border-red-200 bg-red-50/40',
    HIGH:     'border-orange-200 bg-orange-50/40',
    MEDIUM:   'border-amber-200 bg-amber-50/30',
    LOW:      'border-blue-200 bg-blue-50/30',
  }
  return (
    <div className={`rounded-lg border p-4 ${borderColor[finding.severity] || 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start gap-3 mb-2">
        <SeverityBadge severity={finding.severity} />
        <span className="text-xs font-mono text-gray-600">{finding.type}</span>
        {finding.status && (
          <span className={`text-xs font-mono ml-auto ${finding.status === 200 ? 'text-green-600' : 'text-red-500'}`}>
            HTTP {finding.status}
          </span>
        )}
        {finding.endpoint && (
          <span className="text-xs font-mono text-gray-400">{finding.endpoint}</span>
        )}
      </div>
      <p className="text-xs text-gray-700 mb-1.5">{finding.description}</p>
      {finding.detail && (
        <div className="font-mono text-[10px] text-gray-500 bg-white/60 border border-gray-200 rounded px-3 py-1.5 mb-2 break-all">
          {finding.detail}
        </div>
      )}
      <p className="text-[11px] text-gray-500">
        <span className="font-medium text-gray-600">Recommendation: </span>
        {finding.recommendation}
      </p>
    </div>
  )
}


// ─── Scan card (collapsible) ──────────────────────────────────────────────────
function ScanCard({ scan }) {
  const [open, setOpen] = useState(false)
  const critCount = scan.vulnerabilities?.filter(v => v.severity === 'CRITICAL').length ?? 0

  return (
    <Card padding={false} className={critCount > 0 ? 'ring-1 ring-red-200' : ''}>
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <ScoreRing score={scan.score} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{scan.serviceName}</p>
            <Badge variant={
              scan.overallRisk === 'CRITICAL' ? 'red'
                : scan.overallRisk === 'HIGH' ? 'orange'
                : scan.overallRisk === 'MEDIUM' ? 'amber'
                : 'blue'
            } size="xs">{scan.overallRisk}</Badge>
          </div>
          <p className="text-xs text-gray-400">
            {new Date(scan.timestamp).toLocaleString('en-US')} · {scan.vulnerabilities?.length ?? 0} findings
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {(scan.vulnerabilities?.length ?? 0) === 0 ? (
            <p className="text-green-600 text-sm">No vulnerabilities found — clean scan.</p>
          ) : (
            scan.vulnerabilities.map((v, i) => (
              <div key={i} className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <SeverityBadge severity={v.severity} />
                  <span className="text-[10px] font-mono text-gray-500">{v.type}</span>
                </div>
                <p className="text-xs text-gray-700 mb-1">{v.description}</p>
                <p className="text-[11px] text-gray-400">{v.recommendation}</p>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SecurityPage() {
  const [scans, setScans] = useState([])
  const [scanning, setScanning] = useState(false)
  const [serviceName, setServiceName] = useState('target-video-service')
  const [showAll, setShowAll] = useState(false)

  const [sslHost, setSslHost] = useState('localhost')
  const [sslResult, setSslResult] = useState(null)
  const [sslLoading, setSslLoading] = useState(false)

  const [portHost, setPortHost] = useState('localhost')
  const [portResult, setPortResult] = useState(null)
  const [portLoading, setPortLoading] = useState(false)

  const fetchScans = async () => {
    try { const r = await securityClient.getAllScans(); setScans([...r.data].reverse()) } catch {}
  }
  useEffect(() => { fetchScans() }, [])

  const handleScan = async () => {
    setScanning(true)
    try { await securityClient.runScan(serviceName); await fetchScans() }
    finally { setScanning(false) }
  }

  const handleSsl = async () => {
    setSslLoading(true)
    try { const r = await securityClient.checkSsl(sslHost); setSslResult(r.data) }
    finally { setSslLoading(false) }
  }

  const handlePort = async () => {
    setPortLoading(true)
    try { const r = await securityClient.checkPorts(portHost); setPortResult(r.data) }
    finally { setPortLoading(false) }
  }

  const handleClear = async () => {
    try { await securityClient.clearScans(); setScans([]) } catch {}
  }

  // De-duplicate — show latest per service unless showAll
  const displayedScans = showAll
    ? scans
    : Object.values(
        scans.reduce((acc, s) => {
          if (!acc[s.serviceName] || new Date(s.timestamp) > new Date(acc[s.serviceName].timestamp))
            acc[s.serviceName] = s
          return acc
        }, {})
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Controls row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deep scan */}
        <Card>
          <p className="text-sm font-semibold text-gray-900 mb-1">Deep Scan</p>
          <p className="text-xs text-gray-500 mb-4">CVSS-style scoring · checks auth, SSL, config, ports</p>
          <select
            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            value={serviceName} onChange={e => setServiceName(e.target.value)}
          >
            <option value="target-video-service">target-video-service</option>
            <option value="chaos-service">chaos-service</option>
            <option value="security-service">security-service</option>
            <option value="report-service">report-service</option>
          </select>
          <Button variant="primary" size="md" className="w-full" loading={scanning} onClick={handleScan}>
            Run Scan
          </Button>
        </Card>

        {/* SSL check */}
        <Card>
          <p className="text-sm font-semibold text-gray-900 mb-1">SSL Certificate</p>
          <p className="text-xs text-gray-500 mb-4">Validate TLS configuration and expiry</p>
          <input
            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 placeholder-gray-400"
            placeholder="hostname (e.g. example.com)"
            value={sslHost} onChange={e => setSslHost(e.target.value)}
          />
          <Button variant="secondary" size="md" className="w-full" loading={sslLoading} onClick={handleSsl}>
            Check SSL
          </Button>
          {sslResult && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {[
                ['Valid SSL', sslResult.sslValid ? '✓ Yes' : '✗ No', sslResult.sslValid ? 'text-green-600' : 'text-red-500'],
                ['HTTPS Redirect', sslResult.httpsRedirect ? 'Enabled' : 'Disabled', sslResult.httpsRedirect ? 'text-green-600' : 'text-amber-600'],
                ['TLS Version', sslResult.tlsVersion, 'text-gray-700'],
                ['Cert Expiry', `${sslResult.certificateDaysRemaining} days`, 'text-gray-700'],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-medium ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Port scan */}
        <Card>
          <p className="text-sm font-semibold text-gray-900 mb-1">Port Scanner</p>
          <p className="text-xs text-gray-500 mb-4">Detect open ports and exposure risks</p>
          <input
            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 placeholder-gray-400"
            placeholder="hostname"
            value={portHost} onChange={e => setPortHost(e.target.value)}
          />
          <Button variant="secondary" size="md" className="w-full" loading={portLoading} onClick={handlePort}>
            Scan Ports
          </Button>
          {portResult && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
              {portResult.ports?.map(p => (
                <div key={p.port} className="flex items-center justify-between text-xs py-1">
                  <span className="font-mono text-gray-600">{p.port} <span className="text-gray-400">({p.service})</span></span>
                  <div className="flex items-center gap-1.5">
                    <span className={p.open ? 'text-amber-600 font-medium' : 'text-gray-400'}>{p.open ? 'Open' : 'Closed'}</span>
                    {p.open && <Badge variant={p.risk === 'HIGH' ? 'red' : 'blue'} size="xs">{p.risk}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Scan history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Scan History</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{scans.length}</span>
            {scans.length > displayedScans.length && (
              <span className="text-xs text-gray-400">· showing {displayedScans.length} latest</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {scans.length > displayedScans.length && (
              <Button variant="ghost" size="xs" onClick={() => setShowAll(v => !v)}>
                {showAll ? 'Show latest only' : `Show all (${scans.length})`}
              </Button>
            )}
            <Button variant="ghost" size="xs" onClick={fetchScans}>Refresh</Button>
            {scans.length > 0 && (
              <Button variant="ghost" size="xs" className="text-red-600 hover:bg-red-50" onClick={handleClear}>
                Clear all
              </Button>
            )}
          </div>
        </div>

        {displayedScans.length === 0 ? (
          <Card>
            <Empty icon="🛡" title="No scans yet" description="Run a scan using the controls above" />
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedScans.map(scan => <ScanCard key={scan.scanId} scan={scan} />)}
          </div>
        )}
      </div>
    </div>
  )
}