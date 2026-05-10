package com.grup6.security.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Guvenlik tarama sonuclarini PostgreSQL'de saklayan JPA entity.
 * Vulnerability listesi scan_vulnerabilities tablosunda @ElementCollection ile tutulur.
 */
@Entity
@Table(name = "scan_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResultEntity {

    @Id
    @Column(length = 36)
    private String scanId;

    @Column(nullable = false)
    private String serviceName;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "scan_vulnerabilities",
        joinColumns = @JoinColumn(name = "scan_id")
    )
    @Builder.Default
    private List<VulnerabilityEmbeddable> vulnerabilities = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private ScanResult.RiskLevel overallRisk;

    private int score;
}
