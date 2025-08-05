/*
  Warnings:

  - You are about to drop the column `emote` on the `EmoteUsage` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `EmoteUsage` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `EmoteUsage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,emoteId]` on the table `EmoteUsage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `emoteId` to the `EmoteUsage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmoteUsage" DROP COLUMN "emote",
DROP COLUMN "platform",
DROP COLUMN "timestamp",
ADD COLUMN     "emoteId" INTEGER NOT NULL,
ALTER COLUMN "count" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "Emote" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "emoteId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "channelId" TEXT,

    CONSTRAINT "Emote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Emote_name_platform_key" ON "Emote"("name", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Emote_platform_emoteId_key" ON "Emote"("platform", "emoteId");

-- CreateIndex
CREATE UNIQUE INDEX "EmoteUsage_userId_emoteId_key" ON "EmoteUsage"("userId", "emoteId");

-- AddForeignKey
ALTER TABLE "EmoteUsage" ADD CONSTRAINT "EmoteUsage_emoteId_fkey" FOREIGN KEY ("emoteId") REFERENCES "Emote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
