// ============================================
// GOOGLE APPS SCRIPT WEB APP URL
// ============================================

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbztDxQZpQ1VFvqyHgddL_RHvpQL4RE-_tqDQ2iOxsUNR_Z9mp4VQ5wuK2H7BpI0Oqw18Q/exec";

const status = document.getElementById("status");

// ============================================
// SUBMIT DATA
// ============================================

async function submitData() {

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

    const payload = {
        profile,
        problem,
        day,
        difficulty,
        url,
        leetcode_no
    };

    try {

        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload)
        });

        showStatus("✅ Submitted Successfully!", "success");

        clearForm();

        // wait for sheet update
        setTimeout(loadSubmissions, 1000);

    }
    catch (err) {

        console.error(err);

        showStatus("❌ Failed to submit.", "error");

    }

}

// ============================================
// LOAD TABLE
// ============================================

function loadSubmissions() {

    fetch(WEB_APP_URL)

        .then(response => response.json())

        .then(data => {

            const table = document.getElementById("submissionTable");
            table.innerHTML = "";

            // ── Build reverse map: LeetCode number (string) → canonical lowercase name ──
            const lcNumToName = {};
            if (typeof leetcodeMap !== 'undefined') {
                Object.entries(leetcodeMap).forEach(([name, num]) => {
                    lcNumToName[String(num)] = name;
                });
            }

            // ── Build Set of LeetCode numbers for all posted questions ──
            const postedNumbers = new Set();          // e.g. {"169","724","121", ...}
            const postedNumToName = {};               // "169" → "Majority Element"
            if (typeof postedQuestions !== 'undefined' && typeof leetcodeMap !== 'undefined') {
                postedQuestions.forEach(q => {
                    const num = leetcodeMap[q.toLowerCase().trim()];
                    if (num) {
                        postedNumbers.add(String(num));
                        postedNumToName[String(num)] = q;
                    }
                });
            }

            const totalPosted = (typeof postedQuestions !== 'undefined') ? postedQuestions.length : 0;

            // ── Aggregate per member ──
            const members = {};

            data.forEach(row => {

                const profile    = row[0];
                const problemName = row[1];
                const time       = row[5];
                const lcNo       = row[6] ? String(row[6]).trim() : "";

                if (!profile) return;

                if (!members[profile]) {
                    members[profile] = {
                        lastTime: time,
                        submittedNumbers: new Set(),   // LeetCode numbers submitted
                        solvedNames: new Set()         // fallback: canonical lowercase names
                    };
                }

                if (lcNo && lcNumToName[lcNo]) {
                    // ✅ Primary: number-based — most reliable
                    members[profile].submittedNumbers.add(lcNo);
                } else if (problemName) {
                    // ⚠️ Fallback for old rows without a LeetCode number
                    const key = problemName.toLowerCase().trim();
                    const canonical = (typeof questionAliases !== 'undefined' && questionAliases[key])
                        ? questionAliases[key]
                        : key;
                    // Try to resolve to a number via leetcodeMap
                    const resolvedNum = typeof leetcodeMap !== 'undefined'
                        ? leetcodeMap[canonical]
                        : null;
                    if (resolvedNum) {
                        members[profile].submittedNumbers.add(String(resolvedNum));
                    } else {
                        members[profile].solvedNames.add(canonical);
                    }
                }

                members[profile].lastTime = time;

            });

            // ── Sort by most submitted (descending) ──
            const sortedProfiles = Object.keys(members).sort(
                (a, b) => {
                    const aCount = [...postedNumbers].filter(n =>
                        members[a].submittedNumbers.has(n) ||
                        members[a].solvedNames.has(lcNumToName[n])
                    ).length;
                    const bCount = [...postedNumbers].filter(n =>
                        members[b].submittedNumbers.has(n) ||
                        members[b].solvedNames.has(lcNumToName[n])
                    ).length;
                    return bCount - aCount;
                }
            );

            sortedProfiles.forEach(profile => {

                const member = members[profile];

                // ── Compute missing: posted questions NOT submitted by this member ──
                const missingNums = [...postedNumbers].filter(num => {
                    // Check by number first
                    if (member.submittedNumbers.has(num)) return false;
                    // Fallback: check by name (for old submissions resolved by name)
                    const name = lcNumToName[num];
                    if (name && member.solvedNames.has(name)) return false;
                    return true;
                });

                const missedCount     = missingNums.length;
                const submittedCount  = totalPosted - missedCount;
                let missingListDisplay = "N/A";

                if (totalPosted > 0) {

                    if (missedCount === 0) {

                        missingListDisplay = '<span style="color: #86efac;">✅ All Caught Up!</span>';

                    } else {

                        const listHtml = missingNums.map(num => {
                            const displayName = postedNumToName[num] || lcNumToName[num] || num;
                            return `<div style="margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px;">• ${num}. ${displayName}</div>`;
                        }).join("");

                        missingListDisplay = `
                            <details style="cursor: pointer; text-align: left;">
                                <summary style="font-weight: 500; outline: none; color: #000000ff;">View Missing (${missedCount})</summary>
                                <div style="margin-top: 8px; max-height: 120px; overflow-y: auto; padding-right: 5px; font-size: 0.9em; color: #f87171;">
                                    ${listHtml}
                                </div>
                            </details>
                        `;

                    }

                }

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${profile}</td>
                    <td>${submittedCount}</td>
                    <td style="max-width: 250px; white-space: normal; line-height: 1.4;">${missingListDisplay}</td>
                    <td>${member.lastTime || "—"}</td>
                `;

                table.appendChild(tr);

            });

        })

        .catch(error => {

            console.error("Failed to load submissions:", error);

            const table = document.getElementById("submissionTable");
            table.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#f87171;">⚠️ Failed to load data. Please refresh.</td></tr>`;

        });

}




// ============================================
// STATUS
// ============================================

function showStatus(message, type) {

    status.innerHTML = message;

    if (type === "success")
        status.style.background = "#D9F99D";

    else if (type === "error")
        status.style.background = "#FCA5A5";

    else
        status.style.background = "#BFDBFE";

}

// ============================================
// CLEAR FORM
// ============================================

function clearForm() {

    document.getElementById("profile").value = "";
    document.getElementById("problem").value = "";
    document.getElementById("day").value = "";
    document.getElementById("leetcode_no").value = "";
    document.getElementById("url").value = "";
    document.getElementById("difficulty").selectedIndex = 0;

}

// ============================================
// PLACEHOLDERS
// ============================================

const placeholders = [
    "Example : Two Sum 🚀",
    "Example : Merge Strings",
    "Example : Binary Search",
    "Example : Valid Parentheses",
    "Example : House Robber"
];

let i = 0;

setInterval(() => {

    document.getElementById("problem").placeholder = placeholders[i];

    i = (i + 1) % placeholders.length;

}, 2500);

// ============================================
// GREETING
// ============================================

const title = document.querySelector(".hero h1");

const hour = new Date().getHours();

if (hour < 12)
    title.innerHTML = "☀️ Good Morning, Coder!";
else if (hour < 17)
    title.innerHTML = "🚀 Good Afternoon, Coder!";
else
    title.innerHTML = "🌙 Good Evening, Coder!";

// ============================================
// LOAD TABLE
// ============================================

window.onload = loadSubmissions;