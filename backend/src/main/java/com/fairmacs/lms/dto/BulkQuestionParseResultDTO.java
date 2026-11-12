package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class BulkQuestionParseResultDTO {

    private int totalDetected;
    private int validCount;
    private int needsReviewCount;
    private int invalidCount;
    private String sourceType;
    private String message;
    private List<ParsedQuestionDTO> questions = new ArrayList<>();

    public BulkQuestionParseResultDTO() {}

    public int getTotalDetected() {
        return totalDetected;
    }

    public void setTotalDetected(int totalDetected) {
        this.totalDetected = totalDetected;
    }

    public int getValidCount() {
        return validCount;
    }

    public void setValidCount(int validCount) {
        this.validCount = validCount;
    }

    public int getNeedsReviewCount() {
        return needsReviewCount;
    }

    public void setNeedsReviewCount(int needsReviewCount) {
        this.needsReviewCount = needsReviewCount;
    }

    public int getInvalidCount() {
        return invalidCount;
    }

    public void setInvalidCount(int invalidCount) {
        this.invalidCount = invalidCount;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<ParsedQuestionDTO> getQuestions() {
        return questions;
    }

    public void setQuestions(List<ParsedQuestionDTO> questions) {
        this.questions = questions;
    }

    public static class ParsedQuestionDTO {
        private String id;
        private String sourceRowOrPage;
        private String questionText;
        private String questionType = "SINGLE_CHOICE";
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String correctAnswer;
        private String explanation;
        private Integer marks = 1;
        private boolean valid = true;
        private List<String> validationErrors = new ArrayList<>();

        public ParsedQuestionDTO() {}

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getSourceRowOrPage() {
            return sourceRowOrPage;
        }

        public void setSourceRowOrPage(String sourceRowOrPage) {
            this.sourceRowOrPage = sourceRowOrPage;
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

        public Integer getMarks() {
            return marks;
        }

        public void setMarks(Integer marks) {
            this.marks = marks;
        }

        public boolean isValid() {
            return valid;
        }

        public void setValid(boolean valid) {
            this.valid = valid;
        }

        public List<String> getValidationErrors() {
            return validationErrors;
        }

        public void setValidationErrors(List<String> validationErrors) {
            this.validationErrors = validationErrors;
        }
    }
}
