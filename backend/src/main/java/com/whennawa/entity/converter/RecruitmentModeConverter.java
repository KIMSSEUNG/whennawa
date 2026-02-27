package com.whennawa.entity.converter;

import com.whennawa.entity.enums.RecruitmentMode;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

@Converter
public class RecruitmentModeConverter implements AttributeConverter<RecruitmentMode, String> {
    @Override
    public String convertToDatabaseColumn(RecruitmentMode attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public RecruitmentMode convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return RecruitmentMode.valueOf(dbData.trim().toUpperCase(Locale.ROOT));
    }
}
