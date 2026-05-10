import { useState } from 'react'
import { reportClient } from '../api/apiClient'
import toast from 'react-hot-toast'
import { FileText, RefreshCw, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#ef4444', '#f59e0b', '#f97316']

function StatTile({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  )
}

export default function ReportPanel() {
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    const id = toast.loading('Rapor olusturuluyor...')
    try {
      const res = await reportClient.generate()
      setReport(res.data)
      toast.success('Rapor hazir', { id })
    } catch {
      toast.error('Rapor olusturulamadi - servisler calisıyor mu?', { id })
    } finally {
      setGenerating(false)
    }
  }

  const chaosBarData = report ? [
    { name: 'Kill', deger: report.chaosSummary?.killCount ?? 0 },
    { name: 'Delay', deger: report.chaosSummary?.delayCount ?? 0 },
    { name: 'Error', deger: report.chaosSummary?.errorCount ?? 0 },
  ] : []

  const pieData = report && report.chaosSummary?.totalEvents > 0 ? [
    { name: 'Kill', value: report.chaosSummary?.killCount ?? 0 },
    { name: 'Delay', value: report.chaosSummary?.delayCount ?? 0 },
    { name: 'Error', value: report.chaosSummary?.errorCount ?? 0 },
  ].filter(d => d.value > 0) : []

  const healthScore = report?.overallHealthScore ?? 0
  const healthColor = healthScore >= 70 ? 'text-green-400' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Panel</h2>
          <p className="text-gray-500 text-sm mt-1">Sistem geneli analiz ve istatistikler</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={generate} disabled={generating}>
          <FileText size={16} />
          {generating ? 'Olusturuluyor...' : 'Rapor Olustur'}
        </button>
      </div>

      {!report ? (
        <div className="card text-center py-16 text-gray-600">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Rapor olusturmak icin butona tiklayin</p>
          <p className="text-sm mt-2">Chaos ve Security servislerinden veri ceker</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rapor baslik */}
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm">Rapor ID</p>
              <p className="text-gray-300 font-mono text-xs mt-0.5">{report.reportId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Olusturulma</p>
              <p className="text-gray-300 text-sm mt-0.5">{new Date(report.generatedAt).toLocaleString('tr-TR')}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Sistem Sagligi</p>
              <p className={`text-4xl font-bold mt-1 ${healthColor}`}>{healthScore}<span className="text-xl">/100</span></p>
            </div>
          </div>

          {/* Chaos Ozeti */}
          <div className="card">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              ⚡ Chaos Ozeti
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatTile label="Toplam Olay" value={report.chaosSummary?.totalEvents} color="text-white" />
              <StatTile label="Kill" value={report.chaosSummary?.killCount} color="text-red-400" />
              <StatTile label="Delay" value={report.chaosSummary?.delayCount} color="text-amber-400" />
              <StatTile label="Error" value={report.chaosSummary?.errorCount} color="text-orange-400" />
            </div>
            <div className="bg-gray-800/30 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
              <span className="text-gray-500 text-sm">Basari Orani:</span>
              <span className={`font-bold ${(report.chaosSummary?.successRate ?? 0) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                %{report.chaosSummary?.successRate ?? 0}
              </span>
            </div>

            {chaosBarData.some(d => d.deger > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chaosBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Bar dataKey="deger" fill="#4f46e5" radius={[6, 6, 0, 0]}>
                    {chaosBarData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-8">Grafik icin chaos olayi gerekli</p>
            )}
          </div>

          {/* Security Ozeti */}
          <div className="card">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              🛡 Guvenlik Ozeti
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatTile label="Toplam Tarama" value={report.securitySummary?.totalScans} />
              <StatTile label="Kritik Acik" value={report.securitySummary?.criticalVulnerabilities} color="text-red-400" />
              <StatTile label="Ort. Skor" value={report.securitySummary?.averageScore} color="text-green-400" />
              <div className="bg-gray-800/60 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-orange-300 truncate">{report.securitySummary?.mostRiskyService || 'N/A'}</p>
                <p className="text-gray-500 text-xs mt-1">En Riskli Servis</p>
              </div>
            </div>

            {pieData.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-2 text-center">Chaos Olay Dagilimi</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#4b5563' }}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} itemStyle={{ color: '#e5e7eb' }} />
                    <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{v}</span>} />
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
