package com.fairmacs.lms.security;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Thread-safe, bounded login attempt and temporary lockout service.
 * Tracks failed login attempts by normalized account identifier and by client IP
 * to mitigate brute-force and credential-stuffing attacks while ensuring lockouts
 * automatically expire after the configured window.
 */
@Service
public class LoginAttemptService {

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptService.class);

    private final int maxAccountAttempts;
    private final int maxIpAttempts;
    private final long lockoutDurationSeconds;
    private final int maxTrackedEntries;

    private final ConcurrentHashMap<String, AttemptRecord> accountAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AttemptRecord> ipAttempts = new ConcurrentHashMap<>();

    @Autowired
    public LoginAttemptService(
            @Value("${app.security.login.max-attempts:5}") int maxAccountAttempts,
            @Value("${app.security.login.ip-max-attempts:20}") int maxIpAttempts,
            @Value("${app.security.login.lockout-minutes:15}") long lockoutMinutes,
            @Value("${app.security.login.max-tracked-entries:10000}") int maxTrackedEntries) {
        this.maxAccountAttempts = Math.max(1, maxAccountAttempts);
        this.maxIpAttempts = Math.max(this.maxAccountAttempts, maxIpAttempts);
        this.lockoutDurationSeconds = Math.max(1L, lockoutMinutes * 60L);
        this.maxTrackedEntries = Math.max(100, maxTrackedEntries);
    }

    /**
     * Constructor with explicit seconds for deterministic unit tests.
     */
    public LoginAttemptService(int maxAccountAttempts, int maxIpAttempts, long lockoutDurationSeconds, boolean inSeconds) {
        this.maxAccountAttempts = Math.max(1, maxAccountAttempts);
        this.maxIpAttempts = Math.max(this.maxAccountAttempts, maxIpAttempts);
        this.lockoutDurationSeconds = Math.max(1L, lockoutDurationSeconds);
        this.maxTrackedEntries = 10000;
    }

    public boolean isBlocked(String loginId, String clientIp) {
        Instant now = Instant.now();
        boolean accountBlocked = isKeyBlocked(accountAttempts, normalizeKey(loginId), now);
        boolean ipBlocked = isKeyBlocked(ipAttempts, normalizeIp(clientIp), now);
        return accountBlocked || ipBlocked;
    }

    public void recordFailedAttempt(String loginId, String clientIp) {
        Instant now = Instant.now();
        String accountKey = normalizeKey(loginId);
        String ipKey = normalizeIp(clientIp);

        if (accountKey != null) {
            pruneIfFull(accountAttempts, now);
            AttemptRecord record = accountAttempts.compute(accountKey, (k, existing) -> {
                if (existing == null || existing.isExpired(now, lockoutDurationSeconds)) {
                    AttemptRecord fresh = new AttemptRecord(now);
                    fresh.increment(now, maxAccountAttempts, lockoutDurationSeconds);
                    return fresh;
                }
                existing.increment(now, maxAccountAttempts, lockoutDurationSeconds);
                return existing;
            });
            if (record.isLocked(now)) {
                log.warn("Security event: account login temporarily throttled after {} failed attempts for identifier '{}'",
                        record.getCount(), maskIdentifier(accountKey));
            }
        }

        if (ipKey != null) {
            pruneIfFull(ipAttempts, now);
            AttemptRecord record = ipAttempts.compute(ipKey, (k, existing) -> {
                if (existing == null || existing.isExpired(now, lockoutDurationSeconds)) {
                    AttemptRecord fresh = new AttemptRecord(now);
                    fresh.increment(now, maxIpAttempts, lockoutDurationSeconds);
                    return fresh;
                }
                existing.increment(now, maxIpAttempts, lockoutDurationSeconds);
                return existing;
            });
            if (record.isLocked(now)) {
                log.warn("Security event: client IP temporarily throttled after {} failed login attempts",
                        record.getCount());
            }
        }
    }

    public void recordSuccessfulLogin(String loginId, String clientIp) {
        String accountKey = normalizeKey(loginId);
        if (accountKey != null) {
            accountAttempts.remove(accountKey);
        }
        String ipKey = normalizeIp(clientIp);
        if (ipKey != null) {
            AttemptRecord ipRecord = ipAttempts.get(ipKey);
            if (ipRecord != null && !ipRecord.isLocked(Instant.now())) {
                ipAttempts.remove(ipKey);
            }
        }
    }

    public void clearAccountLock(String loginId) {
        String accountKey = normalizeKey(loginId);
        if (accountKey != null) {
            accountAttempts.remove(accountKey);
        }
    }

    public int getFailedAttempts(String loginId) {
        String accountKey = normalizeKey(loginId);
        if (accountKey == null) {
            return 0;
        }
        AttemptRecord record = accountAttempts.get(accountKey);
        if (record == null || record.isExpired(Instant.now(), lockoutDurationSeconds)) {
            return 0;
        }
        return record.getCount();
    }

    private boolean isKeyBlocked(ConcurrentHashMap<String, AttemptRecord> map, String key, Instant now) {
        if (key == null) {
            return false;
        }
        AttemptRecord record = map.get(key);
        if (record == null) {
            return false;
        }
        if (record.isExpired(now, lockoutDurationSeconds)) {
            map.remove(key, record);
            return false;
        }
        return record.isLocked(now);
    }

    private void pruneIfFull(ConcurrentHashMap<String, AttemptRecord> map, Instant now) {
        if (map.size() < maxTrackedEntries) {
            return;
        }
        Iterator<Map.Entry<String, AttemptRecord>> it = map.entrySet().iterator();
        int removed = 0;
        while (it.hasNext() && map.size() >= maxTrackedEntries) {
            Map.Entry<String, AttemptRecord> entry = it.next();
            if (entry.getValue().isExpired(now, lockoutDurationSeconds) || removed < 256) {
                it.remove();
                removed++;
            }
        }
    }

    private String normalizeKey(String loginId) {
        if (loginId == null) {
            return null;
        }
        String trimmed = loginId.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeIp(String clientIp) {
        if (clientIp == null) {
            return null;
        }
        String trimmed = clientIp.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String maskIdentifier(String id) {
        if (id == null || id.length() <= 3) {
            return "***";
        }
        return id.substring(0, 2) + "***" + id.substring(id.length() - 1);
    }

    private static final class AttemptRecord {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile Instant lastAttemptAt;
        private volatile Instant lockedUntil;

        AttemptRecord(Instant now) {
            this.lastAttemptAt = now;
        }

        synchronized void increment(Instant now, int threshold, long lockoutSeconds) {
            this.lastAttemptAt = now;
            int current = this.count.incrementAndGet();
            if (current >= threshold) {
                this.lockedUntil = now.plusSeconds(lockoutSeconds);
            }
        }

        int getCount() {
            return count.get();
        }

        boolean isLocked(Instant now) {
            Instant lockTime = this.lockedUntil;
            return lockTime != null && now.isBefore(lockTime);
        }

        boolean isExpired(Instant now, long windowSeconds) {
            Instant lockTime = this.lockedUntil;
            if (lockTime != null) {
                return !now.isBefore(lockTime);
            }
            Instant last = this.lastAttemptAt;
            return last != null && !now.isBefore(last.plusSeconds(windowSeconds));
        }
    }
}

