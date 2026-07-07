package com.personal.portfolio.projects;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/** Public showcase project. */
@Entity
@Table(name = "project")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80, unique = true)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 800)
    private String blurb;

    @Column(length = 200)
    private String metric;

    /** Comma-separated. Kept simple — see {@link #stackAsList()}. */
    @Column(nullable = false, length = 400)
    private String stack;

    @Column(length = 40)
    private String accent;

    @Column(name = "repo_url", length = 400)
    private String repoUrl;

    @Column(name = "demo_url", length = 400)
    private String demoUrl;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 100;

    @Column(nullable = false)
    private Boolean featured = Boolean.TRUE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public List<String> stackAsList() {
        if (stack == null || stack.isBlank()) return List.of();
        return Arrays.stream(stack.split("\\s*,\\s*")).filter(s -> !s.isBlank()).toList();
    }
}
