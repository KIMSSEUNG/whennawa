package com.whennawa.dto.board;

import java.time.LocalDateTime;
import java.util.List;

public class BoardCommentResponse {
    private final Long commentId;
    private final Long postId;
    private final Long parentCommentId;
    private final String content;
    private final Long authorUserId;
    private final String authorName;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final int likeCount;
    private final boolean likedByMe;
    private final int replyCount;
    private final List<BoardCommentResponse> replies;

    public BoardCommentResponse(Long commentId,
                                Long postId,
                                Long parentCommentId,
                                String content,
                                Long authorUserId,
                                String authorName,
                                LocalDateTime createdAt,
                                LocalDateTime updatedAt,
                                int likeCount,
                                boolean likedByMe,
                                int replyCount,
                                List<BoardCommentResponse> replies) {
        this.commentId = commentId;
        this.postId = postId;
        this.parentCommentId = parentCommentId;
        this.content = content;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.likeCount = likeCount;
        this.likedByMe = likedByMe;
        this.replyCount = replyCount;
        this.replies = replies;
    }

    public Long getCommentId() {
        return commentId;
    }

    public Long getPostId() {
        return postId;
    }

    public Long getParentCommentId() {
        return parentCommentId;
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public int getLikeCount() {
        return likeCount;
    }

    public boolean isLikedByMe() {
        return likedByMe;
    }

    public int getReplyCount() {
        return replyCount;
    }

    public List<BoardCommentResponse> getReplies() {
        return replies;
    }
}
