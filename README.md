# 🚀 DSA Tracker — Nakama Voyage

A **Neo-Brutalist** single-page web app for tracking DSA (Data Structures & Algorithms) progress, built with pure Vanilla JavaScript, HTML5, and CSS3 — no build tools required.

---

## 📁 Project Structure

```
dsa-tracker/
├── index.html              # SPA skeleton — all UI sections, forms, modals, tables
├── script.js               # Core app engine — state, API sync, rendering, notifications
├── style.css               # Neo-Brutalist design system — layout, themes, responsiveness
├── questions.js            # Curated 75-question curriculum, topics, schedule, aliases
├── leetcode_mapping.js     # 3,614+ LeetCode problem name → number lookup dictionary
├── sw.js                   # Service Worker — push notifications & reminder delivery
└── .env.example            # Environment variable template (API URLs, VAPID key)
```

### Dependency Flow

```
index.html
  ├── style.css              (stylesheet)
  ├── leetcode_mapping.js    (loaded 1st — declares global `leetcodeMap`)
  ├── questions.js           (loaded 2nd — declares curriculum & aliases)
  └── script.js              (loaded 3rd — consumes all above, registers sw.js)
        └── sw.js            (Service Worker for push notifications)
        └── Google Apps Script Web App (POST/GET backend via Google Sheets)
```

---

## 🗺️ Feature → Code Location Map

Use this section to quickly find **where the logic lives** for any feature.

---

### 1. 📚 Question & Curriculum Management

> Curated curriculum of 75 DSA questions, category classification, daily auto-release schedule, pause windows, and typo alias resolution.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Topic classification map (10 categories) | `questions.js` | `questionTopicMap` | L7–103 |
| All 75 curated questions | `questions.js` | `allQuestions` | L125–202 |
| Daily release scheduler (1 question/day) | `questions.js` | `appendDailyQuestions()` | L252–285 |
| Pause window dates | `questions.js` | `PAUSE_START_DATE`, `PAUSE_END_DATE` | L247–250 |
| Question name normalizer | `questions.js` | `getQuestionName()`, `getQuestionTopic()` | L109–123 |
| Typo / alias correction map | `questions.js` | `questionAliases` | L295–328 |
| LeetCode name → number lookup (3,614+ entries) | `leetcode_mapping.js` | `leetcodeMap` | L2–3615 |

---

### 2. 📝 Submission Handling & Backend Sync

> Form validation, Google Apps Script POST, optimistic UI updates, localStorage timestamp persistence, and dual background refresh (4s & 10s).

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Form validation & POST submission | `script.js` | `submitData()` | L232–313 |
| Fetch live data from Google Sheets | `script.js` | `loadSubmissions()` | L319–353 |
| Status banner (success/error/loading) | `script.js` | `showStatus()` | L1383–1389 |
| Clear & reset form | `script.js` | `clearForm()` | L1395–1404 |
| Submission form HTML | `index.html` | `#formSection` | L316–379 |
| Form styling | `style.css` | `.formCard`, `.field`, `button` | L514–702 |

---

### 3. 🔄 Core Data Aggregation & Rendering

> Merges remote + local data, resolves aliases/numbers, computes per-profile stats, and dispatches all child renderers.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Master aggregation + render dispatcher | `script.js` | `processAndRenderAll()` | L360–528 |
| Reverse LeetCode number lookup | `script.js` | `lcNumToName` (built inside `processAndRenderAll`) | L365–371 |
| Alias & number resolution | `script.js` | Inside `processAndRenderAll` | L420–438 |
| LocalStorage timestamp merge | `script.js` | Inside `processAndRenderAll` | L459–480 |

---

### 4. 📊 Personal Progress & Statistics

> Total solved, difficulty breakdown (Easy/Medium/Hard), streak badges, and completion rate.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Progress stats computation & DOM update | `script.js` | `renderMyProgress()` | L534–606 |
| Stats UI (stat cards, streak grid) | `index.html` | `#progressSection` | L204–312 |
| Stats card styling | `style.css` | `.myProgressCard`, `.statsGrid`, `.streakGrid` | L1240–1432 |

---

### 5. 🔥 Streak Calculation Engine

