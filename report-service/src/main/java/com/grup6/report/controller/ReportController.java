package com.grup6.report.controller;

import com.grup6.report.model.Report;
import com.grup6.report.service.ReportService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.grup6.report.model.ReportEntity;

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
     * Tum rapor gecmisini getir (sayfali)
     */
    @GetMapping("/all")
    public ResponseEntity<Page<ReportEntity>> getAllReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(reportService.getPaginatedReports(PageRequest.of(page, size)));
    }

    /**
     * Tum raporlari sil
     */
    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, String>> clearReports() {
        reportService.deleteAllReports();
        return ResponseEntity.ok(Map.of("message", "All reports cleared"));
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
