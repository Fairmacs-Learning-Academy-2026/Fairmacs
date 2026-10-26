package com.fairmacs.lms.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class CourseAuthoringRequest {

    private String courseId;
    private String title;
    private String categorySlug;
    private String level;
    private String duration;
    private Integer durationHours;
    private String banner;
    private String description;
    private Integer passingScore = 70;
    private Boolean foundation = false;
    private Boolean publish = false;

    // Assignment configuration
    private List<String> targetDepartments = new ArrayList<>();
    private List<Long> targetEmployeeIds = new ArrayList<>();
    private LocalDate dueDate;
    private Boolean mandatory = false;

    private List<ModuleInput> modules = new ArrayList<>();
    private QuizInput finalQuiz;

    public String getCourseId() { return courseId; }
    public void setCourseId(String courseId) { this.courseId = courseId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategorySlug() { return categorySlug; }
    public void setCategorySlug(String categorySlug) { this.categorySlug = categorySlug; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public Integer getDurationHours() { return durationHours; }
    public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }

    public String getBanner() { return banner; }
    public void setBanner(String banner) { this.banner = banner; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }

    public Boolean getFoundation() { return foundation; }
    public void setFoundation(Boolean foundation) { this.foundation = foundation; }

    public Boolean getPublish() { return publish; }
    public void setPublish(Boolean publish) { this.publish = publish; }

    public List<String> getTargetDepartments() { return targetDepartments; }
    public void setTargetDepartments(List<String> targetDepartments) {
        this.targetDepartments = targetDepartments;
    }

    public List<Long> getTargetEmployeeIds() { return targetEmployeeIds; }
    public void setTargetEmployeeIds(List<Long> targetEmployeeIds) {
        this.targetEmployeeIds = targetEmployeeIds;
    }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public Boolean getMandatory() { return mandatory; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory; }

    public List<ModuleInput> getModules() { return modules; }
    public void setModules(List<ModuleInput> modules) { this.modules = modules; }

    public QuizInput getFinalQuiz() { return finalQuiz; }
    public void setFinalQuiz(QuizInput finalQuiz) { this.finalQuiz = finalQuiz; }

    public static class ModuleInput {
        private String title;
        private Integer orderIndex;
        private List<LessonInput> lessons = new ArrayList<>();
        private QuizInput quiz;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }

        public List<LessonInput> getLessons() { return lessons; }
        public void setLessons(List<LessonInput> lessons) { this.lessons = lessons; }

        public QuizInput getQuiz() { return quiz; }
        public void setQuiz(QuizInput quiz) { this.quiz = quiz; }
    }

    public static class LessonInput {
        private String title;
        private String type;
        private String contentUrl;
        private String duration;
        private Integer orderIndex;
        private String workdriveFileId;

        public String getWorkdriveFileId() {return workdriveFileId;}
        public void setWorkdriveFileId(String workdriveFileId) {this.workdriveFileId = workdriveFileId;}

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getContentUrl() { return contentUrl; }
        public void setContentUrl(String contentUrl) { this.contentUrl = contentUrl; }

        public String getDuration() { return duration; }
        public void setDuration(String duration) { this.duration = duration; }

        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }

    public static class QuizInput {
        private String title;
        private Integer passingScore = 70;
        private Integer timeLimitMinutes;
        private Integer maxAttempts = 3;
        private Integer questionsPerAttempt;
        private Boolean randomizeQuestions = true;
        private Boolean randomizeOptions = true;
        private List<QuestionInput> questions = new ArrayList<>();

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public Integer getPassingScore() { return passingScore; }
        public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }

        public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
        public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }

        public Integer getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

        public Integer getQuestionsPerAttempt() { return questionsPerAttempt; }
        public void setQuestionsPerAttempt(Integer questionsPerAttempt) {
            this.questionsPerAttempt = questionsPerAttempt;
        }

        public Boolean getRandomizeQuestions() { return randomizeQuestions; }
        public void setRandomizeQuestions(Boolean randomizeQuestions) {
            this.randomizeQuestions = randomizeQuestions;
        }

        public Boolean getRandomizeOptions() { return randomizeOptions; }
        public void setRandomizeOptions(Boolean randomizeOptions) {
            this.randomizeOptions = randomizeOptions;
        }

        public List<QuestionInput> getQuestions() { return questions; }
        public void setQuestions(List<QuestionInput> questions) {
            this.questions = questions;
        }
    }

    public static class QuestionInput {
        private String questionText;
        private String questionType = "SINGLE_CHOICE";
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String correctAnswer;
        private String explanation;
        private Integer orderIndex;

        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }

        public String getQuestionType() { return questionType; }
        public void setQuestionType(String questionType) { this.questionType = questionType; }

        public String getOptionA() { return optionA; }
        public void setOptionA(String optionA) { this.optionA = optionA; }

        public String getOptionB() { return optionB; }
        public void setOptionB(String optionB) { this.optionB = optionB; }

        public String getOptionC() { return optionC; }
        public void setOptionC(String optionC) { this.optionC = optionC; }

        public String getOptionD() { return optionD; }
        public void setOptionD(String optionD) { this.optionD = optionD; }

        public String getCorrectAnswer() { return correctAnswer; }
        public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }

        public String getExplanation() { return explanation; }
        public void setExplanation(String explanation) { this.explanation = explanation; }

        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }
}