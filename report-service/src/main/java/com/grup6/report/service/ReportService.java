package com.grup6.report.service;

import com.grup6.report.model.Report;
import com.grup6.report.model.Report.ChaosSummary;
import com.grup6.report.model.Report.SecuritySummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Chaos ve Security servislerinden veri cekip rapor olusturan servis.
 */
@Service
public class ReportService {

    private final RestTemplate restTemplate;

    @Value("${chaos.service.url}")
    private String chaosServiceUrl;

    @Value("${security.service.url}")
    private String securityServiceUrl;

    public ReportService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Chaos ve Security verilerini birlestirerek tam rapor olusturur
     */
    public Report generateReport() {
        List<Map<String, Object>> chaosEvents = fetchChaosEvents();
        List<Map<String, Object>> securityScans = fetchSecurityScans();

        ChaosSummary chaosSummary = buildChaosSummary(chaosEvents);
        boolean isKilled = isServiceUnderKillChaos("security-service");
        SecuritySummary securitySummary = buildSecuritySummary(securityScans, isKilled);

        int healthScore = calculateHealthScore(chaosSummary, securitySummary);

        return Report.builder()
                .reportId(UUID.randomUUID().toString())
                .generatedAt(LocalDateTime.now())
                .chaosSummary(chaosSummary)
                .securitySummary(securitySummary)
                .overallHealthScore(healthScore)
                .build();
    }

    /**
     * Sadece chaos ozetini dondurur
     */
    public ChaosSummary getChaosSummary() {
        return buildChaosSummary(fetchChaosEvents());
    }

    /**
     * Sadece guvenlik ozetini dondurur
     */
    public SecuritySummary getSecuritySummary() {
        boolean isKilled = isServiceUnderKillChaos("security-service");
        return buildSecuritySummary(fetchSecurityScans(), isKilled);
    }

    /**
     * Istatistikleri hesaplar
     */
    public Map<String, Object> getStats() {
        List<Map<String, Object>> chaosEvents = fetchChaosEvents();
        List<Map<String, Object>> securityScans = fetchSecurityScans();

        ChaosSummary cs = buildChaosSummary(chaosEvents);
        boolean isKilled = isServiceUnderKillChaos("security-service");
        SecuritySummary ss = buildSecuritySummary(securityScans, isKilled);

        return Map.of(
            "chaosTotalEvents", cs.getTotalEvents(),
            "chaosKillCount",   cs.getKillCount(),
            "chaosErrorCount",  cs.getErrorCount(),
            "chaosDelayCount",  cs.getDelayCount(),
            "securityTotalScans", ss.getTotalScans(),
            "securityAverageScore", ss.getAverageScore(),
            "criticalVulnerabilities", ss.getCriticalVulnerabilities(),
            "overallHealthScore", calculateHealthScore(cs, ss)
        );
    }

    // --- Veri cekme metodlari ---

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchChaosEvents() {
        try {
            List<Map<String, Object>> result = restTemplate.exchange(
                chaosServiceUrl + "/api/chaos/status",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (RestClientException e) {
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchSecurityScans() {
        // Chaos propagation: security-service KILL modundaysa veri donme
        if (isServiceUnderKillChaos("security-service")) {
            return Collections.emptyList();
        }
        // DELAY modundaysa 2sn bekle (gercek latency etkisi)
        if (isServiceUnderDelayChaos("security-service")) {
            try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        }
        try {
            List<Map<String, Object>> result = restTemplate.exchange(
                securityServiceUrl + "/api/security/scans",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (RestClientException e) {
            return Collections.emptyList();
        }
    }

    /** Chaos modunu chaos-service'den sorgular */
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchChaosMode(String serviceName) {
        try {
            return restTemplate.getForObject(
                chaosServiceUrl + "/api/chaos/mode/" + serviceName,
                Map.class
            );
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private boolean isServiceUnderKillChaos(String serviceName) {
        Map<String, Object> mode = fetchChaosMode(serviceName);
        return Boolean.TRUE.equals(mode.get("active")) && "KILL".equals(mode.get("type"));
    }

    private boolean isServiceUnderDelayChaos(String serviceName) {
        Map<String, Object> mode = fetchChaosMode(serviceName);
        return Boolean.TRUE.equals(mode.get("active")) && "DELAY".equals(mode.get("type"));
    }

    // --- Hesaplama metodlari ---

    private ChaosSummary buildChaosSummary(List<Map<String, Object>> events) {
        int total = events.size();
        int kills = (int) events.stream().filter(e -> "KILL".equals(e.get("chaosType"))).count();
        int delays = (int) events.stream().filter(e -> "DELAY".equals(e.get("chaosType"))).count();
        int errors = (int) events.stream().filter(e -> "ERROR".equals(e.get("chaosType"))).count();
        long successCount = events.stream().filter(e -> Boolean.TRUE.equals(e.get("success"))).count();
        double successRate = total > 0 ? (double) successCount / total * 100 : 0;

        return ChaosSummary.builder()
                .totalEvents(total)
                .killCount(kills)
                .delayCount(delays)
                .errorCount(errors)
                .successRate(Math.round(successRate * 10.0) / 10.0)
                .build();
    }

    @SuppressWarnings("unchecked")
    private SecuritySummary buildSecuritySummary(List<Map<String, Object>> scans, boolean isKilled) {
        int total = scans.size();

        int criticalCount = 0;
        int highCount = 0;
        int mediumCount = 0;
        double totalScore = 0;
        String mostRiskyService = "N/A";
        int lowestScore = Integer.MAX_VALUE;

        for (Map<String, Object> scan : scans) {
            Integer score = (Integer) scan.get("score");
            if (score != null) {
                totalScore += score;
                if (score < lowestScore) {
                    lowestScore = score;
                    mostRiskyService = (String) scan.getOrDefault("serviceName", "Unknown");
                }
            }

            List<Map<String, Object>> vulns = (List<Map<String, Object>>) scan.get("vulnerabilities");
            if (vulns != null) {
                criticalCount += vulns.stream().filter(v -> "CRITICAL".equals(v.get("severity"))).count();
                highCount     += vulns.stream().filter(v -> "HIGH".equals(v.get("severity"))).count();
                mediumCount   += vulns.stream().filter(v -> "MEDIUM".equals(v.get("severity"))).count();
            }
        }

        double avgScore = total > 0 ? Math.round((totalScore / total) * 10.0) / 10.0 : 0;

        return SecuritySummary.builder()
                .totalScans(total)
                .criticalVulnerabilities(criticalCount)
                .highVulnerabilities(highCount)
                .mediumVulnerabilities(mediumCount)
                .averageScore(avgScore)
                .mostRiskyService(total > 0 ? mostRiskyService : "N/A")
                .cascadeFailure(isKilled)
                .build();
    }

    private int calculateHealthScore(ChaosSummary cs, SecuritySummary ss) {
        // Penalty-based scoring: start at 100, subtract for each chaos event and vulnerability
        int score = 100;
        score -= cs.getKillCount()  * 30;   // Kill injection  → -30 per event
        score -= cs.getErrorCount() * 20;   // Error injection → -20 per event
        score -= cs.getDelayCount() * 10;   // Delay injection → -10 per event
        score -= ss.getCriticalVulnerabilities() * 15; // Critical vuln → -15 each
        score -= ss.getHighVulnerabilities()     *  8; // High vuln     → -8 each
        score -= ss.getMediumVulnerabilities()   *  3; // Medium vuln   → -3 each
        return Math.max(0, Math.min(100, score));
    }
}
