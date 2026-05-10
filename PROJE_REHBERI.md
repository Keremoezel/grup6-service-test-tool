# 🔬 Service Test Tool — Proje Rehberi
### Grup 6 | Chaos & Security Testing Platform

---

## 📌 Bu Proje Ne?

Gerçek şirketlerde (Netflix, Amazon, Google) sistemlerin **"kötü günde nasıl davranır?"** sorusunu test etmek için kullanılan araçların üniversite düzeyinde simülasyonu.

İki ana fikri test eder:
- **Chaos Engineering** → "Sisteme kasıtlı zarar ver, ne olduğunu gör"
- **Security Scanning** → "Sistemde açık var mı bul"

---

## 🏗️ Mimari — Ne Var, Ne İş Yapar?

```
┌─────────────────────────────────────────────────────────┐
│                    TARAYICI (port 3000)                  │
│              React + Tailwind + WebSocket                │
└────────────┬────────────┬────────────┬──────────────────┘
             │            │            │
             ▼            ▼            ▼
        ┌────────┐  ┌──────────┐  ┌────────┐
        │ Chaos  │  │ Security │  │ Report │
        │ :8081  │  │  :8082   │  │ :8083  │
        └───┬────┘  └────┬─────┘  └───┬────┘
            │            │            │
            └────────────┴────────────┘
                         │
                   ┌─────▼──────┐
                   │ PostgreSQL  │
                   │   :5432     │
                   └────────────┘
```

### 4 Servis Var:

| Servis | Port | Ne Yapar |
|---|---|---|
| **chaos-service** | 8081 | Servisleri "öldürür", gecikme ekler, hata fırlatır |
| **security-service** | 8082 | Güvenlik açığı taraması yapar |
| **report-service** | 8083 | Diğer iki servisten veri çekip rapor üretir |
| **ui-service** | 3000 | Hepsini kontrol eden web arayüzü |

---

## ⚡ Ne Zaman Ne Eklendi? (Özellik Listesi)

### Başlangıçta Vardı:
- 3 mikroservis + React UI
- In-memory (RAM) veri saklama — restart'ta her şey siliniyordu
- Manuel refresh ile veri güncelleme

### Sonradan Eklendi:

#### 🗄️ PostgreSQL Veritabanı
- Tüm chaos olayları ve güvenlik taramaları **kalıcı** olarak saklanıyor
- Docker'ı yeniden başlatsan bile eski veriler duruyor
- `chaos_events`, `scan_results`, `scan_vulnerabilities`, `chaos_modes` tabloları oluştu

#### 📡 WebSocket (Canlı Yayın)
- Chaos Panel'de bir olay tetiklenince **sayfa yenilemeden** anında tabloya düşüyor
- Sağ üstte **"Canlı Yayın"** (yeşil) / **"Bağlanıyor..."** (gri) göstergesi var
- Teknoloji: STOMP protokolü üzerinde WebSocket (SockJS transport)

#### ⏱️ Otomatik Test Zamanlayıcı
- Dashboard'da "Otomatik Test Zamanlayıcı" paneli var
- "Başlat" → her X saniyede otomatik chaos + güvenlik testleri çalışır
- Minimum 10 saniye, varsayılan 60 saniye ayarlanabilir
- Report service bunu orkestre eder

#### 💥 Gerçekçi Chaos Etkisi (HTTP Propagation)
- `security-service`'e **KILL** uygulanınca → Report paneli gerçekten boş güvenlik verisi döner
- `security-service`'e **DELAY** uygulanınca → Report'ta gerçek 2 saniyelik gecikme oluşur
- Bu, gerçek sistemlerde "cascade failure" (domino etkisi) simülasyonu

#### ☁️ Cloud Deploy Hazırlığı
- `railway.toml` — Java servisleri Railway'e deploy için
- `vercel.json` — React UI'ı Vercel'e deploy için

---

## 🚀 Nasıl Çalıştırılır?

### Ön Koşul
- Docker Desktop açık ve çalışıyor olmalı

### Başlatmak:
```bash
cd grup6-service-test-tool
docker-compose up --build
```

İlk build **5-10 dakika** sürer (Maven + npm indiriyor).
Sonraki başlatmalar 1-2 dakika.

### Erişim:
| Ne | URL |
|---|---|
| Web Arayüzü | http://localhost:3000 |
| Chaos API | http://localhost:8081 |
| Security API | http://localhost:8082 |
| Report API | http://localhost:8083 |

### Durdurmak:
```bash
docker-compose down
```

Veritabanını da sıfırlamak için:
```bash
docker-compose down -v
```

---

## 🎯 Sunumda Nasıl Demo Yapılır?

### Sıralı Demo Senaryosu (10 dakika):

