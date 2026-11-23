package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Fairmacs KMS — Learning Streak & Dual Activity Rings DTO
 *
 * Encapsulates:
 * 1. Current streak (consecutive active calendar days)
 * 2. Longest streak (historical max consecutive active days)
 * 3. Weekly summary for the Monday-Sunday window
 * 4. Configurable presentation targets
 * 5. Daily activity breakdown for the 7-day calendar
 */
public class LearningStreakDTO {

    private int currentStreak;
    private int longestStreak;
    private int weeklyActiveDays;
    private int weeklyCompletedLessons;
    private int weeklySubmittedQuizzes;
    private int weeklyTargetDays;
    private int weeklyTargetLessons;
    private String weekStart;
    private String weekEnd;
    private String timezone;
    private List<DailyLearningActivityDTO> dailyActivity = new ArrayList<>();

    public LearningStreakDTO() {
    }

    public LearningStreakDTO(
            int currentStreak,
            int longestStreak,
            int weeklyActiveDays,
            int weeklyCompletedLessons,
            int weeklySubmittedQuizzes,
            int weeklyTargetDays,
            int weeklyTargetLessons,
            String weekStart,
            String weekEnd,
            String timezone,
            List<DailyLearningActivityDTO> dailyActivity
    ) {
        this.currentStreak = currentStreak;
        this.longestStreak = longestStreak;
        this.weeklyActiveDays = weeklyActiveDays;
        this.weeklyCompletedLessons = weeklyCompletedLessons;
        this.weeklySubmittedQuizzes = weeklySubmittedQuizzes;
        this.weeklyTargetDays = weeklyTargetDays;
        this.weeklyTargetLessons = weeklyTargetLessons;
        this.weekStart = weekStart;
        this.weekEnd = weekEnd;
        this.timezone = timezone;
        this.dailyActivity = dailyActivity != null ? dailyActivity : new ArrayList<>();
    }

    public int getCurrentStreak() {
        return currentStreak;
    }

    public void setCurrentStreak(int currentStreak) {
        this.currentStreak = currentStreak;
    }

    public int getLongestStreak() {
        return longestStreak;
    }

    public void setLongestStreak(int longestStreak) {
        this.longestStreak = longestStreak;
    }

    public int getWeeklyActiveDays() {
        return weeklyActiveDays;
    }

    public void setWeeklyActiveDays(int weeklyActiveDays) {
        this.weeklyActiveDays = weeklyActiveDays;
    }

    public int getWeeklyCompletedLessons() {
        return weeklyCompletedLessons;
    }

    public void setWeeklyCompletedLessons(int weeklyCompletedLessons) {
        this.weeklyCompletedLessons = weeklyCompletedLessons;
    }

    public int getWeeklySubmittedQuizzes() {
        return weeklySubmittedQuizzes;
    }

    public void setWeeklySubmittedQuizzes(int weeklySubmittedQuizzes) {
        this.weeklySubmittedQuizzes = weeklySubmittedQuizzes;
    }

    public int getWeeklyTargetDays() {
        return weeklyTargetDays;
    }

    public void setWeeklyTargetDays(int weeklyTargetDays) {
        this.weeklyTargetDays = weeklyTargetDays;
    }

    public int getWeeklyTargetLessons() {
        return weeklyTargetLessons;
    }

    public void setWeeklyTargetLessons(int weeklyTargetLessons) {
        this.weeklyTargetLessons = weeklyTargetLessons;
    }

    public String getWeekStart() {
        return weekStart;
    }

    public void setWeekStart(String weekStart) {
        this.weekStart = weekStart;
    }

    public String getWeekEnd() {
        return weekEnd;
    }

    public void setWeekEnd(String weekEnd) {
        this.weekEnd = weekEnd;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public List<DailyLearningActivityDTO> getDailyActivity() {
        return dailyActivity;
    }

    public void setDailyActivity(List<DailyLearningActivityDTO> dailyActivity) {
        this.dailyActivity = dailyActivity;
    }
}
