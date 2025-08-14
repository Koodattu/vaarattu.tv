"use client";

import { useState } from "react";
import { StreamsList } from "@/components/StreamsList";
import { StreamTimeline } from "@/components/StreamTimeline";

type View = "streams" | "timeline";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("streams");
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);

  const handleStreamSelect = (streamId: number) => {
    setSelectedStreamId(streamId);
    setCurrentView("timeline");
  };

  const handleBackToStreams = () => {
    setCurrentView("streams");
    setSelectedStreamId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto">
        {currentView === "streams" && <StreamsList onStreamSelect={handleStreamSelect} />}

        {currentView === "timeline" && selectedStreamId && <StreamTimeline streamId={selectedStreamId} onBack={handleBackToStreams} />}
      </div>
    </div>
  );
}
