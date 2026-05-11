import { useState, useEffect, useCallback } from 'react'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import ChaosPage from './pages/ChaosPage'
import SecurityPage from './pages/SecurityPage'
import ReportPage from './pages/ReportPage'
import { ToastList } from './components/ui'
import { TARGET_VIDEO_URL } from './api/apiClient'

// ─── Minimal toast manager ────────────────────────────────────────────────────
let _toastId = 0
const _toasts = { items: [], listeners: new Set() }
const _notify = () => _toasts.listeners.forEach(fn => fn([..._toasts.items]))

export const toast = {
  _show(msg, type, duration = 4000) {
    const id = ++_toastId
    _toasts.items = [{ id, msg, type }, ..._toasts.items]
    _notify()
    if (duration < Infinity) setTimeout(() => toast._dismiss(id), duration)
    return id
  },
  _dismiss(id) { _toasts.items = _toasts.items.filter(t => t.id !== id); _notify() },
  success: (msg) => toast._show(msg, 'success'),
  error:   (msg) => toast._show(msg, 'error'),
  loading: (msg) => toast._show(msg, 'loading', Infinity),
  dismiss: (id)  => toast._dismiss(id),
  update:  (id, msg, type) => { toast._dismiss(id); return toast._show(msg, type) },
}

function useToasts() {
  const [items, setItems] = useState([])
  useEffect(() => { _toasts.listeners.add(setItems); return () => _toasts.listeners.delete(setItems) }, [])
  return items
}

// ─── WebSocket hook stub — replace with real implementation ──────────────────
export function useChaosWebSocket(onEvent) {
  const [connected, setConnected] = useState(false)
  // Wire your real WebSocket here.
  // Call onEvent(event) whenever a chaos event arrives.
  return { connected }
}

// ─── App ──────────────────────────────────────────────────────────────────────
const PAGES = {
  dashboard: Dashboard,
  chaos:     ChaosPage,
  security:  SecurityPage,
  report:    ReportPage,
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const toasts = useToasts()

  const Page = PAGES[active] || Dashboard

  return (
    <>
      <ToastList toasts={toasts} />
      <AppShell
        active={active}
        onNavigate={setActive}
        targetUrl={TARGET_VIDEO_URL}
        wsConnected={false}  // pass real websocket connected state here
      >
        <Page />
      </AppShell>
    </>
  )
}