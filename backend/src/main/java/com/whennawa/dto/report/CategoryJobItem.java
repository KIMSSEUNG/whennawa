package com.whennawa.dto.report;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class CategoryJobItem {
    private final Long companyJobCategoryId;
    private final Long jobCategoryId;
    private final String jobCategoryName;
}
