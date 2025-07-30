-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "twitchId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "lastSeen" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelReward" (
    "id" TEXT NOT NULL,
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
    "userId" INTEGER NOT NULL,
    "rewardId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "customText" TEXT,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" SERIAL NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerProfile" (
    "userId" INTEGER NOT NULL,
    "aiSummary" TEXT,
    "lastUpdate" TIMESTAMP(3),
    "stats" JSONB,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "achievements" JSONB,

    CONSTRAINT "ViewerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "EmoteUsage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emote" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmoteUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL,
    "sessionEnd" TIMESTAMP(3),

    CONSTRAINT "ViewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "previousName" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "modelUrl" TEXT,

    CONSTRAINT "SetupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_twitchId_key" ON "User"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChannelReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerProfile" ADD CONSTRAINT "ViewerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmoteUsage" ADD CONSTRAINT "EmoteUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewSession" ADD CONSTRAINT "ViewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameHistory" ADD CONSTRAINT "NameHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
