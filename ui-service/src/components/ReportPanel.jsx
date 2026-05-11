import { useState } from 'react'
import { reportClient } from '../api/apiClient'
import toast from 'react-hot-toast'
import { FileText, TrendingUp, Activity, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const CHAOS_COLORS = ['#ef4444', '#f59e0b', '#f97316']

function StatTile({ label, value, color = 'text-white', highlight }) {
  return (
    <div className={`rounded-xl p-4 text-center border transition-all ${highlight ? 'border-red-500/40 bg-red-950/20' : 'border-gray-800 bg-gray-800/50'}`}>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value ?? '—'}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  )
}

function HealthGauge({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Degraded' : 'Critical'
  const circumference = 2 * Math.PI * 55
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="55" fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="70" cy="70" r="55" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
        <text x="70" y="64" textAnchor="middle" fill="white" fontSize="26" fontWeight="bold">{score}</text>
        <text x="70" y="82" textAnchor="middle" fill={color} fontSize="11" fontWeight="600">{label}</text>
      </svg>
      <p className="text-gray-500 text-sm -mt-1">System Health</p>
    </div>
  )
}

export default function ReportPanel() {
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    const id = toast.loading('📊 Generating report...')
    try {
      const res = await reportClient.generate()
      setReport(res.data)
      toast.success('Report ready', { id })
    } catch {
      toast.error('Report failed — are all services running?', { id })
    } finally { setGenerating(false) }
  }

  const chaosBarData = report ? [
    { name: 'Kill', count: report.chaosSummary?.killCount ?? 0 },
    { name: 'Delay', count: report.chaosSummary?.delayCount ?? 0 },
    { name: 'Error', count: report.chaosSummary?.errorCount ?? 0 },
  ] : []

  const pieData = report && report.chaosSummary?.totalEvents > 0
    ? [
        { name: 'Kill', value: report.chaosSummary?.killCount ?? 0 },
        { name: 'Delay', value: report.chaosSummary?.delayCount ?? 0 },
        { name: 'Error', value: report.chaosSummary?.errorCount ?? 0 },
      ].filter(d => d.value > 0)
    : []

  const healthScore = report?.overallHealthScore ?? 0
  const criticals = report?.securitySummary?.criticalVulnerabilities ?? 0
  const successRate = report?.chaosSummary?.successRate ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText size={22} className="text-indigo-400" /> Report Panel
          </h2>
          <p className="text-gray-500 text-sm mt-1">Aggregated system analysis from all services</p>
        </div>
        <button
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-900/30"
          onClick={generate} disabled={generating}
        >
          <FileText size={15} />
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {!report ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 text-center py-20 text-gray-600">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg text-gray-500">Click "Generate Report" to analyze the system</p>
          <p className="text-sm mt-2">Pulls live data from Chaos and Security services</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header card with gauge */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <HealthGauge score={healthScore} />
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Report ID</p>
                  <p className="text-gray-300 font-mono text-xs break-all">{report.reportId}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Generated At</p>
                  <p className="text-gray-300 text-sm">{new Date(report.generatedAt).toLocaleString('en-US')}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Chaos Injection Rate</p>
                  <p className={`text-xl font-bold ${(report.chaosSummary?.totalEvents ?? 0) === 0 ? 'text-gray-500' : successRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {(report.chaosSummary?.totalEvents ?? 0) === 0 ? '—' : `${successRate}%`}
                  </p>
                </div>

                {criticals > 0 && (
                  <div className="col-span-full flex items-center gap-2 bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-3">
                    <AlertTriangle size={16} className="text-red-400 animate-pulse" />
                    <p className="text-red-300 text-sm font-semibold">{criticals} critical vulnerabilit{criticals === 1 ? 'y' : 'ies'} detected across all scans</p>
                  </div>
                )}

                {report.securitySummary?.cascadeFailure && (
                  <div className="col-span-full flex items-center gap-2 bg-amber-950/20 border border-amber-500/30 rounded-xl px-4 py-3">
                    <Activity size={16} className="text-amber-400" />
                    <p className="text-amber-300 text-sm">No security data — security-service may have been killed (cascade failure)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chaos Summary */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              ⚡ Chaos Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatTile label="Total Events" value={report.chaosSummary?.totalEvents} />
              <StatTile label="Kill" value={report.chaosSummary?.killCount} color="text-red-400" highlight={report.chaosSummary?.killCount > 0} />
              <StatTile label="Delay" value={report.chaosSummary?.delayCount} color="text-amber-400" />
              <StatTile label="Error" value={report.chaosSummary?.errorCount} color="text-orange-400" />
            </div>

            {chaosBarData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chaosBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {chaosBarData.map((_, i) => (
                      <Cell key={i} fill={CHAOS_COLORS[i % CHAOS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-10 text-sm">No chaos events yet — trigger some from the Chaos Panel</p>
            )}
          </div>

          {/* Security Summary */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              🛡 Security Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatTile label="Total Scans" value={report.securitySummary?.totalScans} />
              <StatTile label="Critical Findings" value={report.securitySummary?.criticalVulnerabilities} color="text-red-400" highlight={criticals > 0} />
              <StatTile label="Avg. Score" value={report.securitySummary?.averageScore} color="text-green-400" />
              <div className={`rounded-xl p-4 text-center border ${report.securitySummary?.mostRiskyService ? 'border-orange-500/30 bg-orange-950/10' : 'border-gray-800 bg-gray-800/50'}`}>
                <p className="text-sm font-semibold text-orange-300 truncate">{report.securitySummary?.mostRiskyService || 'N/A'}</p>
                <p className="text-gray-500 text-xs mt-1">Most Risky Service</p>
              </div>
            </div>

            {pieData.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-3 text-center">Chaos Event Distribution</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#4b5563' }}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={CHAOS_COLORS[i % CHAOS_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} itemStyle={{ color: '#e5e7eb' }} />
                    <Legend formatter={v => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
