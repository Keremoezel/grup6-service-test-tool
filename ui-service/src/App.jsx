import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Dashboard from './components/Dashboard'
import ChaosPanel from './components/ChaosPanel'
import SecurityPanel from './components/SecurityPanel'
import ReportPanel from './components/ReportPanel'
import { LayoutDashboard, Zap, Shield, FileText } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chaos', label: 'Chaos', icon: Zap },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'report', label: 'Report', icon: FileText },
]

export default function App() {
  const [active, setActive] = useState('dashboard')

  const Content = {
    dashboard: Dashboard,
    chaos: ChaosPanel,
    security: SecurityPanel,
    report: ReportPanel,
  }[active]

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
        }}
      />

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-lg">🔬</div>
            <div>
              <h1 className="font-bold text-lg leading-none">Service Test Tool</h1>
              <p className="text-gray-500 text-xs mt-0.5">Chaos & Security Testing Platform — Grup 6</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-400 text-sm">Canli</span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-gray-900/50 border-b border-gray-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${active === id
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Content />
        </div>
      </main>

      <footer className="text-center py-4 text-gray-700 text-xs border-t border-gray-800">
        Grup 6 — Service Test Tool © 2024
      </footer>
    </div>
  )
}
