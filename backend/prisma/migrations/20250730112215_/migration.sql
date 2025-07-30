/*
  Warnings:

  - The primary key for the `Stream` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_StreamGames` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "_StreamGames" DROP CONSTRAINT "_StreamGames_B_fkey";

-- AlterTable
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Stream_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Stream_id_seq";

-- AlterTable
ALTER TABLE "_StreamGames" DROP CONSTRAINT "_StreamGames_AB_pkey",
ALTER COLUMN "B" SET DATA TYPE TEXT,
ADD CONSTRAINT "_StreamGames_AB_pkey" PRIMARY KEY ("A", "B");

-- AddForeignKey
ALTER TABLE "_StreamGames" ADD CONSTRAINT "_StreamGames_B_fkey" FOREIGN KEY ("B") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
