package com.whennawa.dto.report;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class JobCategoryItem {
    private final Long jobCategoryId;
    private final String name;
}
