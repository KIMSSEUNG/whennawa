package com.whennawa.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum UnitCategory {
    GENERAL("일반"),
    DESIGN_ART("디자인/예술"),
    IT("IT"),
    TECH_ENGINEERING("기술/엔지니어"),
    INTEGRATED("통합직군");

    private final String displayName;

    UnitCategory(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static UnitCategory fromJson(String unitName) {
        UnitCategory parsed = fromUnitName(unitName);
        if (parsed == null) {
            throw new IllegalArgumentException("Invalid unit category: " + unitName);
        }
        return parsed;
    }

    public static UnitCategory fromUnitName(String unitName) {
        if (unitName == null || unitName.isBlank()) {
            return null;
        }
        String normalized = unitName.trim().toLowerCase(Locale.ROOT);
        String enumName = unitName.trim().toUpperCase(Locale.ROOT);
        try {
            return UnitCategory.valueOf(enumName);
        } catch (IllegalArgumentException ignored) {
            // Continue with alias mapping.
        }

        if (normalized.equals("통합직군")
            || normalized.equals("전직군")
            || normalized.equals("전체직군")
            || normalized.equals("전 직군")
            || normalized.equals("전체 직군")
            || normalized.equals("종합")
            || normalized.equals("all")) {
            return INTEGRATED;
        }
        if (normalized.equals("일반")
            || normalized.equals("비즈니스")
            || normalized.equals("general")
            || normalized.equals("business")) {
            return GENERAL;
        }
        if (normalized.equals("디자인/예술")
            || normalized.equals("디자인예술")
            || normalized.equals("디자인")
            || normalized.equals("예술")
            || normalized.equals("design")
            || normalized.equals("art")
            || normalized.equals("arts")) {
            return DESIGN_ART;
        }
        if (normalized.equals("it")
            || normalized.equals("개발")
            || normalized.equals("dev")
            || normalized.equals("developer")
            || normalized.equals("software")
            || normalized.equals("sw")) {
            return IT;
        }
        if (normalized.equals("기술/엔지니어")
            || normalized.equals("기술엔지니어")
            || normalized.equals("기술")
            || normalized.equals("엔지니어")
            || normalized.equals("engineering")
            || normalized.equals("engineer")
            || normalized.equals("tech")) {
            return TECH_ENGINEERING;
        }
        return null;
    }
}
