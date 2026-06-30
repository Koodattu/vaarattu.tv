-- CreateTable
CREATE TABLE "SubscriptionGift" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "amount" INTEGER NOT NULL,
    "cumulativeAmount" INTEGER,
    "tier" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cheer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "bits" INTEGER NOT NULL,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cheer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionGift_userId_idx" ON "SubscriptionGift"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionGift_timestamp_idx" ON "SubscriptionGift"("timestamp");

-- CreateIndex
CREATE INDEX "SubscriptionGift_userId_timestamp_idx" ON "SubscriptionGift"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Cheer_userId_idx" ON "Cheer"("userId");

-- CreateIndex
CREATE INDEX "Cheer_timestamp_idx" ON "Cheer"("timestamp");

-- CreateIndex
CREATE INDEX "Cheer_userId_timestamp_idx" ON "Cheer"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "SubscriptionGift" ADD CONSTRAINT "SubscriptionGift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
