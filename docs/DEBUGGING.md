# Debugging log

**This file is thin, and that's stated plainly rather than padded.** The project's `git log` currently has only two commits, most of the build happened in Claude Code sessions whose exact back-and-forth isn't preserved verbatim in this repo, and the deploy/partner steps that tend to generate the most debugging stories (requirement #4 and #5) haven't happened yet. What's below is everything that's actually traceable to a commit, `docs/devlog.md`, or a session transcript. **This file should grow** as the Render deployment and partner exchange happen — those are exactly the steps most likely to produce real "it didn't go as planned" stories, per the assignment's own framing.

---

## 1. Server crashed on boot: `FIREBASE_SERVICE_ACCOUNT` was shell-command text, not JSON

**What happened.** After the initial scaffold, the Express server failed to start locally. `docs/setup.md` §4 instructs setting `FIREBASE_SERVICE_ACCOUNT` in `server/.env` to the *output* of a Node command that reads and minifies the downloaded service-account JSON file. `server/.env` had instead been set to the literal text of that shell command itself (the command, not what it produces) — likely copy-pasted from the setup comment without running it.

**What broke, concretely.** The server's Firebase Admin init (`firebase-admin`'s `credential.cert()` or equivalent, given a string value) calls `JSON.parse()` on `FIREBASE_SERVICE_ACCOUNT`. Given shell-command text instead of JSON, that parse fails and the process can't boot. [SHAZEB: fill in the exact stack trace if you have it — it wasn't captured verbatim, only described after the fact in the devlog entry below.]

**Resolution.** Ran the actual `node -e "console.log(JSON.stringify(require('/path/to/downloaded-key.json')))"` command from `docs/setup.md` §4, and pasted its real output — the minified service-account JSON — into `server/.env`. Logged via:

```bash
./scripts/log.sh "Fixed local dev: server/.env had FIREBASE_SERVICE_ACCOUNT set to the literal shell-command text from the setup comment instead of its JSON output, causing JSON.parse to fail on boot. Replaced with the actual minified service account JSON; server now starts cleanly."
```

