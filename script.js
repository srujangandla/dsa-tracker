// ============================================
// ENVIRONMENT VARIABLES & CONFIGURATION (LOADED FROM .env)
// ============================================

window.ENV = window.ENV || {};

let WEB_APP_URL = window.ENV.WEB_APP_URL || "";
let VAPID_PUBLIC_KEY = window.ENV.VAPID_PUBLIC_KEY || "";
let SHEET_URL = window.ENV.SHEET_URL || "";

function updateConfigBindings() {
    if (window.ENV.WEB_APP_URL) WEB_APP_URL = window.ENV.WEB_APP_URL;
    if (window.ENV.VAPID_PUBLIC_KEY !== undefined) VAPID_PUBLIC_KEY = window.ENV.VAPID_PUBLIC_KEY;
    if (window.ENV.SHEET_URL) SHEET_URL = window.ENV.SHEET_URL;

    const sheetLinkEl = document.getElementById("sheetLink");
    if (sheetLinkEl) {
        if (SHEET_URL) {
            sheetLinkEl.href = SHEET_URL;
        } else {
            sheetLinkEl.addEventListener("click", (e) => {
                if (!SHEET_URL) {
                    e.preventDefault();
                    alert("Sheet URL is not configured in .env");
                }
            });
        }
    }
}

/**
 * Loads and parses key-value pairs from .env into window.ENV
 */
async function loadEnvConfig() {
    try {
        const response = await fetch('.env');
        if (response.ok) {
            const text = await response.text();
            const lines = text.split(/\r?\n/);
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    let val = trimmed.slice(eqIdx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    window.ENV[key] = val;
                }
            });
        }
    } catch (err) {
        console.warn("Notice: Could not load .env file directly via fetch:", err);
    }

    updateConfigBindings();
    return window.ENV;
}

const envPromise = loadEnvConfig();

// Global In-Memory State
let allSubmissions = [];
let localPendingSubmissions = [];
let activeProfile = localStorage.getItem("dsa_tracker_active_profile") || "Luffy";
let swRegistration = null;

const status = document.getElementById("status");

// ============================================
// PROFILE MANAGEMENT (CUSTOM / LOCAL PROFILES)
// ============================================

