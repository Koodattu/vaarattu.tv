# Stream archive and replay

The VOD archive supports literal title/game search, inclusive dates in
Europe/Helsinki, and a **With recording** filter. Results are newest first with
stable ID ordering for equal timestamps. Filters and page live in the URL;
overview, timeline and playback links retain the path back to the archive.
Both the home previews and archive show which recording providers are available.

## API contract

`GET /api/streams` retains `page` and `limit` and accepts these optional filters:

| Parameter | Meaning |
| --- | --- |
| `q` | Case-insensitive substring in any segment title or game, up to 300 characters. SQL wildcard characters are literal text. |
| `from`, `to` | Stream start date in Helsinki, `YYYY-MM-DD`, inclusive. Either bound may be omitted. Both DST transitions are covered. |
| `recording` | `all` (default) or `available`. |

Filters apply before counting and pagination. Malformed filters return 400.
Each stream now includes additive `recordingSources`, containing `twitch`,
`youtube`, both or neither. YouTube availability does not require a thumbnail.
Twitch availability follows the existing detail endpoint's recorded availability,
verification freshness and age rules; it does not guarantee successful embedding.

The separate fuzzy `/api/streams/search` endpoint used to identify recordings
is unchanged. See [its contract](stream-search.md).

## Chapters and shared moments

Chapters use recorded title/game changes. `/vods/:id/watch?t=4200` means 4,200
seconds after **stream start**, not after the beginning of an uploaded part.
The player chooses a recording covering that moment and subtracts its saved
`streamOffsetSeconds`. An optional `source=twitch` or YouTube video ID selects
a particular recording. Source switching retains the current stream time when
the selected source covers it; otherwise it opens that part's beginning.

Gaps and times after the stream show recovery links rather than silently seeking
to zero. Invalid timestamps fall back with a visible explanation. Next-part
autoplay advances the URL, but refreshing a shared URL does not request autoplay.
Copied playback links include the source and stream timestamp, omit private
browsing context, and have a manual-copy fallback. Player errors offer retry and
a provider link at the current position.

## Activity meaning and access

Choose one metric at a time. Captured messages are averaged per minute within
each interval. Active chatters are the largest distinct count in any minute of
the interval. Audience values use the highest Twitch sample, or tracked chat
presence when Twitch samples are absent. Chat presence is not unique viewers.
Missing samples remain gaps; they are not converted to zero. Collection gaps can
still appear as zero captured chat, which the chart explains.

Peak, previous/next, keyboard slider and tap selection all lead to the same
selected interval and replay action. An expandable table exposes exact values.
`metric=messages|viewers|chatters` and `at=<stream seconds>` preserve the view in
shared URLs. Selecting an interval replaces history; changing metrics adds an
entry. These client-only selections use Next's supported native History API so
rapid input cannot race an unnecessary server navigation. Failed refreshes keep
the last successful snapshot, labeled as such, and allow retry.

No dependencies, schema, retention, authentication or deployment settings change.
See [local testing](local-testing.md) for the disposable database, real API and
browser verification workflow.
