package com.whennawa.dto.board;

import java.time.LocalDateTime;

public class BoardPostResponse {
    private final Long postId;
    private final Long companyId;
    private final String companyName;
    private final String title;
    private final String content;
    private final Long authorUserId;
    private final String authorName;
    private final LocalDateTime createdAt;

    public BoardPostResponse(Long postId,
                             Long companyId,
                             String companyName,
                             String title,
                             String content,
                             Long authorUserId,
                             String authorName,
                             LocalDateTime createdAt) {
        this.postId = postId;
        this.companyId = companyId;
        this.companyName = companyName;
        this.title = title;
        this.content = content;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.createdAt = createdAt;
    }

    public Long getPostId() {
        return postId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Long getAuthorUserId() {
        return authorUserId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
