package com.fairmacs.lms.dto;

/**
 * Fairmacs KMS — Daily Learning Activity DTO
 * Represents aggregated learning milestones for a single calendar day in Asia/Kolkata.
 */
public class DailyLearningActivityDTO {

    private String date; // YYYY-MM-DD
    private String day;  // Mon, Tue, etc.
    private int completedLessons;
    private int submittedQuizzes;
    private boolean active;

    public DailyLearningActivityDTO() {
    }

    public DailyLearningActivityDTO(
            String date,
            String day,
            int completedLessons,
            int submittedQuizzes,
            boolean active
    ) {
        this.date = date;
        this.day = day;
        this.completedLessons = completedLessons;
        this.submittedQuizzes = submittedQuizzes;
        this.active = active;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public int getCompletedLessons() {
        return completedLessons;
    }

    public void setCompletedLessons(int completedLessons) {
        this.completedLessons = completedLessons;
    }

    public int getSubmittedQuizzes() {
        return submittedQuizzes;
    }

    public void setSubmittedQuizzes(int submittedQuizzes) {
        this.submittedQuizzes = submittedQuizzes;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
