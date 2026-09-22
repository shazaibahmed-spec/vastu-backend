-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('BEDROOM', 'LIVING_ROOM', 'KITCHEN', 'MAIN_ENTRANCE', 'OFFICE');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('NORTH', 'NORTH_EAST', 'EAST', 'SOUTH_EAST', 'SOUTH', 'SOUTH_WEST', 'WEST', 'NORTH_WEST', 'CENTER');

-- CreateEnum
CREATE TYPE "DirectionSource" AS ENUM ('DEVICE_COMPASS', 'USER_SELECTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'IMAGE_UPLOADED', 'AI_ANALYSIS', 'OBJECT_DETECTION', 'RULE_EVALUATION', 'REPORT_GENERATION', 'COMPLETED', 'FAILED_AI_ANALYSIS', 'FAILED_RULE_EVALUATION', 'FAILED_REPORT_GENERATION', 'FAILED_INVALID_INPUT');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('COMPLIANT', 'DEFECT', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RemedyType" AS ENUM ('STRUCTURAL', 'ELEMENTAL', 'DECORATIVE', 'COLOR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vastu_rule_versions" (
    "id" UUID NOT NULL,
    "version_number" VARCHAR(20) NOT NULL,
    "release_notes" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vastu_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vastu_rules" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "room_type" "RoomType" NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "target_object" VARCHAR(50) NOT NULL,
    "condition_json" JSONB NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "verdict_on_match" "Verdict" NOT NULL DEFAULT 'DEFECT',
    "default_remedy" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vastu_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rule_version_id" UUID NOT NULL,
    "room_type" "RoomType" NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "compass_heading" DOUBLE PRECISION,
    "direction_source" "DirectionSource" NOT NULL DEFAULT 'UNKNOWN',
    "confirmed_direction" "Direction",
    "overall_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_images" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_inputs" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "raw_compass_heading" DOUBLE PRECISION,
    "user_selected_direction" "Direction",
    "room_type" "RoomType" NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detected_objects" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "object_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "zone" "Direction" NOT NULL,
    "relative_position" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "attributes_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detected_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_findings" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "detected_object_id" UUID,
    "verdict" "Verdict" NOT NULL,
    "severity" "Severity" NOT NULL,
    "raw_reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remedies" (
    "id" UUID NOT NULL,
    "finding_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "remedy_type" "RemedyType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remedies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "elemental_balance_json" JSONB NOT NULL,
    "ai_model_used" VARCHAR(50),
    "token_usage_json" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vastu_rule_versions_version_number_key" ON "vastu_rule_versions"("version_number");

-- CreateIndex
CREATE INDEX "vastu_rules_room_type_is_active_idx" ON "vastu_rules"("room_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vastu_rules_code_version_id_key" ON "vastu_rules"("code", "version_id");

-- CreateIndex
CREATE INDEX "analyses_user_id_created_at_idx" ON "analyses"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_images_analysis_id_key" ON "analysis_images"("analysis_id");

-- CreateIndex
CREATE INDEX "analysis_images_sha256_hash_idx" ON "analysis_images"("sha256_hash");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_inputs_analysis_id_key" ON "analysis_inputs"("analysis_id");

-- CreateIndex
CREATE INDEX "detected_objects_analysis_id_idx" ON "detected_objects"("analysis_id");

-- CreateIndex
CREATE INDEX "analysis_findings_analysis_id_idx" ON "analysis_findings"("analysis_id");

-- CreateIndex
CREATE INDEX "remedies_finding_id_idx" ON "remedies"("finding_id");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_reports_analysis_id_key" ON "analysis_reports"("analysis_id");

-- AddForeignKey
ALTER TABLE "vastu_rules" ADD CONSTRAINT "vastu_rules_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "vastu_rule_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "vastu_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_images" ADD CONSTRAINT "analysis_images_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_inputs" ADD CONSTRAINT "analysis_inputs_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detected_objects" ADD CONSTRAINT "detected_objects_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "vastu_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_detected_object_id_fkey" FOREIGN KEY ("detected_object_id") REFERENCES "detected_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedies" ADD CONSTRAINT "remedies_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "analysis_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
