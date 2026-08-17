-- Username is the primary login identifier for field personnel. Existing email
-- logins remain unique and continue to work; PostgreSQL permits multiple NULLs
-- in a unique index.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Confirmed source files do not always contain an employee join date. Keep the
-- business value unknown instead of inventing one during import.
ALTER TABLE "Employee" ALTER COLUMN "joinedDate" DROP NOT NULL;
