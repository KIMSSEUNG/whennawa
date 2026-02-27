package com.whennawa.controller;

import com.whennawa.dto.board.BoardCommentCreateRequest;
import com.whennawa.dto.board.BoardCommentResponse;
import com.whennawa.dto.board.BoardCommentUpdateRequest;
import com.whennawa.dto.board.BoardPageResponse;
import com.whennawa.dto.board.BoardPostCreateRequest;
import com.whennawa.dto.board.BoardPostResponse;
import com.whennawa.dto.board.BoardPostUpdateRequest;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.BoardService;
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
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {
    private final BoardService boardService;

    @GetMapping("/{companyName}/posts")
    public BoardPageResponse<BoardPostResponse> posts(@PathVariable("companyName") String companyName,
                                                      @RequestParam(value = "page", defaultValue = "0") Integer page,
                                                      @RequestParam(value = "size", defaultValue = "20") Integer size) {
        return boardService.listPosts(companyName, page, size);
    }

    @GetMapping("/{companyName}/posts/{postId}")
    public BoardPostResponse post(@PathVariable("companyName") String companyName,
                                  @PathVariable("postId") Long postId) {
        return boardService.getPost(companyName, postId);
    }

    @GetMapping("/{companyName}/posts/search")
    public BoardPageResponse<BoardPostResponse> searchPosts(@PathVariable("companyName") String companyName,
                                                            @RequestParam("q") String query,
                                                            @RequestParam(value = "field", defaultValue = "title") String field,
                                                            @RequestParam(value = "page", defaultValue = "0") Integer page,
                                                            @RequestParam(value = "size", defaultValue = "20") Integer size) {
        return boardService.searchPosts(companyName, query, field, page, size);
    }

    @PostMapping("/{companyName}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardPostResponse create(@PathVariable("companyName") String companyName,
                                    @Valid @RequestBody BoardPostCreateRequest request,
                                    Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return boardService.createPost(companyName, request, principal.getUserId());
    }

    @PatchMapping("/{companyName}/posts/{postId}")
    public BoardPostResponse update(@PathVariable("companyName") String companyName,
                                    @PathVariable("postId") Long postId,
                                    @Valid @RequestBody BoardPostUpdateRequest request,
                                    Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return boardService.updatePost(companyName, postId, request, principal.getUserId(), isAdmin(principal));
    }

    @DeleteMapping("/{companyName}/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("companyName") String companyName,
                       @PathVariable("postId") Long postId,
                       Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        boardService.deletePost(companyName, postId, principal.getUserId(), isAdmin(principal));
    }

    @GetMapping("/{companyName}/posts/{postId}/comments")
    public BoardPageResponse<BoardCommentResponse> comments(@PathVariable("companyName") String companyName,
                                                            @PathVariable("postId") Long postId,
                                                            @RequestParam(value = "page", defaultValue = "0") Integer page,
                                                            @RequestParam(value = "size", defaultValue = "20") Integer size,
                                                            Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        Long userId = principal == null ? null : principal.getUserId();
        return boardService.listComments(companyName, postId, page, size, userId);
    }

    @PostMapping("/{companyName}/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardCommentResponse createComment(@PathVariable("companyName") String companyName,
                                              @PathVariable("postId") Long postId,
                                              @Valid @RequestBody BoardCommentCreateRequest request,
                                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return boardService.createComment(companyName, postId, request, principal.getUserId());
    }

    @PatchMapping("/{companyName}/posts/{postId}/comments/{commentId}")
    public BoardCommentResponse updateComment(@PathVariable("companyName") String companyName,
                                              @PathVariable("postId") Long postId,
                                              @PathVariable("commentId") Long commentId,
                                              @Valid @RequestBody BoardCommentUpdateRequest request,
                                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return boardService.updateComment(companyName, postId, commentId, request, principal.getUserId(), isAdmin(principal));
    }

    @DeleteMapping("/{companyName}/posts/{postId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable("companyName") String companyName,
                              @PathVariable("postId") Long postId,
                              @PathVariable("commentId") Long commentId,
                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        boardService.deleteComment(companyName, postId, commentId, principal.getUserId(), isAdmin(principal));
    }

    @PostMapping("/{companyName}/posts/{postId}/comments/{commentId}/like")
    public BoardCommentResponse likeComment(@PathVariable("companyName") String companyName,
                                            @PathVariable("postId") Long postId,
                                            @PathVariable("commentId") Long commentId,
                                            Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return boardService.likeComment(companyName, postId, commentId, principal.getUserId());
    }

    @DeleteMapping("/{companyName}/posts/{postId}/comments/{commentId}/like")
    public BoardCommentResponse unlikeComment(@PathVariable("companyName") String companyName,
                                              @PathVariable("postId") Long postId,
                                              @PathVariable("commentId") Long commentId,
                                              Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return boardService.unlikeComment(companyName, postId, commentId, principal.getUserId());
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