function getCustomProfiles() {
    try {
        const stored = localStorage.getItem("dsa_tracker_custom_profiles");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveCustomProfiles(profiles) {
    try {
        localStorage.setItem("dsa_tracker_custom_profiles", JSON.stringify(profiles));
    } catch (e) {
        console.error("Failed to save custom profiles to localStorage", e);
    }
}

// ============================================
// DATE & TIMESTAMP UTILITIES (FIXES TIMESTAMP BUG)
// ============================================

// Base start date for the challenge: Day 1 = July 15, 2026
const CHALLENGE_START_DATE = new Date(2026, 6, 15); // Month is 0-indexed: 6 = July

/**
 * Precomputes running maximum day across sheet rows to accurately
 * anchor historical catch-up submissions to their real calendar dates.
 */
function computeRunningMaxDays(rows) {
    let maxDay = 1;
    return rows.map(r => {
        const dayMatch = (r[2] || "").match(/\d+/);
        const dayNum = dayMatch ? parseInt(dayMatch[0], 10) : 1;
        if (dayNum > maxDay) maxDay = dayNum;
        return maxDay;
    });
}

/**
 * Robustly parses a submission timestamp.
 * - If timeVal has year >= 2020: directly parse valid ISO/Date.
 * - If timeVal has year 1899 (Google Sheets time-of-day serialization artifact) or raw time string:
 *   Extracts time-of-day and reconstructs calendar date from challenge schedule.
 */
function parseSubmissionTimestamp(timeVal, dayVal, rowIndex, runningMaxDays) {
    if (!timeVal) return null;

    // 1. Check for valid modern date
    const dObj = new Date(timeVal);
    if (!isNaN(dObj.getTime()) && dObj.getFullYear() >= 2020) {
        return dObj;
    }

    // 2. Extract hours, minutes, seconds from timeVal
    let hours = 12;
    let minutes = 0;
    let seconds = 0;

    if (typeof timeVal === "string" && (timeVal.startsWith("1899-") || timeVal.includes("T"))) {
        if (!isNaN(dObj.getTime())) {
            hours = dObj.getHours();
            minutes = dObj.getMinutes();
            seconds = dObj.getSeconds();
        }
    } else if (typeof timeVal === "string") {
        const timeMatch = timeVal.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
            hours = parseInt(timeMatch[1], 10);
            minutes = parseInt(timeMatch[2], 10);
            seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        }
    }

    // 3. Reconstruct calendar date from Day number and sheet progression
    const dayMatch = (dayVal || "").match(/\d+/);
    const dayNum = dayMatch ? parseInt(dayMatch[0], 10) : 1;
    const runningMax = (runningMaxDays && runningMaxDays[rowIndex]) ? runningMaxDays[rowIndex] : dayNum;
    const effectiveDay = Math.max(dayNum, runningMax);

    const calculatedDate = new Date(CHALLENGE_START_DATE.getTime() + (effectiveDay - 1) * 86400000);
    calculatedDate.setHours(hours, minutes, seconds, 0);

    return calculatedDate;
}

/**
 * Formats a Date object into human-readable format:
 * - "Today • 12:05 PM"
 * - "Yesterday • 6:40 PM"
 * - "Sep 6 • 8:30 PM" (current year)
 * - "Sep 6, 2025 • 8:30 PM" (different year)
 */
function formatSubmissionTime(dateInput) {
    if (!dateInput) return "—";
    const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return "—";

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((todayMidnight - targetMidnight) / (24 * 60 * 60 * 1000));

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    if (diffDays === 0) {
        return `Today • ${timeStr}`;
    } else if (diffDays === 1) {
        return `Yesterday • ${timeStr}`;
    } else if (date.getFullYear() === now.getFullYear()) {
        const monthStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${monthStr} • ${timeStr}`;
    } else {
        const fullDateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return `${fullDateStr} • ${timeStr}`;
    }
}

/**
 * Returns date in YYYY-MM-DD format based on local calendar day.
 */
function toLocalDateString(date) {
    if (!date || isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Base date to calculate streak from: starts fresh from today, leaving all past streaks
const STREAK_BASELINE_DATE = "2026-09-08";

/**
 * Calculates current streak and longest streak from an array of Date objects.
 * Streaks are calculated from today onwards (STREAK_BASELINE_DATE), ignoring all past streaks.
 */
function calculateStreaks(dateList) {
    const uniqueDayStrings = new Set();
    dateList.forEach(d => {
        if (d && !isNaN(d.getTime())) {
            const dayStr = toLocalDateString(d);
            // Only count submissions from today onwards, leaving all past streaks
            if (dayStr >= STREAK_BASELINE_DATE) {
                uniqueDayStrings.add(dayStr);
            }
        }
    });

    const sortedDates = Array.from(uniqueDayStrings).sort();
    if (sortedDates.length === 0) return { current: 0, longest: 0 };

    // 1. Longest Streak
    let longest = 1;
    let curRun = 1;
    for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1] + "T00:00:00");
        const curr = new Date(sortedDates[i] + "T00:00:00");
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays === 1) {
            curRun++;
            if (curRun > longest) longest = curRun;
        } else if (diffDays > 1) {
            curRun = 1;
        }
    }

    // 2. Current Streak
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDate = new Date(sortedDates[sortedDates.length - 1] + "T00:00:00");
    const diffFromToday = Math.round((todayMidnight.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

    let current = 0;
    // Streak is active if user submitted today (diff == 0) or yesterday (diff == 1)
    if (diffFromToday === 0 || diffFromToday === 1) {
        current = 1;
        let checkDate = lastDate;
        for (let i = sortedDates.length - 2; i >= 0; i--) {
            const prevDate = new Date(sortedDates[i] + "T00:00:00");
            const diff = Math.round((checkDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
            if (diff === 1) {
                current++;
                checkDate = prevDate;
            } else if (diff > 1) {
                break;
            }
        }
    }

    return { current, longest };
}

// ============================================
// SUBMIT DATA
// ============================================

async function submitData() {
    await envPromise;
    if (!WEB_APP_URL) {
        return showStatus("⚠️ WEB_APP_URL not configured in .env", "error");
    }

    const profile = document.getElementById("profile").value.trim();
    const problem = document.getElementById("problem").value.trim();
    const day = document.getElementById("day").value.trim();
    const difficulty = document.getElementById("difficulty").value;
    const url = document.getElementById("url").value.trim();
    const leetcode_no = document.getElementById("leetcode_no").value.trim();

    if (!profile) return showStatus("⚠ Enter your name.", "error");
    if (!problem) return showStatus("📘 Enter problem name.", "error");
    if (!day) return showStatus("📅 Enter day.", "error");
    if (!url) return showStatus("🔗 Enter submission URL.", "error");

    showStatus("⏳ Submitting...", "loading");

    const nowIso = new Date().toISOString();

    const payload = {
        profile,
        problem,
        day,
        difficulty,
        url,
        leetcode_no,
        timestamp: nowIso,
        time: nowIso,
        date: nowIso,
        submission_time: nowIso
    };

    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload)
        });

        // Store in local pending cache so changes reflect instantly
        localPendingSubmissions.push([
            profile,
            problem,
            day,
            difficulty,
            url,
            nowIso,
            leetcode_no
        ]);

        showStatus("✅ Submitted Successfully!", "success");

        // Sync active profile
        activeProfile = profile;
        localStorage.setItem("dsa_tracker_active_profile", activeProfile);

        clearForm();

        // Re-render immediately with local pending submission included
        processAndRenderAll(allSubmissions);

        // Fetch fresh data from sheet — give Google Sheets time to process the POST
        setTimeout(loadSubmissions, 4000);
        setTimeout(loadSubmissions, 10000);

    } catch (err) {
        console.error(err);
        showStatus("❌ Failed to submit.", "error");
    }
}

// ============================================
// LOAD SUBMISSIONS FROM GOOGLE SHEETS
// ============================================

function loadSubmissions() {
    envPromise.then(() => {
        if (!WEB_APP_URL) {
            console.warn("Notice: WEB_APP_URL is not set in .env.");
            processAndRenderAll(allSubmissions);
            return;
        }

        fetch(WEB_APP_URL)
            .then(response => response.json())
            .then(data => {
            allSubmissions = Array.isArray(data) ? data : [];
            // Only clear pending submissions that are already reflected in remote data.
            // This prevents the 4-second refresh from reverting an optimistic UI update
            // when Google Sheets hasn't yet processed the POST.
            localPendingSubmissions = localPendingSubmissions.filter(pending => {
                const pProfile = String(pending[0] || "").trim().toLowerCase();
                const pProblem = String(pending[1] || "").trim().toLowerCase();
                const pLcNo   = String(pending[6] || "").trim();
                return !allSubmissions.some(r => {
                    const rProfile = String(r[0] || "").trim().toLowerCase();
                    const rProblem = String(r[1] || "").trim().toLowerCase();
                    const rLcNo   = String(r[6] || "").trim();
                    const profileMatch = rProfile === pProfile;
                    // Match by LeetCode number (preferred) or problem name
                    const problemMatch = (pLcNo && rLcNo && pLcNo === rLcNo)
                        || rProblem === pProblem;
                    return profileMatch && problemMatch;
                });
            });
            processAndRenderAll(allSubmissions);
        })
        .catch(error => {
            console.error("Failed to load submissions:", error);
            const table = document.getElementById("submissionTable");
            if (table) {
                table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#f87171; padding:20px;">⚠️ Failed to load remote data. Showing local session data.</td></tr>`;
            }
            // Fallback: render with pending submissions if any
            processAndRenderAll(allSubmissions);
        });
    });
}

// ============================================
// CORE DATA PROCESSING & RENDERING
// ============================================

