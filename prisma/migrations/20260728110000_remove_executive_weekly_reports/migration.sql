-- Corrective migration: the legacy executive-report tables were QA-only and empty.
DROP TABLE IF EXISTS "ExecutiveWeeklyReportVersion";
DROP TABLE IF EXISTS "ExecutiveWeeklyDecisionItem";
DROP TABLE IF EXISTS "ExecutiveWeeklyProjectDetail";
DROP TABLE IF EXISTS "ExecutiveWeeklyReport";
DROP TYPE IF EXISTS "ExecutiveWeeklyReportStatus";
