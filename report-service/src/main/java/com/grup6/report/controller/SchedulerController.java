package com.grup6.report.controller;

import com.grup6.report.scheduler.SchedulerConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

/**
 * Otomatik test zamanlayicisini baslatmak, durdurmak ve sorgulamak icin API.
 */
@RestController
@RequestMapping("/api/scheduler")
public class SchedulerController {

    private final SchedulerConfig config;

    public SchedulerController(SchedulerConfig config) {
        this.config = config;
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> start(
            @RequestParam(defaultValue = "60") int intervalSeconds) {
        config.setEnabled(true);
        config.setIntervalSeconds(Math.max(10, intervalSeconds)); // en az 10 saniye
        config.setLastRunTime(0); // hemen ilk calistirmaya hazir
        return ResponseEntity.ok(Map.of(
            "enabled", true,
            "intervalSeconds", config.getIntervalSeconds(),
            "message", "Otomatik testler baslatildi"
        ));
    }

    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stop() {
        config.setEnabled(false);
        return ResponseEntity.ok(Map.of(
            "enabled", false,
            "message", "Otomatik testler durduruldu"
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        long lastRun = config.getLastRunTime();
        return ResponseEntity.ok(Map.of(
            "enabled", config.isEnabled(),
            "intervalSeconds", config.getIntervalSeconds(),
            "lastRunAt", lastRun > 0 ? Instant.ofEpochMilli(lastRun).toString() : "Henuz calistirilmadi"
        ));
    }
}
