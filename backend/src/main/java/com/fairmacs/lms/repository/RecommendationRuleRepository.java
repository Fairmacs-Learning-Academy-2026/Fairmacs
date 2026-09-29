package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.RecommendationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationRuleRepository extends JpaRepository<RecommendationRule, Long> {

    @Query("SELECT r FROM RecommendationRule r JOIN FETCH r.course c WHERE LOWER(r.department) = LOWER(:department)")
    List<RecommendationRule> findByDepartmentIgnoreCase(@Param("department") String department);
}
