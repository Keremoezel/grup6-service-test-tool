package com.grup6.chaos.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Bir chaos olayinin sonucunu temsil eden model sinifi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChaosResult {

    private String id;
    private String serviceName;
    private ChaosType chaosType;
    private LocalDateTime timestamp;
    private boolean success;
    private String message;
    private long durationMs;

    public enum ChaosType {
        KILL, DELAY, ERROR
    }
}