function processAndRenderAll(remoteRows) {
    // Combine remote data and local pending submissions
    const combinedRows = [...remoteRows, ...localPendingSubmissions];
    if (combinedRows.length === 0) return;

    // ── Build reverse map: LeetCode number (string) → canonical lowercase name ──
    const lcNumToName = {};
    if (typeof leetcodeMap !== "undefined") {
        Object.entries(leetcodeMap).forEach(([name, num]) => {
            lcNumToName[String(num)] = name;
        });
    }

    // ── Build Set of LeetCode numbers for all posted questions ──
    const postedNumbers = new Set();
    const postedNumToName = {};
    if (typeof postedQuestions !== "undefined" && typeof leetcodeMap !== "undefined") {
        postedQuestions.forEach(q => {
            const qName = (typeof getQuestionName === "function")
                ? getQuestionName(q)
                : ((typeof q === "object" && q.name) ? q.name : String(q));
            const num = leetcodeMap[qName.toLowerCase().trim()];
            if (num) {
                postedNumbers.add(String(num));
                postedNumToName[String(num)] = qName;
            }
        });
    }

    const totalPosted = (typeof postedQuestions !== "undefined") ? postedQuestions.length : 0;

    // Compute running max day to reconstruct historical dates
    const runningMaxDays = computeRunningMaxDays(combinedRows);

    // ── Aggregate per member ──
    const members = {};

    combinedRows.forEach((row, idx) => {
        const profile     = row[0] ? String(row[0]).trim() : "";
        const problemName = row[1] ? String(row[1]).trim() : "";
        const dayVal      = row[2] ? String(row[2]).trim() : "";
        const diffVal     = row[3] ? String(row[3]).trim() : "";
        const timeVal     = row[5];
        const lcNo        = row[6] ? String(row[6]).trim() : "";

        if (!profile) return;

        if (!members[profile]) {
            members[profile] = {
                profile,
                lastDate: null,
                submittedNumbers: new Set(),
                solvedNames: new Set(),
                dates: [],
                difficultyMap: new Map() // problemKey -> 'Easy' | 'Medium' | 'Hard'
            };
        }

        const member = members[profile];

        // Resolve problem identifier
        let problemKey = null;
        if (lcNo && lcNumToName[lcNo]) {
            member.submittedNumbers.add(lcNo);
            problemKey = "num_" + lcNo;
        } else if (problemName) {
            const key = problemName.toLowerCase().trim();
            const canonical = (typeof questionAliases !== "undefined" && questionAliases[key])
                ? questionAliases[key]
                : key;
            const resolvedNum = typeof leetcodeMap !== "undefined" ? leetcodeMap[canonical] : null;
            if (resolvedNum) {
                member.submittedNumbers.add(String(resolvedNum));
                problemKey = "num_" + resolvedNum;
            } else {
                member.solvedNames.add(canonical);
                problemKey = "name_" + canonical;
            }
        }

        // Categorize difficulty
        if (problemKey && !member.difficultyMap.has(problemKey)) {
            let diff = "Easy";
            const lowerDiff = diffVal.toLowerCase();
            if (lowerDiff.includes("hard")) diff = "Hard";
            else if (lowerDiff.includes("med")) diff = "Medium";
            member.difficultyMap.set(problemKey, diff);
        }

        // Parse valid timestamp
        const parsedDate = parseSubmissionTimestamp(timeVal, dayVal, idx, runningMaxDays);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
            member.dates.push(parsedDate);
            if (!member.lastDate || parsedDate.getTime() > member.lastDate.getTime()) {
                member.lastDate = parsedDate;
            }
        }
    });

    // Ensure custom profiles exist in members
    const customProfiles = getCustomProfiles();
    if (activeProfile && !members[activeProfile] && !customProfiles.includes(activeProfile)) {
        customProfiles.push(activeProfile);
        saveCustomProfiles(customProfiles);
    }
    customProfiles.forEach(cp => {
        if (!members[cp]) {
            members[cp] = {
                profile: cp,
                lastDate: null,
                submittedNumbers: new Set(),
                solvedNames: new Set(),
                dates: [],
                difficultyMap: new Map()
            };
        }
    });

    // Ensure active profile exists
    const profileNames = Object.keys(members);
    if (profileNames.length > 0 && !members[activeProfile]) {
        activeProfile = profileNames[0];
        localStorage.setItem("dsa_tracker_active_profile", activeProfile);
    }

    // Keep reference for dynamic re-renders
    lastProcessedMembers = members;

    // 1. Render Personal Statistics (My Progress)
    renderMyProgress(members, totalPosted, profileNames);

    // 1.5 Render Weak Areas
    renderWeakAreas(activeProfile, members);

    // 2. Render Activity Heatmap
    renderActivityHeatmap(activeProfile, members);

    // 3. Render Team Progress Table
    renderTeamProgress(members, postedNumbers, postedNumToName, lcNumToName, totalPosted);

    // 4. Update Header Day Badge & Challenge Info
    updateDashboardMeta();

    // 5. Evaluate Notifications
    checkDailyReminder();
}

// ============================================
// 1. RENDER PERSONAL PROGRESS (MY STATISTICS)
// ============================================

function renderMyProgress(members, totalPosted, profileNames) {

    const member = members[activeProfile] || {
        submittedNumbers: new Set(),
        solvedNames: new Set(),
        dates: [],
        difficultyMap: new Map()
    };

    // Calculate unique solved count
    const totalSolved = member.difficultyMap.size || (member.submittedNumbers.size + member.solvedNames.size);

    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    member.difficultyMap.forEach(diff => {
        if (diff === "Easy") easyCount++;
        else if (diff === "Medium") mediumCount++;
        else if (diff === "Hard") hardCount++;
    });

    // If difficultyMap is empty fallback to difficulty proportion
    if (totalSolved > 0 && easyCount === 0 && mediumCount === 0 && hardCount === 0) {
        easyCount = totalSolved;
    }

    const streaks = calculateStreaks(member.dates);
    const completionRate = totalPosted > 0 ? Math.round((totalSolved / totalPosted) * 100) : 0;

    // Update stat boxes
    const totalEl = document.getElementById("statTotalSolved");
    const easyEl = document.getElementById("statEasySolved");
    const medEl = document.getElementById("statMediumSolved");
    const hardEl = document.getElementById("statHardSolved");
    const curStreakEl = document.getElementById("statCurrentStreak");
    const longStreakEl = document.getElementById("statLongestStreak");
    const rateEl = document.getElementById("statCompletionRate");

    if (totalEl) totalEl.textContent = totalSolved;
    if (easyEl) easyEl.textContent = easyCount;
    if (medEl) medEl.textContent = mediumCount;
    if (hardEl) hardEl.textContent = hardCount;
    if (curStreakEl) curStreakEl.textContent = `${streaks.current} Days`;
    if (longStreakEl) longStreakEl.textContent = `${streaks.longest} Days`;
    if (rateEl) rateEl.textContent = `${completionRate}%`;

    const optionsHtml = profileNames.map(p =>
        `<option value="${p}" ${p === activeProfile ? "selected" : ""}>${p}</option>`
    ).join("") + `<option value="__add_new__">➕ Add New Profile...</option>`;

    // Populate the My Progress section profile selector
    const profileSelector = document.getElementById("profileSelector");
    if (profileSelector && profileNames.length > 0) {
        profileSelector.innerHTML = optionsHtml;
        profileSelector.value = activeProfile;
    }

    // Populate the sidebar profile switcher dropdown
    const sidebarSelect = document.getElementById("sidebarProfileSelect");
    if (sidebarSelect && profileNames.length > 0) {
        sidebarSelect.innerHTML = optionsHtml;
        sidebarSelect.value = activeProfile;
    }

    // Update active profile display in Challenge section
    const challengeProfileEl = document.getElementById("challengeActiveProfileName");
    if (challengeProfileEl) challengeProfileEl.textContent = activeProfile;

    // Always sync the hidden profile input used by submitData()
    const profileInput = document.getElementById("profile");
    if (profileInput) profileInput.value = activeProfile;
}

