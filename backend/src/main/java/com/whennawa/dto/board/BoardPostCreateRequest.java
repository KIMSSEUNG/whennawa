package com.whennawa.dto.board;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class BoardPostCreateRequest {
    @NotBlank
    @Size(max = 120)
    private String title;

    @NotBlank
    @Size(max = 3000)
    private String content;

    private Boolean anonymous;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Boolean getAnonymous() {
        return anonymous;
    }

    public void setAnonymous(Boolean anonymous) {
        this.anonymous = anonymous;
    }
}
