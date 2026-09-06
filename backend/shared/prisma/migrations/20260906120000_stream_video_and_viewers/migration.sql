ALTER TABLE "Stream" ADD COLUMN "twitchVideoId" TEXT;
CREATE UNIQUE INDEX "Stream_twitchVideoId_key" ON "Stream"("twitchVideoId");

CREATE TABLE "StreamViewerSample" (
    "id" SERIAL NOT NULL,
    "streamId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "viewerCount" INTEGER NOT NULL,
    CONSTRAINT "StreamViewerSample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StreamViewerSample_streamId_timestamp_key" ON "StreamViewerSample"("streamId", "timestamp");
ALTER TABLE "StreamViewerSample" ADD CONSTRAINT "StreamViewerSample_streamId_fkey"
    FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
