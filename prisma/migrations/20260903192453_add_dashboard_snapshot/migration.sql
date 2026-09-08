-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "attendeesCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardSnapshot_companyId_date_idx" ON "DashboardSnapshot"("companyId", "date");

-- AddForeignKey
ALTER TABLE "DashboardSnapshot" ADD CONSTRAINT "DashboardSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
