package com.whennawa.scheduler;

import com.whennawa.config.AppProperties;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.repository.ChatMessageRepository;
import com.whennawa.repository.CompanyNotificationRepository;
import com.whennawa.repository.StepDateReportRepository;
import com.whennawa.repository.UserRefreshTokenRepository;
import com.whennawa.service.BoardService;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class UnifiedCleanupScheduler {
    private final BoardService boardService;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRefreshTokenRepository userRefreshTokenRepository;
    private final StepDateReportRepository stepDateReportRepository;
    private final CompanyNotificationRepository companyNotificationRepository;
    private final AppProperties appProperties;

    // 하루 1회 정리 작업을 한 번에 실행한다.
    @Scheduled(cron = "${app.scheduler.cleanup-cron:0 0 3 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void cleanupAll() {
        AppProperties.Scheduler scheduler = appProperties.getScheduler();

        // 1) 게시판 오래된 글 정리
        long boardPostRetentionDays = scheduler.getBoardPostRetentionDays();
        long deletedBoardPosts = boardService.purgeOldPosts(boardPostRetentionDays);

        // 2) 채팅 오래된 메시지 정리
        long chatRetentionDays = scheduler.getChatRetentionDays();
        LocalDateTime chatCutoff = LocalDateTime.now().minusDays(chatRetentionDays);
        long deletedChatMessages = chatMessageRepository.deleteByCreatedAtBefore(chatCutoff);

        // 3) 리프레시 토큰 만료/철회분 정리
        long refreshRevokedRetentionDays = scheduler.getRefreshRevokedRetentionDays();
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime refreshCutoffUtc = nowUtc.minusDays(refreshRevokedRetentionDays);
        int deletedRefreshTokens = userRefreshTokenRepository.deleteExpiredOrRevokedBefore(nowUtc, refreshCutoffUtc);

        // 4) 처리 완료/폐기된 제보 정리
        long deletedReports = stepDateReportRepository.deleteByStatusIn(List.of(ReportStatus.DISCARDED, ReportStatus.PROCESSED));

        // 5) 오래된 알림 정리
        long notificationRetentionDays = scheduler.getNotificationRetentionDays();
        LocalDateTime notificationCutoff = LocalDateTime.now().minusDays(notificationRetentionDays);
        long deletedNotifications = companyNotificationRepository.deleteByUpdatedAtBefore(notificationCutoff);

        log.info(
            "Unified cleanup done - boardPosts: {}, chatMessages: {}, refreshTokens: {}, reports: {}, notifications: {}",
            deletedBoardPosts,
            deletedChatMessages,
            deletedRefreshTokens,
            deletedReports,
            deletedNotifications
        );
    }
}
