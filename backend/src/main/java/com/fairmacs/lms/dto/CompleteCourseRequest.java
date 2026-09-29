package com.fairmacs.lms.dto;

public class CompleteCourseRequest {

    private Long enrollmentId;
    private Long courseId;
    private String courseCode;
    private Integer score;

    public CompleteCourseRequest() {}

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
}
