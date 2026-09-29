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
}