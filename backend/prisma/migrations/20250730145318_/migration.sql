/*
  Warnings:

  - A unique constraint covering the columns `[twitchRedemptionId]` on the table `Redemption` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `twitchRedemptionId` to the `Redemption` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN     "twitchRedemptionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_twitchRedemptionId_key" ON "Redemption"("twitchRedemptionId");
