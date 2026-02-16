package com.whennawa.entity;

import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.UnitCategory;
import com.whennawa.entity.RecruitmentUnit;
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
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "step_date_report")
@Getter @Setter
public class StepDateReport extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reportId;

    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "company_name", length = 100, nullable = false)
    private String companyName;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private RecruitmentUnit unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_name", length = 50)
    private UnitCategory unitName;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", length = 16)
    private RecruitmentChannelType channelType;

    @Enumerated(EnumType.STRING)
    @Column(name = "recruitment_mode", length = 16, nullable = false)
    private RecruitmentMode recruitmentMode = RecruitmentMode.REGULAR;

    @Column(name = "prev_reported_date")
    private LocalDate prevReportedDate;

    @Column(name = "current_step_name", length = 100)
    private String currentStepName;

    @Column(name = "reported_date", nullable = false)
    private LocalDate reportedDate;

    @ManyToOne
    @JoinColumn(name = "step_id")
    private RecruitmentStep step;

    @Column(name = "step_name_raw", length = 100)
    private String stepNameRaw;

    @Column(name = "report_count", nullable = false)
    private Integer reportCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
