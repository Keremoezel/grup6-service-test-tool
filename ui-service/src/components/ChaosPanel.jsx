import { useState, useEffect, useCallback } from 'react'
import { chaosClient } from '../api/apiClient'
import { useChaosWebSocket } from '../hooks/useChaosWebSocket'
import toast from 'react-hot-toast'
import { Skull, Clock, AlertTriangle, Trash2, RefreshCw, Wifi, WifiOff } from 'lucide-react'

function ChaosTypeBadge({ type }) {
  const styles = {
    KILL: 'bg-red-900/60 text-red-300 border-red-700',
    DELAY: 'bg-amber-900/60 text-amber-300 border-amber-700',
    ERROR: 'bg-orange-900/60 text-orange-300 border-orange-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${styles[type] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {type}
    </span>
  )
}

export default function ChaosPanel() {
  const [serviceName, setServiceName] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState({})

  // WebSocket: yeni olay geldikce listeye ekle
  const handleWsEvent = useCallback((event) => {
    setEvents(prev => {
      // ayni id iki kez gelmesin (optimistic update + WS push durumu)
      if (prev.some(e => e.id === event.id)) return prev
      return [event, ...prev]
    })
  }, [])

  const { connected } = useChaosWebSocket(handleWsEvent)

  const fetchEvents = async () => {
    try {
      const res = await chaosClient.getStatus()
      setEvents([...res.data].reverse())
    } catch {
      toast.error('Chaos servisi erisilemez')
    }
  }

  useEffect(() => { fetchEvents() }, [])

  const handleAction = async (type) => {
    if (!serviceName.trim()) { toast.error('Servis adi girin'); return }
    setLoading(prev => ({ ...prev, [type]: true }))
    const toastId = toast.loading(`${type} islemi yurutüluyor...`)
    try {
      const actions = {
        kill: () => chaosClient.killService(serviceName),
        delay: () => chaosClient.delayService(serviceName),
        error: () => chaosClient.injectError(serviceName),
      }
      const res = await actions[type]()
      toast.success(res.data.message, { id: toastId })
      // WebSocket push gelecegi icin manual fetch gerekmez
      // ama WS bagli degilse yedek olarak fetch yap
      if (!connected) await fetchEvents()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Islem basarisiz', { id: toastId })
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleReset = async () => {
    try {
      await chaosClient.reset()
      setEvents([])
      toast.success('Tum chaos olaylari silindi')
    } catch {
      toast.error('Sifırlama basarisiz')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chaos Panel</h2>
          <p className="text-gray-500 text-sm mt-1">Servis dayanikliligini test et</p>
        </div>
        {/* WebSocket durum gostergesi */}
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
          connected
            ? 'bg-green-900/40 text-green-300 border-green-700'
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? 'Canli Yayin' : 'Baglaniyor...'}
        </div>
      </div>

      {/* Kontroller */}
      <div className="card space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Servis Adi</label>
          <input
            className="input"
            placeholder="orn: payment-service, user-api..."
            value={serviceName}
            onChange={e => setServiceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAction('kill')}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-danger flex items-center gap-2" onClick={() => handleAction('kill')} disabled={loading.kill}>
            <Skull size={16} />{loading.kill ? 'Isleniyor...' : 'Servis Oldur'}
          </button>
          <button className="btn-warning flex items-center gap-2" onClick={() => handleAction('delay')} disabled={loading.delay}>
            <Clock size={16} />{loading.delay ? 'Bekleniyor...' : 'Gecikme Ekle'}
          </button>
          <button className="bg-orange-700 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            onClick={() => handleAction('error')} disabled={loading.error}>
            <AlertTriangle size={16} />{loading.error ? 'Isleniyor...' : 'Hata Enjekte Et'}
          </button>
        </div>
      </div>

      {/* Olay listesi */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-300">
            Chaos Olaylari
            <span className="ml-2 text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{events.length}</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={fetchEvents} className="btn-secondary flex items-center gap-1 text-xs py-1 px-2">
              <RefreshCw size={12} /> Yenile
            </button>
            {events.length > 0 && (
              <button onClick={handleReset} className="btn-danger flex items-center gap-1 text-xs py-1 px-2">
                <Trash2 size={12} /> Temizle
              </button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <Skull size={36} className="mx-auto mb-3 opacity-30" />
            <p>Henuz chaos olayi yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-2 pr-4">Zaman</th>
                  <th className="text-left pb-2 pr-4">Servis</th>
                  <th className="text-left pb-2 pr-4">Tip</th>
                  <th className="text-left pb-2 pr-4">Durum</th>
                  <th className="text-left pb-2 pr-4">Sure</th>
                  <th className="text-left pb-2">Mesaj</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-2 pr-4 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(event.timestamp).toLocaleTimeString('tr-TR')}
                    </td>
                    <td className="py-2 pr-4 font-medium text-indigo-300">{event.serviceName}</td>
                    <td className="py-2 pr-4"><ChaosTypeBadge type={event.chaosType} /></td>
                    <td className="py-2 pr-4">
                      {event.success
                        ? <span className="text-green-400 font-semibold">✓ Basarili</span>
                        : <span className="text-red-400 font-semibold">✗ Basarisiz</span>}
                    </td>
                    <td className="py-2 pr-4 text-gray-400 text-xs">{event.durationMs}ms</td>
                    <td className="py-2 text-gray-400 text-xs max-w-xs truncate">{event.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