function onProfileSelected(newProfile) {
    if (!newProfile) return;

    if (newProfile === "__add_new__") {
        promptAddNewProfile();
        return;
    }

    activeProfile = newProfile;
    localStorage.setItem("dsa_tracker_active_profile", activeProfile);

    // Sync hidden profile input used by submitData()
    const profileInput = document.getElementById("profile");
    if (profileInput) profileInput.value = activeProfile;

    // Sync the My Progress dropdown (if present)
    const profileSelector = document.getElementById("profileSelector");
    if (profileSelector) profileSelector.value = activeProfile;

    // Sync the sidebar dropdown
    const sidebarSelect = document.getElementById("sidebarProfileSelect");
    if (sidebarSelect) sidebarSelect.value = activeProfile;

    // Update challenge badge immediately
    const challengeProfileEl = document.getElementById("challengeActiveProfileName");
    if (challengeProfileEl) challengeProfileEl.textContent = activeProfile;

    processAndRenderAll(allSubmissions);
}

function promptAddNewProfile() {
    const input = prompt("Enter a new username / profile name:");
    if (input === null) {
        // User clicked cancel — revert dropdowns back to activeProfile
        syncProfileDropdowns();
        return;
    }

    const trimmed = input.trim();
    if (!trimmed) {
        alert("Username cannot be empty.");
        syncProfileDropdowns();
        return;
    }

    if (trimmed === "__add_new__") {
        syncProfileDropdowns();
        return;
    }

    const custom = getCustomProfiles();
    const existingCustom = custom.find(p => p.toLowerCase() === trimmed.toLowerCase());
    const existingRemote = Object.keys(lastProcessedMembers || {}).find(p => p.toLowerCase() === trimmed.toLowerCase());

    const chosenName = existingCustom || existingRemote || trimmed;

    if (!existingCustom && !existingRemote) {
        custom.push(chosenName);
        saveCustomProfiles(custom);
    }

    onProfileSelected(chosenName);
    if (typeof showStatus === "function") {
        showStatus(`👤 Switched to profile: ${chosenName}`, "info");
    }
}

function syncProfileDropdowns() {
    const profileSelector = document.getElementById("profileSelector");
    if (profileSelector) profileSelector.value = activeProfile;

    const sidebarSelect = document.getElementById("sidebarProfileSelect");
    if (sidebarSelect) sidebarSelect.value = activeProfile;
}

// ============================================
// 1.5 RENDER WEAK AREAS (PURELY TOPIC BASED)
// ============================================

let showAllTopics = false;
let lastProcessedMembers = {};

function toggleAllTopics() {
    showAllTopics = !showAllTopics;
    renderWeakAreas(activeProfile, lastProcessedMembers);
}

