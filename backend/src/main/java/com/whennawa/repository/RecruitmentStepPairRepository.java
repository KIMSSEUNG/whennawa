package com.whennawa.repository;

import com.whennawa.entity.CompanyJobCategory;
import com.whennawa.entity.RecruitmentStepMaster;
import com.whennawa.entity.RecruitmentStepPair;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentStepPairRepository extends JpaRepository<RecruitmentStepPair, Long> {
    Optional<RecruitmentStepPair> findFirstByCompanyJobCategoryAndPrevStepMasterAndCurrentStepMasterAndIsActiveTrue(
        CompanyJobCategory companyJobCategory,
        RecruitmentStepMaster prevStepMaster,
        RecruitmentStepMaster currentStepMaster
    );

    Optional<RecruitmentStepPair> findFirstByCompanyJobCategoryAndPrevStepMasterAndCurrentStepMaster(
        CompanyJobCategory companyJobCategory,
        RecruitmentStepMaster prevStepMaster,
        RecruitmentStepMaster currentStepMaster
    );

    Optional<RecruitmentStepPair> findFirstByCompanyJobCategoryAndPrevStepMasterAndIsActiveTrue(
        CompanyJobCategory companyJobCategory,
        RecruitmentStepMaster prevStepMaster
    );

    Optional<RecruitmentStepPair> findFirstByCompanyJobCategoryAndCurrentStepMasterAndIsActiveTrue(
        CompanyJobCategory companyJobCategory,
        RecruitmentStepMaster currentStepMaster
    );

    List<RecruitmentStepPair> findByCompanyJobCategoryAndIsActiveTrueOrderByPairIdAsc(CompanyJobCategory companyJobCategory);
}
