package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class LearningDashboardDTO {
    private String name;
    private String department;
    private String designation;
    private String branch;
    private int mandatoryPercent;
    private int completedCourses;
    private int inProgress;
    private int certificates;
    private String learningHours;
    private CourseDTO continueLearning;
    private List<CourseDTO> mandatory = new ArrayList<>();
    private List<CourseDTO> recommended = new ArrayList<>();
    private List<CourseDTO> enrolled = new ArrayList<>();
    private List<CategoryDTO> categories = new ArrayList<>();

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    public int getMandatoryPercent() { return mandatoryPercent; }
    public void setMandatoryPercent(int mandatoryPercent) { this.mandatoryPercent = mandatoryPercent; }
    public int getCompletedCourses() { return completedCourses; }
    public void setCompletedCourses(int completedCourses) { this.completedCourses = completedCourses; }
    public int getInProgress() { return inProgress; }
    public void setInProgress(int inProgress) { this.inProgress = inProgress; }
    public int getCertificates() { return certificates; }
    public void setCertificates(int certificates) { this.certificates = certificates; }
    public String getLearningHours() { return learningHours; }
    public void setLearningHours(String learningHours) { this.learningHours = learningHours; }
    public CourseDTO getContinueLearning() { return continueLearning; }
    public void setContinueLearning(CourseDTO continueLearning) { this.continueLearning = continueLearning; }
    public List<CourseDTO> getMandatory() { return mandatory; }
    public void setMandatory(List<CourseDTO> mandatory) { this.mandatory = mandatory; }
    public List<CourseDTO> getRecommended() { return recommended; }
    public void setRecommended(List<CourseDTO> recommended) { this.recommended = recommended; }
    public List<CourseDTO> getEnrolled() { return enrolled; }
    public void setEnrolled(List<CourseDTO> enrolled) { this.enrolled = enrolled; }
    public List<CategoryDTO> getCategories() { return categories; }
    public void setCategories(List<CategoryDTO> categories) { this.categories = categories; }
}
