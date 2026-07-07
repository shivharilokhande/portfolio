package com.personal.portfolio.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByOrderBySortOrderAscIdAsc();
    List<Project> findAllByFeaturedTrueOrderBySortOrderAscIdAsc();
    Optional<Project> findBySlug(String slug);
}
