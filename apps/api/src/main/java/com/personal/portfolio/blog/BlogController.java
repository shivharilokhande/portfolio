package com.personal.portfolio.blog;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 *   GET /api/blog          — list of published posts (newest first)
 *   GET /api/blog/{slug}   — one published post
 */
@RestController
@RequestMapping("/api/blog")
public class BlogController {

    private final BlogRepository repo;

    public BlogController(BlogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<BlogPostSummaryDto> list() {
        return repo.findAllByPublishedTrueOrderByPublishedAtDesc()
                .stream().map(BlogPostSummaryDto::from).toList();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<BlogPostDto> one(@PathVariable String slug) {
        return repo.findBySlugAndPublishedTrue(slug)
                .map(BlogPostDto::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
