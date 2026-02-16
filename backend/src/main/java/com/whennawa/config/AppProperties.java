package com.whennawa.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
@Getter @Setter
public class AppProperties {
    private Jwt jwt = new Jwt();
    private Timeline timeline = new Timeline();
    private Report report = new Report();
    private Chat chat = new Chat();
    private Auth auth = new Auth();
    private Scheduler scheduler = new Scheduler();

    @Getter @Setter
    public static class Jwt {
        private String secret;
        private long accessTtlMinutes = 15;
        private long refreshTtlDays = 30;

    }

    @Getter @Setter
    public static class Timeline {
        private int officialScoreBoost = 5;
    }

    @Getter @Setter
    public static class Report {
        private long cooldownMs = 3000;
        private long rollingMaxDiffDays = 92;
    }

    @Getter @Setter
    public static class Chat {
        private long cooldownMs = 500;
        private int maxMessageLength = 300;
        private int recentFetchMax = 200;
    }

    @Getter @Setter
    public static class Auth {
        private long loginNextCookieTtlMinutes = 10;
    }

    @Getter @Setter
    public static class Scheduler {
        private String reportCleanupCron = "0 0 12 * * *";
        private String refreshTokenCleanupCron = "0 0 12 * * *";
        private String chatCleanupCron = "0 0 3 * * *";
        private long chatRetentionDays = 5;
        private long refreshRevokedRetentionDays = 1;
    }
}






