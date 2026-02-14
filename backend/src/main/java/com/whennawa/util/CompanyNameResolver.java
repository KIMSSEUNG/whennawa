package com.whennawa.util;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.text.Normalizer;

public final class CompanyNameResolver {
    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})");

    private static final Set<String> IGNORE_DOMAINS = Set.of(
        "gmail.com",
        "googlemail.com",
        "naver.com",
        "daum.net",
        "hanmail.net",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "jobkorea.co.kr",
        "saramin.co.kr",
        "wanted.co.kr"
    );

    private static final Set<String> KR_SECOND_LEVEL = Set.of(
        "co",
        "or",
        "go",
        "ac",
        "ne"
    );

    private static final Pattern COMPANY_TOKENS =
        Pattern.compile("\\(\\uC8FC\\)|\\uC8FC\\uC2DD\\uD68C\\uC0AC|\\u3231");
    private static final Pattern KEEP_ONLY =
        Pattern.compile("[^0-9a-zA-Z\\uAC00-\\uD7A3]");

    private CompanyNameResolver() {
    }

    public static String resolve(String companyNameRaw, String fromAddress) {
        String normalizedCompany = normalizeCompanyName(companyNameRaw);
        if (!normalizedCompany.isBlank()) {
            return normalizedCompany;
        }

        String domain = extractDomain(fromAddress);
        if (domain == null || domain.isBlank()) {
            return null;
        }
        if (IGNORE_DOMAINS.contains(domain)) {
            return null;
        }

        String base = extractBaseDomain(domain);
        if (base == null || base.isBlank()) {
            return null;
        }
        String normalizedDomain = normalizeCompanyName(base);
        return normalizedDomain.isBlank() ? null : normalizedDomain;
    }

    private static String extractDomain(String fromAddress) {
        if (fromAddress == null || fromAddress.isBlank()) {
            return null;
        }
        Matcher matcher = EMAIL_PATTERN.matcher(fromAddress);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group(2).toLowerCase(Locale.ROOT);
    }

    private static String extractBaseDomain(String domain) {
        String[] parts = domain.split("\\.");
        if (parts.length < 2) {
            return null;
        }
        int len = parts.length;
        String last = parts[len - 1];
        String second = parts[len - 2];

        if ("kr".equals(last) && KR_SECOND_LEVEL.contains(second)) {
            if (len >= 3) {
                return parts[len - 3];
            }
        }
        return second;
    }

    private static String normalizeCompanyName(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.isEmpty()) return "";

        s = Normalizer.normalize(s, Normalizer.Form.NFKC);
        s = COMPANY_TOKENS.matcher(s).replaceAll("");
        s = s.toLowerCase(Locale.ROOT);
        s = KEEP_ONLY.matcher(s).replaceAll("");

        return s;
    }
}

