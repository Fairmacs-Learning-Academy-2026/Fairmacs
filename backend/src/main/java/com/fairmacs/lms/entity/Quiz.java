package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "quizzes")
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String quizId;

    @Column(nullable = false)
    private String title;

    /**
     * MODULE = quiz after an individual module
     * FINAL = final quiz for the complete course
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuizType type;

    /**
     * Every quiz belongs to a course.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    /**
     * Only MODULE quizzes have a module.
     * FINAL quizzes will have this as null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private Module module;

    /**
     * Minimum score required to pass.
     */
    @Column
    private Integer passingScore = 70;

    /**
     * Optional time limit for the quiz.
     */
    @Column
    private Integer timeLimitMinutes;

    /**
     * Maximum number of attempts allowed.
     */
    @Column
    private Integer maxAttempts;

    /**
     * Number of questions available in the question bank
     * is not stored here. It is calculated from QuizQuestion.
     *
     * Example:
     * Question bank = 30
     * Questions per attempt = 10
     */
    @Column
    private Integer questionsPerAttempt;

    @Column(name = "cooldown_minutes")
    private Integer cooldownMinutes = 5;

    /**
     * Randomly select questions from the question bank.
     */
    @Column
    private Boolean randomizeQuestions = true;

    /**
     * Randomize the order of answer options.
     */
    @Column
    private Boolean randomizeOptions = true;

    @Column
    private Boolean active = true;

    @OneToMany(
            mappedBy = "quiz",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<QuizQuestion> questions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Quiz() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQuizId() {
        return quizId;
    }

    public void setQuizId(String quizId) {
        this.quizId = quizId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public QuizType getType() {
        return type;
    }

    public void setType(QuizType type) {
        this.type = type;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public Module getModule() {
        return module;
    }

    public void setModule(Module module) {
        this.module = module;
    }

    public Integer getPassingScore() {
        return passingScore;
    }

    public void setPassingScore(Integer passingScore) {
        this.passingScore = passingScore;
    }

    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }

    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public Integer getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Integer getQuestionsPerAttempt() {
        return questionsPerAttempt;
    }

    public void setQuestionsPerAttempt(Integer questionsPerAttempt) {
        this.questionsPerAttempt = questionsPerAttempt;
    }

    public Integer getCooldownMinutes() {
        return cooldownMinutes != null ? cooldownMinutes : 5;
    }

    public void setCooldownMinutes(Integer cooldownMinutes) {
        this.cooldownMinutes = cooldownMinutes;
    }

    public Boolean getRandomizeQuestions() {
        return randomizeQuestions;
    }

    public void setRandomizeQuestions(Boolean randomizeQuestions) {
        this.randomizeQuestions = randomizeQuestions;
    }

    public Boolean getRandomizeOptions() {
        return randomizeOptions;
    }

    public void setRandomizeOptions(Boolean randomizeOptions) {
        this.randomizeOptions = randomizeOptions;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public List<QuizQuestion> getQuestions() {
        return questions;
    }

    public void setQuestions(List<QuizQuestion> questions) {
        this.questions = questions;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}