package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {

    Optional<Module> findByModuleId(String moduleId);

    List<Module> findByCourseIdOrderByOrderIndexAsc(Long courseId);

    boolean existsByModuleId(String moduleId);

    long countByCourseId(Long courseId);

    @org.springframework.data.jpa.repository.Query("SELECT m.course.id, COUNT(m) FROM Module m WHERE m.course.id IN :courseIds GROUP BY m.course.id")
    List<Object[]> countByCourseIds(@org.springframework.data.repository.query.Param("courseIds") java.util.Collection<Long> courseIds);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Module m WHERE m.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}