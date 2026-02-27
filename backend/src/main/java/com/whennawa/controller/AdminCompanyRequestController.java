package com.whennawa.controller;

import com.whennawa.dto.company.CompanyNameRequestAdminItem;
import com.whennawa.dto.company.CompanyNameRequestUpdateRequest;
import com.whennawa.entity.enums.CompanyRequestStatus;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.CompanyNameRequestService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
@RequestMapping("/api/admin/company-requests")
@RequiredArgsConstructor
public class AdminCompanyRequestController {
    private final CompanyNameRequestService companyNameRequestService;

    @GetMapping
    public List<CompanyNameRequestAdminItem> list(Authentication authentication,
                                                  @RequestParam(value = "status", required = false) CompanyRequestStatus status) {
        ensureAuthenticated(authentication);
        return companyNameRequestService.findAdminRequests(status);
    }

    @PatchMapping("/{requestId}")
    public CompanyNameRequestAdminItem update(Authentication authentication,
                                              @PathVariable("requestId") Long requestId,
                                              @Valid @RequestBody CompanyNameRequestUpdateRequest request) {
        ensureAuthenticated(authentication);
        return companyNameRequestService.updateRequest(requestId, request.getCompanyName());
    }

    @PostMapping("/{requestId}/process")
    public CompanyNameRequestAdminItem process(Authentication authentication,
                                               @PathVariable("requestId") Long requestId) {
        ensureAuthenticated(authentication);
        return companyNameRequestService.processRequest(requestId);
    }

    @PostMapping("/{requestId}/discard")
    @ResponseStatus(HttpStatus.OK)
    public CompanyNameRequestAdminItem discard(Authentication authentication,
                                               @PathVariable("requestId") Long requestId) {
        ensureAuthenticated(authentication);
        return companyNameRequestService.discardRequest(requestId);
    }

    private void ensureAuthenticated(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
    }
}
