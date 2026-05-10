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
        boolean sslValid = random.nextInt(100) < 60;
        boolean httpsRedirect = random.nextBoolean();
        int daysUntilExpiry = 30 + random.nextInt(335);
        return Map.of(
            "host", host,
            "sslValid", sslValid,
            "httpsRedirect", httpsRedirect,
            "certificateDaysRemaining", daysUntilExpiry,
            "tlsVersion", sslValid ? "TLS 1.3" : "TLS 1.1 (zayif)",
            "message", sslValid ? "SSL sertifikasi gecerli" : "SSL sertifikasi gecersiz veya suresi dolmak uzere"
        );
    }

    public Map<String, Object> checkPorts(String host) {
        List<Map<String, Object>> portResults = new ArrayList<>();
        for (int[] portInfo : COMMON_PORTS) {
            int port = portInfo[0];
            boolean isRisky = portInfo[1] == 1;
            boolean isOpen = random.nextInt(100) < 50;
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
        int count = random.nextInt(6);
        String[][] templates = {
            {"OPEN_PORT", "CRITICAL", serviceName + " uzerinde kritik port acik (3306 - MySQL)", "Guvenlik duvari ile 3306 portunu kapat"},
            {"WEAK_CONFIG", "HIGH", serviceName + " varsayilan kimlik bilgileri kullaniyor", "Admin sifresini degistir, MFA etkinlestir"},
            {"SSL_ISSUE", "HIGH", serviceName + " SSL sertifikasi 30 gun icinde surecek", "SSL sertifikasini yenile"},
            {"AUTH_MISSING", "CRITICAL", serviceName + " API kimlik dogrulama eksik", "OAuth2 veya API key ekle"},
            {"WEAK_CONFIG", "MEDIUM", serviceName + " HTTP headers eksik (X-Frame-Options)", "Guvenlik headerlarini ekle"},
            {"OPEN_PORT", "LOW", serviceName + " 8080 portu disariya acik", "8080 portunu dahili erisime kapat"},
            {"SSL_ISSUE", "MEDIUM", serviceName + " eski TLS surumu kullaniyor", "TLS 1.2+ zorunlu hale getir"},
            {"AUTH_MISSING", "HIGH", serviceName + " rate limiting uygulanmamis", "API rate limiting ekle"}
        };
        List<String[]> shuffled = new ArrayList<>(Arrays.asList(templates));
        Collections.shuffle(shuffled);
        return shuffled.stream().limit(count).map(t -> VulnerabilityEmbeddable.builder()
                .type(VulnerabilityType.valueOf(t[0])).severity(Severity.valueOf(t[1]))
                .description(t[2]).recommendation(t[3]).build()
        ).collect(Collectors.toList());
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
