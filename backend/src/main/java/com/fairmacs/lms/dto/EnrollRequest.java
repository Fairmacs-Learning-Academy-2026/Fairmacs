package com.fairmacs.lms.dto;

public class EnrollRequest {
    private Long courseId;
    private String courseCode;

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
}
