package com.grup6.report.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Olusturulan raporun model sinifi.
 * Chaos ve Security verilerini bir araya getirir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    private String reportId;
    private LocalDateTime generatedAt;
    private ChaosSummary chaosSummary;
    private SecuritySummary securitySummary;
    private int overallHealthScore;

    /**
     * Chaos olaylarinin ozeti
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChaosSummary {
        private int totalEvents;
        private int killCount;
        private int delayCount;
        private int errorCount;
        private double successRate;
    }

    /**
     * Guvenlik taramalarinin ozeti
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SecuritySummary {
        private int totalScans;
        private int criticalVulnerabilities;
        private double averageScore;
        private String mostRiskyService;
    }
}
