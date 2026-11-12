package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.NotificationJobLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationJobLogRepository extends JpaRepository<NotificationJobLog, Long> {

    boolean existsByExecutionKey(String executionKey);

    boolean existsByExecutionKeyAndStatus(String executionKey, String status);

    Optional<NotificationJobLog> findByExecutionKey(String executionKey);

    List<NotificationJobLog> findTop20ByOrderByStartedAtDesc();
}