function renderWeakAreas(profile, members) {
    const listEl = document.getElementById("weakAreasList");
    const footerEl = document.getElementById("weakAreasFooter");
    const toggleBtn = document.getElementById("toggleAllTopicsBtn");
    const subtitleEl = document.getElementById("weakAreasSubtitle");
    const chipWeak = document.getElementById("chipWeakCount");
    const chipImprove = document.getElementById("chipImproveCount");
    const chipAverage = document.getElementById("chipAverageCount");
    const chipStrong = document.getElementById("chipStrongCount");

    if (!listEl) return;

    if (subtitleEl) {
        subtitleEl.textContent = `Topic proficiency for ${profile} based strictly on submitted vs. posted problems.`;
    }

    const member = (members && members[profile]) ? members[profile] : {
        submittedNumbers: new Set(),
        solvedNames: new Set()
    };

    // Aggregate posted and submitted problems strictly per topic from postedQuestions
    const topicStats = {};

    if (typeof postedQuestions !== "undefined" && Array.isArray(postedQuestions)) {
        postedQuestions.forEach(q => {
            const qName = (typeof getQuestionName === "function")
                ? getQuestionName(q)
                : ((typeof q === "object" && q.name) ? q.name : String(q));

            const topic = (typeof getQuestionTopic === "function")
                ? getQuestionTopic(q)
                : ((typeof q === "object" && q.topic) ? q.topic : "General");

            if (!topicStats[topic]) {
                topicStats[topic] = {
                    topic,
                    posted: 0,
                    submitted: 0,
                    questions: []
                };
            }

            topicStats[topic].posted++;
            topicStats[topic].questions.push(qName);

            // Determine if the active member has solved/submitted this posted problem
            const lowerName = qName.toLowerCase().trim();
            const canonical = (typeof questionAliases !== "undefined" && questionAliases[lowerName])
                ? questionAliases[lowerName]
                : lowerName;

            const lcNum = (typeof leetcodeMap !== "undefined") ? leetcodeMap[canonical] : null;

            const isSolved = (lcNum && member.submittedNumbers.has(String(lcNum)))
                || member.solvedNames.has(canonical)
                || member.solvedNames.has(lowerName);

            if (isSolved) {
                topicStats[topic].submitted++;
            }
        });
    }

    // Filter: Only show topics that have at least 3 posted problems
    const eligibleTopics = Object.values(topicStats).filter(t => t.posted >= 3);

    // Calculate submission rate and classification for each eligible topic
    // Submission Rate = (Submitted Problems / Posted Problems) × 100
    // >= 80% → 🟢 Strong
    // 60%–79% → 🟡 Average
    // 40%–59% → 🟠 Needs Improvement
    // Below 40% → 🔴 Weak
    eligibleTopics.forEach(t => {
        t.rate = t.posted > 0 ? Math.round((t.submitted / t.posted) * 100) : 0;
        if (t.rate >= 80) {
            t.status = "Strong";
            t.icon = "🟢";
            t.tagClass = "topicTagStrong";
            t.fillClass = "progressFillStrong";
        } else if (t.rate >= 60) {
            t.status = "Average";
            t.icon = "🟡";
            t.tagClass = "topicTagAverage";
            t.fillClass = "progressFillAverage";
        } else if (t.rate >= 40) {
            t.status = "Needs Improvement";
            t.icon = "🟠";
            t.tagClass = "topicTagImprove";
            t.fillClass = "progressFillImprove";
        } else {
            t.status = "Weak";
            t.icon = "🔴";
            t.tagClass = "topicTagWeak";
            t.fillClass = "progressFillWeak";
        }
    });

    // Summary counts
    let weakCount = 0;
    let improveCount = 0;
    let avgCount = 0;
    let strongCount = 0;

    eligibleTopics.forEach(t => {
        if (t.status === "Weak") weakCount++;
        else if (t.status === "Needs Improvement") improveCount++;
        else if (t.status === "Average") avgCount++;
        else if (t.status === "Strong") strongCount++;
    });

    if (chipWeak) chipWeak.textContent = `🔴 Weak: ${weakCount}`;
    if (chipImprove) chipImprove.textContent = `🟠 Needs Improvement: ${improveCount}`;
    if (chipAverage) chipAverage.textContent = `🟡 Average: ${avgCount}`;
    if (chipStrong) chipStrong.textContent = `🟢 Strong: ${strongCount}`;

    // Sort topics from weakest to strongest based on submission rate
    eligibleTopics.sort((a, b) => {
        if (a.rate !== b.rate) return a.rate - b.rate;
        // Tied rate: sort by posted count descending, then topic name
        if (b.posted !== a.posted) return b.posted - a.posted;
        return a.topic.localeCompare(b.topic);
    });

    // Render list
    listEl.innerHTML = "";

    if (eligibleTopics.length === 0) {
        listEl.innerHTML = `
            <div class="weakAreasEmptyState">
                ℹ️ Not enough data yet. Topics need at least 3 posted problems to be evaluated for weak areas.
            </div>
        `;
        if (footerEl) footerEl.style.display = "none";
        return;
    }

    // Determine topics to display based on showAllTopics toggle
    const DISPLAY_LIMIT = 4;
    const shouldShowToggle = eligibleTopics.length > DISPLAY_LIMIT;
    const displayedTopics = (shouldShowToggle && !showAllTopics)
        ? eligibleTopics.slice(0, DISPLAY_LIMIT)
        : eligibleTopics;

    displayedTopics.forEach(t => {
        // Generate block progress representation: 10 blocks (e.g. ████░░░░░░)
        const filledBlocks = Math.min(10, Math.max(0, Math.round(t.rate / 10)));
        const emptyBlocks = 10 - filledBlocks;
        const blockText = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

        const card = document.createElement("div");
        card.className = "topicCard";
        card.innerHTML = `
            <div class="topicCardHeader">
                <div class="topicTitleArea">
                    <span class="topicStatusDot">${t.icon}</span>
                    <span class="topicName">${t.topic}</span>
                    <span class="topicTag ${t.tagClass}">${t.status}</span>
                </div>
                <div class="topicStatsArea">
                    <span class="topicCountText">${t.submitted} / ${t.posted} submitted</span>
                    <span class="topicRateBadge">${t.rate}% completion</span>
                </div>
            </div>
            <div class="progressBarContainer">
                <div class="progressBarTrack" title="${t.topic}: ${t.rate}% completion (${t.submitted}/${t.posted})">
                    <div class="progressBarFill ${t.fillClass}" style="width: ${t.rate}%;"></div>
                </div>
                <span class="progressBarBlockText" aria-hidden="true">${blockText}</span>
            </div>
        `;
        listEl.appendChild(card);
    });

    // Update toggle button
    if (footerEl && toggleBtn) {
        if (shouldShowToggle) {
            footerEl.style.display = "block";
            toggleBtn.innerHTML = showAllTopics
                ? `🔼 Show Less`
                : `👁️ View All Topics (${eligibleTopics.length})`;
        } else {
            footerEl.style.display = "none";
        }
    }
}

// ============================================
// 2. RENDER ACTIVITY HEATMAP
// ============================================

