-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "language_code" VARCHAR(10) NOT NULL DEFAULT 'en',
ADD COLUMN     "model_version" VARCHAR(50),
ADD COLUMN     "prompt_version" VARCHAR(20);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "language_code" VARCHAR(10) NOT NULL DEFAULT 'en';
