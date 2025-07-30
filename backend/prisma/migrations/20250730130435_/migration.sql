/*
  Warnings:

  - You are about to drop the column `changedAt` on the `NameHistory` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `User` table. All the data in the column will be lost.
  - Added the required column `detectedAt` to the `NameHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NameHistory" DROP COLUMN "changedAt",
ADD COLUMN     "detectedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastSeen";

-- AlterTable
ALTER TABLE "ViewerProfile" ADD COLUMN     "lastSeen" TIMESTAMP(3);
