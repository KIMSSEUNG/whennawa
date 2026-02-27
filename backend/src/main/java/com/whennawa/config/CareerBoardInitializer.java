package com.whennawa.config;

import com.whennawa.entity.Company;
import com.whennawa.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CareerBoardInitializer {
    public static final String CAREER_BOARD_COMPANY_NAME = "취업고민";

    private final CompanyRepository companyRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureCareerBoardCompany() {
        Company existing = companyRepository.findByCompanyNameIgnoreCase(CAREER_BOARD_COMPANY_NAME).orElse(null);
        if (existing == null) {
            Company created = new Company();
            created.setCompanyName(CAREER_BOARD_COMPANY_NAME);
            created.setActive(true);
            companyRepository.save(created);
            log.info("Created default career board company: {}", CAREER_BOARD_COMPANY_NAME);
            return;
        }

        if (!existing.isActive()) {
            existing.setActive(true);
            companyRepository.save(existing);
            log.info("Reactivated default career board company: {}", CAREER_BOARD_COMPANY_NAME);
        }
    }
}