function renderActivityHeatmap(profile, members) {
    const gridEl = document.getElementById("heatmapGrid");
    const monthLabelsEl = document.getElementById("heatmapMonthLabels");
    const subtitleEl = document.getElementById("heatmapSubtitle");
    if (!gridEl) return;

    gridEl.innerHTML = "";
    if (monthLabelsEl) monthLabelsEl.innerHTML = "";

    if (subtitleEl) {
        subtitleEl.textContent = `Daily problem solving consistency for ${profile} starting from today (${STREAK_BASELINE_DATE}).`;
    }

    const member = members[profile];
    const dailyCounts = {};

    // Only count submissions from today onwards, leaving past activity out of the new matrix
    if (member && member.dates) {
        member.dates.forEach(d => {
            const key = toLocalDateString(d);
            if (key >= STREAK_BASELINE_DATE) {
                dailyCounts[key] = (dailyCounts[key] || 0) + 1;
            }
        });
    }

    // Heatmap date range: starts from the current week containing today (15 weeks forward)
    const now = new Date();
    const todayKey = toLocalDateString(now);
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday=0, ..., Sunday=6
    // Align to Monday of the current week
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

    const totalWeeks = 15;
    const totalDays = totalWeeks * 7;

    const tooltip = document.getElementById("heatmapTooltip");

    let lastMonth = -1;
    const monthPositions = [];

    // Loop through each day from startDate for 15 weeks forward
    for (let i = 0; i < totalDays; i++) {
        const curDate = new Date(startDate.getTime() + i * 86400000);
        const dateKey = toLocalDateString(curDate);
        const count = dailyCounts[dateKey] || 0;
        const weekIndex = Math.floor(i / 7);

        // Track month changes for column header
        const m = curDate.getMonth();
        if (m !== lastMonth && curDate.getDay() === 1) {
            monthPositions.push({
                week: weekIndex,
                name: curDate.toLocaleDateString("en-US", { month: "short" })
            });
            lastMonth = m;
        }

        // Intensity level: 0 (empty), 1 (1 problem), 2 (2-3 problems), 3 (4+ problems)
        let levelClass = "heatLevel0";
        if (count >= 4) levelClass = "heatLevel3";
        else if (count >= 2) levelClass = "heatLevel2";
        else if (count === 1) levelClass = "heatLevel1";

        const cell = document.createElement("div");
        cell.className = `heatCell ${levelClass}`;
        cell.setAttribute("data-date", dateKey);
        cell.setAttribute("data-count", count);

        // Highlight today's cell with an accent border
        if (dateKey === todayKey) {
            cell.style.borderColor = "#25B8FF";
            cell.style.borderWidth = "2.5px";
        }

        // Tooltip interaction
        cell.addEventListener("mouseenter", (e) => {
            if (!tooltip) return;
            const formattedDate = curDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            const problemWord = count === 1 ? "problem" : "problems";
            const todayBadge = dateKey === todayKey ? " (Today)" : "";
            tooltip.textContent = `${formattedDate}${todayBadge} — ${count} ${problemWord}`;
            tooltip.style.display = "block";
            updateTooltipPos(e);
        });

        cell.addEventListener("mousemove", (e) => {
            updateTooltipPos(e);
        });

        cell.addEventListener("mouseleave", () => {
            if (tooltip) tooltip.style.display = "none";
        });

        gridEl.appendChild(cell);
    }

    // Render month labels
    if (monthLabelsEl) {
        monthLabelsEl.style.position = "relative";
        monthLabelsEl.style.height = "18px";
        monthPositions.forEach(mp => {
            const span = document.createElement("span");
            span.textContent = mp.name;
            span.style.position = "absolute";
            span.style.left = `${mp.week * 19}px`;
            monthLabelsEl.appendChild(span);
        });
    }
}

