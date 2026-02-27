package com.whennawa.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;

public abstract class MySqlContainerBaseTest {
    private static final MySQLContainer<?> MYSQL;
    private static final boolean DOCKER_AVAILABLE;

    static {
        boolean dockerAvailable;
        try {
            dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
        } catch (Exception e) {
            dockerAvailable = false;
        }
        DOCKER_AVAILABLE = dockerAvailable;

        //?꾩빱 ?ㅽ뻾??url , username , password瑜??앹꽦 ???ㅽ뻾?쒗궓??
        if (DOCKER_AVAILABLE) {
            MYSQL = new MySQLContainer<>("mysql:8.0.36")
                .withDatabaseName("whennawa_test")
                .withUsername("test")
                .withPassword("test");
            MYSQL.start();
            Runtime.getRuntime().addShutdownHook(new Thread(MYSQL::stop));
        } else {
            MYSQL = null;
        }
    }

    /*
        而⑦뀒?대꼫?ㅽ뻾???먮룞?쇰줈 ?대떦?섎뒗 媛믪쓣 ?숈옉?섍쾶 ?쒕떎.
     */
    @DynamicPropertySource
    static void registerDataSourceProperties(DynamicPropertyRegistry registry) {
        if (DOCKER_AVAILABLE && MYSQL != null) {
            registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
            registry.add("spring.datasource.username", MYSQL::getUsername);
            registry.add("spring.datasource.password", MYSQL::getPassword);
            registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
            registry.add("spring.jpa.show-sql", () -> "false");
            return;
        }

        String url = resolve("DB_URL");
        String username = resolve("DB_USERNAME");
        String password = resolve("DB_PASSWORD");
        String driver = resolve("DB_DRIVER");
        if (url == null || username == null) {
            throw new IllegalStateException("Docker is unavailable. Set DB_URL and DB_USERNAME for local MySQL tests.");
        }
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", () -> username);
        registry.add("spring.datasource.password", () -> password == null ? "" : password);
        registry.add("spring.datasource.driver-class-name", () -> driver == null ? "com.mysql.cj.jdbc.Driver" : driver);
        registry.add("spring.jpa.show-sql", () -> "false");
    }

    private static String resolve(String key) {
        String value = System.getProperty(key);
        if (value == null || value.isBlank()) {
            value = System.getenv(key);
        }
        return (value == null || value.isBlank()) ? null : value;
    }
}


