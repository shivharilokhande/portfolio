package com.personal.portfolio.projects;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 *   GET /api/projects             — list (featured first)
 *   GET /api/projects?all=true    — include non-featured
 *   GET /api/projects/{slug}      — single project
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository repo;

    public ProjectController(ProjectRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ProjectDto> list(@RequestParam(value = "all", defaultValue = "false") boolean all) {
        var rows = all
                ? repo.findAllByOrderBySortOrderAscIdAsc()
                : repo.findAllByFeaturedTrueOrderBySortOrderAscIdAsc();
        return rows.stream().map(ProjectDto::from).toList();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProjectDto> one(@PathVariable String slug) {
        return repo.findBySlug(slug)
                .map(ProjectDto::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
