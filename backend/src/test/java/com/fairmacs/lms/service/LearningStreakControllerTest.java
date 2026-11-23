package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.LearningStreakController;
import com.fairmacs.lms.dto.DailyLearningActivityDTO;
import com.fairmacs.lms.dto.LearningStreakDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LearningStreakControllerTest {

    private static class TestLearningStreakService extends LearningStreakService {
        private LearningStreakDTO stubbedDto;

        public TestLearningStreakService() {
            super(null, null, null);
        }

        public void setStubbedDto(LearningStreakDTO stubbedDto) {
            this.stubbedDto = stubbedDto;
        }

        @Override
        public LearningStreakDTO getEmployeeStreaks() {
            return stubbedDto;
        }
    }

    @Test
    @DisplayName("GET /api/learning/streaks returns 200 OK with streak payload")
    void testGetStreaksEndpoint() {
        DailyLearningActivityDTO day = new DailyLearningActivityDTO("2026-11-17", "Tue", 2, 1, true);
        LearningStreakDTO expected = new LearningStreakDTO(
                3,
                12,
                3,
                4,
                2,
                5,
                5,
                "2026-11-16",
                "2026-11-22",
                "Asia/Kolkata",
                List.of(day)
        );

        TestLearningStreakService stubService = new TestLearningStreakService();
        stubService.setStubbedDto(expected);

        LearningStreakController controller = new LearningStreakController(stubService);
        ResponseEntity<LearningStreakDTO> response = controller.getStreaks();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(3, response.getBody().getCurrentStreak());
        assertEquals(12, response.getBody().getLongestStreak());
        assertEquals(3, response.getBody().getWeeklyActiveDays());
        assertEquals(4, response.getBody().getWeeklyCompletedLessons());
        assertEquals(2, response.getBody().getWeeklySubmittedQuizzes());
        assertEquals(1, response.getBody().getDailyActivity().size());
    }
}
