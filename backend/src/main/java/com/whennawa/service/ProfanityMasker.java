package com.whennawa.service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ProfanityMasker {
    private static final String BLINDED_TEXT = "[블라인드]";
    private final Resource profanityWordsResource;
    private volatile List<Pattern> patterns = List.of();

    public ProfanityMasker(
        @Value("${app.chat.profanity.file:classpath:profanity-words.txt}") Resource profanityWordsResource
    ) {
        this.profanityWordsResource = profanityWordsResource;
    }

    @PostConstruct
    public void init() {
        reloadPatterns();
    }

    public String mask(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        String sanitized = text;
        for (Pattern pattern : patterns) {
            sanitized = pattern.matcher(sanitized).replaceAll(BLINDED_TEXT);
        }
        return sanitized;
    }

    public void reloadPatterns() {
        List<Pattern> loaded = new ArrayList<>();
        if (!profanityWordsResource.exists()) {
            log.warn("Profanity words resource not found: {}", profanityWordsResource);
            patterns = List.of();
            return;
        }

        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(profanityWordsResource.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line;
            while ((line = reader.readLine()) != null) {
                String word = line.trim();
                if (word.isBlank() || word.startsWith("#")) {
                    continue;
                }
                loaded.add(Pattern.compile(Pattern.quote(word), Pattern.CASE_INSENSITIVE));
            }
            patterns = List.copyOf(loaded);
            log.info("Loaded profanity patterns: {}", patterns.size());
        } catch (IOException e) {
            log.error("Failed to load profanity words from {}", profanityWordsResource, e);
            patterns = List.of();
        }
    }
}
