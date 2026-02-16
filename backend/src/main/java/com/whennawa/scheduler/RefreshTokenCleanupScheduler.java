package com.whennawa.scheduler;

import com.whennawa.repository.UserRefreshTokenRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class RefreshTokenCleanupScheduler {

    private final UserRefreshTokenRepository tokenRepository;
    @Value("${app.scheduler.refresh-revoked-retention-days:1}")
    private long refreshRevokedRetentionDays;

    @Scheduled(cron = "${app.scheduler.refresh-token-cleanup-cron:0 0 12 * * *}")
    @Transactional
    public void cleanupRefreshTokens() {
        LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).minusDays(refreshRevokedRetentionDays);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        int deleted = tokenRepository.deleteExpiredOrRevokedBefore(now, cutoff);
        if (deleted > 0) {
            log.info("Deleted {} expired or revoked(refresh>1d) tokens", deleted);
        }
    }
}
