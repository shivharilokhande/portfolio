package com.personal.portfolio.contact;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface ContactRepository extends JpaRepository<ContactSubmission, Long> {
    long countByEmailAndCreatedAtAfter(String email, Instant since);
    /** Count inquiries by status — used by admin stats to avoid loading whole table. */
    long countByStatus(ContactSubmission.Status status);
}
