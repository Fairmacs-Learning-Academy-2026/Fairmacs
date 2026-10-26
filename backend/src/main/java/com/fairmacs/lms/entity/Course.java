
package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String courseId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(name = "draft_payload", columnDefinition = "TEXT")
    private String draftPayload;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category catalogCategory;

    @Column
    private Boolean foundation = false;

    @Column(columnDefinition = "TEXT")
    private String quizJson;

    @Column
    private Double durationHours = 1.0;

    @Column
    private String level;

    @Column
    private String duration;

    @Column
    private Double rating;

    @Column
    private Integer enrolledCount;

    @Column
    private String banner;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private Integer passingScore;

    @Column
    private Boolean active = true;

    @Column(name = "is_draft", nullable = false)
    private Boolean draft = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", foreignKey = @ForeignKey(name = "fk_courses_created_by"))
    private User createdBy;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Module> modules;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "certificate_eligible", nullable = false)
    private Boolean certificateEligible = false;

    public Boolean getCertificateEligible() {
        return certificateEligible;
    }

    public void setCertificateEligible(Boolean certificateEligible) {
        this.certificateEligible = certificateEligible;
    }

    public Course() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCourseId() { return courseId; }
    public void setCourseId(String courseId) { this.courseId = courseId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Category getCatalogCategory() { return catalogCategory; }
    public void setCatalogCategory(Category catalogCategory) { this.catalogCategory = catalogCategory; }

    public Boolean getFoundation() { return foundation; }
    public void setFoundation(Boolean foundation) { this.foundation = foundation; }

    public String getQuizJson() { return quizJson; }
    public void setQuizJson(String quizJson) { this.quizJson = quizJson; }

    public Double getDurationHours() { return durationHours; }
    public void setDurationHours(Double durationHours) { this.durationHours = durationHours; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getEnrolledCount() { return enrolledCount; }
    public void setEnrolledCount(Integer enrolledCount) { this.enrolledCount = enrolledCount; }

    public String getBanner() { return banner; }
    public void setBanner(String banner) { this.banner = banner; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Boolean getDraft() { return draft; }
    public void setDraft(Boolean draft) { this.draft = draft; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public List<Module> getModules() { return modules; }
    public void setModules(List<Module> modules) { this.modules = modules; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getDraftPayload() { return draftPayload; }
    public void setDraftPayload(String draftPayload) { this.draftPayload = draftPayload; }
}
