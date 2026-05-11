# 🛠 Grup 6 — Chaos Engineering Test Platform

> A microservice-based chaos engineering dashboard for systematically testing the resilience of the **VOIDSCREEN** target video streaming service. Built as a university project to demonstrate real-world fault injection, security scanning, and automated reporting.

---

## 📌 What is this?

This platform lets you **deliberately break things** and observe what happens. You inject chaos into a running service, watch it degrade in real time, and measure how well it recovers. The three backend microservices each handle a distinct concern:

| Service | Responsibility |
|---------|---------------|
| `chaos-service` | Injects delays, errors, and kills into the target |
| `security-service` | Scans the target for vulnerabilities |
| `report-service` | Aggregates results from both services |
| `ui-service` | React dashboard to control and observe everything |

---

## 🏗 System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                    Docker Network: grup6-network                   │
│                                                                   │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │chaos-service│   │ security-service  │   │  report-service  │  │
│  │  :8081      │   │     :8082         │   │     :8083        │  │
│  │  Spring Boot│   │  Spring Boot      │   │  Spring Boot     │  │
│  └──────┬──────┘   └────────┬──────────┘   └────────┬─────────┘  │
│         │                   │                        │            │
│         └───────────────────┴────────────────────────┘            │
│                             │                                     │
│                    ┌────────▼────────┐                            │
│                    │   PostgreSQL    │                            │
│                    │    :5432        │                            │
│                    └─────────────────┘                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                   ui-service (React)                     │    │
│  │                       :3001                              │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
          │
          │ host.docker.internal (bridge to host machine)
          ▼
┌─────────────────────────┐
│  VOIDSCREEN (Nuxt 3)    │  ← The chaos target
│  localhost:4000         │  ← Must be running separately
└─────────────────────────┘
```

---

## 🚀 How to Run

### Prerequisites
- Docker Desktop (running)
- The VOIDSCREEN target service running at `localhost:4000` (see its own README)

### Start everything

```bash
cd grup6-service-test-tool
docker-compose up --build
```

This builds and starts **5 containers**:
- `postgres` — shared database
- `chaos-service` — :8081
- `security-service` — :8082
- `report-service` — :8083
- `ui-service` — :3001

### Open the dashboard

```
http://localhost:3001
```

### Stop everything

```bash
docker-compose down
```

> **Note:** PostgreSQL data persists in a Docker volume. To fully reset including the database, run `docker-compose down -v`.

---

## 🧩 Service Details

### 1. Chaos Service (`:8081`)

The core of the platform. Communicates with the target service's admin endpoints to inject failures.

**What it does:**
- Sends `POST /api/admin/inject-delay` to slow down the target
- Sends `POST /api/admin/inject-error` to make the target randomly fail
- Sends `POST /api/admin/shutdown` to kill the target entirely
- Polls the target's `/api/health` to track recovery
- Stores chaos event history in PostgreSQL

**Key API endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/chaos/health` | Chaos service health |
| `POST /api/chaos/inject` | Inject chaos scenario |
| `GET /api/chaos/events` | History of all injected chaos |
| `DELETE /api/chaos/events` | Clear event history |
| `GET /api/chaos/status` | Current active chaos on target |

**Chaos scenario types:**

| Type | What happens | Why it's useful |
|------|-------------|-----------------|
| **DELAY** | Every request to the target waits N ms before responding | Tests timeout handling, latency sensitivity |
| **ERROR** | A percentage (e.g., 50%) of requests return HTTP 500 | Tests retry logic, partial failure handling |
| **KILL** | All requests return HTTP 503 Service Unavailable | Tests failover, service discovery, circuit breakers |

**Why percentage-based errors?**

A 50% error rate is fundamentally different from a kill. In real production incidents, services rarely fail completely — they degrade. A database under heavy load might fail 30% of queries. A network partition might drop 40% of packets. Testing partial failure reveals whether your system has:

