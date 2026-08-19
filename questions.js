// Add the names of all the problems here. 
// The system will automatically post one question per day based on the START_DATE.
// The system will check user submissions against this list to calculate missing problems.
// Make sure the problem names match exactly (case-insensitive) with what users submit.

const allQuestions = [
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
    "Minimum Window Substring",
    "Merge Sorted Array",
    "Add Strings",
    "Binary Search",
    "Missing Number",
    "Is Subsequence",
    "First Bad Version",
    "Intersection of Two Arrays II",
    "Longest Palindrome",
    "Find Smallest Letter Greater Than Target",
    "Find All Numbers Disappeared in an Array",
    "Repeated Substring Pattern",
    "Find First and Last Position of Element in Sorted Array",
    "Find the Duplicate Number",
    "Reverse Words in a String",
    "Search in Rotated Sorted Array",
    "Set Matrix Zeroes",
    "String Compression",
    "Find Minimum in Rotated Sorted Array",
    "Rotate Image",
    "Group Anagrams",
    "Search in Rotated Sorted Array II",
    "Merge Intervals",
    "Find All Anagrams in a String",
    "Find Peak Element",
    "Insert Interval",
    "Basic Calculator II",
    "Sqrt(x)",
    "Non-overlapping Intervals",
    "Longest Substring with At Most Two Distinct Characters",
    "Koko Eating Bananas",
];

// The first 37 questions are already posted and will always be visible.
const INITIAL_POSTED_COUNT = 35;

// Start with the first 37 questions already posted
const postedQuestions = allQuestions.slice(0, INITIAL_POSTED_COUNT);

// Set the start date for when the NEW future questions will start posting (Format: YYYY-MM-DD)
// E.g., if set to "2026-08-20", the 38th question will post on that date.
const FUTURE_START_DATE = "2026-08-20";

function appendDailyQuestions() {
    const startDate = new Date(`${FUTURE_START_DATE}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    const daysSinceStart = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
    );

    if (daysSinceStart < 0) return;

    const questionsToAdd = Math.min(
        daysSinceStart + 1,
        allQuestions.length - INITIAL_POSTED_COUNT
    );

    for (let i = 0; i < questionsToAdd; i++) {
        postedQuestions.push(
            allQuestions[INITIAL_POSTED_COUNT + i]
        );
    }
}

// Automatically append the future questions based on today's date
appendDailyQuestions();
