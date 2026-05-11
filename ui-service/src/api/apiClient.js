import axios from 'axios'

const CHAOS_URL = import.meta.env.VITE_CHAOS_URL || 'http://localhost:8081'
const SECURITY_URL = import.meta.env.VITE_SECURITY_URL || 'http://localhost:8082'
const REPORT_URL = import.meta.env.VITE_REPORT_URL || 'http://localhost:8083'
export const TARGET_VIDEO_URL = import.meta.env.VITE_TARGET_VIDEO_URL || 'http://localhost:4000'
export const TARGET_SERVICE_NAME = 'target-video-service'

const chaosApi = axios.create({ baseURL: CHAOS_URL })
const securityApi = axios.create({ baseURL: SECURITY_URL })
const reportApi = axios.create({ baseURL: REPORT_URL })

// --- Chaos API ---
export const chaosClient = {
  killService: (name) => chaosApi.post(`/api/chaos/kill/${name}`),
  delayService: (name) => chaosApi.post(`/api/chaos/delay/${name}`),
  injectError: (name) => chaosApi.post(`/api/chaos/error/${name}`),
  getStatus: () => chaosApi.get('/api/chaos/status'),
  reset: () => chaosApi.delete('/api/chaos/reset'),
  health: () => chaosApi.get('/api/chaos/health'),
  // Live chaos state of the target video service (proxied through chaos-service)
  targetStatus: () => chaosApi.get('/api/chaos/target-status'),
}

// --- Security API ---
export const securityClient = {
  runScan: (name) => securityApi.post(`/api/security/scan/${name}`),
  getScanById: (id) => securityApi.get(`/api/security/scan/${id}`),
  getAllScans: () => securityApi.get('/api/security/scans'),
  checkSsl: (host) => securityApi.post(`/api/security/check/ssl/${host}`),
  checkPorts: (host) => securityApi.post(`/api/security/check/ports/${host}`),
  health: () => securityApi.get('/api/security/health'),
}

// --- Report API ---
export const reportClient = {
  getSummary: () => reportApi.get('/api/report/summary'),
  getChaos: () => reportApi.get('/api/report/chaos'),
  getSecurity: () => reportApi.get('/api/report/security'),
  generate: () => reportApi.post('/api/report/generate'),
  getStats: () => reportApi.get('/api/report/stats'),
  health: () => reportApi.get('/api/report/health'),
}

// --- Scheduler API ---
export const schedulerClient = {
  start: (intervalSeconds = 60) => reportApi.post(`/api/scheduler/start?intervalSeconds=${intervalSeconds}`),
  stop: () => reportApi.post('/api/scheduler/stop'),
  status: () => reportApi.get('/api/scheduler/status'),
}
