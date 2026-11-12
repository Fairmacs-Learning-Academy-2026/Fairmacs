package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class CourseDTO {

    private Long dbId;
    private String id;
    private String title;
    private String category;
    private String categorySlug;
    private String department;
    private Long departmentId;
    private String owningDepartmentName;
    private List<CourseDepartmentAssignmentDTO> departmentAssignments = new ArrayList<>();
    private List<String> departments = new ArrayList<>();
    private String publishedAt;
    private List<String> learningOutcomes = new ArrayList<>();
    private Boolean certificateEligible;
    private String level;
    private String duration;
    private Double durationHours;
    private Double rating;
    private Integer enrolledCount;
    private Integer moduleCount;
    private Integer lessonCount;
    private String banner;
    private Boolean active = true;
    private String description;
    private Integer passingScore;
    private Boolean foundation;
    private String assignmentType;
    private String enrollmentType;
    private String enrollmentStatus;
    private Integer progressPercent;
    private Long enrollmentDbId;
    private String dueDate;
    private List<ModuleDTO> modules = new ArrayList<>();
    private Map<String, Object> quiz;

    public Long getDbId() {
        return dbId;
    }

    public void setDbId(Long dbId) {
        this.dbId = dbId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getOwningDepartmentName() {
        return owningDepartmentName;
    }

    public void setOwningDepartmentName(String owningDepartmentName) {
        this.owningDepartmentName = owningDepartmentName;
    }

    public List<CourseDepartmentAssignmentDTO> getDepartmentAssignments() {
        return departmentAssignments;
    }

    public void setDepartmentAssignments(List<CourseDepartmentAssignmentDTO> departmentAssignments) {
        this.departmentAssignments = departmentAssignments != null ? departmentAssignments : new ArrayList<>();
    }

    public List<String> getDepartments() {
        return departments;
    }

    public void setDepartments(List<String> departments) {
        this.departments = departments;
    }

    public String getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
        this.publishedAt = publishedAt;
    }

    public List<String> getLearningOutcomes() {
        return learningOutcomes;
    }

    public void setLearningOutcomes(List<String> learningOutcomes) {
        this.learningOutcomes = learningOutcomes;
    }

    public Boolean getCertificateEligible() {
        return certificateEligible;
    }

    public void setCertificateEligible(Boolean certificateEligible) {
        this.certificateEligible = certificateEligible;
    }

    public String getCategorySlug() {
        return categorySlug;
    }

    public void setCategorySlug(String categorySlug) {
        this.categorySlug = categorySlug;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getPosition() {
        return level;
    }

    public void setPosition(String position) {
        this.level = position;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public Double getDurationHours() {
        return durationHours;
    }

    public void setDurationHours(Double durationHours) {
        this.durationHours = durationHours;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getEnrolledCount() {
        return enrolledCount;
    }

    public void setEnrolledCount(Integer enrolledCount) {
        this.enrolledCount = enrolledCount;
    }

    public Integer getModuleCount() {
        return moduleCount;
    }

    public void setModuleCount(Integer moduleCount) {
        this.moduleCount = moduleCount;
    }

    public Integer getLessonCount() {
        return lessonCount;
    }

    public void setLessonCount(Integer lessonCount) {
        this.lessonCount = lessonCount;
    }

    public String getBanner() {
        return banner;
    }

    public void setBanner(String banner) {
        this.banner = banner;
    }

    public String getThumbnailUrl() {
        return banner;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        if (this.banner == null || this.banner.isBlank()) {
            this.banner = thumbnailUrl;
        }
    }

    public String getThumbnail() {
        return banner;
    }

    public void setThumbnail(String thumbnail) {
        if (this.banner == null || this.banner.isBlank()) {
            this.banner = thumbnail;
        }
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getPassingScore() {
        return passingScore;
    }

    public void setPassingScore(Integer passingScore) {
        this.passingScore = passingScore;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Boolean getFoundation() {
        return foundation;
    }

    public void setFoundation(Boolean foundation) {
        this.foundation = foundation;
    }

    public String getAssignmentType() {
        return assignmentType;
    }

    public void setAssignmentType(String assignmentType) {
        this.assignmentType = assignmentType;
    }

    public String getEnrollmentType() {
        return enrollmentType;
    }

    public void setEnrollmentType(String enrollmentType) {
        this.enrollmentType = enrollmentType;
    }

    public String getEnrollmentStatus() {
        return enrollmentStatus;
    }

    public void setEnrollmentStatus(String enrollmentStatus) {
        this.enrollmentStatus = enrollmentStatus;
    }

    public Integer getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(Integer progressPercent) {
        this.progressPercent = progressPercent;
    }

    public Long getEnrollmentDbId() {
        return enrollmentDbId;
    }

    public void setEnrollmentDbId(Long enrollmentDbId) {
        this.enrollmentDbId = enrollmentDbId;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public List<ModuleDTO> getModules() {
        return modules;
    }

    public void setModules(List<ModuleDTO> modules) {
        this.modules = modules;
    }

    public Map<String, Object> getQuiz() {
        return quiz;
    }

    public void setQuiz(Map<String, Object> quiz) {
        this.quiz = quiz;
    }

    
    public static class ModuleDTO {

    // Numeric database ID: used by quiz and progress APIs.
        private Long dbId;

    // Existing business ID: retain for backward compatibility.
        private String id;

        private String title;
        private List<LessonDTO> lessons = new ArrayList<>();

        public Long getDbId() {
            return dbId;
        }

        public void setDbId(Long dbId) {
            this.dbId = dbId;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public List<LessonDTO> getLessons() {
            return lessons;
        }

        public void setLessons(List<LessonDTO> lessons) {
            this.lessons = lessons;
        }
    }

    public static class LessonDTO {

        /*
         * Database primary key.
         *
         * Used by lesson-progress APIs.
         */
        private Long dbId;

        /*
         * Existing frontend/business lesson ID.
         *
         * Example: lesson-1
         */
        private String id;

        private String title;
        private String type;
        private String duration;
        private String summary;
        private String assetUrl;
        private String workdriveFileId;

        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }

        public String getWorkdriveFileId() {return workdriveFileId;}

        public void setWorkdriveFileId(String workdriveFileId) {this.workdriveFileId = workdriveFileId;}

        public Long getDbId() {
            return dbId;
        }

        public void setDbId(Long dbId) {
            this.dbId = dbId;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getDuration() {
            return duration;
        }

        public void setDuration(String duration) {
            this.duration = duration;
        }

        public String getAssetUrl() {
            return assetUrl;
        }

        public void setAssetUrl(String assetUrl) {
            this.assetUrl = assetUrl;
        }
    }
}