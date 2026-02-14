package com.whennawa.util;

import java.security.SecureRandom;
import java.util.List;
import java.util.function.Predicate;
import org.springframework.stereotype.Component;

@Component
public class NicknameGenerator {
    private static final List<String> ADJECTIVES = List.of(
        "배고픈", "용감한", "상냥한", "차분한", "반짝이는", "신속한", "졸린", "유쾌한", "따뜻한", "영리한"
    );
    private static final List<String> ANIMALS = List.of(
        "장미앵무", "수달", "고양이", "여우", "고래", "펭귄", "참새", "판다", "다람쥐", "부엉이"
    );
    private final SecureRandom random = new SecureRandom();

    public String generateUnique(Predicate<String> existsInRoom) {
        for (int attempt = 0; attempt < 30; attempt++) {
            String candidate = ADJECTIVES.get(random.nextInt(ADJECTIVES.size()))
                + " " + ANIMALS.get(random.nextInt(ANIMALS.size()));
            if (!existsInRoom.test(candidate)) {
                return candidate;
            }
        }
        String fallback = ADJECTIVES.get(random.nextInt(ADJECTIVES.size()))
            + " " + ANIMALS.get(random.nextInt(ANIMALS.size()));
        return fallback + "-" + (1000 + random.nextInt(9000));
    }
}
