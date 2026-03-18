package com.whennawa.entity;

import com.whennawa.entity.converter.RollingReportTypeConverter;
import com.whennawa.entity.enums.InterviewDifficulty;
import com.whennawa.entity.enums.JobReviewStatus;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "rolling_report")
@Getter
@Setter
public class RollingReport extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rolling_report_id")
    private Long reportId;

    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne
    @JoinColumn(name = "rolling_job_id", nullable = false)
    private RollingJob rollingJob;

    @ManyToOne
    @JoinColumn(name = "job_category_id")
    private JobCategory jobCategory;

    @Column(name = "company_name", length = 100, nullable = false)
    private String companyName;

    @Convert(converter = RollingReportTypeConverter.class)
    @Column(name = "rolling_result_type", length = 32, nullable = false)
    private RollingReportType rollingResultType = RollingReportType.DATE_REPORTED;

    @Column(name = "prev_reported_date")
    private LocalDate prevReportedDate;

    @Column(name = "prev_step_name", length = 100)
    private String prevStepName;

    @Column(name = "current_step_name", length = 100, nullable = false)
    private String currentStepName;

    @Column(name = "reported_date")
    private LocalDate reportedDate;

    @Column(name = "report_count", nullable = false)
    private Integer reportCount = 1;

    @Column(name = "other_job_name", length = 20)
    private String otherJobName;

    @Column(name = "interview_review_content", length = 2000)
    private String interviewReviewContent;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_difficulty", length = 16)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private InterviewDifficulty interviewDifficulty;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_review_status", length = 16, nullable = false)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private JobReviewStatus jobReviewStatus = JobReviewStatus.PENDING;

    @Column(name = "job_reviewed_at")
    private LocalDateTime jobReviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
