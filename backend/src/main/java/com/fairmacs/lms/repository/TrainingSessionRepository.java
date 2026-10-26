package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
    @Query("select distinct s from TrainingSession s left join s.targetUserIds targetId where s.targetType = com.fairmacs.lms.entity.TrainingSessionTargetType.ALL or (s.targetType = com.fairmacs.lms.entity.TrainingSessionTargetType.DEPARTMENT and lower(s.department) = lower(:department)) or (s.targetType = com.fairmacs.lms.entity.TrainingSessionTargetType.EMPLOYEES and targetId = :userId) order by s.date, s.id")
    List<TrainingSession> findVisibleSessions(@Param("userId") Long userId, @Param("department") String department);
}