> Current streak, longest streak, and baseline date logic.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Streak algorithm (current + longest) | `script.js` | `calculateStreaks()` | L172–226 |
| Streak baseline date | `script.js` | `STREAK_BASELINE_DATE` | L166 |

---

### 6. 🕐 Date & Timestamp Recovery

> Fixes Google Sheets 1899 timestamp serialization bugs, computes running max days, and formats relative time.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Running max day tracker | `script.js` | `computeRunningMaxDays()` | L61–69 |
| Timestamp parser (Sheets bug fix) | `script.js` | `parseSubmissionTimestamp()` | L77–116 |
| Human-readable time formatter | `script.js` | `formatSubmissionTime()` | L125–152 |
| Date string helper | `script.js` | `toLocalDateString()` | L157–163 |

---

### 7. 👥 Profile Management & Multi-User Switching

> Create profiles, persist in localStorage, sync dropdowns, and switch active profile.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Read custom profiles from localStorage | `script.js` | `getCustomProfiles()` | L33–40 |
| Save custom profiles | `script.js` | `saveCustomProfiles()` | L42–48 |
| Switch active profile | `script.js` | `onProfileSelected()` | L608–636 |
| Add new profile (browser prompt) | `script.js` | `promptAddNewProfile()` | L638–673 |
| Sync sidebar + section dropdowns | `script.js` | `syncProfileDropdowns()` | L675–681 |
| Sidebar profile switcher HTML | `index.html` | `#sidebarProfileSwitcher` | L44–63 |
| Profile switcher styling | `style.css` | `.sidebarProfileSwitcher` | L201–316 |

---

### 8. 🎯 Weak Areas Analysis & Topic Proficiency

> Per-topic completion %, 4-tier rating (Weak / Needs Improvement / Average / Strong), graphical + ASCII progress bars.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Weak areas computation & rendering | `script.js` | `renderWeakAreas()` | L695–880 |
| Show/hide all topics toggle | `script.js` | `toggleAllTopics()` | L690–693 |
| Weak areas card HTML | `index.html` | `#weakAreasCard` | L383–425 |
| Weak areas styling (chips, bars, cards) | `style.css` | `.weakAreasCard`, `.topicCard`, `.progressBarFill` | L1434–1723 |

---

### 9. 🟩 Activity Heatmap (GitHub-Style Grid)

> 15-week contribution grid, 4 heat intensity levels, current day highlight, floating tooltip.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Heatmap grid generation & rendering | `script.js` | `renderActivityHeatmap()` | L886–999 |
| Tooltip positioning | `script.js` | `updateTooltipPos()` | L1001–1006 |
| Heatmap HTML container | `index.html` | `#heatmapSection` | L429–497 |
| Heatmap styling (grid, cells, legend) | `style.css` | `.heatmapCard`, `.heatmapGrid`, `.heatCell`, `.heatLevel0–3` | L1725–1869 |

---

### 10. 🏆 Team Leaderboard & Missed Questions

> Ranked table sorted by solved count, top-3 medals, expandable missed-question lists, row-click profile switch.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Leaderboard rendering & sorting | `script.js` | `renderTeamProgress()` | L1012–1122 |
| Leaderboard table HTML | `index.html` | `#teamSection` | L553–603 |
| Table styling (ranks, hover, active row) | `style.css` | `.recent`, `table`, `.rank1–3`, `.activeRow` | L704–834 |

---

### 11. 🔔 Push Notifications & Reminders

> Service Worker lifecycle, VAPID push subscription, daily reminder check, streak-at-risk warnings.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Service Worker registration | `script.js` | `registerServiceWorker()` | L1167–1180 |
| Toggle push subscription (VAPID) | `script.js` | `toggleNotificationSubscription()` | L1232–1281 |
| Daily reminder check logic | `script.js` | `checkDailyReminder()` | L1325–1366 |
| Dispatch notification (SW + fallback) | `script.js` | `dispatchNotification()` | L1305–1323 |
| Test notification trigger | `script.js` | `triggerTestNotification()` | L1289–1303 |
| Reminder time change handler | `script.js` | `onReminderTimeChanged()` | L1283–1287 |
| Reminder preference read/write | `script.js` | `getReminderPreference()`, `saveReminderPreference()` | L1182–1196 |
| Reminder UI state sync | `script.js` | `updateReminderUI()` | L1198–1230 |
| VAPID key converter | `script.js` | `urlB64ToUint8Array()` | L1368–1377 |
| SW install / activate / push / click | `sw.js` | Event listeners | L1–75 |
| Reminder card HTML | `index.html` | `#reminderSection` | L501–549 |
| Reminder styling | `style.css` | `.reminderCard`, `.reminderBtn` | L1871–1983 |

