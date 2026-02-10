# TidyHome Phase 2 PRD

## Current State Assessment

### What TidyHome does well today
- Solid recurrence engine supporting 5 frequency types with per-date completion tracking
- Clean dual-view UX (Rooms list + 7-day Calendar)
- Thoughtful onboarding wizard that configures rooms by floor plan
- AI-powered schedule generation via Gemini (though uses hardcoded house description, not the user's actual data)
- Local load-balancing algorithm that batches tasks by room to reduce context-switching
- Full auth with Google OAuth and per-user Firestore isolation
- Real-time sync across devices
- Today-focused stats dashboard with progress, effort-by-room, and completion donut

### Key gaps and friction points

| Gap | Impact |
|-----|--------|
| **Single-user households** | Families clean together. No way to share a home or assign tasks. This is the #1 blocker to real-world adoption. |
| **No notifications or reminders** | Users must remember to open the app. No push, email, or in-app nudges. |
| **No historical view** | Only "today's progress" exists. Users can't see if they're getting better or worse over time. `completedDates` is already stored but never surfaced. |
| **No motivation loop** | No streaks, badges, or gamification. Nothing keeps users coming back after the novelty wears off. |
| **AI Optimize is disconnected** | `generateSmartSchedule()` uses hardcoded `INITIAL_TASKS_RAW` and `INITIAL_HOUSE_DESC` from constants, not the user's actual rooms/tasks. The `HouseProfile` type is defined but unused. |
| **No mobile install story** | No PWA manifest, no service worker. Users can't add to home screen or get offline support. |
| **Firestore security rules are wide open** | Still in test mode - any authenticated user could read/write any user's data. |
| **No tests** | Zero test coverage. Risky for the recurrence engine which is the core correctness guarantee. |

---

## Phase 2 Vision

**"From solo chore tracker to the household command center."**

Phase 1 proved the core loop: configure your home, get a schedule, check off tasks daily. Phase 2 turns TidyHome into a shared experience that keeps households accountable through social motivation and smart nudges. The goal is to make TidyHome the app a household *relies on* rather than one a person *tries and forgets*.

**North star metric:** Weekly active households (not users) with >60% task completion rate.

---

## Phase 2 Epics

### Epic 1: Household Sharing & Task Assignment

**Why:** This is the single highest-leverage feature. Cleaning is a household activity - without sharing, the app solves only half the problem.

**User Stories:**
- As a user, I can create a "Household" and invite members via email link so my family shares one task list
- As a household admin, I can assign tasks to specific members so everyone knows their responsibilities
- As a member, I can see "My Tasks" filtered to just what's assigned to me so I'm not overwhelmed
- As a member, I can see what others have completed today so we stay coordinated
- Calendar view shows avatar icons on tasks indicating assignment

**Data model changes:**
- New `Household` entity: `{ id, name, memberUids[], adminUid, inviteCode }`
- `Task` gains `assignedTo?: string` (uid)
- Firestore path changes: `households/{householdId}/tasks/{taskId}`

**Rough scope:** Large (2-3 weeks). Touches auth flow, data model, Firestore rules, most UI components.

---

### Epic 2: Streaks, Stats & Motivation

**Why:** Retention. The completion data is already in `completedDates` but completely hidden. Surfacing it creates an intrinsic motivation loop.

**User Stories:**
- As a user, I can see my current streak (consecutive days with >80% completion) on the dashboard
- As a user, I can view a weekly/monthly heatmap of my completion history (think GitHub contribution graph)
- As a user, I can see a "Weekly Report" summary: total time cleaned, completion %, most/least completed rooms
- As a household member, I can see a leaderboard of household completion rates (opt-in, to avoid toxicity)

**Implementation notes:**
- All data already exists in `completedDates[]` - this is primarily a UI/analytics feature
- Add a new `StatsView` replacing the current `StatsOverview` with historical depth
- Streak calculation is a pure function over `completedDates` across all tasks

**Rough scope:** Medium (1 week). Mostly new UI components + pure utility functions.

---

### Epic 3: Smart Notifications & Reminders

**Why:** Without prompts, users forget. Push notifications are the standard engagement lever for daily-habit apps.

**User Stories:**
- As a user, I can set a daily reminder time (e.g., "Remind me at 9am") to start my cleaning tasks
- As a user, I get a push notification at my chosen time with today's task count and estimated time
- As a user, I get an evening "wrap-up" nudge if I have uncompleted tasks after 7pm
- As a household admin, I can enable/disable notifications for the whole household

**Implementation:**
- Add PWA manifest + service worker (this also enables "Add to Home Screen")
- Use the Web Push API with Firebase Cloud Messaging (FCM)
- New `NotificationPreferences` in user settings

**Rough scope:** Medium-Large (1-2 weeks). Requires service worker, FCM setup, and a minimal Cloud Function for scheduled sends.

---

### Epic 4: PWA & Offline Support

**Why:** TidyHome is used while walking around a house - mobile is the primary context. PWA gives native-app feel without app store friction.

**User Stories:**
- As a user, I can install TidyHome to my phone's home screen
- As a user, I can check off tasks even without internet and they sync when I'm back online
- As a user, the app loads instantly from cache on repeat visits

**Implementation:**
- Vite PWA plugin (`vite-plugin-pwa`) for manifest + service worker generation
- Firestore already has offline persistence - just needs to be enabled (`enablePersistence()`)
- App shell caching strategy for static assets

**Rough scope:** Small-Medium (3-5 days). Mostly configuration, not new features.

---

### Epic 5: Personalized AI (Fix the Gemini Integration)

**Why:** The current "AI Optimize" button uses hardcoded constants instead of the user's actual data. The `HouseProfile` type exists but is unused. This is a quick win to make the AI feature actually useful.

**User Stories:**
- As a user, the AI Optimize feature analyzes *my actual rooms and tasks* not a hardcoded template
- As a user, I can tell the AI about my household context (kids, pets, allergies, square footage) via a profile form
- As a user, the AI suggests new tasks I might be missing based on my room types (e.g., "You have a kitchen but no 'clean oven' task - want to add it?")

**Implementation:**
- Wire up `HouseProfile` to a settings form and persist to Firestore
- Change `generateSmartSchedule()` to accept the user's actual task list and house profile as inputs
- Add a "suggest missing tasks" mode that compares user tasks against the catalog

**Rough scope:** Small (2-3 days). The plumbing exists, just needs wiring.

---

### Epic 6: Production Hardening

**Why:** Non-negotiable before any public launch. Security rules are wide open, there are no tests, and no error boundaries.

**User Stories (technical):**
- Firestore security rules enforce user-scoped read/write (and household-scoped in Epic 1)
- Core recurrence engine has unit test coverage (>90%)
- Scheduler has unit test coverage
- React error boundaries prevent white-screen crashes
- Environment variables are validated at startup
- Rate limiting on Gemini API calls

**Rough scope:** Medium (1 week). Mostly security rules + test authoring.

---

## Recommended Priority Order

| Priority | Epic | Rationale |
|----------|------|-----------|
| **P0** | Epic 6: Production Hardening | Security is broken. Fix before anything else. |
| **P0** | Epic 4: PWA & Offline | Low effort, high impact on daily usability. Unlocks Epic 3. |
| **P1** | Epic 5: Fix AI Integration | Quick win. Makes an existing button actually work properly. |
| **P1** | Epic 2: Streaks & Stats | Data already exists. High retention impact for moderate effort. |
| **P2** | Epic 1: Household Sharing | Highest-leverage feature but also highest complexity. Do after the foundation is solid. |
| **P2** | Epic 3: Notifications | Depends on PWA (Epic 4). Implement after household sharing so notifications can be household-aware. |

---

## Success Metrics

| Metric | Current | Phase 2 Target |
|--------|---------|----------------|
| 7-day retention | Unknown (no analytics) | >40% |
| Daily completion rate | Tracked but not surfaced | >60% avg across active users |
| Household size | 1 (single-user only) | 2.5 avg members per household |
| PWA installs | N/A | >30% of signups |
| Notification opt-in | N/A | >50% of active users |

---

## Out of Scope for Phase 2
- Native iOS/Android apps (PWA covers mobile)
- Supply/inventory tracking
- Integration with smart home devices
- Paid tier / monetization
- Custom recurrence patterns (e.g., "every 3 days")
