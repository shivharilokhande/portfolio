package com.personal.portfolio.cms;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** One row per editable section of the portfolio (profile, projects, …). */
@Entity
@Table(name = "portfolio_content")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class PortfolioContent {

    @Id
    @Column(name = "section_key", nullable = false, length = 60)
    private String sectionKey;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String body;            // stringified JSON — up to 16 MB, matches V6 SQL

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() { this.updatedAt = Instant.now(); }
}
