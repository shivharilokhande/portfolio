package com.personal.portfolio.store;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product>      findAllByPublishedTrueOrderByFeaturedDescIdAsc();
    Optional<Product>  findBySlugAndPublishedTrue(String slug);
    /** Count published products for admin stats — avoids loading rows. */
    long               countByPublishedTrue();
}
