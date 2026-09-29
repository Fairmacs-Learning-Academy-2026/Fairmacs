package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class LearningPathDTO {
    private String id;
    private String title;
    private String description;
    private boolean suggested;
    private int courseCount;
    private List<CourseDTO> courses = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isSuggested() { return suggested; }
    public void setSuggested(boolean suggested) { this.suggested = suggested; }
    public int getCourseCount() { return courseCount; }
    public void setCourseCount(int courseCount) { this.courseCount = courseCount; }
    public List<CourseDTO> getCourses() { return courses; }
    public void setCourses(List<CourseDTO> courses) { this.courses = courses; }
}
