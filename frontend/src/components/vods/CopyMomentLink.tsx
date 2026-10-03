"use client";

import { useState } from "react";
import { formatStreamTime } from "@/lib/vods";

export function CopyMomentLink({ href, seconds }: { href: string; seconds: number }) {
  const [feedback, setFeedback] = useState<{ message: string; link?: string }>();
  return <div>
    <button type="button" className="min-h-11 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700" onClick={async () => {
      const link = new URL(href, window.location.origin).href;
      try {
        await navigator.clipboard.writeText(link);
        setFeedback({ message: `Copied link to ${formatStreamTime(seconds)}.` });
      } catch { setFeedback({ message: "Copy the moment link below.", link }); }
    }}>Copy moment link</button>
    {feedback && <p role="status" className="mt-2 text-sm text-gray-300">{feedback.message}</p>}
    {feedback?.link && <input aria-label="Moment link" readOnly value={feedback.link} onFocus={event => event.target.select()} className="mt-2 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white" />}
  </div>;
}
