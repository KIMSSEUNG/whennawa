package com.whennawa.dto.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JobCategoryCreateRequest {
    @NotBlank
    @Size(max = 50)
    private String name;
}