---

### 12. 🎨 Neo-Brutalist Theme & Design System

> High-contrast borders, hard drop shadows, vibrant pastel colors, floating animations, custom scrollbars.

| What | File | Key Identifiers | Lines |
|------|------|-----------------|-------|
| Global reset & typography | `style.css` | `*`, `html`, `body`, `Space Grotesk` | L1–36 |
| Core layout (flex grid) | `style.css` | `.appLayout`, `.mainContent` | L38–70 |
| Sidebar (sticky nav) | `style.css` | `.sidebarNav`, `.sidebarLink` | L72–200 |
| Card & stat box system | `style.css` | `.card`, `.blue`, `.pink`, `.yellow` | L391–470 |
| Float animation keyframes | `style.css` | `@keyframes float` | L935–984 |
| Custom scrollbar | `style.css` | `::-webkit-scrollbar` | L836–870 |
| Responsive breakpoints | `style.css` | `@media` queries | L474–512, L874–933, L1988–2095 |

---

### 13. ✨ Interactive UI Polish

> ScrollSpy for sidebar, dynamic greeting, rotating input placeholders.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Sidebar ScrollSpy | `script.js` | `initSidebarScrollSpy()` | L1445–1489 |
| Rotating placeholder text | `script.js` | `placeholders` + `setInterval` | L1410–1426 |
| Time-of-day greeting | `script.js` | Greeting logic in bootstrap | L1432–1439 |

---

### 14. 🎯 Dashboard Meta & Today's Challenge

> Day badge updates, today's target problem display, challenge start date.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Dashboard meta updater | `script.js` | `updateDashboardMeta()` | L1128–1161 |
| Challenge start date | `script.js` | `CHALLENGE_START_DATE` | L55 |
| Hero section HTML | `index.html` | `#heroSection` | L151–169 |
| Challenge card HTML | `index.html` | `#challengeSection` | L173–200 |

---

### 15. ⚙️ Configuration & Environment

> API endpoints, Google Sheets URL, VAPID key.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Config constants | `script.js` | `WEB_APP_URL`, `SHEET_URL`, `VAPID_PUBLIC_KEY` | L5–7 |
| Config → DOM binding | `script.js` | `updateConfigBindings()` | L9–14 |
| Env variable template | `.env.example` | `WEB_APP_URL`, `SHEET_URL`, `VAPID_PUBLIC_KEY` | L1–9 |

---

### 16. 🚀 App Bootstrap

> Load event initialization — fetches data, registers SW, starts ScrollSpy, sets up 60s reminder timer.

| What | File | Function / Identifier | Lines |
|------|------|-----------------------|-------|
| Window load bootstrap | `script.js` | `window.addEventListener("load", ...)` | L1495–1500 |

---

## 🛠️ Setup & Deployment

1. **Clone the repo**
   ```bash
   git clone https://github.com/srujangandla/dsa-tracker.git
   ```

2. **Configure environment** — Copy `.env.example` values into `script.js` (lines 5–7):
   - `WEB_APP_URL` — Your Google Apps Script Web App endpoint
   - `SHEET_URL` — Your Google Spreadsheet URL
   - `VAPID_PUBLIC_KEY` — Your VAPID public key for push notifications

3. **Deploy** — Serve directly via GitHub Pages, Vercel, or Netlify. No build step required.

---

## 📝 Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Google Apps Script + Google Sheets
- **Notifications**: Web Push API + Service Worker (VAPID)
- **Design**: Neo-Brutalist (Space Grotesk font, hard shadows, vibrant pastels)
- **Build Tools**: None — zero dependencies, zero bundler

---

## 📄 License

© 2026 Nakama Voyage. All rights reserved.
