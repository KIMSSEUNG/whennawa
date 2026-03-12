package com.whennawa.controller;

import com.whennawa.dto.board.BoardCommentCreateRequest;
import com.whennawa.dto.board.BoardCommentResponse;
import com.whennawa.dto.board.BoardCommentUpdateRequest;
import com.whennawa.dto.board.BoardPageResponse;
import com.whennawa.dto.board.BoardPostCreateRequest;
import com.whennawa.dto.board.BoardPostResponse;
import com.whennawa.dto.board.BoardPostUpdateRequest;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.CareerBoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/career-board")
@RequiredArgsConstructor
public class CareerBoardController {
    private final CareerBoardService careerBoardService;

    @GetMapping("/posts")
    public BoardPageResponse<BoardPostResponse> posts(@RequestParam(value = "page", defaultValue = "0") Integer page,
                                                      @RequestParam(value = "size", defaultValue = "20") Integer size,
                                                      Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        return careerBoardService.listPosts(page, size, principal == null ? null : principal.getUserId());
    }

    @GetMapping("/posts/{postId}")
    public BoardPostResponse post(@PathVariable("postId") Long postId,
                                  Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        return careerBoardService.getPost(postId, principal == null ? null : principal.getUserId());
    }

    @GetMapping("/posts/search")
    public BoardPageResponse<BoardPostResponse> searchPosts(@RequestParam("q") String query,
                                                            @RequestParam(value = "field", defaultValue = "title") String field,
                                                            @RequestParam(value = "page", defaultValue = "0") Integer page,
                                                            @RequestParam(value = "size", defaultValue = "20") Integer size,
                                                            Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        return careerBoardService.searchPosts(query, field, page, size, principal == null ? null : principal.getUserId());
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardPostResponse create(@Valid @RequestBody BoardPostCreateRequest request,
                                    Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return careerBoardService.createPost(request, principal.getUserId());
    }

    @PatchMapping("/posts/{postId}")
    public BoardPostResponse update(@PathVariable("postId") Long postId,
                                    @Valid @RequestBody BoardPostUpdateRequest request,
                                    Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return careerBoardService.updatePost(postId, request, principal.getUserId(), isAdmin(principal));
    }

    @DeleteMapping("/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("postId") Long postId,
                       Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        careerBoardService.deletePost(postId, principal.getUserId(), isAdmin(principal));
    }

    @GetMapping("/posts/{postId}/comments")
    public BoardPageResponse<BoardCommentResponse> comments(@PathVariable("postId") Long postId,
                                                            @RequestParam(value = "page", defaultValue = "0") Integer page,
                                                            @RequestParam(value = "size", defaultValue = "20") Integer size,
                                                            Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        Long userId = principal == null ? null : principal.getUserId();
        return careerBoardService.listComments(postId, page, size, userId);
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardCommentResponse createComment(@PathVariable("postId") Long postId,
                                              @Valid @RequestBody BoardCommentCreateRequest request,
                                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return careerBoardService.createComment(postId, request, principal.getUserId());
    }

    @PatchMapping("/posts/{postId}/comments/{commentId}")
    public BoardCommentResponse updateComment(@PathVariable("postId") Long postId,
                                              @PathVariable("commentId") Long commentId,
                                              @Valid @RequestBody BoardCommentUpdateRequest request,
                                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return careerBoardService.updateComment(postId, commentId, request, principal.getUserId(), isAdmin(principal));
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable("postId") Long postId,
                              @PathVariable("commentId") Long commentId,
                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        careerBoardService.deleteComment(postId, commentId, principal.getUserId(), isAdmin(principal));
    }

    @PostMapping("/posts/{postId}/comments/{commentId}/like")
    public BoardCommentResponse likeComment(@PathVariable("postId") Long postId,
                                            @PathVariable("commentId") Long commentId,
                                            Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return careerBoardService.likeComment(postId, commentId, principal.getUserId());
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}/like")
    public BoardCommentResponse unlikeComment(@PathVariable("postId") Long postId,
                                              @PathVariable("commentId") Long commentId,
                                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return careerBoardService.unlikeComment(postId, commentId, principal.getUserId());
    }

    private UserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return principal;
    }

    private UserPrincipal extractPrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return null;
        }
        return principal;
    }

    private boolean isAdmin(UserPrincipal principal) {
        return principal != null && "ADMIN".equalsIgnoreCase(principal.getRole());
    }
}
