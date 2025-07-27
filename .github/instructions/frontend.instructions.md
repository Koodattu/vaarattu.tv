---
applyTo: "**/frontend/**"
---

# Frontend Best Practices

## Stack

- Next.js (App Router, TypeScript)
- React (Function components, hooks)
- Tailwind CSS
- shadcn/ui (component library, works with Tailwind CSS)

## Structure

/components
/pages
/hooks
/styles
/types
/services
/public

## Practices

- **TypeScript strict mode**: No `any`, explicit props, use interfaces/types
- **Components**: Atomic, reusable, single-responsibility, no duplicated logic; prefer shadcn/ui components for common UI patterns when possible
- **Hooks**: Use for all stateful/data logic; custom hooks for API/data fetching
- **API Calls**: Only via `/services` or dedicated API utility hooks; never inline
- **State**: Use React state, context, or Tanstack Query/SWR for async/server state
- **Error Boundaries**: Use for all page trees and major components
- **Routing**: Only Next.js router (app router); no client-side hacks
- **Env Vars**: Only expose with `NEXT_PUBLIC_`; never leak secrets
- **Testing**: React Testing Library/Jest for components, end-to-end where possible
- **Accessibility**: Use semantic HTML, aria-\* as needed, test with keyboard and screen reader
- **Auth**: Use NextAuth.js or custom Twitch OAuth client (identity only)
- **Responsive**: Mobile-first CSS, flex/grid layouts, test at all breakpoints
- **Search**: All search components are debounced, use backend API (never search large data in browser)
- **UI**:
  - Clear loading and error states
  - Skeleton loaders for async data
  - Accessible and keyboard navigable modals/dialogs/forms
- **Linting/Formatting**: Enforced with ESLint + Prettier in CI

## Page/Component Guidelines

- **UI Library**: Use shadcn/ui components together with Tailwind CSS for building accessible, consistent, and modern UIs.

- **Home page**: Embedded stream, status, quick links to leaderboards/clips
- **Leaderboards**: Paginated, sortable, highlight current logged-in user
- **Viewer profiles**: Wikipedia-style left (text, AI-generated), right (table of stats); show emote usage, achievements, ranks
- **Admin pages**: Hidden unless admin, advanced search/filter, logs
- **Clips page**: List all clips, featured clips on frontpage
- **/setup**: List all devices; future: embed interactive 3D models

---
