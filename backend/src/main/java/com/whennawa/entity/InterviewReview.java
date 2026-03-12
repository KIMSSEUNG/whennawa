package com.whennawa.entity;

import com.whennawa.entity.enums.InterviewDifficulty;
import com.whennawa.entity.enums.RecruitmentMode;
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
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_review")
@Getter
@Setter
public class InterviewReview extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewId;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "report_id")
    private StepDateReport report;

    @ManyToOne
    @JoinColumn(name = "rolling_report_id")
    private RollingReport rollingReport;

    @Enumerated(EnumType.STRING)
    @Column(name = "recruitment_mode", length = 16, nullable = false)
    private RecruitmentMode recruitmentMode;

    @Column(name = "step_name", length = 100, nullable = false)
    private String stepName;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", length = 16, nullable = false)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private InterviewDifficulty difficulty = InterviewDifficulty.MEDIUM;

    @Column(name = "content", length = 2000, nullable = false)
    private String content;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
