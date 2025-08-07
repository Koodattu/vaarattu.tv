-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitchProfile" (
    "userId" INTEGER NOT NULL,
    "isFollowing" BOOLEAN NOT NULL DEFAULT false,
    "followedSince" TIMESTAMP(3),
    "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" TEXT,
    "subscriptionMonths" INTEGER NOT NULL DEFAULT 0,
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitchProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "userId" INTEGER NOT NULL,
    "badgeId" INTEGER NOT NULL,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("userId","badgeId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "streamId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelReward" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "imageUrl" TEXT,
    "backgroundColor" TEXT,

    CONSTRAINT "ChannelReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "streamId" INTEGER NOT NULL,
    "rewardId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "customText" TEXT,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "thumbnailUrl" TEXT,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamSegment" (
    "id" SERIAL NOT NULL,
    "streamId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "StreamSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boxArtUrl" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "EmoteUsage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emoteId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EmoteUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "streamId" INTEGER NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL,
    "sessionEnd" TIMESTAMP(3),

    CONSTRAINT "ViewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerProfile" (
    "userId" INTEGER NOT NULL,
    "aiSummary" TEXT,
    "aiSummaryLastUpdate" TIMESTAMP(3),
    "aiSummaryGeneratedAtMessages" INTEGER NOT NULL DEFAULT 0,
    "consent" BOOLEAN NOT NULL DEFAULT true,
    "totalWatchTime" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalRedemptions" INTEGER NOT NULL DEFAULT 0,
    "totalPointsSpent" INTEGER NOT NULL DEFAULT 0,
    "averageSessionTime" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3),

    CONSTRAINT "ViewerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NameHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "previousName" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerProfileTopEmote" (
    "id" SERIAL NOT NULL,
    "viewerProfileId" INTEGER NOT NULL,
    "emoteId" INTEGER NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "ViewerProfileTopEmote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerProfileTopGame" (
    "id" SERIAL NOT NULL,
    "viewerProfileId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "ViewerProfileTopGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerProfileTopReward" (
    "id" SERIAL NOT NULL,
    "viewerProfileId" INTEGER NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "totalPointsSpent" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "ViewerProfileTopReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_twitchId_key" ON "User"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_twitchId_key" ON "Badge"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_setId_version_key" ON "Badge"("setId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Message_twitchId_key" ON "Message"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelReward_twitchId_key" ON "ChannelReward"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_twitchId_key" ON "Redemption"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "Stream_twitchId_key" ON "Stream"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_twitchId_key" ON "Game"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "Emote_name_platform_key" ON "Emote"("name", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Emote_platform_emoteId_key" ON "Emote"("platform", "emoteId");

-- CreateIndex
CREATE UNIQUE INDEX "EmoteUsage_userId_emoteId_key" ON "EmoteUsage"("userId", "emoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerProfileTopEmote_viewerProfileId_rank_key" ON "ViewerProfileTopEmote"("viewerProfileId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerProfileTopEmote_viewerProfileId_emoteId_key" ON "ViewerProfileTopEmote"("viewerProfileId", "emoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerProfileTopGame_viewerProfileId_rank_key" ON "ViewerProfileTopGame"("viewerProfileId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerProfileTopGame_viewerProfileId_gameId_key" ON "ViewerProfileTopGame"("viewerProfileId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerProfileTopReward_viewerProfileId_rank_key" ON "ViewerProfileTopReward"("viewerProfileId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerProfileTopReward_viewerProfileId_rewardId_key" ON "ViewerProfileTopReward"("viewerProfileId", "rewardId");

-- AddForeignKey
ALTER TABLE "TwitchProfile" ADD CONSTRAINT "TwitchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TwitchProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChannelReward"("twitchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamSegment" ADD CONSTRAINT "StreamSegment_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamSegment" ADD CONSTRAINT "StreamSegment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmoteUsage" ADD CONSTRAINT "EmoteUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmoteUsage" ADD CONSTRAINT "EmoteUsage_emoteId_fkey" FOREIGN KEY ("emoteId") REFERENCES "Emote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewSession" ADD CONSTRAINT "ViewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewSession" ADD CONSTRAINT "ViewSession_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfile" ADD CONSTRAINT "ViewerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameHistory" ADD CONSTRAINT "NameHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfileTopEmote" ADD CONSTRAINT "ViewerProfileTopEmote_viewerProfileId_fkey" FOREIGN KEY ("viewerProfileId") REFERENCES "ViewerProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfileTopEmote" ADD CONSTRAINT "ViewerProfileTopEmote_emoteId_fkey" FOREIGN KEY ("emoteId") REFERENCES "Emote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfileTopGame" ADD CONSTRAINT "ViewerProfileTopGame_viewerProfileId_fkey" FOREIGN KEY ("viewerProfileId") REFERENCES "ViewerProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfileTopGame" ADD CONSTRAINT "ViewerProfileTopGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfileTopReward" ADD CONSTRAINT "ViewerProfileTopReward_viewerProfileId_fkey" FOREIGN KEY ("viewerProfileId") REFERENCES "ViewerProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfileTopReward" ADD CONSTRAINT "ViewerProfileTopReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChannelReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
