package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.CourseThumbnail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CourseThumbnailRepository extends JpaRepository<CourseThumbnail, Long> {

    Optional<CourseThumbnail> findByStorageId(String storageId);

    Optional<CourseThumbnail> findByWorkdriveFileId(String workdriveFileId);

    boolean existsByWorkdriveFileId(String workdriveFileId);

    Optional<CourseThumbnail> findTopByCourseIdOrderByCreatedAtDesc(Long courseId);

    void deleteByStorageId(String storageId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM CourseThumbnail ct WHERE ct.courseId = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}

