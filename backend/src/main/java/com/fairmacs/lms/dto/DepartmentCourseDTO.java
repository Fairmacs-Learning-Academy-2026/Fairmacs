package com.fairmacs.lms.dto;

public class DepartmentCourseDTO {
    private Long courseId;
    private String courseCode;
    private String title;
    private Boolean active;
    private int enrolledEmployees;
    private double completionRate;
    private boolean owned;
    private String assignmentType;
    private String owningDepartmentName;
    private int mandatoryCount;
    private int recommendedCount;
    private int completedCount;
    private int overdueCount;
    private double averageScore;

    public DepartmentCourseDTO() {}

    public DepartmentCourseDTO(Long courseId, String courseCode, String title,
                               Boolean active, int enrolledEmployees, double completionRate) {
        this.courseId = courseId;
        this.courseCode = courseCode;
        this.title = title;
        this.active = active;
        this.enrolledEmployees = enrolledEmployees;
        this.completionRate = completionRate;
    }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public int getEnrolledEmployees() { return enrolledEmployees; }
    public void setEnrolledEmployees(int enrolledEmployees) { this.enrolledEmployees = enrolledEmployees; }
    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }

    public boolean isOwned() { return owned; }
    public void setOwned(boolean owned) { this.owned = owned; }
    public String getAssignmentType() { return assignmentType; }
    public void setAssignmentType(String assignmentType) { this.assignmentType = assignmentType; }
    public String getOwningDepartmentName() { return owningDepartmentName; }
    public void setOwningDepartmentName(String owningDepartmentName) { this.owningDepartmentName = owningDepartmentName; }
    public int getMandatoryCount() { return mandatoryCount; }
    public void setMandatoryCount(int mandatoryCount) { this.mandatoryCount = mandatoryCount; }
    public int getRecommendedCount() { return recommendedCount; }
    public void setRecommendedCount(int recommendedCount) { this.recommendedCount = recommendedCount; }
    public int getCompletedCount() { return completedCount; }
    public void setCompletedCount(int completedCount) { this.completedCount = completedCount; }
    public int getOverdueCount() { return overdueCount; }
    public void setOverdueCount(int overdueCount) { this.overdueCount = overdueCount; }
    public double getAverageScore() { return averageScore; }
    public void setAverageScore(double averageScore) { this.averageScore = averageScore; }
}
