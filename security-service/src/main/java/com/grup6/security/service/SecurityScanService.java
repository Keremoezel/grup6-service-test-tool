package com.grup6.security.service;

import com.grup6.security.model.ScanResult;
import com.grup6.security.model.ScanResult.*;
import com.grup6.security.model.ScanResultEntity;
import com.grup6.security.model.VulnerabilityEmbeddable;
import com.grup6.security.repository.ScanRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.net.Socket;
import java.net.InetSocketAddress;
import java.net.URL;
import java.net.HttpURLConnection;
import javax.net.ssl.HttpsURLConnection;
import java.security.cert.X509Certificate;
import java.util.stream.Collectors;

/**
 * Guvenlik tarama is mantigi.
 * Sonuclar PostgreSQL'de kalici olarak saklanir.
 */
@Service
public class SecurityScanService {

    private final ScanRepository repository;
    private final Random random = new Random();

    private static final List<int[]> COMMON_PORTS = List.of(
        new int[]{80, 1}, new int[]{443, 0},
        new int[]{8080, 1}, new int[]{3306, 1}, new int[]{5432, 1}
    );

    public SecurityScanService(ScanRepository repository) {
        this.repository = repository;
    }

    public ScanResult runFullScan(String serviceName) {
        List<VulnerabilityEmbeddable> vulnEmbeddables = generateRandomVulnerabilities(serviceName);
        List<Vulnerability> vulnDtos = vulnEmbeddables.stream().map(this::embeddableToDto).collect(Collectors.toList());

        int score = calculateScore(vulnDtos);
        RiskLevel risk = calculateRiskLevel(vulnDtos);

        ScanResultEntity entity = ScanResultEntity.builder()
                .scanId(UUID.randomUUID().toString())
                .serviceName(serviceName)
                .timestamp(LocalDateTime.now())
                .vulnerabilities(vulnEmbeddables)
                .overallRisk(risk)
                .score(score)
                .build();

        return toDto(repository.save(entity));
    }

    public Map<String, Object> checkSsl(String host) {
        boolean sslValid = false;
        int daysUntilExpiry = 0;
        String tlsVersion = "None";
        String message = "SSL Connection Failed";
        
        try {
            URL url = new URL("https://" + host);
            HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
            conn.setConnectTimeout(2000);
            conn.setReadTimeout(2000);
            conn.connect();
            
            tlsVersion = conn.getCipherSuite();
            java.security.cert.Certificate[] certs = conn.getServerCertificates();
            if (certs.length > 0 && certs[0] instanceof X509Certificate) {
                X509Certificate x509 = (X509Certificate) certs[0];
                long diff = x509.getNotAfter().getTime() - System.currentTimeMillis();
                daysUntilExpiry = (int) (diff / (1000 * 60 * 60 * 24));
                sslValid = true;
                message = "SSL Certificate Valid";
            }
        } catch (Exception e) {
            message = e.getClass().getSimpleName() + ": " + e.getMessage();
        }

        return Map.of(
            "host", host,
            "sslValid", sslValid,
            "httpsRedirect", false,
            "certificateDaysRemaining", Math.max(0, daysUntilExpiry),
            "tlsVersion", tlsVersion,
            "message", message
        );
    }

    public Map<String, Object> checkPorts(String host) {
        List<Map<String, Object>> portResults = new ArrayList<>();
        for (int[] portInfo : COMMON_PORTS) {
            int port = portInfo[0];
            boolean isRisky = portInfo[1] == 1;
            boolean isOpen = false;
            
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(host, port), 800);
                isOpen = true;
            } catch (Exception e) {
                isOpen = false;
            }
            
