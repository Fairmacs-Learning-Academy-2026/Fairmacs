package com.fairmacs.lms.dto;

import java.time.LocalDateTime;

public class LearnerActivityDTO {

    private String activityId;
    private String employeeName;
    private String department;
    private String activityType;
    private String activityDescription;
    private String courseId;
    private String courseTitle;
    private LocalDateTime timestamp;

    public LearnerActivityDTO() {
    }

    public LearnerActivityDTO(
            String activityId,
            String employeeName,
            String department,
            String activityType,
            String activityDescription,
            String courseId,
            String courseTitle,
            LocalDateTime timestamp
    ) {
        this.activityId = activityId;
        this.employeeName = employeeName;
        this.department = department;
        this.activityType = activityType;
        this.activityDescription = activityDescription;
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.timestamp = timestamp;
    }

    public String getActivityId() {
        return activityId;
    }

    public void setActivityId(String activityId) {
        this.activityId = activityId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getActivityType() {
        return activityType;
    }

    public void setActivityType(String activityType) {
        this.activityType = activityType;
    }

    public String getActivityDescription() {
        return activityDescription;
    }

    public void setActivityDescription(String activityDescription) {
        this.activityDescription = activityDescription;
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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
