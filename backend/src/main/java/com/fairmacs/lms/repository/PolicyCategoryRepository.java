package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.PolicyCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyCategoryRepository extends JpaRepository<PolicyCategory, Long> {

    Optional<PolicyCategory> findByCode(String code);

    Optional<PolicyCategory> findByCategoryNameIgnoreCase(String name);

    boolean existsByCode(String code);

    boolean existsByCategoryNameIgnoreCase(String name);

    default boolean existsByNameIgnoreCase(String name) {
        return existsByCategoryNameIgnoreCase(name);
    }

    List<PolicyCategory> findByActiveTrueOrderByDisplayOrderAsc();

    List<PolicyCategory> findAllByOrderByDisplayOrderAsc();
}
