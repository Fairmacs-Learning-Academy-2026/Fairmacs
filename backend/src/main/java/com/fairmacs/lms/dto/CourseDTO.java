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
    private String level;
    private String duration;
    private Double durationHours;
    private Double rating;
    private Integer enrolledCount;
    private String banner;
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

    public String getBanner() {
        return banner;
    }

    public void setBanner(String banner) {
        this.banner = banner;
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
        private String assetUrl;
        private String workdriveFileId;

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