            portResults.add(Map.of(
                "port", port, "open", isOpen,
                "risk", isOpen && isRisky ? "HIGH" : "LOW",
                "service", getServiceName(port)
            ));
        }
        return Map.of("host", host, "checkedAt", LocalDateTime.now().toString(), "ports", portResults);
    }

    public Optional<ScanResult> getScanById(String scanId) {
        return repository.findById(scanId).map(this::toDto);
    }

    public List<ScanResult> getAllScans() {
        return repository.findAllByOrderByTimestampDesc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public long deleteAllScans() {
        long count = repository.count();
        repository.deleteAll();
        return count;
    }

    // --- Mapping ve hesaplama yardimcilari ---

    private ScanResult toDto(ScanResultEntity entity) {
        List<Vulnerability> vulns = entity.getVulnerabilities().stream()
                .map(this::embeddableToDto).collect(Collectors.toList());
        return ScanResult.builder()
                .scanId(entity.getScanId())
                .serviceName(entity.getServiceName())
                .timestamp(entity.getTimestamp())
                .vulnerabilities(vulns)
                .overallRisk(entity.getOverallRisk())
                .score(entity.getScore())
                .build();
    }

    private Vulnerability embeddableToDto(VulnerabilityEmbeddable e) {
        return Vulnerability.builder()
                .type(e.getType()).severity(e.getSeverity())
                .description(e.getDescription()).recommendation(e.getRecommendation())
                .build();
    }

    private List<VulnerabilityEmbeddable> generateRandomVulnerabilities(String serviceName) {
        List<VulnerabilityEmbeddable> vulns = new ArrayList<>();
        String actualHost = serviceName.equals("target-video-service") ? "target-video-service" : serviceName;
        if (actualHost.equals("localhost")) actualHost = "127.0.0.1";
        
        // Real Port Scan
        for (int[] portInfo : COMMON_PORTS) {
            int port = portInfo[0];
            if (portInfo[1] == 1) { // isRisky
                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(actualHost, port), 800);
                    vulns.add(VulnerabilityEmbeddable.builder()
                        .type(VulnerabilityType.OPEN_PORT)
                        .severity(port == 3306 || port == 5432 ? Severity.CRITICAL : Severity.HIGH)
                        .description(serviceName + " uzerinde riskli port acik: " + port)
                        .recommendation(port + " portunu firewall arkasina alin.")
                        .build());
                } catch (Exception e) {}
            }
        }
        
        // 1. Deep Scan - Check /api/debug (Intentional vulnerability)
        try {
            URL url = new URL("http://" + actualHost + ":4000/api/debug");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(1500);
            if (conn.getResponseCode() == 200) {
                 vulns.add(VulnerabilityEmbeddable.builder()
                    .type(VulnerabilityType.AUTH_MISSING)
                    .severity(Severity.CRITICAL)
                    .description("Hedef serviste /api/debug ucu disariya acik ve hassas bilgileri sizdiriyor.")
                    .recommendation("Debug endpoint'ini production ortaminda kapatin veya kimlik dogrulama ekleyin.")
                    .build());
            }
        } catch (Exception e) {}

        // 2. Deep Scan - Check /api/videos for CORS issues
        try {
            URL url = new URL("http://" + actualHost + ":4000/api/videos");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("OPTIONS");
            conn.setConnectTimeout(1500);
            conn.connect();
            String cors = conn.getHeaderField("Access-Control-Allow-Origin");
            if ("*".equals(cors)) {
                 vulns.add(VulnerabilityEmbeddable.builder()
                    .type(VulnerabilityType.WEAK_CONFIG)
                    .severity(Severity.HIGH)
                    .description("/api/videos CORS politikasi asiri esnek (Access-Control-Allow-Origin: *).")
                    .recommendation("Wildcard (*) yerine sadece guvenilir domainlere izin verin.")
                    .build());
            }
        } catch (Exception e) {}

        // 3. Deep Scan - Check /api/health for Info Disclosure
        try {
            URL url = new URL("http://" + actualHost + ":4000/api/health");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(1500);
            if (conn.getResponseCode() == 200) {
                 java.util.Scanner s = new java.util.Scanner(conn.getInputStream()).useDelimiter("\\A");
                 String body = s.hasNext() ? s.next() : "";
                 if (body.contains("chaos") || body.contains("memoryUsage")) {
                     vulns.add(VulnerabilityEmbeddable.builder()
                        .type(VulnerabilityType.WEAK_CONFIG)
                        .severity(Severity.MEDIUM)
                        .description("Health endpoint gereginden fazla detay (chaos durumu vb.) ifsa ediyor.")
                        .recommendation("Public health endpoint'lerini sadece UP/DOWN dönecek sekilde sadelestirin.")
                        .build());
                 }
            }
        } catch (Exception e) {}

        // Custom check for HTTPS
        try {
            URL url = new URL("https://" + actualHost);
            HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
            conn.setConnectTimeout(1000);
            conn.connect();
        } catch (javax.net.ssl.SSLHandshakeException e) {
             vulns.add(VulnerabilityEmbeddable.builder()
                .type(VulnerabilityType.SSL_ISSUE)
                .severity(Severity.HIGH)
                .description("Gecersiz SSL sertifikasi.")
                .recommendation("Sertifikayi yenileyin.")
                .build());
        } catch (Exception e) {
             vulns.add(VulnerabilityEmbeddable.builder()
                .type(VulnerabilityType.WEAK_CONFIG)
                .severity(Severity.MEDIUM)
                .description("HTTPS (Port 443) kapali veya erisilemiyor.")
                .recommendation("Guvenlik icin TLS/SSL yapilandirilmali.")
                .build());
        }

        return vulns;
    }

    private int calculateScore(List<Vulnerability> vulnerabilities) {
        int deduction = vulnerabilities.stream().mapToInt(v -> switch (v.getSeverity()) {
            case CRITICAL -> 25; case HIGH -> 15; case MEDIUM -> 8; case LOW -> 3;
        }).sum();
        return Math.max(0, 100 - deduction);
    }

    private RiskLevel calculateRiskLevel(List<Vulnerability> vulnerabilities) {
        if (vulnerabilities.stream().anyMatch(v -> v.getSeverity() == Severity.CRITICAL)) return RiskLevel.CRITICAL;
        if (vulnerabilities.stream().anyMatch(v -> v.getSeverity() == Severity.HIGH)) return RiskLevel.HIGH;
        if (vulnerabilities.stream().anyMatch(v -> v.getSeverity() == Severity.MEDIUM)) return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }

    private String getServiceName(int port) {
        return switch (port) {
            case 80 -> "HTTP"; case 443 -> "HTTPS"; case 8080 -> "HTTP-Alt";
            case 3306 -> "MySQL"; case 5432 -> "PostgreSQL"; default -> "Unknown";
        };
    }
}