**1. Dashboard'u göster** (1 dk)
- "Sistem genel durumunu gösteriyor, her 10 saniyede otomatik yenileniyor"
- Servis durumları yeşil/kırmızı görünüyor

**2. Chaos Panel** (3 dk)
- Servis adına `payment-service` yaz
- "Servis Öldür" → tabloda anında görünüyor ← **WebSocket demo**
- "Gecikme Ekle" → buton birkaç saniye bekler (Thread.sleep çalışıyor)
- "Hata Enjekte Et" → hata tablosu doluyor
- "Gerçek Netflix Chaos Monkey böyle çalışıyor" de

**3. Security Panel** (3 dk)
- `user-api` yaz, "Tara" → 0-5 arası açık çıkıyor
- Karta tıkla → açıklar açılıyor (CRITICAL/HIGH/MEDIUM/LOW)
- SSL Kontrol: `google.com` yaz
- Port Tarama: `myserver.com` yaz
- "OWASP ZAP ve Nessus gibi araçların simülasyonu" de

**4. Cascade Failure Demo** (2 dk) ← **En etkileyici kısım**
- Chaos Panel'e dön, `security-service` yaz, "Servis Öldür" seç
- Hemen Report Panel'e geç, "Rapor Oluştur" tıkla
- **Security özeti boş gelecek** → "Bir servis çöktüğünde diğerleri nasıl etkileniyor"
- 30 saniye sonra tekrar dene → kendi kendine düzeldi (expire)

**5. Otomatik Zamanlayıcı** (1 dk)
- Dashboard → Zamanlayıcı paneli → "30" yaz → "Başlat"
- "Artık sistem kendi kendini test ediyor, CI/CD pipeline'ına entegre edilebilir" de

---

## 🔌 Tüm API Endpointleri

### Chaos Service (8081)
```
POST   /api/chaos/kill/{servisAdi}     → Servisi öldür
POST   /api/chaos/delay/{servisAdi}    → Gecikme ekle (1-5sn)
POST   /api/chaos/error/{servisAdi}    → Hata enjekte et
GET    /api/chaos/status               → Tüm olayları listele
DELETE /api/chaos/reset                → Temizle
GET    /api/chaos/mode/{servisAdi}     → Aktif chaos modu sorgula
GET    /api/chaos/health               → Sağlık kontrolü
```

### Security Service (8082)
```
POST   /api/security/scan/{servisAdi}      → Güvenlik taraması
GET    /api/security/scan/{scanId}         → Tarama sonucu getir
GET    /api/security/scans                 → Tüm taramalar
POST   /api/security/check/ssl/{host}      → SSL kontrolü
POST   /api/security/check/ports/{host}    → Port taraması
GET    /api/security/health                → Sağlık kontrolü
```

### Report Service (8083)
```
GET    /api/report/summary             → Tam özet
GET    /api/report/chaos               → Chaos özeti
GET    /api/report/security            → Güvenlik özeti
POST   /api/report/generate            → Yeni rapor oluştur
GET    /api/report/stats               → İstatistikler
POST   /api/scheduler/start?intervalSeconds=60  → Zamanlayıcıyı başlat
POST   /api/scheduler/stop             → Zamanlayıcıyı durdur
GET    /api/scheduler/status           → Zamanlayıcı durumu
GET    /api/report/health              → Sağlık kontrolü
```

---

## 🌐 Cloud Deploy (Railway + Vercel)

### Backend → Railway