(See `docs/devlog.md`, entry timestamped 2026-09-11 02:20 EDT. Note: this devlog entry exists in the working tree but hasn't been committed yet — see `docs/SUBMISSION.md`, "Known gaps.")

**What it taught.** A setup doc that shows a command *and* the env var it feeds is ambiguous about which one is the value — worth making the distinction (`# run this command, then paste its output`) more explicit in `docs/setup.md` so a partner doesn't repeat it. `server/.env` is gitignored, so this specific failure mode is invisible to anyone who hasn't hit it themselves; it only exists as a devlog entry.

---

## 2. Silent navigation bug: `create` and `game/[id]` had no header or back button

**What happened.** Not a crash — a silently missing feature. The root layout (`app/app/_layout.tsx`) rendered `<Slot />` directly instead of an Expo Router `<Stack />`. `(tabs)` and `(auth)` have their own nested navigators (`Tabs`, `Stack`) and so looked fine, but the two top-level routes outside those groups — `/create` and `/game/[id]` — got **no header, no title, and no back button at all**. On iOS the only way back was an edge-swipe gesture with zero visual indication it existed; there was no way back on Android beyond the hardware/gesture back button.

**How it was found.** Not from a bug report — found by reading the routing code directly while doing a general "make the navigation and UI actually good" pass, specifically because `app/app/_layout.tsx` didn't match the pattern used in `(tabs)/_layout.tsx` and `(auth)/_layout.tsx` (both of which correctly use a real navigator).

**What was tried and the resolution.** Rewrote the root layout to use a `Stack` with `(tabs)` and `(auth)` as headerless child screens, `create` as a `presentation: 'modal'` screen with a "Cancel" header button, and `game/[id]` with `headerShown: true` and a dynamically-set title (`navigation.setOptions({ title: game?.spotName })`, set once the game document loads).

**What it taught.** This kind of bug is invisible to `tsc --noEmit` and to a casual glance at any single file in isolation — it only shows up by comparing the root layout's pattern against its siblings, or by actually trying to navigate back from those two screens on a device. It's also evidence that an earlier Claude Code session's scaffold output wasn't reviewed carefully enough for exactly this kind of omission — see `docs/REFERENCES.md`'s AI disclosure section.

---

## 3. `npx expo lint` silently installed dependencies as a side effect

**What happened.** Ran `npx expo lint` to check code style on the polished files. No ESLint config existed yet in `app/`, so Expo's CLI auto-installed `eslint` and `eslint-config-expo` as new `devDependencies`, wrote a new `app/eslint.config.js`, and then still failed:

```
Error: Cannot find module 'eslint'
Require stack:
- .../node_modules/expo/node_modules/@expo/cli/build/src/lint/lintAsync.js
```

**What was tried.** Checked `git status` immediately after the failed command (a habit specifically for anything that wasn't a pure read/grep), which showed `app/package.json` and `app/package-lock.json` modified and a new `app/eslint.config.js` — none of which were intended changes.

**Resolution.** Reverted the unintended changes: `git checkout -- app/package.json app/package-lock.json` and `rm app/eslint.config.js`. Did not re-attempt lint setup, since it wasn't what was being worked on.

**What it taught.** A command that looks read-only from its name ("lint") can still mutate the repo as a side effect of a missing config. Checking `git status` after any command that wasn't obviously a pure read is now a habit worth keeping, not just for destructive commands.

---

## 4. Web export doesn't work: `react-native-maps` breaks the bundle

**What happened.** While trying to visually verify the UI polish pass without a physical device, tried `npx expo start --web` (the app lists `react-native-web` as a dependency and `app.config.js` has a `web` block). The bundle failed at the very first screen with:

```
Server Error
(0 , _reactNativeWebDistIndex.codegenNativeComponent) is not a function
```

**What was tried.** Confirmed this wasn't caused by the polish-pass changes by reasoning through the dependency graph: Metro/webpack bundles the *entire* route tree for a web build regardless of which screen is actually visited first, so `react-native-maps` (used in `map.tsx`, `create.tsx`, and `game/[id].tsx`) breaks the whole bundle even though the very first screen reached (login) doesn't import it.

**Resolution — abandoned, not fixed.** Did not pursue a web build further. `Pickup-GT-PRD.md` explicitly scopes this project to Expo Go only (§2: "the app must run in Expo Go with no custom native build"); web was never a requirement, and `react-native-maps` web support is a known, non-trivial gap in the library rather than something fixable in this codebase. Fell back to two other verification methods instead (see #5 below).

**What it taught.** Knowing when to stop is itself the right call here, not a failure — chasing web support for a library explicitly out of scope would have been effort spent on nothing the assignment or the PRD asked for.

---

## 5. No way to visually run the app on this machine — verified by other means instead

**What happened.** This development machine has Xcode Command Line Tools but not full Xcode, so there's no iOS Simulator:

```
xcrun: error: unable to find utility "simctl", not a developer tool or in PATH
```

and no Android emulator (`emulator: command not found`). Combined with #4 above, there was **no way to visually render the app** in this environment at all during the polish pass.

**What was tried instead.**
- `npx tsc --noEmit` in `app/` — catches broken imports, prop-type mismatches, etc. Passed clean.
- Started Metro (`npx expo start`) and directly requested the compiled iOS bundle over HTTP (`curl http://localhost:<port>/node_modules/expo-router/entry.bundle?platform=ios&dev=true`) rather than through a device. A `200` response with a complete, well-formed bundle (ending in a `sourceMappingURL` comment, ~9.6MB) confirms Metro could resolve and transform every module in the app — including `react-native-maps`, which resolves fine for native platforms, unlike web — with no syntax or resolution errors. An `index.bundle` request without the `expo-router/entry` prefix returned a `404` first, which was itself useful: it showed the entry point Expo Router apps actually need for this kind of check.

**Resolution.** Treated this as "structurally verified, not visually verified" and said so explicitly rather than claiming a screenshot-backed check that didn't happen. Actual visual confirmation still requires a physical phone running Expo Go — see the screenshot placeholder list in `docs/SUBMISSION.md`.

**What it taught.** `tsc` and a forced bundle compile catch a real, useful class of errors (anything that would crash before a single frame renders) but nothing about whether the UI actually looks right, whether a `Pressable` is in the right place, or whether text overflows on a real screen size. They're a floor, not a substitute for running the app.
