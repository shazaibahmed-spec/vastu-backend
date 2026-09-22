-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "image_quality_score" DOUBLE PRECISION,
ADD COLUMN     "vision_duration_ms" INTEGER,
ADD COLUMN     "vision_model_used" VARCHAR(50),
ADD COLUMN     "vision_prompt_version" VARCHAR(20);

-- AlterTable
ALTER TABLE "detected_objects" ADD COLUMN     "bounding_box" JSONB,
ADD COLUMN     "detection_status" VARCHAR(20) DEFAULT 'DETECTED';
