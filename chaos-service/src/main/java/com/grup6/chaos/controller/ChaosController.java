package com.grup6.chaos.controller;

import com.grup6.chaos.model.ChaosMode;
import com.grup6.chaos.model.ChaosResult;
import com.grup6.chaos.service.ChaosService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Chaos olaylarini tetikleyen ve sorgulayan REST controller.
 */
@RestController
@RequestMapping("/api/chaos")
public class ChaosController {

    private final ChaosService chaosService;

    public ChaosController(ChaosService chaosService) {
        this.chaosService = chaosService;
    }

    /**
     * Belirtilen servisi oldurme simulasyonu
     */
    @PostMapping("/kill/{serviceName}")
    public ResponseEntity<ChaosResult> killService(@PathVariable String serviceName) {
        ChaosResult result = chaosService.killService(serviceName);
        return ResponseEntity.ok(result);
    }

    /**
     * Belirtilen servise gecikme ekleme simulasyonu
     */
    @PostMapping("/delay/{serviceName}")
    public ResponseEntity<ChaosResult> delayService(@PathVariable String serviceName) throws InterruptedException {
        ChaosResult result = chaosService.delayService(serviceName);
        return ResponseEntity.ok(result);
    }

    /**
     * Belirtilen servise hata enjeksiyonu simulasyonu
     */
    @PostMapping("/error/{serviceName}")
    public ResponseEntity<ChaosResult> injectError(@PathVariable String serviceName) {
        ChaosResult result = chaosService.injectError(serviceName);
        return ResponseEntity.ok(result);
    }

    /**
     * Tum chaos olaylarini listeler
     */
    @GetMapping("/status")
    public ResponseEntity<List<ChaosResult>> getStatus() {
        return ResponseEntity.ok(chaosService.getAllEvents());
    }

    /**
     * Tum chaos kayitlarini siler
     */
    @DeleteMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        chaosService.resetAllEvents();
        return ResponseEntity.ok(Map.of("message", "Tum chaos olaylari temizlendi"));
    }

    /**
     * Bir servisin aktif chaos modunu sorgular (report-service tarafindan kullanilir)
     */
    @GetMapping("/mode/{serviceName}")
    public ResponseEntity<Map<String, Object>> getMode(@PathVariable String serviceName) {
        Optional<ChaosMode> mode = chaosService.getActiveMode(serviceName);
        if (mode.isEmpty()) {
            return ResponseEntity.ok(Map.of("active", false, "serviceName", serviceName));
        }
        ChaosMode m = mode.get();
        return ResponseEntity.ok(Map.of(
            "active", true,
            "serviceName", serviceName,
            "type", m.getActiveType().name(),
            "expiresAt", m.getExpiresAt().toString()
        ));
    }

    /**
     * Servis saglik kontrolu
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "chaos-service",
            "totalEvents", chaosService.getAllEvents().size()
        ));
    }
}
