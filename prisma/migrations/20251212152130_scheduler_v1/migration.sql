-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('TODO', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "WorkSource" AS ENUM ('MANUAL', 'DEALER', 'RINGCENTRAL', 'ORBISX');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "bayId" TEXT,
ADD COLUMN     "freeTextJob" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "source" "WorkSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "defaultMins" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechSkill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequiredSkill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ServiceRequiredSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechScheduleRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TechScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechTimeOff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT,
    "freeTextJob" TEXT,
    "promisedAt" TIMESTAMP(3),
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "bayId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkStatus" NOT NULL DEFAULT 'TODO',
    "source" "WorkSource" NOT NULL DEFAULT 'DEALER',
    "assignedTechId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_tenantId_name_key" ON "ServiceCategory"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Service_tenantId_name_key" ON "Service"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_tenantId_name_key" ON "Skill"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TechSkill_tenantId_techId_idx" ON "TechSkill"("tenantId", "techId");

-- CreateIndex
CREATE UNIQUE INDEX "TechSkill_techId_skillId_key" ON "TechSkill"("techId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequiredSkill_serviceId_skillId_key" ON "ServiceRequiredSkill"("serviceId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Bay_tenantId_name_key" ON "Bay"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TechScheduleRule_techId_day_key" ON "TechScheduleRule"("techId", "day");

-- CreateIndex
CREATE INDEX "TechTimeOff_techId_startAt_endAt_idx" ON "TechTimeOff"("techId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_tenantId_date_key" ON "Holiday"("tenantId", "date");

-- CreateIndex
CREATE INDEX "WorkItem_tenantId_status_priority_idx" ON "WorkItem"("tenantId", "status", "priority");

-- CreateIndex
CREATE INDEX "WorkItem_assignedTechId_status_idx" ON "WorkItem"("assignedTechId", "status");

-- CreateIndex
CREATE INDEX "WorkLog_techId_startedAt_idx" ON "WorkLog"("techId", "startedAt");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_startTime_endTime_idx" ON "Appointment"("tenantId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Appointment_techId_startTime_endTime_idx" ON "Appointment"("techId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Appointment_bayId_startTime_endTime_idx" ON "Appointment"("bayId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSkill" ADD CONSTRAINT "TechSkill_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSkill" ADD CONSTRAINT "TechSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequiredSkill" ADD CONSTRAINT "ServiceRequiredSkill_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequiredSkill" ADD CONSTRAINT "ServiceRequiredSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bay" ADD CONSTRAINT "Bay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechScheduleRule" ADD CONSTRAINT "TechScheduleRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechScheduleRule" ADD CONSTRAINT "TechScheduleRule_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechTimeOff" ADD CONSTRAINT "TechTimeOff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechTimeOff" ADD CONSTRAINT "TechTimeOff_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_assignedTechId_fkey" FOREIGN KEY ("assignedTechId") REFERENCES "Tech"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_techId_fkey" FOREIGN KEY ("techId") REFERENCES "Tech"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
