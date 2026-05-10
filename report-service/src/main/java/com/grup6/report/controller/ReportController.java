package com.grup6.report.controller;

import com.grup6.report.model.Report;
import com.grup6.report.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Rapor olusturma ve sorgulama islemlerini yoneten REST controller.
 */
@RestController
@RequestMapping("/api/report")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * Tum sistem ozeti
     */
    @GetMapping("/summary")
    public ResponseEntity<Report> getSummary() {
        return ResponseEntity.ok(reportService.generateReport());
    }

    /**
     * Chaos olaylari ozeti
     */
    @GetMapping("/chaos")
    public ResponseEntity<Report.ChaosSummary> getChaosSummary() {
        return ResponseEntity.ok(reportService.getChaosSummary());
    }

    /**
     * Guvenlik taramalari ozeti
     */
    @GetMapping("/security")
    public ResponseEntity<Report.SecuritySummary> getSecuritySummary() {
        return ResponseEntity.ok(reportService.getSecuritySummary());
    }

    /**
     * Tam rapor olustur
     */
    @PostMapping("/generate")
    public ResponseEntity<Report> generateReport() {
        return ResponseEntity.ok(reportService.generateReport());
    }

    /**
     * Istatistikler
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(reportService.getStats());
    }

    /**
     * Servis saglik kontrolu
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "report-service"
        ));
    }
}
