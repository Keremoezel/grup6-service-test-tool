# Service Test Tool

**Chaos & Security Testing Platform** — A microservices-based platform that simulates Chaos Engineering and Security Monkey patterns to test system resilience and detect vulnerabilities.

> Built with Spring Boot 3, Java 17, React 18, PostgreSQL, WebSocket (STOMP), Docker Compose  
> Group 6 — University Microservices Assignment

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Browser  (port 3000)                      │
│         React + Tailwind CSS + WebSocket (STOMP)          │
└──────────┬───────────────┬───────────────┬───────────────┘
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │    chaos    │ │  security   │ │   report    │
    │  :8081      │ │   :8082     │ │   :8083     │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┴───────────────┘
                           │
                   ┌───────▼───────┐
                   │  PostgreSQL   │
                   │    :5432      │
                   └───────────────┘
```

| Service | Port | Description |
|---|---|---|
| **chaos-service** | 8081 | Simulates service kill, latency injection, error injection. Broadcasts events via WebSocket. |
| **security-service** | 8082 | Runs vulnerability scans, SSL checks, port scans. Persists results to PostgreSQL. |
| **report-service** | 8083 | Aggregates data from both services. Runs auto-scheduled tests. Implements chaos propagation. |
| **ui-service** | 3000 | React SPA dashboard served by Nginx. |

---

## Features

- **Real-time WebSocket streaming** — Chaos events appear instantly in the UI without polling (STOMP over SockJS)
- **PostgreSQL persistence** — All chaos events and security scans survive service restarts
- **Cascade failure simulation** — Killing `security-service` causes Report to return empty security data, dropping the health score
- **Auto-scheduled tests** — Configure an interval and the platform runs chaos + security tests automatically
- **Chaos mode propagation** — Active chaos modes expire after 30 seconds, automatically restoring normal behavior
- **Security scanning** — Detects OPEN_PORT, WEAK_CONFIG, SSL_ISSUE, AUTH_MISSING with severity levels (CRITICAL / HIGH / MEDIUM / LOW)
- **Cloud-ready** — `railway.toml` for each Java service, `vercel.json` for the UI

---

## Running Locally

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and **running**
- Ports 3000, 5432, 8081, 8082, 8083 must be free

### Start

```bash
git clone <repo-url>
cd grup6-service-test-tool

docker-compose up --build
```

First build takes **5–10 minutes** (Maven downloads dependencies, npm installs packages).  
Subsequent starts take ~60 seconds.

### Access

| Service | URL |
|---|---|
| Web Dashboard | http://localhost:3000 |
| Chaos API | http://localhost:8081 |
| Security API | http://localhost:8082 |
| Report API | http://localhost:8083 |

### Stop

```bash
# Stop containers, keep database data
docker-compose down

# Stop containers AND wipe database
docker-compose down -v
```

---

## API Reference

### Chaos Service — `http://localhost:8081`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chaos/kill/{serviceName}` | Simulate service kill (70% success rate) |
| `POST` | `/api/chaos/delay/{serviceName}` | Inject random latency (1–5 seconds) |
| `POST` | `/api/chaos/error/{serviceName}` | Inject random exception |
| `GET` | `/api/chaos/status` | List all chaos events (newest first) |
| `DELETE` | `/api/chaos/reset` | Clear all events and active chaos modes |
| `GET` | `/api/chaos/mode/{serviceName}` | Query active chaos mode for a service |
| `GET` | `/api/chaos/health` | Health check |

**Chaos event response schema:**
```json
{
  "id": "uuid",
  "serviceName": "payment-service",
  "chaosType": "KILL | DELAY | ERROR",
  "timestamp": "2024-01-15T14:30:00",
  "success": true,
  "message": "Service successfully stopped (simulation)",
  "durationMs": 142
}
```

**Chaos mode response schema:**
```json
{
  "active": true,
  "serviceName": "security-service",
  "type": "KILL",
  "expiresAt": "2024-01-15T14:30:30"
}
```

---

### Security Service — `http://localhost:8082`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/security/scan/{serviceName}` | Run full vulnerability scan |
| `GET` | `/api/security/scan/{scanId}` | Fetch scan result by ID |
| `GET` | `/api/security/scans` | List all scans (newest first) |
| `POST` | `/api/security/check/ssl/{host}` | Simulate SSL certificate check |
| `POST` | `/api/security/check/ports/{host}` | Simulate port scan (80, 443, 8080, 3306, 5432) |
| `GET` | `/api/security/health` | Health check |

