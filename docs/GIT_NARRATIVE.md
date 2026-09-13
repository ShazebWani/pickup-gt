# Git history and partner coordination narrative

## Commit history summary

As of this writing, `git log` on `main` shows:

```
e16d33a  2026-09-11  Add first devlog entry via scripts/log.sh
a414e49  2026-09-11  Scaffold Pickup GT: Expo app, Express API, and Firestore data model
```

**2 commits, 1 branch (`main`), no tags, no merges yet.** Both commits were made directly on `main` on the same day (2026-09-11), about 10 minutes apart. Both carry a `Co-Authored-By: Claude Sonnet 5` trailer and a `Claude-Session` URL, from the same Claude Code session (`session_01BScSCbngfmzNj6MMwNxy4A`) — see `docs/REFERENCES.md`'s AI disclosure section for what that means in practice.

**Phases so far:**
1. **Scaffold** (`a414e49`) — the entire Phase 1 MVP in one commit: Expo app, Express server, Firestore data model, GitHub issue templates and the initial 13 build-order issues, and the course docs (`README.md`, `docs/setup.md` placeholder, `docs/api.md` placeholder, `docs/devlog.md`, `scripts/log.sh`).
2. **First devlog entry** (`e16d33a`) — a small, separate commit just to log that the scaffold happened, using `scripts/log.sh` itself.

**Not yet committed, as of this writing** (visible in `git status`, not in the log above):
- A UI/navigation polish pass across all 9 screens/components plus a new `app/src/theme.ts` (see `docs/DEBUGGING.md` #2 for the navigation bug it fixed).
- A second `docs/devlog.md` entry recording the `FIREBASE_SERVICE_ACCOUNT` local-dev fix (`docs/DEBUGGING.md` #1).
- `firebase.json` and `firestore.rules` (untracked).
- This documentation set (`docs/SUBMISSION.md`, `docs/REFERENCES.md`, `docs/DEBUGGING.md`, this file, `docs/PARTNER_SETUP.md`) and the `README.md` update.

**Branching and messaging conventions actually used so far:** everything has gone directly to `main` — there is no branching convention yet, because there's been no PR yet. Commit messages so far are multi-sentence, imperative-mood, and describe *what* was implemented and *why* in the body, matching the style requested in `Pickup-GT-PRD.md` §13 ("Descriptive commit messages in imperative mood"). **This will need to change for the partner exchange** — a real PR-based flow (feature branch → PR → review → merge) is the whole point of requirement #4, and hasn't been exercised yet since everything has been solo work directly on `main`.

**Issue tracker state** (from `gh issue list`, see `docs/SUBMISSION.md` for the full picture): 14 issues total, 10 closed (one per completed build-order step), 3 open (`#5` deploy to Render, `#13` docs, `#14` the partner's assigned task), all labeled `task` (plus `#14` also labeled `good first issue`).

---

## Partner coordination narrative

**Everything below is a skeleton — mine to fill in after the exchange actually happens.** Nothing here should be treated as having occurred yet.

### How we found each other and agreed on scope

> [SHAZEB: fill in — who your partner is (first name / role is fine, per the redaction convention used elsewhere in this repo's docs), how you agreed who'd go first, and what you scoped their change to be. If you used issue #14 as-is, say so; if you changed the task, say what and why.]

### How we communicated

> [SHAZEB: fill in — Slack, text, email, in person, GitHub PR comments, etc. If you hit a moment where async communication was too slow and you had to sync up live, that's worth a specific mention — it's exactly the kind of "how we worked together" detail this section exists for.]

### The handoff, your repo to them

> [SHAZEB: fill in — did they clone from `docs/PARTNER_SETUP.md` as written, or did you walk them through it live? What was their starting point (fresh machine, already had Node/Expo, etc.)? Link their PR here once it exists.]

### The handoff, their repo to you

> [SHAZEB: fill in — same questions in reverse. What was their project, what was your assigned task, what branch/PR did you open against their repo? Link it here.]

### What broke during the handoff

> [SHAZEB: fill in — this is likely to be the most valuable section for grading, per the assignment's explicit note that debugging something that didn't go as planned is what separates the most successful submissions. Environment differences (Windows vs. macOS path handling, a missing global tool, a Node version mismatch, a `.env` value that worked on one machine and not the other, an Expo Go version skew) are the most likely candidates here — don't reach for something more dramatic if the real answer is mundane.]

### What I learned about working with someone else's setup

> [SHAZEB: fill in — concretely, not "communication is important." E.g.: did their commit conventions differ from yours? Did their code assume something about the environment that `docs/PARTNER_SETUP.md` didn't cover, and did you go back and fix the doc? Did you find a bug in *their* app while checking it out, the way requirement #4 implies both directions should happen?]

### What I'd do differently

> [SHAZEB: fill in — anything from doc gaps you found the hard way, to timing coordination, to scope you'd have narrowed or widened for their task.]
