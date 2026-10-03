CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "broadcasterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "gameId" TEXT,
    "gameName" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "videoId" TEXT,
    "vodOffsetSeconds" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Clip_available_createdAt_id_idx" ON "Clip"("available", "createdAt", "id");
CREATE INDEX "Clip_available_viewCount_createdAt_id_idx" ON "Clip"("available", "viewCount", "createdAt", "id");
