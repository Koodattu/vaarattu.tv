"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";
import { StreamCard } from "@/components/vods/StreamCard";

export default function VodsPage() {
  return <Suspense fallback={<p role="status" className="p-8 text-gray-300">Loading streams…</p>}><Archive /></Suspense>;
}

function Archive() {
  const params = useSearchParams();
  return <StreamArchive key={params.toString()} />;
}

function StreamArchive() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q")?.slice(0, 300) || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const recording = params.get("recording") === "available" ? "available" : "all";
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1;
  const [queryInput, setQueryInput] = useState(q);
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);
  const [recordingInput, setRecordingInput] = useState(recording === "available");
  const [validation, setValidation] = useState("");
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getStreams(page, 12, { q, from, to, recording }, signal), [page, q, from, to, recording]));
  const streams = response?.data ?? [];
  const filtered = Boolean(q || from || to || recording === "available");
  const total = response?.pagination?.total ?? 0;
  const totalPages = response?.pagination?.totalPages ?? 0;
  const returnTo = `/vods${params.size ? `?${params}` : ""}`;
  const field = "min-h-11 min-w-0 w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-400";
  const button = "min-h-11 rounded-md px-4 py-2 font-medium text-white";
  function navigate(next: URLSearchParams) {
    const href = `/vods${next.size ? `?${next}` : ""}`;
    if (href === returnTo) retry();
    else router.push(href, { scroll: false });
  }
  return <div className="container mx-auto px-4 py-8">
    <header className="mb-6">
      <h1 className="text-3xl font-bold text-white">VODs</h1>
      <p className="mt-2 max-w-2xl text-gray-300">Find a past stream, revisit a game, or jump back into a moment with chat.</p>
    </header>
    <form className="mb-6 space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4" onSubmit={event => {
      event.preventDefault();
      if (fromInput && toInput && fromInput > toInput) { setValidation("Choose an end date on or after the start date."); return; }
      setValidation("");
      const next = new URLSearchParams();
      if (queryInput.trim()) next.set("q", queryInput.trim());
      if (fromInput) next.set("from", fromInput);
      if (toInput) next.set("to", toInput);
      if (recordingInput) next.set("recording", "available");
      navigate(next);
    }}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-[1_1_9rem] text-sm text-gray-300">Search streams
          <input type="search" maxLength={300} placeholder="Stream title or game" value={queryInput} onChange={event => setQueryInput(event.target.value)} className={`${field} mt-2`} />
        </label>
        <button className={`${button} bg-purple-600 hover:bg-purple-700`} type="submit">Search</button>
        {filtered && <button className={`${button} bg-gray-700 hover:bg-gray-600`} type="button" onClick={() => navigate(new URLSearchParams())}>Clear filters</button>}
      </div>
      <details open={Boolean(from || to || recording === "available")}>
        <summary className="w-fit cursor-pointer py-2 text-sm text-gray-300">Filter by date or recording{filtered ? " · Filters active" : ""}</summary>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <label className="min-w-0 flex-[1_1_10rem] text-sm text-gray-300">From
            <input type="date" min="1970-01-01" max="9998-12-31" value={fromInput} onChange={event => setFromInput(event.target.value)} className={`${field} mt-2`} />
          </label>
          <label className="min-w-0 flex-[1_1_10rem] text-sm text-gray-300">To
            <input type="date" min={fromInput || "1970-01-01"} max="9998-12-31" value={toInput} onChange={event => setToInput(event.target.value)} className={`${field} mt-2`} />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-gray-200"><input type="checkbox" className="h-5 w-5 accent-purple-500" checked={recordingInput} onChange={event => setRecordingInput(event.target.checked)} />With recording</label>
        </div>
        <p className="mt-3 text-xs text-gray-400">Stream start dates and times use Europe/Helsinki. Both dates are included.</p>
      </details>
      {validation && <p role="alert" className="text-sm text-amber-300">{validation}</p>}
    </form>
    <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm text-gray-400">
      <p role="status">{loading ? "Finding streams…" : response?.success ? `${total.toLocaleString()} ${total === 1 ? "stream" : "streams"}${filtered ? " found" : " in the archive"}` : "Streams unavailable"}</p>
      <p>Newest first · Times in Helsinki</p>
    </div>
    {response?.error ? <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5">
      <p className="text-red-300">{response.error}</p><button type="button" onClick={retry} className={`${button} mt-3 bg-gray-700 hover:bg-gray-600`}>Try again</button>
    </div> : loading ? <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(index => <div key={index} className="h-48 rounded-lg bg-gray-800" />)}</div>
      : streams.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{streams.map(vod => <StreamCard key={vod.id} vod={vod} returnTo={returnTo} />)}</div>
        : <div className="rounded-lg border border-gray-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">{page > 1 ? "No streams on this page" : filtered ? "No matching streams" : "No streams yet"}</h2>
          <p className="mt-2 text-gray-300">{filtered ? "Try another title, game or date, or clear your filters." : "Streams will appear here as they are recorded."}</p>
          {page > 1 && <button type="button" className={`${button} mt-4 bg-gray-800 hover:bg-gray-700`} onClick={() => { const next = new URLSearchParams(params); next.delete("page"); navigate(next); }}>Return to first page</button>}
        </div>}
    {!loading && response?.success && totalPages > 0 && page <= totalPages && <Pagination page={page} totalPages={totalPages} onPageChange={nextPage => { const next = new URLSearchParams(params); if (nextPage > 1) next.set("page", String(nextPage)); else next.delete("page"); navigate(next); }} />}
  </div>;
}