1. [railway.app](https://railway.app) → "New Project"
2. "Add Service" → "PostgreSQL" ekle (database URL otomatik verilir)
3. Her Java servis için: "Add Service" → "GitHub Repo" → klasörü seç
4. Environment Variables ayarla:

**chaos-service ve security-service için:**
```
SPRING_DATASOURCE_URL     = railway'den gelen postgres URL
SPRING_DATASOURCE_USERNAME = postgres kullanıcı adı
SPRING_DATASOURCE_PASSWORD = postgres şifresi
```

**report-service için ek olarak:**
```
CHAOS_SERVICE_URL    = https://chaos-service-xxx.up.railway.app
SECURITY_SERVICE_URL = https://security-service-xxx.up.railway.app
```

### Frontend → Vercel

1. [vercel.com](https://vercel.com) → "Import Project" → GitHub repo
2. Root Directory: `ui-service`
3. Environment Variables:
```
VITE_CHAOS_URL      = https://chaos-service-xxx.up.railway.app
VITE_SECURITY_URL   = https://security-service-xxx.up.railway.app
VITE_REPORT_URL     = https://report-service-xxx.up.railway.app
VITE_CHAOS_WS_URL   = https://chaos-service-xxx.up.railway.app/ws
```

---

## 🧠 Teknik Kavramlar (Sunumda Bahsedebileceğin)

| Kavram | Projede Nerede? |
|---|---|
| **Microservices** | 3 bağımsız Spring Boot servisi |
| **REST API** | Her servisin HTTP endpoint'leri |
| **WebSocket / STOMP** | Chaos olaylarının canlı akışı |
| **JPA / ORM** | Java ↔ PostgreSQL mapping |
| **Docker Compose** | Tüm servislerin tek komutla ayağa kalkması |
| **Chaos Engineering** | Netflix'in Chaos Monkey yaklaşımı |
| **Cascade Failure** | KILL → Report'ta boş güvenlik verisi |
| **Health Check** | Servisler birbirini kontrol ediyor |
| **Scheduled Tasks** | @Scheduled ile otomatik testler |
| **CI/CD Ready** | railway.toml + vercel.json |

---

## 📁 Dosya Yapısı

```
grup6-service-test-tool/
│
├── docker-compose.yml          ← Tüm servisleri ayağa kaldırır
├── PROJE_REHBERI.md            ← Bu dosya
│
├── chaos-service/              ← Port 8081
│   ├── Dockerfile
│   ├── railway.toml            ← Cloud deploy config
│   ├── pom.xml
│   └── src/main/java/com/grup6/chaos/
│       ├── model/
│       │   ├── ChaosResult.java    (DTO - API cevabı)
│       │   ├── ChaosEvent.java     (Entity - veritabanı)
│       │   └── ChaosMode.java      (Entity - aktif chaos durumu)
│       ├── repository/             (Veritabanı sorguları)
│       ├── service/
│       │   ├── ChaosService.java       (İş mantığı)
│       │   └── ChaosEventPublisher.java (WebSocket yayıncı)
│       ├── controller/
│       │   └── ChaosController.java
│       └── config/
│           ├── CorsConfig.java
│           └── WebSocketConfig.java    (STOMP ayarları)
│
├── security-service/           ← Port 8082
│   ├── Dockerfile
│   ├── railway.toml
│   ├── pom.xml
│   └── src/main/java/com/grup6/security/
│       ├── model/
│       │   ├── ScanResult.java         (DTO)
│       │   ├── ScanResultEntity.java   (Entity)
│       │   └── VulnerabilityEmbeddable.java (@ElementCollection)
│       ├── repository/
│       ├── service/SecurityScanService.java
│       └── controller/SecurityController.java
│
├── report-service/             ← Port 8083
│   ├── Dockerfile
│   ├── railway.toml
│   ├── pom.xml
│   └── src/main/java/com/grup6/report/
│       ├── model/Report.java
│       ├── service/ReportService.java      (Chaos propagation var)
│       ├── controller/
│       │   ├── ReportController.java
│       │   └── SchedulerController.java    (Zamanlayıcı API)
│       └── scheduler/
│           ├── SchedulerConfig.java        (Thread-safe ayarlar)
│           └── AutoTestScheduler.java      (@Scheduled)
│
└── ui-service/                 ← Port 3000
    ├── Dockerfile
    ├── vercel.json             ← Cloud deploy config
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                         (Tab navigasyonu)
        ├── api/apiClient.js                (Axios + scheduler client)
        ├── hooks/
        │   └── useChaosWebSocket.js        (WebSocket hook)
        └── components/
            ├── Dashboard.jsx               (SchedulerControl dahil)
            ├── ChaosPanel.jsx              (WebSocket bağlı)
            ├── SecurityPanel.jsx
            └── ReportPanel.jsx
```

---

## ❓ Sık Sorulan Sorular

**S: Veriler gerçek mi?**
A: Chaos ve güvenlik açıkları simülasyon — ama API'ler, veritabanı, WebSocket, Docker ağı tamamen gerçek teknoloji.

**S: Neden Railway + Vercel?**
A: Java backend'i Heroku alternatifleri (Railway, Render) halleder. React UI statik dosya olduğu için Vercel idealdir. İkisi birlikte tam stack cloud deploy sağlar.

**S: WebSocket neden sadece Chaos'ta var?**
A: Security taramaları kullanıcı tetikler ve POST cevabı zaten sonucu döner — push gerekmez. Chaos olayları hem manuel hem otomatik geldiği için real-time akış burada mantıklı.

**S: Chaos modu 30 saniye sonra neden biter?**
A: `ChaosMode.expiresAt` alanı. Gerçek sistemlerde de chaos testleri süre sınırlıdır; sonsuza kadar "broken" kalmak istemezsin.

**S: Postgresql bağlantısı neden env variable?**
A: `${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/grup6db}` → Docker'da env var geliyor, lokal geliştirmede default değer kullanılıyor. Aynı kod her ortamda çalışıyor.
