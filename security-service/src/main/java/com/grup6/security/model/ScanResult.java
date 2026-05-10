package com.grup6.security.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Bir guvenlik taramasinin sonucunu temsil eden model sinifi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResult {

    private String scanId;
    private String serviceName;
    private LocalDateTime timestamp;
    private List<Vulnerability> vulnerabilities;
    private RiskLevel overallRisk;
    private int score;

    /**
     * Tespit edilen bir guvenlik acigini temsil eder.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Vulnerability {
        private VulnerabilityType type;
        private Severity severity;
        private String description;
        private String recommendation;
    }

    public enum VulnerabilityType {
        OPEN_PORT, WEAK_CONFIG, SSL_ISSUE, AUTH_MISSING
    }

    public enum Severity {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum RiskLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}
