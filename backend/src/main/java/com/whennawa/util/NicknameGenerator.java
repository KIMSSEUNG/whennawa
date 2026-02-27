package com.whennawa.util;

import java.security.SecureRandom;
import java.util.List;
import java.util.function.Predicate;
import org.springframework.stereotype.Component;

@Component
public class NicknameGenerator {
    private static final List<String> PREFIXES = List.of(
        "swift", "calm", "bold", "bright", "lucky", "smart", "quiet", "brave", "fresh", "kind"
    );
    private static final List<String> NOUNS = List.of(
        "fox", "otter", "whale", "falcon", "tiger", "koala", "wolf", "panda", "eagle", "bear"
    );
    private static final int MAX_ATTEMPTS = 200;

    private final SecureRandom random = new SecureRandom();

    public String generateUnique(Predicate<String> exists) {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String base = PREFIXES.get(random.nextInt(PREFIXES.size()))
                + "-" + NOUNS.get(random.nextInt(NOUNS.size()));
            String candidate = base + "#" + String.format("%05d", random.nextInt(100_000));
            if (!exists.test(candidate)) {
                return candidate;
            }
        }
        for (int i = 0; i < 10_000; i++) {
            String fallback = "user#" + String.format("%05d", random.nextInt(100_000));
            if (!exists.test(fallback)) {
                return fallback;
            }
        }
        throw new IllegalStateException("Unable to allocate unique nickname");
    }
}
