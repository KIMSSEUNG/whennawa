package com.whennawa.repository;

import com.whennawa.entity.StepDateLog;
import com.whennawa.entity.enums.StepDateType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StepDateLogRepository extends JpaRepository<StepDateLog, Long> {
    Optional<StepDateLog> findByStepStepIdAndTargetDateAndDateType(Long stepId,
                                                                   LocalDateTime targetDate,
                                                                   StepDateType dateType);

    @Query("""
        select l.step.stepId, max(l.targetDate)
        from StepDateLog l
        where l.step.stepId in :stepIds
        group by l.step.stepId
        """)
    List<Object[]> findLatestTargetDates(@Param("stepIds") List<Long> stepIds);

    List<StepDateLog> findByStepStepIdIn(List<Long> stepIds);
}
