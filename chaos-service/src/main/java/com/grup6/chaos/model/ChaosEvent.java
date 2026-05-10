package com.grup6.chaos.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Chaos olaylarini veritabaninda kalici olarak saklayan JPA entity.
 * ChaosResult DTO ile ayni alanlara sahiptir, REST API donusu icin DTO'ya map edilir.
 */
@Entity
@Table(name = "chaos_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChaosEvent {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false)
    private String serviceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChaosResult.ChaosType chaosType;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private boolean success;

    @Column(length = 500)
    private String message;

    private long durationMs;
}
