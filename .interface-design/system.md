# vaarattu.tv interface patterns

Preserve the established dark community interface: Geist, gray950 canvas,
gray900 shell, gray800 data surfaces, gray700 borders, white primary text,
gray300/400 supporting text and purple selection/link accents. English UI;
generated biographies may be Finnish. No light theme or separate token system.

## Community browsing

- Category-specific routes keep existing deep links. Query parameters are the
  source of truth for period, search and page. Query-only ranking changes use
  Next's documented integrated History API for synchronous state; category
  navigation uses Next Link/router.
- Desktop category links and period buttons expose choices directly. Below 640px,
  native labeled selectors reduce the control stack. Controls have 44px minimum
  height, visible focus, explicit selected state and familiar keyboard behavior.
- Ranking tables prioritize rank, viewer identity and an aligned exact value.
  Supporting login distinguishes similar display names. Tabular numbers keep
  values steady. On phones, omit decorative avatars and allow names to wrap.
- Use 4px spacing increments, 16px body, 30px primary heading and compact rows.
  Skeletons preserve the results area during loading. Errors keep controls and
  offer retry; empty searches offer clear recovery. No decorative page motion.
- Long biographies, names and statistics must reflow at 320px and 200% root text.
  Footer links wrap rather than expanding the document.

These patterns describe the implemented community surfaces; they do not mandate
rewriting already working recording, clip or history interfaces.
