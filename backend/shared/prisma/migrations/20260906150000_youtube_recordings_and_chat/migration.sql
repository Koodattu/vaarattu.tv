ALTER TABLE "Stream"
  ADD COLUMN "twitchVideoAvailable" BOOLEAN,
  ADD COLUMN "twitchVideoCheckedAt" TIMESTAMP(3),
  ADD COLUMN "youtubeMatchLocked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "YouTubeVideo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "streamId" INTEGER,
  "position" INTEGER,
  "streamOffsetSeconds" INTEGER NOT NULL DEFAULT 0,
  "matchSource" TEXT NOT NULL DEFAULT 'unmatched',
  "matchScore" DOUBLE PRECISION,
  CONSTRAINT "YouTubeVideo_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "YouTubeVideo_duration_check" CHECK ("durationSeconds" >= 0),
  CONSTRAINT "YouTubeVideo_offset_check" CHECK ("streamOffsetSeconds" >= 0),
  CONSTRAINT "YouTubeVideo_assignment_check" CHECK (("streamId" IS NULL AND "position" IS NULL) OR ("streamId" IS NOT NULL AND "position" > 0))
);
CREATE UNIQUE INDEX "YouTubeVideo_streamId_position_key" ON "YouTubeVideo"("streamId", "position");
CREATE INDEX "YouTubeVideo_channelId_idx" ON "YouTubeVideo"("channelId");
CREATE INDEX "Message_streamId_timestamp_id_idx" ON "Message"("streamId", "timestamp", "id");
