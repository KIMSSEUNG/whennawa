package com.whennawa.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
@Getter @Setter
public class AppProperties {
    private Jwt jwt = new Jwt();
    private Timeline timeline = new Timeline();

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
}