function updateTooltipPos(e) {
    const tooltip = document.getElementById("heatmapTooltip");
    if (!tooltip) return;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY - 12}px`;
}

// ============================================
// 3. RENDER IMPROVED TEAM PROGRESS TABLE
// ============================================

function renderTeamProgress(members, postedNumbers, postedNumToName, lcNumToName, totalPosted) {
    const table = document.getElementById("submissionTable");
    if (!table) return;
    table.innerHTML = "";

    // ── Sort members: 1st by solved count (descending), 2nd by last submission time ──
    const sortedProfiles = Object.keys(members).filter(p => {
        const aMember = members[p];
        if (!aMember) return false;
        const hasActivity = aMember.submittedNumbers.size > 0 || aMember.solvedNames.size > 0 || aMember.lastDate !== null;
        return hasActivity || p === activeProfile;
    }).sort((a, b) => {
        const aMember = members[a];
        const bMember = members[b];

        const aSolved = [...postedNumbers].filter(n =>
            aMember.submittedNumbers.has(n) || aMember.solvedNames.has(lcNumToName[n])
        ).length;

        const bSolved = [...postedNumbers].filter(n =>
            bMember.submittedNumbers.has(n) || bMember.solvedNames.has(lcNumToName[n])
        ).length;

        if (bSolved !== aSolved) return bSolved - aSolved;

        const aTime = aMember.lastDate ? aMember.lastDate.getTime() : 0;
        const bTime = bMember.lastDate ? bMember.lastDate.getTime() : 0;
        return bTime - aTime;
    });

    sortedProfiles.forEach((profile, idx) => {
        const member = members[profile];
        const rank = idx + 1;

        // Compute missing: posted questions NOT submitted by this member
        const missingNums = [...postedNumbers].filter(num => {
            if (member.submittedNumbers.has(num)) return false;
            const name = lcNumToName[num];
            if (name && member.solvedNames.has(name)) return false;
            return true;
        });

        const missedCount = missingNums.length;
        // Count solved posted questions using the same set-intersection logic
        // as the rank sort — avoids inflated counts when totalPosted > postedNumbers.size
        const submittedCount = [...postedNumbers].filter(n =>
            member.submittedNumbers.has(n) || member.solvedNames.has(lcNumToName[n])
        ).length;
        let missingListDisplay = "N/A";

        if (totalPosted > 0) {
            if (missedCount === 0) {
                missingListDisplay = '<span style="color:#16A34A; font-weight:700;">✅ All Caught Up!</span>';
            } else {
                const listHtml = missingNums.map(num => {
                    const displayName = postedNumToName[num] || lcNumToName[num] || num;
                    return `<div style="margin-bottom:3px; border-bottom:1px solid #fee2e2; padding-bottom:2px;">• ${num}. ${displayName}</div>`;
                }).join("");

                missingListDisplay = `
                    <details style="cursor:pointer; text-align:left;">
                        <summary style="font-weight:700; outline:none; color:#111;">View Missing (${missedCount})</summary>
                        <div style="margin-top:6px; max-height:110px; overflow-y:auto; padding-right:5px; font-size:0.85em; color:#DC2626; font-weight:600;">
                            ${listHtml}
                        </div>
                    </details>
                `;
            }
        }

        // Streaks
        const streaks = calculateStreaks(member.dates);
        const streakDisplay = streaks.current > 0 ? `🔥 ${streaks.current}` : "0";

        // Human-readable formatted last submission time
        const lastActiveDisplay = formatSubmissionTime(member.lastDate);

        // Rank Badge style
        let rankClass = "rankOther";
        if (rank === 1) rankClass = "rank1";
        else if (rank === 2) rankClass = "rank2";
        else if (rank === 3) rankClass = "rank3";

        const tr = document.createElement("tr");
        if (profile === activeProfile) tr.className = "activeRow";

        tr.innerHTML = `
            <td><span class="rankBadge ${rankClass}">${rank}</span></td>
            <td><strong>${profile}</strong></td>
            <td>${submittedCount}</td>
            <td><strong>${streakDisplay}</strong></td>
            <td style="max-width:240px; white-space:normal; line-height:1.3;">${missingListDisplay}</td>
            <td>${lastActiveDisplay}</td>
        `;

        // Row click switches active profile
        tr.addEventListener("click", () => {
            onProfileSelected(profile);
        });

        table.appendChild(tr);

        // Prevent the <details> dropdown from triggering the row's profile-switch click
        const detailsEl = tr.querySelector("details");
        if (detailsEl) {
            detailsEl.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }
    });
}

// ============================================
// 4. DASHBOARD META (DAY BADGE & CHALLENGE INFO)
// ============================================

function updateDashboardMeta() {
    const totalPosted = (typeof postedQuestions !== "undefined") ? postedQuestions.length : 1;

    // Update Day Badge in Hero & Sidebar
    const dayBadge = document.getElementById("currentDayBadge");
    if (dayBadge) {
        dayBadge.innerHTML = `🔥 Day ${totalPosted}`;
    }
    const sidebarDayBadge = document.getElementById("sidebarDayBadge");
    if (sidebarDayBadge) {
        sidebarDayBadge.innerHTML = `🔥 Day ${totalPosted}`;
    }

    // Auto-fill Day field placeholder/default in Submission Form
    const dayInput = document.getElementById("day");
    if (dayInput && !dayInput.value.trim()) {
        dayInput.placeholder = `Day ${totalPosted}`;
    }

    // Show today's challenge question name
    if (typeof postedQuestions !== "undefined" && postedQuestions.length > 0) {
        const rawQ = postedQuestions[postedQuestions.length - 1];
        const todayQuestion = (typeof getQuestionName === "function")
            ? getQuestionName(rawQ)
            : ((typeof rawQ === "object" && rawQ.name) ? rawQ.name : String(rawQ));
        const challengeLeftP = document.querySelector(".challengeLeft p");
        if (challengeLeftP && !challengeLeftP.innerHTML.includes("Today's Target")) {
            challengeLeftP.innerHTML = `<strong>Today's Target:</strong> <span style="background:#FFE44D; padding:3px 8px; border-radius:6px; border:2px solid #111; font-weight:800;">${todayQuestion}</span><br>Solve today's problem and submit before the day ends. One problem closer to greatness.`;
        }
    }
}

// ============================================
// 5. WEB PUSH & BROWSER REMINDERS
// ============================================

async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register("./sw.js");
            console.log("Service Worker registered successfully:", swRegistration.scope);
            updateReminderUI();
        } catch (err) {
            console.warn("Service Worker registration failed:", err);
            updateReminderUI();
        }
    } else {
        updateReminderUI();
    }
}

function getReminderPreference() {
    const key = `dsa_reminder_config_${activeProfile}`;
    const stored = localStorage.getItem(key) || localStorage.getItem("dsa_reminder_config_global");
    if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
    }
    return { enabled: false, time: "20:00", lastRemindedDate: "" };
}

function saveReminderPreference(pref) {
    const key = `dsa_reminder_config_${activeProfile}`;
    localStorage.setItem(key, JSON.stringify(pref));
    localStorage.setItem("dsa_reminder_config_global", JSON.stringify(pref));
    updateReminderUI();
}

function updateReminderUI() {
    const toggleBtn = document.getElementById("toggleReminderBtn");
    const statusBox = document.getElementById("reminderStatusText");
    const timeInput = document.getElementById("reminderTimeInput");
    if (!toggleBtn || !statusBox) return;

    if (!("Notification" in window)) {
        toggleBtn.disabled = true;
        toggleBtn.textContent = "🚫 Unsupported";
        statusBox.textContent = "⚠️ Browser notifications are not supported in this browser.";
        return;
    }

    const pref = getReminderPreference();
    if (timeInput && pref.time) timeInput.value = pref.time;

    if (Notification.permission === "denied") {
        toggleBtn.className = "reminderBtn activeState";
        toggleBtn.textContent = "🚫 Permission Denied";
        statusBox.textContent = "⚠️ Notification permission is blocked in your browser settings. Please enable notifications for this site.";
        return;
    }

    if (pref.enabled && Notification.permission === "granted") {
        toggleBtn.className = "reminderBtn activeState";
        toggleBtn.textContent = "🔕 Disable Notifications";
        statusBox.textContent = `✅ Daily reminders enabled for ${activeProfile} at ${pref.time || "20:00"}. You'll be notified if today's problem isn't submitted.`;
    } else {
        toggleBtn.className = "reminderBtn";
        toggleBtn.textContent = "🔔 Enable Notifications";
        statusBox.textContent = `ℹ️ Notifications are currently disabled. Click "Enable Notifications" to receive daily challenge reminders.`;
    }
}

async function toggleNotificationSubscription() {
    if (!("Notification" in window)) {
        alert("Web notifications are not supported in this browser.");
        return;
    }

    const pref = getReminderPreference();

    if (pref.enabled && Notification.permission === "granted") {
        // User wants to disable
        pref.enabled = false;
        saveReminderPreference(pref);
        updateReminderUI();
        return;
    }

    // User wants to enable -> request permission
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            pref.enabled = true;
            saveReminderPreference(pref);

            // Attempt Web Push subscription if VAPID key provided
            if (swRegistration && swRegistration.pushManager && VAPID_PUBLIC_KEY) {
                try {
                    const sub = await swRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
                    });
                    console.log("Push subscription created:", JSON.stringify(sub));
                } catch (pushErr) {
                    console.warn("Web Push subscription not active; local reminders will function:", pushErr);
                }
            }

            updateReminderUI();
            dispatchNotification(
                "🎯 DSA Reminders Activated!",
                `Consistency is key, ${activeProfile}. We'll keep you accountable daily!`
            );
        } else {
            pref.enabled = false;
            saveReminderPreference(pref);
            updateReminderUI();
        }
    } catch (e) {
        console.error("Error requesting notification permission:", e);
    }
}

