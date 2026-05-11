package com.grup6.chaos.service;

import com.grup6.chaos.model.ChaosEvent;
import com.grup6.chaos.model.ChaosMode;
import com.grup6.chaos.model.ChaosResult;
import com.grup6.chaos.model.ChaosResult.ChaosType;
import com.grup6.chaos.repository.ChaosModeRepository;
import com.grup6.chaos.repository.ChaosRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Chaos olaylarini yoneten is mantigi.
 *
 * "target-video-service" servis adı için GERÇEK HTTP saldırısı yapılır:
 *   kill  → POST /api/admin/shutdown
 *   delay → POST /api/admin/inject-delay
 *   error → POST /api/admin/inject-error
 *
 * Diğer servis adları için simülasyon moduna düşülür (eski davranış).
 */
@Service
public class ChaosService {

    private static final String TARGET_VIDEO_SERVICE = "target-video-service";
    private static final int CHAOS_EXPIRE_SECONDS = 30;

    private final ChaosRepository repository;
    private final ChaosModeRepository modeRepository;
    private final ChaosEventPublisher publisher;
    private final RestTemplate restTemplate;
    private final Random random = new Random();

    @Value("${target.video.url:http://localhost:4000}")
    private String targetVideoUrl;

    public ChaosService(ChaosRepository repository,
                        ChaosModeRepository modeRepository,
                        ChaosEventPublisher publisher) {
        this.repository = repository;
        this.modeRepository = modeRepository;
        this.publisher = publisher;
        this.restTemplate = new RestTemplate();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KILL
    // ─────────────────────────────────────────────────────────────────────────

    public ChaosResult killService(String serviceName) {
        long start = System.currentTimeMillis();
        boolean success;
        String message;

        if (TARGET_VIDEO_SERVICE.equalsIgnoreCase(serviceName)) {
            // REAL ATTACK — call /api/admin/shutdown on the video service
            try {
                String url = targetVideoUrl + "/api/admin/shutdown?ttl=" + CHAOS_EXPIRE_SECONDS;
                ResponseEntity<Map> resp = restTemplate.postForEntity(url, null, Map.class);
                success = resp.getStatusCode().is2xxSuccessful();
                message = success
                    ? "target-video-service KILLED — returning 503 for " + CHAOS_EXPIRE_SECONDS + "s (real attack)"
                    : "target-video-service kill failed — HTTP " + resp.getStatusCode();
            } catch (Exception e) {
                success = false;
                message = "target-video-service unreachable: " + e.getMessage();
            }
        } else {
            // SIMULATION — legacy behaviour for other service names
            success = random.nextInt(100) < 70;
            message = success
                ? serviceName + " servisi basariyla durduruldu (simulasyon)"
                : serviceName + " servisine ulasilamadi, zaten kapali olabilir";
        }

        setChaosMode(serviceName, ChaosType.KILL);
        ChaosResult result = save(serviceName, ChaosType.KILL, success, message,
                System.currentTimeMillis() - start);
        publisher.publish(result);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELAY
    // ─────────────────────────────────────────────────────────────────────────

    public ChaosResult delayService(String serviceName) throws InterruptedException {
        long start = System.currentTimeMillis();
        int delayMs = 1000 + random.nextInt(4000);   // 1–5 s
        boolean success;
        String message;

        if (TARGET_VIDEO_SERVICE.equalsIgnoreCase(serviceName)) {
            // REAL ATTACK — inject delay into every video service request
            try {
                String url = targetVideoUrl + "/api/admin/inject-delay?ms=" + delayMs
                        + "&ttl=" + CHAOS_EXPIRE_SECONDS;
                ResponseEntity<Map> resp = restTemplate.postForEntity(url, null, Map.class);
                success = resp.getStatusCode().is2xxSuccessful();
                message = success
                    ? "target-video-service: " + delayMs + "ms delay injected for " + CHAOS_EXPIRE_SECONDS + "s (real attack)"
                    : "Delay injection failed — HTTP " + resp.getStatusCode();
            } catch (Exception e) {
                success = false;
                message = "target-video-service unreachable: " + e.getMessage();
            }
        } else {
            // SIMULATION
            Thread.sleep(delayMs);
            success = true;
            message = serviceName + " servisine " + delayMs + "ms gecikme eklendi (simulasyon)";
        }

        setChaosMode(serviceName, ChaosType.DELAY);
        ChaosResult result = save(serviceName, ChaosType.DELAY, success, message,
                System.currentTimeMillis() - start);
        publisher.publish(result);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERROR
    // ─────────────────────────────────────────────────────────────────────────

    public ChaosResult injectError(String serviceName) {
        long start = System.currentTimeMillis();
        int errorRate = 50 + random.nextInt(40);   // 50–90 %
        boolean success;
        String message;

        if (TARGET_VIDEO_SERVICE.equalsIgnoreCase(serviceName)) {
            // REAL ATTACK — inject error rate into video service
            try {
                String url = targetVideoUrl + "/api/admin/inject-error?rate=" + errorRate
                        + "&ttl=" + CHAOS_EXPIRE_SECONDS;
                ResponseEntity<Map> resp = restTemplate.postForEntity(url, null, Map.class);
                success = resp.getStatusCode().is2xxSuccessful();
                message = success
                    ? "target-video-service: " + errorRate + "% error rate injected for " + CHAOS_EXPIRE_SECONDS + "s (real attack)"
                    : "Error injection failed — HTTP " + resp.getStatusCode();
            } catch (Exception e) {
                success = false;
                message = "target-video-service unreachable: " + e.getMessage();
            }
        } else {
            // SIMULATION
            String[] errorTypes = {
                "NullPointerException", "ConnectionTimeoutException",
                "OutOfMemoryError", "SocketException", "DatabaseConnectionException"
            };
            String errorType = errorTypes[random.nextInt(errorTypes.length)];
            success = false;
            message = serviceName + " servisinde " + errorType + " hatasi tetiklendi (simulasyon)";
        }

        setChaosMode(serviceName, ChaosType.ERROR);
        ChaosResult result = save(serviceName, ChaosType.ERROR, success, message,
                System.currentTimeMillis() - start);
        publisher.publish(result);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESET — also clears chaos state on the video service
    // ─────────────────────────────────────────────────────────────────────────

    public void resetTargetVideo() {
        try {
            restTemplate.postForEntity(targetVideoUrl + "/api/admin/reset", null, Map.class);
        } catch (Exception ignored) { }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────────

    public List<ChaosResult> getAllEvents() {
        return repository.findAllByOrderByTimestampDesc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public void resetAllEvents() {
        repository.deleteAll();
        modeRepository.deleteAll();
        resetTargetVideo();   // also clear real chaos state
    }

    public Optional<ChaosMode> getActiveMode(String serviceName) {
        return modeRepository.findById(serviceName)
                .filter(m -> m.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    /** Returns current chaos state of the target video service (live) */
    public Map<String, Object> getTargetVideoStatus() {
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(
                    targetVideoUrl + "/api/admin/status", Map.class);
            return resp.getBody() != null ? resp.getBody() : Map.of("error", "empty response");
        } catch (Exception e) {
            return Map.of("error", "unreachable: " + e.getMessage(), "url", targetVideoUrl);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void setChaosMode(String serviceName, ChaosType type) {
        LocalDateTime now = LocalDateTime.now();
        ChaosMode mode = ChaosMode.builder()
                .serviceName(serviceName)
                .activeType(type)
                .activatedAt(now)
                .expiresAt(now.plusSeconds(CHAOS_EXPIRE_SECONDS))
                .build();
        modeRepository.save(mode);
    }

    private ChaosResult save(String serviceName, ChaosType type, boolean success,
                              String message, long durationMs) {
        ChaosEvent entity = ChaosEvent.builder()
                .id(UUID.randomUUID().toString())
                .serviceName(serviceName)
                .chaosType(type)
                .timestamp(LocalDateTime.now())
                .success(success)
                .message(message)
                .durationMs(durationMs)
                .build();
        return toDto(repository.save(entity));
    }

    private ChaosResult toDto(ChaosEvent e) {
        return ChaosResult.builder()
                .id(e.getId())
                .serviceName(e.getServiceName())
                .chaosType(e.getChaosType())
                .timestamp(e.getTimestamp())
                .success(e.isSuccess())
                .message(e.getMessage())
                .durationMs(e.getDurationMs())
                .build();
    }
}
