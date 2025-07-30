/*
  Warnings:

  - You are about to drop the column `status` on the `Stream` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Stream" DROP COLUMN "status",
ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boxArtUrl" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StreamGames" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StreamGames_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StreamGames_B_index" ON "_StreamGames"("B");

-- AddForeignKey
ALTER TABLE "_StreamGames" ADD CONSTRAINT "_StreamGames_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StreamGames" ADD CONSTRAINT "_StreamGames_B_fkey" FOREIGN KEY ("B") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
