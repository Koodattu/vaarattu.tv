/*
  Warnings:

  - You are about to drop the column `title` on the `Stream` table. All the data in the column will be lost.
  - You are about to drop the `_StreamGames` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_StreamGames" DROP CONSTRAINT "_StreamGames_A_fkey";

-- DropForeignKey
ALTER TABLE "_StreamGames" DROP CONSTRAINT "_StreamGames_B_fkey";

-- AlterTable
ALTER TABLE "Stream" DROP COLUMN "title";

-- DropTable
DROP TABLE "_StreamGames";

-- CreateTable
CREATE TABLE "StreamSegment" (
    "id" SERIAL NOT NULL,
    "streamId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "StreamSegment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StreamSegment" ADD CONSTRAINT "StreamSegment_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamSegment" ADD CONSTRAINT "StreamSegment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
