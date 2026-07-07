package com.personal.portfolio.contact;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Persistent record of every contact-form submission. */
@Entity
@Table(name = "contact_submission")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class ContactSubmission {

    public enum Status { NEW, REPLIED, ARCHIVED, SPAM }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 160)
    private String company;

    @Column(name = "project_type", length = 120)
    private String projectType;

    @Column(nullable = false, length = 4000)
    private String message;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.NEW;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
