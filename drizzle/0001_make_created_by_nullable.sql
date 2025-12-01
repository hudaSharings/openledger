-- Alter households table to make created_by nullable
ALTER TABLE "households" ALTER COLUMN "created_by" DROP NOT NULL;

