-- Seed data — projects + a couple of blog posts.

INSERT INTO project (slug, title, blurb, metric, stack, accent, sort_order, featured) VALUES
('eon-ecommerce',
 'EON Ecommerce',
 'Microservices ecommerce on AWS. Auth, catalog, cart, orders and payments wired event-driven over SQS. 1.4 M requests/day at peak with sub-100ms p95.',
 '12 services · 1.4 M req/day',
 'Java 17,Spring Boot,AWS,PostgreSQL,Kafka', '#a855f7', 10, TRUE),

('workiva-integration',
 'Workiva Financial Integration',
 'SOX-grade reporting integration for a Big 4 client — Salesforce data piped into Workiva Wdesk with a full audit trail. Deployed across 4 Fortune-500 customers.',
 '4 Fortune-500 rollouts',
 'Workiva,Salesforce,Java,AWS Lambda', '#38bdf8', 20, TRUE),

('autoscalp',
 'AutoScalp Trading Platform',
 'Algorithmic scalping engine for the Indian equity market. Low-latency Java with WebSocket order routing. p99 below 20ms.',
 'p99 < 20 ms',
 'Java,Spring WebFlux,Redis,TimescaleDB', '#fbbf24', 30, TRUE),

('sugar-spice',
 'Sugar & Spice Café',
 'Owner-operator product: POS, inventory and CRM automation for a real café in Pune. Saving ₹40K/month in manual overhead.',
 'Live · ₹40K/mo savings',
 'React,Node,PostgreSQL', '#10b981', 40, TRUE),

('photo-sorter',
 'Wedding Photo Sorter',
 'Face-recognition pipeline that groups thousands of wedding photos by guest, with a delightful gallery UI for the family to browse.',
 '10 K photos in < 4 min',
 'Python,FastAPI,ONNX,Next.js', '#ec4899', 50, TRUE),

('shivhari-dev',
 'shivhari.dev (this site)',
 '3D animated portfolio built with React Three Fiber + Framer Motion + a Spring Boot API. The very thing you are scrolling.',
 'Lighthouse 95+',
 'React,R3F,Spring Boot,PostgreSQL', '#a855f7', 60, TRUE);


INSERT INTO blog_post (slug, title, excerpt, body_md, category, read_min, published, published_at) VALUES
('agile-maturity-in-a-quarter',
 'How we raised Agile maturity 2 levels in a single quarter',
 'A short field report on the rituals, metrics and conversations that actually moved the needle for our squad — and the things that politely did not.',
 '# How we raised Agile maturity 2 levels in a single quarter

We did the obvious — proper standups, clean retros, a defined Definition of Done. What worked was less obvious: weekly tech-debt slot, "story shaping" before sprint planning, and ruthless WIP limits. The full breakdown is below.',
 'Leadership', 6, TRUE, CURRENT_TIMESTAMP),

('spring-boot-3-pitfalls',
 'Five Spring Boot 3 pitfalls I keep seeing in client codebases',
 'Validation that silently swallows errors, transaction propagation surprises, and the JPA n+1 nobody talks about. With concrete fixes.',
 '# Five Spring Boot 3 pitfalls I keep seeing

When I rescue a Spring Boot codebase the same five patterns keep coming up — and they all look harmless at first.

1. **Validation, but no `@Valid`**
2. **`@Transactional` on private methods**
3. **JPA n+1 hidden behind a DTO mapper**
4. **CORS configured twice**
5. **Actuator info leak**',
 'Engineering', 8, TRUE, CURRENT_TIMESTAMP),

('workiva-from-the-trenches',
 'Workiva implementation, from the trenches',
 'Lessons from delivering Wdesk SOX reporting for four Fortune-500 clients — what to ask in week one, the connectors worth building, and the rollouts that scared me.',
 '# Workiva from the trenches

Most Workiva engagements get stuck on the same three things: source-of-truth ownership, sign-off cadence, and the surprisingly emotional question of "who owns the spreadsheet?"',
 'Consulting', 7, TRUE, CURRENT_TIMESTAMP);
