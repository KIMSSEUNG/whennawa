package com.whennawa.entity.converter;

import com.whennawa.entity.enums.RollingReportType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class RollingReportTypeConverter implements AttributeConverter<RollingReportType, String> {
    @Override
    public String convertToDatabaseColumn(RollingReportType attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public RollingReportType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return RollingReportType.valueOf(dbData);
    }
}
