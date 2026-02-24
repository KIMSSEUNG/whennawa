package com.whennawa.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class CompanyNameNormalizer {
    private static final Pattern COMPANY_TOKENS = Pattern.compile("\\(\\uC8FC\\)|\\uC8FC\\uC2DD\\uD68C\\uC0AC|\\u3231");
    private static final Pattern KEEP_FOR_DISPLAY = Pattern.compile("[^0-9a-zA-Z\\uAC00-\\uD7A3]");
    private static final Pattern KEEP_FOR_KEY = Pattern.compile("[^0-9a-zA-Z\\uAC00-\\uD7A3]");

    private CompanyNameNormalizer() {
    }

    public static String normalizeForDisplay(String raw) {
        if (raw == null) {
            return "";
        }
        String value = Normalizer.normalize(raw, Normalizer.Form.NFKC).trim();
        if (value.isBlank()) {
            return "";
        }
        value = COMPANY_TOKENS.matcher(value).replaceAll("");
        value = value.replaceAll("\\s+", "");
        value = KEEP_FOR_DISPLAY.matcher(value).replaceAll("");
        return value;
    }

    public static String normalizeKey(String raw) {
        return normalizeForDisplay(raw).toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }
}
