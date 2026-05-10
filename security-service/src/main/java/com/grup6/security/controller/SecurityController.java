package com.grup6.security.controller;

import com.grup6.security.model.ScanResult;
import com.grup6.security.service.SecurityScanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Guvenlik tarama islemlerini yoneten REST controller.
 */
@RestController
@RequestMapping("/api/security")
public class SecurityController {

    private final SecurityScanService securityScanService;

    public SecurityController(SecurityScanService securityScanService) {
        this.securityScanService = securityScanService;
    }

    /**
     * Servis icin tam guvenlik taramasi baslat
     */
    @PostMapping("/scan/{serviceName}")
    public ResponseEntity<ScanResult> runScan(@PathVariable String serviceName) {
        ScanResult result = securityScanService.runFullScan(serviceName);
        return ResponseEntity.ok(result);
    }

    /**
     * ID ile tarama sonucunu getir
     */
    @GetMapping("/scan/{scanId}")
    public ResponseEntity<ScanResult> getScanById(@PathVariable String scanId) {
        return securityScanService.getScanById(scanId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Tum tarama sonuclarini listele
     */
    @GetMapping("/scans")
    public ResponseEntity<List<ScanResult>> getAllScans() {
        return ResponseEntity.ok(securityScanService.getAllScans());
    }

    /**
     * SSL sertifika kontrolu
     */
    @PostMapping("/check/ssl/{host}")
    public ResponseEntity<Map<String, Object>> checkSsl(@PathVariable String host) {
        return ResponseEntity.ok(securityScanService.checkSsl(host));
    }

    /**
     * Acik port kontrolu
     */
    @PostMapping("/check/ports/{host}")
    public ResponseEntity<Map<String, Object>> checkPorts(@PathVariable String host) {
        return ResponseEntity.ok(securityScanService.checkPorts(host));
    }

    /**
     * Servis saglik kontrolu
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "security-service",
            "totalScans", securityScanService.getAllScans().size()
        ));
    }
}
