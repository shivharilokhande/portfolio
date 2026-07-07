-- shivhari.dev — Store schema (MySQL 8 / InnoDB)
-- Tables: products, orders, order_items.

CREATE TABLE store_product (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    slug          VARCHAR(120)  NOT NULL,
    title         VARCHAR(200)  NOT NULL,
    tagline       VARCHAR(400)  NOT NULL,
    description   TEXT          NOT NULL,
    category      VARCHAR(80)   NOT NULL,
    price_inr     DECIMAL(12,2) NOT NULL,
    price_usd     DECIMAL(12,2) NOT NULL,
    cover_color   VARCHAR(40)   NOT NULL,
    tags          VARCHAR(400)  NOT NULL,
    features      VARCHAR(2000) NOT NULL,
    what_you_get  VARCHAR(2000) NOT NULL,
    tech_stack    VARCHAR(600)  NOT NULL,
    file_size_mb  INT           NOT NULL,
    version       VARCHAR(20)   NOT NULL DEFAULT '1.0.0',
    demo_url      VARCHAR(400),
    repo_url      VARCHAR(400),
    asset_path    VARCHAR(400),
    featured      BOOLEAN       NOT NULL DEFAULT TRUE,
    published     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_store_product_slug (slug),
    KEY ix_store_product_featured (featured DESC, id),
    KEY ix_store_product_category (category)
);

CREATE TABLE store_order (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    name            VARCHAR(120)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    total           DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(8)    NOT NULL,
    payment_method  VARCHAR(32)   NOT NULL,
    payment_ref     VARCHAR(200),
    status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    download_token  VARCHAR(80),
    expires_at      TIMESTAMP     NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at         TIMESTAMP     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY ux_store_order_token (download_token),
    KEY ix_store_order_email  (email),
    KEY ix_store_order_status (status)
);

CREATE TABLE store_order_item (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    order_id        BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    product_title   VARCHAR(200)  NOT NULL,
    product_slug    VARCHAR(120)  NOT NULL,
    price           DECIMAL(12,2) NOT NULL,
    quantity        INT           NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    KEY ix_store_order_item_order (order_id),
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES store_order(id) ON DELETE CASCADE
);
