package com.grup6.report.scheduler;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Random;

/**
 * Belirli aralikta otomatik chaos ve security testleri calistiran zamanlayici.
 * Her 5 saniyede bir kontrol eder; yapılandırılan interval gecmisse testleri tetikler.
 */
@Component
public class AutoTestScheduler {

    private final SchedulerConfig config;
    private final RestTemplate restTemplate;
    private final Random random = new Random();

    @Value("${chaos.service.url}")
    private String chaosServiceUrl;

    @Value("${security.service.url}")
    private String securityServiceUrl;

    private static final List<String> TARGET_SERVICES = List.of(
        "target-video-service"
    );
    private static final String[] CHAOS_TYPES = {"kill", "delay", "error"};

    public AutoTestScheduler(SchedulerConfig config, RestTemplate restTemplate) {
        this.config = config;
        this.restTemplate = restTemplate;
    }

    @Scheduled(fixedDelay = 5000)
    public void runAutoTests() {
        if (!config.isEnabled()) return;

        long elapsedSeconds = (System.currentTimeMillis() - config.getLastRunTime()) / 1000;
        if (elapsedSeconds < config.getIntervalSeconds()) return;

        config.setLastRunTime(System.currentTimeMillis());

        // Her servis icin rastgele bir chaos eylemi
        TARGET_SERVICES.forEach(svc -> {
            String type = CHAOS_TYPES[random.nextInt(CHAOS_TYPES.length)];
            try {
                restTemplate.postForObject(
                    chaosServiceUrl + "/api/chaos/" + type + "/" + svc, null, String.class
                );
            } catch (Exception ignored) {}
        });

        // Her servis icin guvenlik taramasi
        TARGET_SERVICES.forEach(svc -> {
            try {
                restTemplate.postForObject(
                    securityServiceUrl + "/api/security/scan/" + svc, null, String.class
                );
            } catch (Exception ignored) {}
        });
    }
}
