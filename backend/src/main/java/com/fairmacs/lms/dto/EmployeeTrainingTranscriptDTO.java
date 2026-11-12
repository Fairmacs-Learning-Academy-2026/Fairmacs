package com.fairmacs.lms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class EmployeeTrainingTranscriptDTO {

    // =========================================================
    // EMPLOYEE INFORMATION
    // =========================================================

    private Long userId;
    private String employeeId;
    private String employeeName;
    private String email;
    private String designation;
    private String department;

    // =========================================================
    // SUMMARY
    // =========================================================

    private int totalCourses;
    private int completedCourses;
    private int inProgressCourses;
    private int notStartedCourses;
    private int certificatesIssued;

    private double overallProgress;
    private double averageScore;
    private double totalTrainingHours;

    // =========================================================
    // COURSE RECORDS
    // =========================================================

    private List<CourseRecordDTO> courses;

    public EmployeeTrainingTranscriptDTO() {
    }

    // =========================================================
    // GETTERS / SETTERS
    // =========================================================

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public int getTotalCourses() {
        return totalCourses;
    }

    public void setTotalCourses(int totalCourses) {
        this.totalCourses = totalCourses;
    }

    public int getCompletedCourses() {
        return completedCourses;
    }

    public void setCompletedCourses(int completedCourses) {
        this.completedCourses = completedCourses;
    }

    public int getInProgressCourses() {
        return inProgressCourses;
    }

    public void setInProgressCourses(int inProgressCourses) {
        this.inProgressCourses = inProgressCourses;
    }

    public int getNotStartedCourses() {
        return notStartedCourses;
    }

    public void setNotStartedCourses(int notStartedCourses) {
        this.notStartedCourses = notStartedCourses;
    }

    public int getCertificatesIssued() {
        return certificatesIssued;
    }

    public void setCertificatesIssued(int certificatesIssued) {
        this.certificatesIssued = certificatesIssued;
    }

    public double getOverallProgress() {
        return overallProgress;
    }

    public void setOverallProgress(double overallProgress) {
        this.overallProgress = overallProgress;
    }

    public double getAverageScore() {
        return averageScore;
    }

    public void setAverageScore(double averageScore) {
        this.averageScore = averageScore;
    }

    public double getTotalTrainingHours() {
        return totalTrainingHours;
    }

    public void setTotalTrainingHours(double totalTrainingHours) {
        this.totalTrainingHours = totalTrainingHours;
    }

    public List<CourseRecordDTO> getCourses() {
        return courses;
    }

    public void setCourses(List<CourseRecordDTO> courses) {
        this.courses = courses;
    }

    // =========================================================
    // COURSE RECORD DTO
    // =========================================================

    public static class CourseRecordDTO {

        private Long enrollmentId;
        private Long courseDatabaseId;
        private String courseId;
        private String courseTitle;
        private String category;
        private String enrollmentType;
        private String status;
        private Integer progressPercent;
        private Integer score;
        private String certificateId;
        private LocalDate dueDate;
        private LocalDateTime enrolledAt;
        private LocalDateTime completedDate;
        private LocalDateTime lastAccessed;
        private Double durationHours;
        private String courseDepartment;
        private Long owningDepartmentId;
        private String assignmentType;
        private String employeeDepartment;

        public CourseRecordDTO() {
        }

        public Long getEnrollmentId() {
            return enrollmentId;
        }

        public void setEnrollmentId(Long enrollmentId) {
            this.enrollmentId = enrollmentId;
        }

        public Long getCourseDatabaseId() {
            return courseDatabaseId;
        }

        public void setCourseDatabaseId(Long courseDatabaseId) {
            this.courseDatabaseId = courseDatabaseId;
        }

        public String getCourseId() {
            return courseId;
        }

        public void setCourseId(String courseId) {
            this.courseId = courseId;
        }

        public String getCourseTitle() {
            return courseTitle;
        }

        public void setCourseTitle(String courseTitle) {
            this.courseTitle = courseTitle;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getEnrollmentType() {
            return enrollmentType;
        }

        public void setEnrollmentType(String enrollmentType) {
            this.enrollmentType = enrollmentType;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Integer getProgressPercent() {
            return progressPercent;
        }

        public void setProgressPercent(Integer progressPercent) {
            this.progressPercent = progressPercent;
        }

        public Integer getScore() {
            return score;
        }

        public void setScore(Integer score) {
            this.score = score;
        }

        public String getCertificateId() {
            return certificateId;
        }

        public void setCertificateId(String certificateId) {
            this.certificateId = certificateId;
        }

        public LocalDate getDueDate() {
            return dueDate;
        }

        public void setDueDate(LocalDate dueDate) {
            this.dueDate = dueDate;
        }

        public LocalDateTime getEnrolledAt() {
            return enrolledAt;
        }

        public void setEnrolledAt(LocalDateTime enrolledAt) {
            this.enrolledAt = enrolledAt;
        }

        public LocalDateTime getCompletedDate() {
            return completedDate;
        }

        public void setCompletedDate(LocalDateTime completedDate) {
            this.completedDate = completedDate;
        }

        public LocalDateTime getLastAccessed() {
            return lastAccessed;
        }

        public void setLastAccessed(LocalDateTime lastAccessed) {
            this.lastAccessed = lastAccessed;
        }

        public Double getDurationHours() {
            return durationHours;
        }

        public void setDurationHours(Double durationHours) {
            this.durationHours = durationHours;
        }

        public String getCourseDepartment() {
            return courseDepartment;
        }

        public void setCourseDepartment(String courseDepartment) {
            this.courseDepartment = courseDepartment;
        }

        public Long getOwningDepartmentId() {
            return owningDepartmentId;
        }

        public void setOwningDepartmentId(Long owningDepartmentId) {
            this.owningDepartmentId = owningDepartmentId;
        }

        public String getAssignmentType() {
            return assignmentType;
        }

        public void setAssignmentType(String assignmentType) {
            this.assignmentType = assignmentType;
        }

        public String getEmployeeDepartment() {
            return employeeDepartment;
        }

        public void setEmployeeDepartment(String employeeDepartment) {
            this.employeeDepartment = employeeDepartment;
        }
    }
}
