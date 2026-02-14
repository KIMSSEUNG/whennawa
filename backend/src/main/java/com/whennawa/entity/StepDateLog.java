package com.whennawa.entity;

import com.whennawa.entity.enums.StepDateType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "step_date_log")
@Getter @Setter
public class StepDateLog extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    @ManyToOne
    @JoinColumn(name = "step_id", nullable = false)
    private RecruitmentStep step;

    @Column(name = "target_date", nullable = false)
    private LocalDateTime targetDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "date_type", length = 16, nullable = false)
    private StepDateType dateType = StepDateType.REPORT;

    @Column(name = "report_count")
    private Integer reportCount = 1;
}
