"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";
import { ClipCard } from "@/components/clips/ClipCard";
import type { ClipFilters } from "@/types/api";

export default function ClipsPage() {
  return <Suspense fallback={<p role="status" className="p-8 text-gray-300">Loading clips…</p>}><Archive /></Suspense>;
}

function Archive() {
  const params = useSearchParams();
  return <ClipArchive key={params.toString()} />;
}

function ClipArchive() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q")?.slice(0, 300) || "";
  const sort = params.get("sort") === "newest" ? "newest" : "popular";
  const period = params.get("period") === "7d" ? "7d" : params.get("period") === "30d" ? "30d" : "all";
  const featured = params.get("featured") === "true";
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1;
  const [queryInput, setQueryInput] = useState(q);
  const [sortInput, setSortInput] = useState<NonNullable<ClipFilters["sort"]>>(sort);
  const [periodInput, setPeriodInput] = useState<NonNullable<ClipFilters["period"]>>(period);
  const [featuredInput, setFeaturedInput] = useState(featured);
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getClips(page, 12, { q, sort, period, featured }, signal), [page, q, sort, period, featured]));
  const clips = response?.data ?? [];
  const filtered = Boolean(q || period !== "all" || featured);
  const total = response?.pagination?.total ?? 0;
  const totalPages = response?.pagination?.totalPages ?? 0;
  const returnTo = `/clips${params.size ? `?${params}` : ""}`;
  const field = "mt-2 min-h-11 min-w-0 w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-base text-white placeholder:text-gray-400";
  const button = "min-h-11 rounded-md px-4 py-2 font-medium text-white";
  function navigate(next: URLSearchParams) {
    const href = `/clips${next.size ? `?${next}` : ""}`;
    if (href === returnTo) retry();
    else router.push(href, { scroll: false });
  }
  return <div className="container mx-auto px-4 py-8">
    <header className="mb-6">
      <h1 className="text-3xl font-bold text-white">Clips</h1>
      <p className="mt-2 max-w-2xl text-gray-300">The close calls, the great plays, and everything chat wanted to keep.</p>
    </header>
    <form className="mb-6 space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4" onSubmit={event => {
      event.preventDefault();
      const next = new URLSearchParams();
      if (queryInput.trim()) next.set("q", queryInput.trim());
      if (sortInput !== "popular") next.set("sort", sortInput);
      if (periodInput !== "all") next.set("period", periodInput);
      if (featuredInput) next.set("featured", "true");
      navigate(next);
    }}>
      <label className="block text-sm text-gray-300">Search clips
        <input type="search" maxLength={300} placeholder="Clip title, game or clipper" value={queryInput} onChange={event => setQueryInput(event.target.value)} className={field} />
      </label>
      <details open={sort !== "popular" || period !== "all" || featured}>
        <summary className="w-fit cursor-pointer py-2 text-sm text-gray-300">Sort and filters{period !== "all" || featured ? " · Filters active" : ""}</summary>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <label className="min-w-0 flex-[1_1_10rem] text-sm text-gray-300">Sort by
            <select value={sortInput} onChange={event => setSortInput(event.target.value as typeof sortInput)} className={field}><option value="popular">Most viewed</option><option value="newest">Newest first</option></select>
          </label>
          <label className="min-w-0 flex-[1_1_10rem] text-sm text-gray-300">Created
            <select value={periodInput} onChange={event => setPeriodInput(event.target.value as typeof periodInput)} className={field}><option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-gray-200"><input type="checkbox" className="h-5 w-5 accent-purple-500" checked={featuredInput} onChange={event => setFeaturedInput(event.target.checked)} />Featured only</label>
        </div>
      </details>
      <div className="flex flex-wrap gap-3">
        <button className={`${button} bg-purple-600 hover:bg-purple-700`} type="submit">Apply filters</button>
        {(filtered || sort !== "popular") && <button className={`${button} bg-gray-700 hover:bg-gray-600`} type="button" onClick={() => navigate(new URLSearchParams())}>Clear filters</button>}
      </div>
    </form>
    <p role="status" className="mb-4 text-sm text-gray-400">{loading ? "Finding clips…" : response?.success ? `${total.toLocaleString()} ${total === 1 ? "clip" : "clips"}${filtered ? " found" : ""}` : "Clips unavailable"}</p>
    {response?.error ? <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5"><p className="text-red-300">{response.error}</p><button type="button" onClick={retry} className={`${button} mt-3 bg-gray-700 hover:bg-gray-600`}>Try again</button></div>
      : loading ? <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(index => <div key={index} className="h-72 rounded-lg bg-gray-800" />)}</div>
        : clips.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{clips.map((clip, index) => <ClipCard key={clip.id} clip={clip} returnTo={returnTo} eager={index < 3} />)}</div>
          : <div className="rounded-lg border border-gray-700 p-8 text-center">
            <h2 className="text-xl font-semibold text-white">{page > 1 ? "No clips on this page" : filtered ? "No matching clips" : "No clips yet"}</h2>
            <p className="mt-2 text-gray-300">{filtered ? "Try another title, game or clipper, or clear your filters." : "Clips will appear here after the next Twitch refresh."}</p>
            {page > 1 && <button type="button" className={`${button} mt-4 bg-gray-800 hover:bg-gray-700`} onClick={() => { const next = new URLSearchParams(params); next.delete("page"); navigate(next); }}>Return to first page</button>}
          </div>}
    {!loading && response?.success && totalPages > 0 && page <= totalPages && <Pagination page={page} totalPages={totalPages} onPageChange={nextPage => { const next = new URLSearchParams(params); if (nextPage > 1) next.set("page", String(nextPage)); else next.delete("page"); navigate(next); }} />}
  </div>;
}
