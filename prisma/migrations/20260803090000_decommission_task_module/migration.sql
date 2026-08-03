-- Decommission Work Task Module Migration
-- Drop all related foreign key constraints, indexes, tables, and enums

-- Drop tables
DROP TABLE IF EXISTS "WorkTaskIdempotency" CASCADE;
DROP TABLE IF EXISTS "WorkTaskOutboxMessage" CASCADE;
DROP TABLE IF EXISTS "WorkTaskAction" CASCADE;
DROP TABLE IF EXISTS "WorkTask" CASCADE;

-- Drop enum
DROP TYPE IF EXISTS "WorkTaskIdempotencyState" CASCADE;
