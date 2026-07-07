-- shivhari.dev — initial schema (MySQL 8 / InnoDB)
-- Compatible with H2 in MODE=MySQL for zero-install dev.
--
-- Three small tables: contact submissions, blog posts, projects.

CREATE TABLE contact_submission (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    name         VARCHAR(120)  NOT NULL,
    email        VARCHAR(255)  NOT NULL,
    company      VARCHAR(160),
    project_type VARCHAR(120),
    message      VARCHAR(4000) NOT NULL,
    ip_hash      VARCHAR(64),
    user_agent   VARCHAR(512),
    status       VARCHAR(20)   NOT NULL DEFAULT 'NEW',
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_contact_created (created_at),
    KEY ix_contact_status  (status)
);

CREATE TABLE project (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(80)   NOT NULL,
    title       VARCHAR(160)  NOT NULL,
    blurb       VARCHAR(800)  NOT NULL,
    metric      VARCHAR(200),
    stack       VARCHAR(400)  NOT NULL,
    accent      VARCHAR(40),
    repo_url    VARCHAR(400),
    demo_url    VARCHAR(400),
    sort_order  INT           NOT NULL DEFAULT 100,
    featured    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_project_slug (slug),
    KEY ix_project_sort (sort_order, id)
);

CREATE TABLE blog_post (
    id          BIGINT         NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(120)   NOT NULL,
    title       VARCHAR(200)   NOT NULL,
    excerpt     VARCHAR(500)   NOT NULL,
    body_md     TEXT           NOT NULL,
    category    VARCHAR(60),
    read_min    INT,
    published   BOOLEAN        NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP     NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_blog_slug (slug),
    KEY ix_blog_pub (published, published_at)
);
