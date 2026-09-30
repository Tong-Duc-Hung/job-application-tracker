-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'REVIEWING', 'INTERVIEWING', 'AWAITING_RESULT', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('HR', 'ONLINE_ASSESSMENT', 'TECHNICAL', 'MANAGER', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewResult" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "location" TEXT,
    "salary" TEXT,
    "job_url" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "applied_date" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3),
    "experience" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL DEFAULT 'OTHER',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "meeting_location" TEXT,
    "meeting_url" TEXT,
    "result" "InterviewResult" NOT NULL DEFAULT 'PENDING',
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT,
    "interview_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_rate_limits_expires_at_idx" ON "auth_rate_limits"("expires_at");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_user_id_status_idx" ON "applications"("user_id", "status");

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interviews_scheduled_at_idx" ON "interviews"("scheduled_at");

-- CreateIndex
CREATE INDEX "notes_application_id_idx" ON "notes"("application_id");

-- CreateIndex
CREATE INDEX "notes_interview_id_idx" ON "notes"("interview_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
