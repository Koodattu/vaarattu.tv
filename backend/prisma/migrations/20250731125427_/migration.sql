-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_rewardId_fkey";

-- AlterTable
ALTER TABLE "Redemption" ALTER COLUMN "rewardId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChannelReward"("twitchId") ON DELETE RESTRICT ON UPDATE CASCADE;
