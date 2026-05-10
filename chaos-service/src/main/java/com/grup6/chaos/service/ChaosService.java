package com.grup6.chaos.service;

import com.grup6.chaos.model.ChaosEvent;
import com.grup6.chaos.model.ChaosMode;
import com.grup6.chaos.model.ChaosResult;
import com.grup6.chaos.model.ChaosResult.ChaosType;
import com.grup6.chaos.repository.ChaosModeRepository;
import com.grup6.chaos.repository.ChaosRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Chaos olaylarini yoneten is mantigi.
 * Olaylar PostgreSQL'de kalici olarak saklanir, WebSocket ile canli yayinlanir.
 */
@Service
public class ChaosService {

    private final ChaosRepository repository;
    private final ChaosModeRepository modeRepository;
    private final ChaosEventPublisher publisher;
    private final Random random = new Random();

    private static final int CHAOS_EXPIRE_SECONDS = 30;

    public ChaosService(ChaosRepository repository, ChaosModeRepository modeRepository, ChaosEventPublisher publisher) {
        this.repository = repository;
        this.modeRepository = modeRepository;
        this.publisher = publisher;
    }

    public ChaosResult killService(String serviceName) {
        long start = System.currentTimeMillis();
        boolean success = random.nextInt(100) < 70;
        String message = success
                ? serviceName + " servisi basariyla durduruldu (simulasyon)"
                : serviceName + " servisine ulasılamadi, zaten kapali olabilir";

        setChaosMode(serviceName, ChaosType.KILL);
        ChaosResult result = save(serviceName, ChaosType.KILL, success, message, System.currentTimeMillis() - start);
        publisher.publish(result);
        return result;
    }

    public ChaosResult delayService(String serviceName) throws InterruptedException {
        long start = System.currentTimeMillis();
        int delayMs = 1000 + random.nextInt(4000);
        Thread.sleep(delayMs);

        setChaosMode(serviceName, ChaosType.DELAY);
        ChaosResult result = save(serviceName, ChaosType.DELAY, true,
                serviceName + " servisine " + delayMs + "ms gecikme eklendi",
                System.currentTimeMillis() - start);
        publisher.publish(result);
        return result;
    }

    public ChaosResult injectError(String serviceName) {
        long start = System.currentTimeMillis();
        String[] errorTypes = {
            "NullPointerException", "ConnectionTimeoutException",
            "OutOfMemoryError", "SocketException", "DatabaseConnectionException"
        };
        String errorType = errorTypes[random.nextInt(errorTypes.length)];

        ChaosResult result;
        try {
            if (random.nextBoolean()) {
                throw new RuntimeException(errorType + " simule edildi: " + serviceName);
            }
            result = save(serviceName, ChaosType.ERROR, false,
                    serviceName + " servisinde " + errorType + " hatasi tetiklendi",
                    System.currentTimeMillis() - start);
        } catch (RuntimeException e) {
            result = save(serviceName, ChaosType.ERROR, false,
                    serviceName + " servisinde hata: " + e.getMessage(),
                    System.currentTimeMillis() - start);
        }
        publisher.publish(result);
        return result;
    }

    public List<ChaosResult> getAllEvents() {
        return repository.findAllByOrderByTimestampDesc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public void resetAllEvents() {
        repository.deleteAll();
        modeRepository.deleteAll();
    }

    /** Aktif chaos modunu sorgular; suresi dolmussa null doner */
    public Optional<ChaosMode> getActiveMode(String serviceName) {
        return modeRepository.findById(serviceName)
                .filter(m -> m.getExpiresAt().isAfter(LocalDateTime.now()));
    }

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

    // --- Yardimci metodlar ---

    private ChaosResult save(String serviceName, ChaosType type, boolean success, String message, long durationMs) {
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
