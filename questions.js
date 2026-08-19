// Add the names of all the problems here. 
// The system will automatically post one question per day based on the START_DATE.
// The system will check user submissions against this list to calculate missing problems.
// Make sure the problem names match exactly (case-insensitive) with what users submit.

const allQuestions = [
    "Remove Duplicates from Sorted Array",
    "Two Sum",
    "Majority Element",
    "Find Pivot Index",
    "Best Time to Buy and Sell Stock",
    "Single Number",
    "Search Insert Position",
    "Pascal's Triangle",
    "Pow(x,n)",
    "Maximum Subarray",
    "Product of Array Except Self",
    "Sort Colors",
    "Container With Most Water",
    "Move Zeroes",
    "Subarray Sum Equals K",
    "Maximum Average Subarray I",
    "Max Consecutive Ones III",
    "3Sum",
    "3Sum Closest",
    "4Sum",
    "Search a 2D Matrix",
    "Search a 2D Matrix II",
    "Spiral Matrix",
    "Valid Anagram",
    "First Unique Character in a String",
    "Reverse String",
    "Reverse Vowels of a String",
    "Length of Last Word",
    "Isomorphic Strings",
    "Word Pattern",
    "Valid Parentheses",
    "Detect Capital",
    "Find the Index of the First Occurrence in a String",
    "Ransom Note",
    "Longest Common Prefix",
    "Merge Strings Alternately",
    "Valid Palindrome",
    "Reverse Words in a String III",
    "Goal Parser Interpretation",
    "Find the Difference",
    "Find Words That Can Be Formed by Characters",
    "Longest Substring Without Repeating Characters",
    "Permutation in String",
    "Longest Palindromic Substring",
    "Palindromic Substrings",
    "Longest Repeating Character Replacement",
    "Decode String",
    "Minimum Window Substring"
];

// The first 37 questions are already posted and will always be visible.
const INITIAL_POSTED_COUNT = 37;

// Start with the first 37 questions already posted
const postedQuestions = allQuestions.slice(0, INITIAL_POSTED_COUNT);

// Set the start date for when the NEW future questions will start posting (Format: YYYY-MM-DD)
// E.g., if set to "2026-08-20", the 38th question will post on that date.
const FUTURE_START_DATE = "2026-08-20";

function appendDailyQuestions() {
    const startDate = new Date(FUTURE_START_DATE);
    const today = new Date();

    // Normalize both dates to midnight to avoid time-of-day timezone issues
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // Calculate the difference in time
    const diffTime = today.getTime() - startDate.getTime();

    // Calculate the difference in days (+1 so the start date itself counts as 1 future question)
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // If today is before the start date, don't append any future questions yet
    if (diffDays < 0) diffDays = 0;

    // Append future questions one by one based on days passed
    for (let i = 0; i < diffDays; i++) {
        const questionIndex = INITIAL_POSTED_COUNT + i;
        // Check if we still have future questions in the array
        if (questionIndex < allQuestions.length) {
            postedQuestions.push(allQuestions[questionIndex]);
        }
    }
}

// Automatically append the future questions based on today's date
appendDailyQuestions();