**Scan result schema:**
```json
{
  "scanId": "uuid",
  "serviceName": "user-api",
  "timestamp": "2024-01-15T14:30:00",
  "vulnerabilities": [
    {
      "type": "OPEN_PORT | WEAK_CONFIG | SSL_ISSUE | AUTH_MISSING",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "description": "MySQL port 3306 exposed",
      "recommendation": "Block port 3306 with firewall"
    }
  ],
  "overallRisk": "LOW | MEDIUM | HIGH | CRITICAL",
  "score": 75
}
```

Score formula: `100 - Σ(CRITICAL×25 + HIGH×15 + MEDIUM×8 + LOW×3)`, clamped to `[0, 100]`.

---

### Report Service — `http://localhost:8083`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/report/summary` | Full aggregated system report |
| `GET` | `/api/report/chaos` | Chaos events summary only |
| `GET` | `/api/report/security` | Security scans summary only |
| `POST` | `/api/report/generate` | Generate a new timestamped report |
| `GET` | `/api/report/stats` | Key statistics (counts, averages, health score) |
| `POST` | `/api/scheduler/start?intervalSeconds=60` | Start auto-test scheduler |
| `POST` | `/api/scheduler/stop` | Stop auto-test scheduler |
| `GET` | `/api/scheduler/status` | Scheduler state and last run time |
| `GET` | `/api/report/health` | Health check |

**Overall health score formula:**
```
healthScore = (chaosSuccessRate × 0.4) + (avgSecurityScore × 0.6) − (criticalVulns × 5)
```
Clamped to `[0, 100]`.

---

## Quick API Test (curl)

```bash
# Trigger a kill event
curl -X POST http://localhost:8081/api/chaos/kill/payment-service

# Run a security scan
curl -X POST http://localhost:8082/api/security/scan/user-api

# Check if security-service is under chaos
curl http://localhost:8081/api/chaos/mode/security-service

# Generate a full report
curl -X POST http://localhost:8083/api/report/generate

# Start auto-scheduler (every 30 seconds)
curl -X POST "http://localhost:8083/api/scheduler/start?intervalSeconds=30"

# Stop scheduler
curl -X POST http://localhost:8083/api/scheduler/stop
```

---

## Cloud Deployment

### Backend — Railway

Each Java service is deployed as a separate Railway service, all sharing one PostgreSQL database.