function onReminderTimeChanged(newTime) {
    const pref = getReminderPreference();
    pref.time = newTime;
    saveReminderPreference(pref);
}

function triggerTestNotification() {
    if (!("Notification" in window)) {
        alert("Web notifications are not supported in this browser.");
        return;
    }
    if (Notification.permission !== "granted") {
        alert("Please enable notifications first by clicking 'Enable Notifications'.");
        return;
    }
    const totalPosted = (typeof postedQuestions !== "undefined") ? postedQuestions.length : 1;
    dispatchNotification(
        "🎯 DSA Challenge Reminder",
        `You haven't completed today's challenge yet. Day ${totalPosted} is waiting! 💪`
    );
}

function dispatchNotification(title, body) {
    if (Notification.permission !== "granted") return;

    if (swRegistration && swRegistration.showNotification) {
        swRegistration.showNotification(title, {
            body: body,
            icon: "./favicon.ico",
            badge: "./favicon.ico",
            tag: "dsa-reminder",
            renotify: true,
            data: { url: window.location.href }
        });
    } else {
        new Notification(title, {
            body: body,
            icon: "./favicon.ico"
        });
    }
}

function checkDailyReminder() {
    const pref = getReminderPreference();
    if (!pref.enabled || Notification.permission !== "granted") return;

    const now = new Date();
    const todayStr = toLocalDateString(now);
    if (pref.lastRemindedDate === todayStr) return; // Already reminded today

    // Check if user submitted today
    const member = (allSubmissions && allSubmissions.length > 0)
        ? allSubmissions.find(r => r[0] === activeProfile && toLocalDateString(parseSubmissionTimestamp(r[5], r[2], 0, null)) === todayStr)
        : null;

    if (!member) {
        // User hasn't submitted today!
        const totalPosted = (typeof postedQuestions !== "undefined") ? postedQuestions.length : 1;

        // Check if streak is at risk (submitted yesterday)
        const yesterday = new Date(now.getTime() - 86400000);
        const yesterdayStr = toLocalDateString(yesterday);
        const hadYesterday = allSubmissions.some(r => r[0] === activeProfile && toLocalDateString(parseSubmissionTimestamp(r[5], r[2], 0, null)) === yesterdayStr);

        let title = "🎯 DSA Reminder";
        let body = `You haven't completed today's DSA challenge yet. Day ${totalPosted} is waiting.`;

        if (hadYesterday) {
            title = "🔥 Your DSA streak is at risk!";
            body = `Complete today's challenge before the day ends to preserve your streak!`;
        }

        // Trigger reminder if time has arrived (or hourly check)
        const [targetHour, targetMin] = (pref.time || "20:00").split(":").map(Number);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const targetMinutes = targetHour * 60 + targetMin;

        if (currentMinutes >= targetMinutes) {
            dispatchNotification(title, body);
            pref.lastRemindedDate = todayStr;
            saveReminderPreference(pref);
        }
    }
}

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// ============================================
// STATUS DISPLAY
// ============================================

function showStatus(message, type) {
    if (!status) return;
    status.innerHTML = message;
    if (type === "success") status.style.background = "#D9F99D";
    else if (type === "error") status.style.background = "#FCA5A5";
    else status.style.background = "#BFDBFE";
}

// ============================================
// CLEAR FORM
// ============================================

function clearForm() {
    const totalPosted = (typeof postedQuestions !== "undefined") ? postedQuestions.length : 1;
    document.getElementById("profile").value = activeProfile;
    document.getElementById("problem").value = "";
    document.getElementById("day").value = "";
    document.getElementById("day").placeholder = `Day ${totalPosted}`;
    document.getElementById("leetcode_no").value = "";
    document.getElementById("url").value = "";
    document.getElementById("difficulty").selectedIndex = 0;
}

// ============================================
// PLACEHOLDERS ROTATION
// ============================================

const placeholders = [
    "Example : Two Sum 🚀",
    "Example : Merge Strings",
    "Example : Binary Search",
    "Example : Valid Parentheses",
    "Example : House Robber"
];

let placeholderIdx = 0;

setInterval(() => {
    const problemInput = document.getElementById("problem");
    if (problemInput) {
        problemInput.placeholder = placeholders[placeholderIdx];
        placeholderIdx = (placeholderIdx + 1) % placeholders.length;
    }
}, 2500);

// ============================================
// GREETING
// ============================================

const heroTitle = document.querySelector(".hero h1");
const currentHour = new Date().getHours();

if (heroTitle) {
    if (currentHour < 12) heroTitle.innerHTML = "☀️ Good Morning, Coder!";
    else if (currentHour < 17) heroTitle.innerHTML = "🚀 Good Afternoon, Coder!";
    else heroTitle.innerHTML = "🌙 Good Evening, Coder!";
}

// ============================================
// SIDEBAR SCROLL SPY
// ============================================

function initSidebarScrollSpy() {
    const navLinks = document.querySelectorAll(".sidebarLink");
    if (!navLinks.length) return;

    const sectionIds = [
        "heroSection",
        "challengeSection",
        "formSection",
        "progressSection",
        "weakAreasCard",
        "heatmapSection",
        "reminderSection",
        "teamSection"
    ];

    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    window.addEventListener("scroll", () => {
        const scrollY = window.scrollY + 140;
        let currentSectionId = "";

        sections.forEach(sec => {
            const top = sec.offsetTop;
            const height = sec.offsetHeight;
            if (scrollY >= top && scrollY < top + height) {
                currentSectionId = sec.id;
            }
        });

        if (!currentSectionId && sections.length && scrollY < sections[0].offsetTop) {
            currentSectionId = sections[0].id;
        }

        if (currentSectionId) {
            navLinks.forEach(link => {
                const target = link.getAttribute("data-target") || (link.getAttribute("href") || "").replace("#", "");
                if (target === currentSectionId) {
                    link.classList.add("active");
                } else {
                    link.classList.remove("active");
                }
            });
        }
    }, { passive: true });
}

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener("load", async () => {
    await envPromise;
    updateConfigBindings();
    loadSubmissions();
    registerServiceWorker();
    initSidebarScrollSpy();
    setInterval(checkDailyReminder, 60000);
});