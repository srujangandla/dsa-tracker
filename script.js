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

async function loadSubmissions(){

    try{

        const res = await fetch(WEB_APP_URL);

        const data = await res.json();

        const table = document.getElementById("submissionTable");

        table.innerHTML = "";

        data.forEach(row=>{

            table.innerHTML += `
            <tr>
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
                <td>${row[5]}</td>
            </tr>
            `;

        });

    }

    catch(err){

        console.error("Table Load Error:",err);

    }

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