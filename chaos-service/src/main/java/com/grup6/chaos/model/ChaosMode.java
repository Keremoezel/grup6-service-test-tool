package com.grup6.chaos.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Bir servise uygulanan aktif chaos modunu temsil eder.
 * 30 saniye sonra otomatik olarak sona erer.
 * Report service bu tabloyu sorgulayarak gercek cascade arıza davranisi gosterir.
 */
@Entity
@Table(name = "chaos_modes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChaosMode {

    @Id
    private String serviceName;

    @Enumerated(EnumType.STRING)
    private ChaosResult.ChaosType activeType;

    private LocalDateTime activatedAt;

    private LocalDateTime expiresAt;
}
