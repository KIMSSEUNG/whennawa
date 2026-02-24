package com.whennawa.controller;

import com.whennawa.dto.board.BoardPostCreateRequest;
import com.whennawa.dto.board.BoardPostResponse;
import com.whennawa.dto.board.BoardPostUpdateRequest;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.BoardService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
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
    public List<BoardPostResponse> posts(@PathVariable("companyName") String companyName,
                                         @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return boardService.listPosts(companyName, limit);
    }

    @GetMapping("/{companyName}/posts/search")
    public List<BoardPostResponse> searchPosts(@PathVariable("companyName") String companyName,
                                               @RequestParam("q") String query,
                                               @RequestParam(value = "field", defaultValue = "title") String field,
                                               @RequestParam(value = "limit", defaultValue = "50") int limit,
                                               HttpServletRequest request) {
        String sessionKey = request == null ? "anon" : request.getSession(true).getId();
        return boardService.searchPosts(companyName, query, field, limit, sessionKey);
    }

    @PostMapping("/{companyName}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardPostResponse create(@PathVariable("companyName") String companyName,
                                    @Valid @RequestBody BoardPostCreateRequest request,
                                    Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return boardService.createPost(companyName, request, principal.getUserId());
    }

    @PatchMapping("/{companyName}/posts/{postId}")
    public BoardPostResponse update(@PathVariable("companyName") String companyName,
                                    @PathVariable("postId") Long postId,
                                    @Valid @RequestBody BoardPostUpdateRequest request,
                                    Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return boardService.updatePost(companyName, postId, request, principal.getUserId());
    }

    @DeleteMapping("/{companyName}/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("companyName") String companyName,
                       @PathVariable("postId") Long postId,
                       Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        boardService.deletePost(companyName, postId, principal.getUserId());
    }
}