**Step 1 — Create the project**
1. Go to [railway.app](https://railway.app) → "New Project"
2. Click **"Add Service" → "Database" → "PostgreSQL"** — Railway provides the connection string automatically

**Step 2 — Deploy chaos-service**
1. "Add Service" → "GitHub Repo" → select your repo → set root directory to `chaos-service`
2. Railway auto-detects `railway.toml` and uses the `Dockerfile`
3. Set environment variables:

```
SPRING_DATASOURCE_URL      = jdbc:postgresql://<railway-postgres-host>:<port>/<db>
SPRING_DATASOURCE_USERNAME = <from Railway PostgreSQL plugin>
SPRING_DATASOURCE_PASSWORD = <from Railway PostgreSQL plugin>
```

4. Copy the generated public URL (e.g. `https://chaos-service-xxxx.up.railway.app`)

**Step 3 — Deploy security-service**
Same as Step 2. Set the same three `SPRING_DATASOURCE_*` variables.

**Step 4 — Deploy report-service**
Same process, plus two additional variables:

```
SPRING_DATASOURCE_URL      = <same postgres URL>
SPRING_DATASOURCE_USERNAME = <same>
SPRING_DATASOURCE_PASSWORD = <same>
CHAOS_SERVICE_URL          = https://chaos-service-xxxx.up.railway.app
SECURITY_SERVICE_URL       = https://security-service-xxxx.up.railway.app
```

---

### Frontend — Vercel

**Step 1** — Push the repo to GitHub (if not already done)

**Step 2** — Go to [vercel.com](https://vercel.com) → "Add New Project" → import your GitHub repo

**Step 3** — Configure:
- **Root Directory:** `ui-service`
- **Framework Preset:** Vite (auto-detected via `vercel.json`)

**Step 4** — Add environment variables:

```
VITE_CHAOS_URL      = https://chaos-service-xxxx.up.railway.app
VITE_SECURITY_URL   = https://security-service-xxxx.up.railway.app
VITE_REPORT_URL     = https://report-service-xxxx.up.railway.app
VITE_CHAOS_WS_URL   = https://chaos-service-xxxx.up.railway.app/ws
```

**Step 5** — Deploy. Vercel builds `npm run build` and serves the `dist/` folder.

> **Note on CORS:** The Java services allow all origins (`allowedOrigins("*")`), so the Vercel domain will work without additional configuration.

---

## Project Structure

```
grup6-service-test-tool/
│
├── docker-compose.yml              # Orchestrates all 5 containers
├── README.md
├── PROJE_REHBERI.md                # Turkish guide for the demo
│
├── chaos-service/                  # Spring Boot — port 8081
│   ├── Dockerfile                  # Multi-stage: Maven build → JRE runtime
│   ├── railway.toml                # Railway deployment config
│   ├── pom.xml
│   └── src/main/java/com/grup6/chaos/
│       ├── model/
│       │   ├── ChaosResult.java        # DTO (API response)
│       │   ├── ChaosEvent.java         # JPA Entity → chaos_events table
│       │   └── ChaosMode.java          # JPA Entity → chaos_modes table (30s TTL)
│       ├── repository/                 # Spring Data JPA repositories
│       ├── service/
│       │   ├── ChaosService.java       # Business logic + mode management
│       │   └── ChaosEventPublisher.java # WebSocket broadcast via SimpMessagingTemplate
│       ├── controller/ChaosController.java
│       └── config/
│           ├── CorsConfig.java
│           └── WebSocketConfig.java    # STOMP broker + SockJS endpoint /ws
│
├── security-service/               # Spring Boot — port 8082
│   ├── Dockerfile
│   ├── railway.toml
│   ├── pom.xml
│   └── src/main/java/com/grup6/security/
│       ├── model/
│       │   ├── ScanResult.java             # DTO (API response)
│       │   ├── ScanResultEntity.java       # JPA Entity → scan_results table
│       │   └── VulnerabilityEmbeddable.java # @Embeddable → scan_vulnerabilities table
│       ├── repository/ScanRepository.java
│       ├── service/SecurityScanService.java
│       └── controller/SecurityController.java
│
├── report-service/                 # Spring Boot — port 8083
│   ├── Dockerfile
│   ├── railway.toml
│   ├── pom.xml
│   └── src/main/java/com/grup6/report/
│       ├── model/Report.java
│       ├── service/ReportService.java      # Calls chaos/security; implements cascade failure
│       ├── controller/
│       │   ├── ReportController.java
│       │   └── SchedulerController.java    # /api/scheduler/* endpoints
│       └── scheduler/
│           ├── SchedulerConfig.java        # Thread-safe config (AtomicBoolean/Long/Integer)
│           └── AutoTestScheduler.java      # @Scheduled fixed-delay runner
│
└── ui-service/                     # React 18 + Vite 5 — port 3000
    ├── Dockerfile                  # Multi-stage: Node build → Nginx serve
    ├── vercel.json                 # Vercel deployment config
    ├── nginx.conf                  # SPA routing (all routes → index.html)
    ├── package.json
    └── src/
        ├── App.jsx                         # Tab navigation shell
        ├── api/apiClient.js                # Axios instances + schedulerClient
        ├── hooks/
        │   └── useChaosWebSocket.js        # STOMP client hook (auto-reconnect)
        └── components/
            ├── Dashboard.jsx               # Stats + health bar + SchedulerControl
            ├── ChaosPanel.jsx              # Real-time table (WebSocket-driven)
            ├── SecurityPanel.jsx           # Scan cards + SSL/port tools
            └── ReportPanel.jsx             # Bar chart + pie chart (Recharts)
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend language | Java 17 |
| Backend framework | Spring Boot 3.2 |
| ORM | Spring Data JPA + Hibernate |
| Database | PostgreSQL 16 |
| Real-time | WebSocket (STOMP) + SockJS |
| Scheduling | Spring `@Scheduled` |
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| HTTP client (UI) | Axios |
| WS client (UI) | @stomp/stompjs + sockjs-client |
| Notifications | react-hot-toast |
| Icons | lucide-react |
| Containerization | Docker + Docker Compose |
| CI/CD (backend) | Railway |
| CI/CD (frontend) | Vercel |

---

## Environment Variables Reference

| Variable | Service | Default (local) | Description |
|---|---|---|---|
| `SPRING_DATASOURCE_URL` | chaos, security, report | `jdbc:postgresql://localhost:5432/grup6db` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | chaos, security, report | `grup6` | Database user |
| `SPRING_DATASOURCE_PASSWORD` | chaos, security, report | `grup6pass` | Database password |
| `CHAOS_SERVICE_URL` | report | `http://chaos-service:8081` | Chaos service base URL |
| `SECURITY_SERVICE_URL` | report | `http://security-service:8082` | Security service base URL |
| `VITE_CHAOS_URL` | ui | `http://localhost:8081` | Chaos REST base URL |
| `VITE_SECURITY_URL` | ui | `http://localhost:8082` | Security REST base URL |
| `VITE_REPORT_URL` | ui | `http://localhost:8083` | Report REST base URL |
| `VITE_CHAOS_WS_URL` | ui | `http://localhost:8081/ws` | WebSocket endpoint |

All Spring Boot variables use `${VAR:default}` syntax — defaults apply when running outside Docker.

---

## License

MIT — Free to use for educational purposes.