- **Retry logic**: If the client retries a failed request once, a 50% error rate becomes only 25% visible failure
- **Circuit breakers**: After N failures, should the client stop trying and fail fast?
- **Graceful degradation**: Can the UI show partial content instead of a blank screen?

---

### 2. Security Service (`:8082`)

Performs automated security scans against the target service.

**What it does:**
- Scans the target's HTTP endpoints for common vulnerabilities
- Checks for missing security headers (CSP, X-Frame-Options, HSTS, etc.)
- Tests for open admin endpoints without authentication
- Tests for information disclosure (stack traces in error responses)
- Assigns a severity level to each finding: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- Stores scan history in PostgreSQL

**Key API endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/security/health` | Security service health |
| `POST /api/security/scan` | Start a new security scan |
| `GET /api/security/scans` | Retrieve scan history |
| `DELETE /api/security/scans` | Clear all scan history |

**Scan findings explained:**

| Finding | Severity | What it means |
|---------|----------|---------------|
| Missing `X-Frame-Options` | MEDIUM | The service can be embedded in iframes (clickjacking risk) |
| Missing `Content-Security-Policy` | HIGH | XSS attacks not mitigated by browser |
| Open `/api/admin/*` endpoints | HIGH | Admin operations accessible without auth |
| Stack trace in 500 response | MEDIUM | Internal code structure exposed to attackers |
| Missing `Strict-Transport-Security` | LOW | HTTPS downgrade attacks possible |

> **Design note:** The target service (VOIDSCREEN) is deliberately insecure. Its `/api/admin/inject-delay`, `/api/admin/inject-error`, and `/api/admin/shutdown` endpoints require no authentication. The security scanner will always flag these as `HIGH` severity findings — this is intentional and demonstrates why chaos engineering targets should never be exposed to the internet.

---

### 3. Report Service (`:8083`)

Aggregates data from the chaos and security services into structured reports.

**What it does:**
- Fetches chaos event history from `chaos-service`
- Fetches scan results from `security-service`
- Computes a **System Health Score** (0–100) based on:
  - Active chaos scenarios (lowers score)
  - Recent critical security findings (lowers score)
  - Service uptime and response time (raises score)
- Generates summary reports on demand

**Health Score calculation:**

```
Base score: 100
- Each KILL event in last 10 minutes:    -30 points
- Each ERROR injection currently active: -20 points
- Each DELAY injection currently active: -10 points
- Each CRITICAL security finding:        -15 points
- Each HIGH security finding:             -8 points
- Each MEDIUM security finding:           -3 points
Minimum score: 0
```

A score below 50 is shown as `CRITICAL` in the dashboard. Below 75 is `DEGRADED`. Above 90 is `HEALTHY`.

---

### 4. UI Service (`:3001`)

React + Vite dashboard. Single-page application served by Nginx inside Docker.

**Dashboard tabs:**

**📊 Dashboard**
- System Health Score with real-time gauge
- Recent chaos events timeline
- Quick-inject buttons
- **Reset All** button — clears all chaos events and scan history simultaneously

**⚡ Chaos Panel**
- Select target service (VOIDSCREEN or internal microservices)
- Inject delay with custom duration (ms) and TTL (seconds)
- Inject error with custom rate (%) and TTL
- Kill the service temporarily
- View live event log

**🔒 Security Panel**
- Run a security scan against the target
- View scan results with severity breakdown
- **Clear All** button — removes scan history
- Auto Scheduler — runs scans at configurable intervals

**📈 Report Panel**
- Download structured HTML/JSON reports
- View trend graphs (health over time)

---

## ⚙️ Configuration

All configuration is done via environment variables in `docker-compose.yml`.

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `TARGET_VIDEO_URL` | chaos-service | `http://host.docker.internal:4000` | URL of the VOIDSCREEN target |
| `SPRING_DATASOURCE_URL` | all Java services | see docker-compose | PostgreSQL connection string |
| `CHAOS_SERVICE_URL` | report-service | `http://chaos-service:8081` | Internal service URL |
| `SECURITY_SERVICE_URL` | report-service | `http://security-service:8082` | Internal service URL |
| `VITE_CHAOS_URL` | ui-service (build arg) | `http://localhost:8081` | Browser-visible chaos API |
| `VITE_SECURITY_URL` | ui-service (build arg) | `http://localhost:8082` | Browser-visible security API |

> **Important:** `host.docker.internal` is how Docker containers reach services running on your local machine (outside Docker). This is how `chaos-service` talks to `VOIDSCREEN` running on your host at `:4000`.

---

## 🔄 Typical Workflow

```
1. Start VOIDSCREEN:    cd target-video-service && pnpm run dev
2. Start test platform: cd grup6-service-test-tool && docker-compose up --build
3. Open dashboard:      http://localhost:3001
4. Open target:         http://localhost:4000

--- Inject chaos ---
5. Dashboard → Chaos → Select "target-video-service"
6. Click "Inject Delay" → set 2000ms, TTL 30s → Submit
7. Switch to http://localhost:4000 → click any video card
8. Observe: player shows spinner for ~2 seconds before video loads
9. Dashboard shows chaos pill: "⏱ +2000MS DELAY · 28s"

--- Inject error ---
10. Dashboard → Chaos → Inject Error → 50% rate, TTL 60s
11. Click video cards on VOIDSCREEN repeatedly
12. ~50% of the time: ERR_500 error screen
13. ~50% of the time: video loads normally
14. Click RETRY on error screen → may succeed or fail

--- Run security scan ---
15. Dashboard → Security → "Start Scan"
16. Wait ~5 seconds for results
17. Review findings (admin endpoints without auth will be HIGH severity)

--- Reset ---
18. Dashboard → "🗑 Reset All" button
19. Clears chaos state + scan history simultaneously
```

---

## 📁 Project Structure

```
grup6-service-test-tool/
├── docker-compose.yml
│
├── chaos-service/           # Spring Boot (Java 17)
│   ├── src/main/java/com/grup6/chaos/
│   │   ├── controller/      # REST endpoints
│   │   ├── service/         # Business logic + HTTP calls to target
│   │   └── entity/          # JPA entities (ChaosEvent)
│   └── Dockerfile
│
├── security-service/        # Spring Boot (Java 17)
│   ├── src/main/java/com/grup6/security/
│   │   ├── controller/      # REST endpoints
│   │   ├── service/         # Scanner logic
│   │   └── entity/          # JPA entities (SecurityScan)
│   └── Dockerfile
│
├── report-service/          # Spring Boot (Java 17)
│   ├── src/main/java/com/grup6/report/
│   │   ├── controller/      # REST endpoints
│   │   └── service/         # Aggregation + health score
│   └── Dockerfile
│
└── ui-service/              # React + Vite
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.jsx     # Main layout + Reset All
    │   │   ├── ChaosPanel.jsx    # Chaos injection controls
    │   │   ├── SecurityPanel.jsx # Scan results + Clear
    │   │   └── ReportPanel.jsx   # Reports
    │   └── api/
    │       └── apiClient.js      # Axios clients for all services
    └── Dockerfile
```

---

## 🐛 Troubleshooting

**VOIDSCREEN shows "unreachable" in the test tool**
- Make sure `pnpm run dev` is running in `target-video-service`
- The target must be on `localhost:4000`
- Docker uses `host.docker.internal` to reach your host machine — this works automatically on Windows/Mac

**Services fail to start (dependency timeout)**
- PostgreSQL needs ~10 seconds to initialize on first run
- All Spring Boot services wait for PostgreSQL to be healthy before starting
- If a service exits with code 137, Docker killed it (likely memory — ensure Docker has 4GB+ RAM)

**"Connection refused" when injecting chaos**
- The chaos is targeting a service that's not running
- Check all containers are healthy: `docker-compose ps`

**Reset All doesn't work**
- Both chaos-service and security-service must be running
- Check `docker-compose logs chaos-service` for errors

---

## 👥 Team — Grup 6

Built as a software engineering project demonstrating chaos engineering principles, microservice architecture, and distributed systems resilience testing.
