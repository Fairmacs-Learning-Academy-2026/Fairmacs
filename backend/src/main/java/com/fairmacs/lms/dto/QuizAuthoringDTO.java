package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class QuizAuthoringDTO {

    private Long id;
    private String quizId;
    private String title;
    private String type; // MODULE or FINAL
    private Long courseId;
    private Long moduleId;
    private Integer passingScore = 70;
    private Integer timeLimitMinutes = 30;
    private Integer maxAttempts;
    private Integer questionsPerAttempt;
    private Boolean randomizeQuestions = true;
    private Boolean randomizeOptions = true;
    private Boolean active = true;
    private List<QuizQuestionDTO> questions = new ArrayList<>();

    public QuizAuthoringDTO() {}

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Long getModuleId() {
        return moduleId;
    }

    public void setModuleId(Long moduleId) {
        this.moduleId = moduleId;
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

    public List<QuizQuestionDTO> getQuestions() {
        return questions;
    }

    public void setQuestions(List<QuizQuestionDTO> questions) {
        this.questions = questions;
    }

    public static class QuizQuestionDTO {
        private Long id;
        private String questionId;
        private String questionText;
        private String questionType = "SINGLE_CHOICE";
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String correctAnswer;
        private String explanation;
        private Integer orderIndex;

        public QuizQuestionDTO() {}

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getQuestionId() {
            return questionId;
        }

        public void setQuestionId(String questionId) {
            this.questionId = questionId;
        }

        public String getQuestionText() {
            return questionText;
        }

        public void setQuestionText(String questionText) {
            this.questionText = questionText;
        }

        public String getQuestionType() {
            return questionType;
        }

        public void setQuestionType(String questionType) {
            this.questionType = questionType;
        }

        public String getOptionA() {
            return optionA;
        }

        public void setOptionA(String optionA) {
            this.optionA = optionA;
        }

        public String getOptionB() {
            return optionB;
        }

        public void setOptionB(String optionB) {
            this.optionB = optionB;
        }

        public String getOptionC() {
            return optionC;
        }

        public void setOptionC(String optionC) {
            this.optionC = optionC;
        }

        public String getOptionD() {
            return optionD;
        }

        public void setOptionD(String optionD) {
            this.optionD = optionD;
        }

        public String getCorrectAnswer() {
            return correctAnswer;
        }

        public void setCorrectAnswer(String correctAnswer) {
            this.correctAnswer = correctAnswer;
        }

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }

        public Integer getOrderIndex() {
            return orderIndex;
        }

        public void setOrderIndex(Integer orderIndex) {
            this.orderIndex = orderIndex;
        }
    }
}
