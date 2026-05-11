import { useState, useEffect, useCallback } from 'react'
import { chaosClient, securityClient, reportClient, TARGET_VIDEO_URL } from '../api/apiClient'
import {
  Card, CardHeader, Button, Badge, StatusDot, Label, Spinner,
  ProgressBar, StatItem, Empty, Divider
} from '../components/ui'

function HealthScore({ score }) {
  const color = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Degraded' : 'Critical'
  return (
    <Card className="col-span-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">System Health Score</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-mono font-medium tabular-nums ${color}`}>{score}</span>
            <span className="text-sm text-gray-400">/100</span>
            <Badge variant={score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red'} dot pulse={score < 40}>
              {label}
            </Badge>
          </div>
        </div>
      </div>
      <ProgressBar value={score} />
    </Card>
  )
}

function MetricCard({ label, value, subtext, variant = 'default', alert = false }) {
  const valColor = {
    default: 'text-gray-900',
    red:     'text-red-600',
    green:   'text-green-600',
    blue:    'text-blue-600',
    amber:   'text-amber-600',
  }
  return (
    <Card className={alert ? 'ring-1 ring-red-200' : ''}>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-mono font-medium tabular-nums ${valColor[variant]}`}>{value ?? '—'}</p>
      {subtext && <p className="text-[11px] text-gray-400 mt-1">{subtext}</p>}
    </Card>
  )
}

function ServiceStatusCard({ chaosState }) {
  const isKilled = chaosState?.killed
  const hasDelay = (chaosState?.delayMs ?? 0) > 0
  const hasError = (chaosState?.errorRate ?? 0) > 0
  const hasChaos = isKilled || hasDelay || hasError

  return (
    <Card className={isKilled ? 'ring-1 ring-red-200' : ''}>
      <CardHeader
        title="Target Service"
        subtitle={TARGET_VIDEO_URL}
        action={
          <Badge
            variant={isKilled ? 'red' : hasChaos ? 'amber' : 'green'}
            dot
            pulse={isKilled}
          >
            {isKilled ? 'Killed' : hasChaos ? 'Degraded' : 'Operational'}
          </Badge>
        }
      />
      <div className="space-y-3">
        <Row label="Service" value="target-video-service" mono />
        <Row label="Runtime" value="Nuxt 3 — Video Streaming" />
        <Row label="Port" value="4000" mono />
        {hasDelay && <Row label="Injected Delay" value={`${chaosState.delayMs}ms`} mono highlight="amber" />}
        {hasError && <Row label="Error Rate" value={`${chaosState.errorRate}%`} mono highlight="orange" />}
        {isKilled && <Row label="Status" value="Returning 503 for all requests" highlight="red" />}
      </div>
    </Card>
  )
}

function Row({ label, value, mono, highlight }) {
  const textColor = {
    red:    'text-red-600 font-medium',
    amber:  'text-amber-600 font-medium',
    orange: 'text-orange-600 font-medium',
  }
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} ${textColor[highlight] || 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

function InternalServicesCard({ clients }) {
  const [status, setStatus] = useState({ chaos: 'checking', security: 'checking', report: 'checking' })

  useEffect(() => {
    const services = [
      ['chaos', chaosClient],
      ['security', securityClient],
      ['report', reportClient],
    ]
    const check = () => services.forEach(([key, client]) => {
      client.health()
        .then(() => setStatus(p => ({ ...p, [key]: 'up' })))
        .catch(() => setStatus(p => ({ ...p, [key]: 'down' })))
    })
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])

  const services = [
    { key: 'chaos',    label: 'Chaos Service',    port: 8081 },
    { key: 'security', label: 'Security Service',  port: 8082 },
    { key: 'report',   label: 'Report Service',    port: 8083 },
  ]

  return (
    <Card>
      <CardHeader title="Internal Services" subtitle="Microservice health status" />
      <div className="space-y-2">
        {services.map(({ key, label, port }) => (
          <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
            <div>
              <p className="text-xs font-medium text-gray-700">{label}</p>
              <p className="text-[10px] text-gray-400 font-mono">:{port}</p>
            </div>
            <StatusDot status={status[key]} />
          </div>
        ))}
      </div>
    </Card>
  )
}


export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [chaosState, setChaosState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [resetting, setResetting] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, chaosRes] = await Promise.allSettled([
        reportClient.getStats(),
        chaosClient.targetStatus(),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (chaosRes.status === 'fulfilled') setChaosState(chaosRes.value.data)
      setLastUpdate(new Date().toLocaleTimeString('en-US'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 10000); return () => clearInterval(t) }, [fetchAll])

  const handleRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false) }

  const handleReset = async () => {
    setResetting(true)
    try {
      await Promise.all([chaosClient.reset(), securityClient.clearScans()])
      await fetchAll()
    } finally { setResetting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size={20} color="#6b7280" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-xs text-gray-400">Updated {lastUpdate}</span>}
          <Button variant="secondary" size="sm" onClick={handleRefresh} loading={refreshing}
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={handleReset} loading={resetting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>}>
            Reset All
          </Button>
        </div>
      </div>

      {/* Health bar */}
      {stats && <HealthScore score={stats.overallHealthScore ?? 0} />}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Chaos Attacks"
          value={stats?.chaosTotalEvents ?? 0}
          subtext="Kill / Delay / Error"
          variant={(stats?.chaosTotalEvents ?? 0) > 5 ? 'red' : 'default'}
          alert={(stats?.chaosTotalEvents ?? 0) > 5}
        />
        <MetricCard
          label="Security Scans"
          value={(stats?.securityTotalScans ?? 0) > 0 ? stats.securityTotalScans : '—'}
          subtext={(stats?.securityTotalScans ?? 0) > 0 ? 'Completed scans' : 'No scans run yet'}
          variant="blue"
        />
        <MetricCard
          label="Critical Vulnerabilities"
          value={(stats?.securityTotalScans ?? 0) > 0 ? (stats?.criticalVulnerabilities ?? 0) : '—'}
          subtext={(stats?.securityTotalScans ?? 0) > 0 ? 'Across all scans' : 'Run a scan first'}
          variant={(stats?.criticalVulnerabilities ?? 0) > 0 ? 'red' : 'green'}
          alert={(stats?.criticalVulnerabilities ?? 0) > 0}
        />
        <MetricCard
          label="Avg. Security Score"
          value={(stats?.securityTotalScans ?? 0) > 0 ? `${stats.securityAverageScore}/100` : '—'}
          subtext={(stats?.securityTotalScans ?? 0) > 0 ? 'Higher is safer' : 'No scans yet'}
          variant="green"
        />
      </div>

      {/* Two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ServiceStatusCard chaosState={chaosState} />
        </div>
        <div>
          <InternalServicesCard />
        </div>
      </div>
    </div>
  )
}