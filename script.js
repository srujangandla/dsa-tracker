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

    if (!profile) return showStatus("⚠ Enter your name.","error");
    if (!problem) return showStatus("📘 Enter problem name.","error");
    if (!day) return showStatus("📅 Enter day.","error");
    if (!url) return showStatus("🔗 Enter submission URL.","error");

    showStatus("⏳ Submitting...","loading");

    const payload = {
        profile,
        problem,
        day,
        difficulty,
        url
    };

    try{

        await fetch(WEB_APP_URL,{
            method:"POST",
            mode:"no-cors",
            body:JSON.stringify(payload)
        });

        showStatus("✅ Submitted Successfully!","success");

        clearForm();

        // wait for sheet update
        setTimeout(loadSubmissions,1000);

    }
    catch(err){

        console.error(err);

        showStatus("❌ Failed to submit.","error");

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

        const members = {};

        // Count submissions and store latest submission
        data.forEach(row => {

            const profile = row[0];
            const day = row[2];
            const time = row[5];

            if (!members[profile]) {

                members[profile] = {
                    total: 0,
                    lastDay: day,
                    lastTime: time
                };

            }

            members[profile].total++;

            members[profile].lastDay = day;
            members[profile].lastTime = time;

        });

        // Today's challenge day
        const todayDay = document.getElementById("day").value.trim();

        Object.keys(members).forEach(profile => {

            const member = members[profile];

            const status =
                member.lastDay === todayDay
                ? "✅ Submitted"
                : "❌ Pending";

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${profile}</td>
                <td>${member.total}</td>
                <td>${status}</td>
                <td>${member.lastTime}</td>
            `;

            table.appendChild(tr);

        });

    })

    .catch(error => {

        console.error(error);

    });

}

// ============================================
// STATUS
// ============================================

function showStatus(message,type){

    status.innerHTML = message;

    if(type==="success")
        status.style.background="#D9F99D";

    else if(type==="error")
        status.style.background="#FCA5A5";

    else
        status.style.background="#BFDBFE";

}

// ============================================
// CLEAR FORM
// ============================================

function clearForm(){

    document.getElementById("profile").value="";
    document.getElementById("problem").value="";
    document.getElementById("day").value="";
    document.getElementById("url").value="";
    document.getElementById("difficulty").selectedIndex=0;

}

// ============================================
// PLACEHOLDERS
// ============================================

const placeholders=[
    "Example : Two Sum 🚀",
    "Example : Merge Strings",
    "Example : Binary Search",
    "Example : Valid Parentheses",
    "Example : House Robber"
];

let i=0;

setInterval(()=>{

    document.getElementById("problem").placeholder=placeholders[i];

    i=(i+1)%placeholders.length;

},2500);

// ============================================
// GREETING
// ============================================

const title=document.querySelector(".hero h1");

const hour=new Date().getHours();

if(hour<12)
    title.innerHTML="☀️ Good Morning, Coder!";
else if(hour<17)
    title.innerHTML="🚀 Good Afternoon, Coder!";
else
    title.innerHTML="🌙 Good Evening, Coder!";

// ============================================
// LOAD TABLE
// ============================================

window.onload=loadSubmissions;