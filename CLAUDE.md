# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Web/Capacitor port of the React Native app in `../BotManager`: a client for **Automation Anywhere Community Edition** Control Rooms that lists bots, deploys them to a user's device, and shows in-progress activities, execution history and device status. Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 (`@tailwindcss/vite`, no config file) + Capacitor 8 (Android only).

## Commands

```bash
npm run dev          # Vite dev server (browser); Control Room calls go through the Vite proxy
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + build to dist/
npx cap sync android # copy dist/ into the Android project (run after every build)
npx cap run android  # install on a device/emulator (needs JDK + Android SDK)
npx cap open android # open in Android Studio
npm run android      # build + sync + run
```

There are no tests.

## Configuration

`.env` (git-ignored, see `.env.example`) uses the `VITE_` prefix. `src/env.ts` re-exports the values under the old react-native-dotenv names, and `vite.config.ts`/`tsconfig.json` alias `@env` to it, so code ported from the RN app keeps `import { X } from '@env'`. Values are inlined into the bundle at build time.

## Architecture

- **Networking / CORS.** The Control Rooms send no CORS headers. In the browser dev server, `env.ts` points `AA_COMMUNITY_URL`/`AA_COMMUNITY2_URL` at `${origin}/aa1/` and `/aa2/`, which `vite.config.ts` proxies to the real hosts. On Android, `CapacitorHttp` (enabled in `capacitor.config.json`) patches XHR/fetch to run natively, so the real URLs are used. A plain `vite preview`/static deploy in a browser has neither and will fail on CORS.
- **`src/Functions.ts`** — the whole API layer (axios, AA `v2`/`v3` REST). Mostly unchanged from the RN app, with three fixes:
  - a request interceptor sets `baseURL` per request from `_userEmail` (most calls use relative URLs, and the global `axios.defaults.baseURL` is overwritten whenever another user's token is fetched);
  - `getToken` shares an in-flight login per user (a new login invalidates the user's previous token);
  - the 401/403 retry interceptor reuses a token already refreshed by another request instead of logging in again.
  Every request must pass `_userEmail` in its config (typed in `src/types/axios.d.ts`). Users map to Control Rooms in `getBaseURLByUsername`; adding a user also means `.env`, `src/env.ts`, `src/vite-env.d.ts` and `src/constants/users.ts`.
- **`src/hooks/`, `src/utils/`, `src/constants/`, `src/types/`** — copied from the RN app; screen-level state hooks. `useBotExecution.executeBot` is the deploy pipeline (token → device `CONNECTED` → `checkBotExists` → userId → `deployBot`). `utils/botVariables.ts` holds the pure helpers for `BotVariablesModal` (DATETIME is sent as `YYYY-MM-DDTHH:mm:00-03:00[America/Argentina/Buenos_Aires]`).
- **Navigation** — `navigation/DrawerNavigator.tsx` replaces react-navigation: a state-driven drawer that mounts one screen at a time, so leaving a screen unmounts it (this replaces `useFocusEffect`; polling intervals live in plain `useEffect`s). The drawer context lives in `navigation/drawerContext.ts` to avoid an import cycle with `Header`.
- **Android back button** — `navigation/backHandler.ts` replaces RN's `BackHandler`: `useBackHandler(handler, enabled)` pushes onto a stack (latest first); `installBackButton()` wires `@capacitor/app`'s `backButton` and falls back to "press back again to exit". Open `Modal`s register themselves, so back closes the top modal.
- **Design system ("industrial control panel")** — tokens live in `@theme` in `src/index.css`: `enamel` (page), `panel` (surfaces), `ink`/`ink-soft`/`steel` (text), `line`, `signal` (yellow, reserved for launching a bot), and lamp colors `go`/`stop`/`amber`. Fonts: Barlow (body) and Barlow Condensed (`font-display`, titles), bundled via `@fontsource`. Lists are one `panel` with `divide-y` rows, left-aligned, lucide icons (no emojis); account/device/run state is an indicator `Lamp` always paired with a text label. `.push-button` (yellow, dark bezel) is the one bold element.
- **UI primitives** — `components/ui.tsx`: `Modal` is a native `<dialog>` opened with `showModal()` (variants `sheet` = bottom sheet, `center`, `page`); React controls visibility and `cancel`/`close`/light-dismiss route through `onRequestClose` (`dismissible={false}` blocks them). Mark the initial control with `data-autofocus`, not `autoFocus` (React's focus runs before `showModal()`). Don't lock body scroll or add `role="dialog"`/focus traps. `Switch` is `<input type="checkbox" switch>`; `main.tsx` loads the polyfill vendored in `public/vendor/input-switch-polyfill/` with a script tag (Vite won't `import()` from `public/`). Also `Sheet`, `Lamp`, `ProgressBar`, `RefreshButton`, `LoadingState`, `ErrorState`, `buttonStyles`.
- **Motion** — GSAP via `src/lib/motion.ts` (registers `useGSAP`; wrap every duration/offset in `motionDuration()` so reduced motion drops movement). Used for dialog enter/exit, the drawer, progress bars, the launching gears and `useListEntrance` (row stagger once per data set/folder/page, not per poll). Don't reintroduce a global `animation-duration: 0.01ms` reduced-motion rule; handle it per animation. GSAP positions the drawer with `xPercent`, so don't add Tailwind `translate` classes there (they stack).
- `main.tsx` deliberately does not use `StrictMode`: its double-run effects fire duplicate logins (which invalidate tokens) and double polling.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
