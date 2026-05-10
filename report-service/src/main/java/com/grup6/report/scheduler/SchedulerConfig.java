package com.grup6.report.scheduler;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Otomatik test zamanlayicisinin runtime konfigurasyonu.
 * Thread-safe atomic tipler kullanilir.
 */
@Component
public class SchedulerConfig {

    private final AtomicBoolean enabled = new AtomicBoolean(false);
    private final AtomicInteger intervalSeconds = new AtomicInteger(60);
    private final AtomicLong lastRunTime = new AtomicLong(0);

    public boolean isEnabled() { return enabled.get(); }
    public void setEnabled(boolean value) { enabled.set(value); }

    public int getIntervalSeconds() { return intervalSeconds.get(); }
    public void setIntervalSeconds(int seconds) { intervalSeconds.set(seconds); }

    public long getLastRunTime() { return lastRunTime.get(); }
    public void setLastRunTime(long time) { lastRunTime.set(time); }
}
