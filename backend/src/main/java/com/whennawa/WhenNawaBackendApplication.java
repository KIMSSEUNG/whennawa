package com.whennawa;

import com.whennawa.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

//swagger 주소
// http://localhost:8080/swagger-ui/index.html

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
@EnableScheduling
public class WhenNawaBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(WhenNawaBackendApplication.class, args);
    }
}






