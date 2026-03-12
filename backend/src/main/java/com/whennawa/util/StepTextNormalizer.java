package com.whennawa.util;

import java.text.Normalizer;
import java.util.Locale;

public final class StepTextNormalizer {
    private StepTextNormalizer() {
    }

    public static String normalizeDisplay(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC)
            .trim()
            .replaceAll("\\s+", " ");
        return normalized;
    }

    public static String normalizeKey(String value) {
        String normalized = normalizeDisplay(value);
        if (normalized.isBlank()) {
            return "";
        }
        return normalized
            .toLowerCase(Locale.ROOT)
            .replaceAll("[\\s\\p{Pd}·ㆍ._/]+", "");
    }
}

