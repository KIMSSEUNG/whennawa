package com.whennawa.repository;

import com.whennawa.entity.RecruitmentStepMaster;
import com.whennawa.entity.enums.StepKind;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentStepMasterRepository extends JpaRepository<RecruitmentStepMaster, Long> {
    Optional<RecruitmentStepMaster> findByStepNameIgnoreCaseAndIsActiveTrue(String stepName);

    List<RecruitmentStepMaster> findByIsActiveTrueOrderByStepMasterIdAsc();

    List<RecruitmentStepMaster> findByStepKindInAndIsActiveTrueOrderByStepMasterIdAsc(List<StepKind> stepKinds);
}
