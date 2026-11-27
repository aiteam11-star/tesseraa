-- AlterTable
ALTER TABLE "DeliverableNote" ADD COLUMN     "fileId" TEXT;

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileId" TEXT;

-- CreateIndex
CREATE INDEX "FileAsset_projectId_idx" ON "FileAsset"("projectId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableNote" ADD CONSTRAINT "DeliverableNote_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
