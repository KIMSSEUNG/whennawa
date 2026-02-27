package com.whennawa.service;

import com.whennawa.dto.company.CompanyCreateResponse;
import com.whennawa.dto.company.CompanyNameRequestAdminItem;
import com.whennawa.entity.Company;
import com.whennawa.entity.CompanyNameRequest;
import com.whennawa.entity.enums.CompanyRequestStatus;
import com.whennawa.repository.CompanyNameRequestRepository;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.util.CompanyNameNormalizer;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CompanyNameRequestService {
    private static final String REQUEST_ACCEPTED_MESSAGE = "회사 등록 요청 감사합니다. 처리에는 일정 시간이 소요될 수 있습니다.";
    private final CompanyRepository companyRepository;
    private final CompanyNameRequestRepository companyNameRequestRepository;
    private final ProfanityMasker profanityMasker;
    private final CompanySearchService companySearchService;

    @Transactional
    public CompanyCreateResponse submitRequest(String rawCompanyName, Long requesterUserId) {
        String original = rawCompanyName == null ? "" : rawCompanyName.trim();
        String normalizedName = CompanyNameNormalizer.normalizeForDisplay(rawCompanyName);
        if (normalizedName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        if (profanityMasker.containsProfanity(normalizedName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "부적절한 회사명은 등록할 수 없습니다.");
        }

        Company existingCompany = companySearchService.resolveActiveCompany(normalizedName);
        if (existingCompany != null) {
            return new CompanyCreateResponse(
                existingCompany.getCompanyId(),
                null,
                existingCompany.getCompanyName(),
                original,
                false,
                false,
                !existingCompany.getCompanyName().equals(original),
                "해당 회사는 이미 등록되어 있습니다."
            );
        }

        CompanyNameRequest existingPending = companyNameRequestRepository
            .findFirstByNormalizedCompanyNameAndStatusOrderByCreatedAtDesc(normalizedName, CompanyRequestStatus.PENDING)
            .orElse(null);
        if (existingPending != null) {
            companyNameRequestRepository.incrementRequestCount(existingPending.getRequestId());
            CompanyNameRequest refreshed = companyNameRequestRepository.findByRequestId(existingPending.getRequestId()).orElse(existingPending);
            return new CompanyCreateResponse(
                null,
                refreshed.getRequestId(),
                refreshed.getNormalizedCompanyName(),
                original,
                false,
                true,
                !refreshed.getNormalizedCompanyName().equals(original),
                REQUEST_ACCEPTED_MESSAGE
            );
        }

        CompanyNameRequest request = new CompanyNameRequest();
        request.setOriginalCompanyName(original.isBlank() ? normalizedName : original);
        request.setNormalizedCompanyName(normalizedName);
        request.setStatus(CompanyRequestStatus.PENDING);
        request.setCreatedByUserId(requesterUserId);
        request.setRequestCount(1);
        CompanyNameRequest saved;
        try {
            saved = companyNameRequestRepository.save(request);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent insert: unique pending constraint won, so fold into the existing pending request.
            CompanyNameRequest pending = companyNameRequestRepository
                .findFirstByNormalizedCompanyNameAndStatusOrderByCreatedAtDesc(normalizedName, CompanyRequestStatus.PENDING)
                .orElseThrow(() -> ex);
            companyNameRequestRepository.incrementRequestCount(pending.getRequestId());
            CompanyNameRequest refreshed = companyNameRequestRepository.findByRequestId(pending.getRequestId()).orElse(pending);
            return new CompanyCreateResponse(
                null,
                refreshed.getRequestId(),
                refreshed.getNormalizedCompanyName(),
                original,
                false,
                true,
                !refreshed.getNormalizedCompanyName().equals(original),
                REQUEST_ACCEPTED_MESSAGE
            );
        }

        return new CompanyCreateResponse(
            null,
            saved.getRequestId(),
            saved.getNormalizedCompanyName(),
            original,
            false,
            true,
            !saved.getNormalizedCompanyName().equals(original),
            REQUEST_ACCEPTED_MESSAGE
        );
    }

    @Transactional(readOnly = true)
    public List<CompanyNameRequestAdminItem> findAdminRequests(CompanyRequestStatus status) {
        List<CompanyNameRequest> items = status == null
            ? companyNameRequestRepository.findAllByOrderByCreatedAtDesc()
            : companyNameRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        return items.stream().map(this::toAdminItem).toList();
    }

    @Transactional
    public CompanyNameRequestAdminItem updateRequest(Long requestId, String companyNameRaw) {
        CompanyNameRequest request = companyNameRequestRepository.findByRequestId(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company request not found"));
        if (request.getStatus() != CompanyRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending requests can be updated");
        }

        String normalizedName = CompanyNameNormalizer.normalizeForDisplay(companyNameRaw);
        if (normalizedName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        if (profanityMasker.containsProfanity(normalizedName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "부적절한 회사명은 등록할 수 없습니다.");
        }

        request.setOriginalCompanyName(companyNameRaw == null ? normalizedName : companyNameRaw.trim());
        request.setNormalizedCompanyName(normalizedName);
        return toAdminItem(request);
    }

    @Transactional
    public CompanyNameRequestAdminItem processRequest(Long requestId) {
        CompanyNameRequest request = companyNameRequestRepository.findByRequestId(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company request not found"));
        if (request.getStatus() != CompanyRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending requests can be processed");
        }

        Company existing = companySearchService.resolveActiveCompany(request.getNormalizedCompanyName());
        if (existing != null) {
            request.setCompany(existing);
            request.setStatus(CompanyRequestStatus.PROCESSED);
            request.setProcessedAt(LocalDateTime.now());
            request.setReviewNote("ALREADY_EXISTS");
            return toAdminItem(request, "해당 회사는 이미 있습니다.");
        }

        Company created = new Company();
        created.setCompanyName(request.getNormalizedCompanyName());
        created.setActive(true);
        Company saved = companyRepository.save(created);

        request.setCompany(saved);
        request.setStatus(CompanyRequestStatus.PROCESSED);
        request.setProcessedAt(LocalDateTime.now());
        request.setReviewNote("CREATED");
        return toAdminItem(request, "회사 등록이 완료되었습니다.");
    }

    @Transactional
    public CompanyNameRequestAdminItem discardRequest(Long requestId) {
        CompanyNameRequest request = companyNameRequestRepository.findByRequestId(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company request not found"));
        if (request.getStatus() != CompanyRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending requests can be discarded");
        }
        request.setStatus(CompanyRequestStatus.DISCARDED);
        request.setProcessedAt(LocalDateTime.now());
        request.setReviewNote("DISCARDED");
        return toAdminItem(request, "요청을 폐기했습니다.");
    }

    private CompanyNameRequestAdminItem toAdminItem(CompanyNameRequest item) {
        return toAdminItem(item, null);
    }

    private CompanyNameRequestAdminItem toAdminItem(CompanyNameRequest item, String message) {
        Company existing = companySearchService.resolveActiveCompany(item.getNormalizedCompanyName());
        boolean alreadyExists = existing != null;
        String existingName = existing == null ? null : existing.getCompanyName();
        return new CompanyNameRequestAdminItem(
            item.getRequestId(),
            item.getOriginalCompanyName(),
            item.getNormalizedCompanyName(),
            item.getRequestCount() == null ? 1 : item.getRequestCount(),
            item.getStatus(),
            alreadyExists,
            existingName,
            message,
            item.getCreatedAt(),
            item.getUpdatedAt()
        );
    }
}
