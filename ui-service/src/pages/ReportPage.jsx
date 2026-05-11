import { useState, useEffect } from 'react'
import { reportClient } from '../api/apiClient'
import { Card, CardHeader, Button, Badge, ScoreRing, Empty, Divider, Label } from '../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const CHAOS_COLORS = { Kill: '#ef4444', Delay: '#f59e0b', Error: '#f97316' }

function SummaryBlock({ label, value, color = 'text-gray-900', highlight }) {
  return (
    <div className={`rounded-xl p-4 text-center border ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
      <p className={`text-2xl font-mono font-medium tabular-nums ${color}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-dropdown px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill || p.color }} className="font-mono">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function ReportPage() {
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [clearing, setClearing] = useState(false)

  const fetchHistory = async (p = 0) => {
    try {
      const res = await reportClient.getAllReports(p, 5)
      setHistory(res.data.content)
      setTotalPages(res.data.totalPages)
      setPage(res.data.number)
    } catch {}
  }

  useEffect(() => { fetchHistory(0) }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await reportClient.generate()
      setReport(r.data)
      fetchHistory(0)
    } catch {}
    finally { setGenerating(false) }
  }

  const clearAll = async () => {
    setClearing(true)
    try {
      await reportClient.clearReports()
      setReport(null)
      fetchHistory(0)
    } catch {}
    finally { setClearing(false) }
  }

  const viewReport = (r) => setReport(r)

  const chaosBarData = report ? [
    { name: 'Kill',   count: report.chaosSummary?.killCount ?? 0,  fill: '#ef4444' },
    { name: 'Delay',  count: report.chaosSummary?.delayCount ?? 0, fill: '#f59e0b' },
    { name: 'Error',  count: report.chaosSummary?.errorCount ?? 0, fill: '#f97316' },
  ] : []

  const pieData = report && (report.chaosSummary?.totalEvents ?? 0) > 0
    ? [
        { name: 'Kill',  value: report.chaosSummary?.killCount ?? 0 },
        { name: 'Delay', value: report.chaosSummary?.delayCount ?? 0 },
        { name: 'Error', value: report.chaosSummary?.errorCount ?? 0 },
      ].filter(d => d.value > 0)
    : []

  const score  = report?.overallHealthScore ?? 0
  const crits  = report?.securitySummary?.criticalVulnerabilities ?? 0
  const noScans = (report?.chaosSummary?.totalEvents ?? 0) === 0

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Actions */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-semibold">Reliability Reports</h2>
          <p className="text-xs text-gray-500 mt-1">Generated health reports saved in database</p>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" size="md" loading={clearing} onClick={clearAll}>
            Clear History
          </Button>
          <Button variant="primary" size="md" loading={generating} onClick={generate}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
            {generating ? 'Generating…' : 'Generate New Report'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Active Report View */}
        <div className="lg:col-span-2 space-y-5">
          {!report ? (
            <Card>
              <Empty icon="📊" title="No report selected" description='Click "Generate New Report" or select one from history.' />
            </Card>
          ) : (
            <div className="space-y-5 animate-slide-up">
              {/* Header overview card */}
              <Card>
                <div className="flex items-start gap-8 flex-wrap">
                  <div className="flex flex-col items-center gap-2">
                    <ScoreRing score={score} size={96} />
                    <p className="text-xs text-gray-500">Health Score</p>
                  </div>
                  <div className="flex-1 min-w-[240px] space-y-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {[
                        ['Report ID', report.reportId.substring(0,8)+'...', 'font-mono text-xs'],
                        ['Generated', new Date(report.generatedAt).toLocaleString(), 'text-xs'],
                        ['Health Score', `${score}/100`, 'font-mono font-medium text-sm'],
                        ['Chaos Success', noScans ? '—' : `${report.chaosSummary.successRate}%`, 'font-mono font-medium text-sm'],
                      ].map(([label, value, cls]) => (
                        <div key={label}>
                          <Label>{label}</Label>
                          <p className={`text-gray-900 mt-1 ${cls}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {crits > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
                        <span className="text-red-600 font-bold text-sm">⚠</span>
                        <p className="text-xs font-medium text-red-700">
                          {crits} critical vulnerabilities detected!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Chaos & Security Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Card>
                  <CardHeader title="Chaos Stats" />
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <SummaryBlock label="Total"  value={report.chaosSummary?.totalEvents} />
                    <SummaryBlock label="Kill"   value={report.chaosSummary?.killCount}  color="text-red-600" />
                    <SummaryBlock label="Delay"  value={report.chaosSummary?.delayCount} color="text-amber-600" />
                    <SummaryBlock label="Error"  value={report.chaosSummary?.errorCount} color="text-orange-600" />
                  </div>
                  {chaosBarData.some(d => d.count > 0) && (
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={chaosBarData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: '#6c757d', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                          {chaosBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Security Stats" />
                  <div className="grid grid-cols-2 gap-3">
                    <SummaryBlock label="Scans" value={report.securitySummary?.totalScans} />
                    <SummaryBlock label="Avg Score" value={report.securitySummary?.averageScore} color="text-green-600" />
                    <SummaryBlock label="Critical" value={report.securitySummary?.criticalVulnerabilities} color={crits > 0 ? 'text-red-600' : 'text-gray-900'} highlight={crits > 0} />
                    <SummaryBlock label="High" value={report.securitySummary?.highVulnerabilities} color="text-orange-600" />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Right: History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader title="Report History" subtitle={`Page ${page + 1} of ${totalPages}`} />
            
            <div className="flex-1 overflow-y-auto space-y-2 mt-2">
              {history.length === 0 ? (
                <Empty icon="🕒" title="No history" description="Generate a report to see it here" />
              ) : (
                history.map(h => (
                  <div key={h.reportId} 
                       onClick={() => viewReport(h)}
                       className={`p-3 border rounded-lg cursor-pointer transition-colors ${report?.reportId === h.reportId ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-medium text-gray-900">Score: {h.overallHealthScore}</span>
                      <span className="text-[10px] text-gray-400">{new Date(h.generatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{new Date(h.generatedAt).toLocaleDateString()}</span>
                      <span>{h.reportId.substring(0,8)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => fetchHistory(page - 1)}>
                  Prev
                </Button>
                <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page === totalPages - 1} onClick={() => fetchHistory(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}