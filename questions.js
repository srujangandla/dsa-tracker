// Add the names of all the problems here. 
// The system will automatically post one question per day based on the START_DATE.
// The system will check user submissions against this list to calculate missing problems.
// Make sure the problem names match exactly (case-insensitive) with what users submit.

// Topic mapping dictionary for canonical fallback
const questionTopicMap = {
    // Arrays
    "majority element": "Arrays",
    "find pivot index": "Arrays",
    "best time to buy and sell stock": "Arrays",
    "single number": "Arrays",
    "pascal's triangle": "Arrays",
    "product of array except self": "Arrays",
    "sort colors": "Arrays",
    "move zeroes": "Arrays",
    "subarray sum equals k": "Arrays",
    "merge sorted array": "Arrays",
    "missing number": "Arrays",
    "intersection of two arrays ii": "Arrays",
    "find all numbers disappeared in an array": "Arrays",
    "find the duplicate number": "Arrays",

    // Strings
    "valid anagram": "Strings",
    "first unique character in a string": "Strings",
    "reverse string": "Strings",
    "reverse vowels of a string": "Strings",
    "length of last word": "Strings",
    "isomorphic strings": "Strings",
    "word pattern": "Strings",
    "detect capital": "Strings",
    "find the index of the first occurrence in a string": "Strings",
    "ransom note": "Strings",
    "longest common prefix": "Strings",
    "merge strings alternately": "Strings",
    "valid palindrome": "Strings",
    "reverse words in a string iii": "Strings",
    "goal parser interpretation": "Strings",
    "find the difference": "Strings",
    "find words that can be formed by characters": "Strings",
    "add strings": "Strings",
    "longest palindrome": "Strings",
    "repeated substring pattern": "Strings",
    "reverse words in a string": "Strings",
    "string compression": "Strings",
    "group anagrams": "Strings",

    // Binary Search
    "search insert position": "Binary Search",
    "search a 2d matrix": "Binary Search",
    "search a 2d matrix ii": "Binary Search",
    "binary search": "Binary Search",
    "first bad version": "Binary Search",
    "find smallest letter greater than target": "Binary Search",
    "find first and last position of element in sorted array": "Binary Search",
    "search in rotated sorted array": "Binary Search",
    "find minimum in rotated sorted array": "Binary Search",
    "search in rotated sorted array ii": "Binary Search",
    "find peak element": "Binary Search",
    "sqrt(x)": "Binary Search",
    "koko eating bananas": "Binary Search",

    // Two Pointers
    "container with most water": "Two Pointers",
    "3sum": "Two Pointers",
    "3sum closest": "Two Pointers",
    "4sum": "Two Pointers",
    "is subsequence": "Two Pointers",

    // Sliding Window
    "maximum average subarray i": "Sliding Window",
    "max consecutive ones iii": "Sliding Window",
    "longest substring without repeating characters": "Sliding Window",
    "permutation in string": "Sliding Window",
    "longest repeating character replacement": "Sliding Window",
    "minimum window substring": "Sliding Window",
    "find all anagrams in a string": "Sliding Window",
    "longest substring with at most two distinct characters": "Sliding Window",

    // Dynamic Programming
    "maximum subarray": "Dynamic Programming",
    "longest palindromic substring": "Dynamic Programming",
    "palindromic substrings": "Dynamic Programming",

    // Stack
    "valid parentheses": "Stack",
    "decode string": "Stack",
    "basic calculator ii": "Stack",

    // Matrix
    "spiral matrix": "Matrix",
    "set matrix zeroes": "Matrix",
    "rotate image": "Matrix",

    // Intervals
    "merge intervals": "Intervals",
    "insert interval": "Intervals",
    "non-overlapping intervals": "Intervals",

    // Math
    "pow(x,n)": "Math"
};

/**
 * Helper to safely extract a question's display name.
 * Works seamlessly with both string and object question definitions.
 */
function getQuestionName(q) {
    if (!q) return "";
    return (typeof q === "object" && q.name) ? q.name : String(q);
}

/**
 * Helper to extract a question's topic.
 * Checks object topic property first, then falls back to questionTopicMap.
 */
function getQuestionTopic(q) {
    if (!q) return "General";
    if (typeof q === "object" && q.topic) return q.topic;
    const name = getQuestionName(q).toLowerCase().trim();
    return questionTopicMap[name] || "General";
}

const allQuestions = [
    { name: "Majority Element", topic: "Arrays" },
    { name: "Find Pivot Index", topic: "Arrays" },
    { name: "Best Time to Buy and Sell Stock", topic: "Arrays" },
    { name: "Single Number", topic: "Arrays" },
    { name: "Search Insert Position", topic: "Binary Search" },
    { name: "Pascal's Triangle", topic: "Arrays" },
    { name: "Pow(x,n)", topic: "Math" },
    { name: "Maximum Subarray", topic: "Dynamic Programming" },
    { name: "Product of Array Except Self", topic: "Arrays" },
    { name: "Sort Colors", topic: "Arrays" },
    { name: "Container With Most Water", topic: "Two Pointers" },
    { name: "Move Zeroes", topic: "Arrays" },
    { name: "Subarray Sum Equals K", topic: "Arrays" },
    { name: "Maximum Average Subarray I", topic: "Sliding Window" },
    { name: "Max Consecutive Ones III", topic: "Sliding Window" },
    { name: "3Sum", topic: "Two Pointers" },
    { name: "3Sum Closest", topic: "Two Pointers" },
    { name: "4Sum", topic: "Two Pointers" },
    { name: "Search a 2D Matrix", topic: "Binary Search" },
    { name: "Search a 2D Matrix II", topic: "Binary Search" },
    { name: "Spiral Matrix", topic: "Matrix" },
    { name: "Valid Anagram", topic: "Strings" },
    { name: "First Unique Character in a String", topic: "Strings" },
    { name: "Reverse String", topic: "Strings" },
    { name: "Reverse Vowels of a String", topic: "Strings" },
    { name: "Length of Last Word", topic: "Strings" },
    { name: "Isomorphic Strings", topic: "Strings" },
    { name: "Word Pattern", topic: "Strings" },
    { name: "Valid Parentheses", topic: "Stack" },
    { name: "Detect Capital", topic: "Strings" },
    { name: "Find the Index of the First Occurrence in a String", topic: "Strings" },
    { name: "Ransom Note", topic: "Strings" },
    { name: "Longest Common Prefix", topic: "Strings" },
    { name: "Merge Strings Alternately", topic: "Strings" },
    { name: "Valid Palindrome", topic: "Strings" },
    { name: "Reverse Words in a String III", topic: "Strings" },
    { name: "Goal Parser Interpretation", topic: "Strings" },
    { name: "Find the Difference", topic: "Strings" },
    { name: "Find Words That Can Be Formed by Characters", topic: "Strings" },
    { name: "Longest Substring Without Repeating Characters", topic: "Sliding Window" },
    { name: "Permutation in String", topic: "Sliding Window" },
    { name: "Longest Palindromic Substring", topic: "Dynamic Programming" },
    { name: "Palindromic Substrings", topic: "Dynamic Programming" },
    { name: "Longest Repeating Character Replacement", topic: "Sliding Window" },
    { name: "Decode String", topic: "Stack" },
    { name: "Minimum Window Substring", topic: "Sliding Window" },
    { name: "Merge Sorted Array", topic: "Arrays" },
    { name: "Add Strings", topic: "Strings" },
    { name: "Binary Search", topic: "Binary Search" },
    { name: "Missing Number", topic: "Arrays" },
    { name: "Is Subsequence", topic: "Two Pointers" },
    { name: "First Bad Version", topic: "Binary Search" },
    { name: "Intersection of Two Arrays II", topic: "Arrays" },
    { name: "Longest Palindrome", topic: "Strings" },
    { name: "Find Smallest Letter Greater Than Target", topic: "Binary Search" },
    { name: "Find All Numbers Disappeared in an Array", topic: "Arrays" },
    { name: "Repeated Substring Pattern", topic: "Strings" },
    { name: "Find First and Last Position of Element in Sorted Array", topic: "Binary Search" },
    { name: "Find the Duplicate Number", topic: "Arrays" },
    { name: "Reverse Words in a String", topic: "Strings" },
    { name: "Search in Rotated Sorted Array", topic: "Binary Search" },
    { name: "Set Matrix Zeroes", topic: "Matrix" },
    { name: "String Compression", topic: "Strings" },
    { name: "Find Minimum in Rotated Sorted Array", topic: "Binary Search" },
    { name: "Rotate Image", topic: "Matrix" },
    { name: "Group Anagrams", topic: "Strings" },
    { name: "Search in Rotated Sorted Array II", topic: "Binary Search" },
    { name: "Merge Intervals", topic: "Intervals" },
    { name: "Find All Anagrams in a String", topic: "Sliding Window" },
    { name: "Find Peak Element", topic: "Binary Search" },
    { name: "Insert Interval", topic: "Intervals" },
    { name: "Basic Calculator II", topic: "Stack" },
    { name: "Sqrt(x)", topic: "Binary Search" },
    { name: "Non-overlapping Intervals", topic: "Intervals" },
    { name: "Longest Substring with At Most Two Distinct Characters", topic: "Sliding Window" },
    { name: "Koko Eating Bananas", topic: "Binary Search" }
];

// The first 36 questions are already posted and will always be visible.
const INITIAL_POSTED_COUNT = 36;

// Start with the first 37 questions already posted
const postedQuestions = allQuestions.slice(0, INITIAL_POSTED_COUNT);

// Set the start date for when the NEW future questions will start posting (Format: YYYY-MM-DD)
// E.g., if set to "2026-08-20", the 38th question will post on that date.
const FUTURE_START_DATE = "2026-08-21";

function appendDailyQuestions() {
    const startDate = new Date(`${FUTURE_START_DATE}T08:00:00`);
    const today = new Date();

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

// ============================================
// ALIASES — common name variations → canonical name
// Add new entries here whenever a user's submission name
// doesn't exactly match the question name above.
// All keys must be LOWERCASE.
// ============================================
const questionAliases = {
    // Stock
    "best time to buy and sell stocks":         "best time to buy and sell stock",
    "best time to buy & sell stock":             "best time to buy and sell stock",
    "best time to buy & sell stocks":            "best time to buy and sell stock",

    // Move Zeroes
    "move zeros":                                "move zeroes",

    // Maximum Average Subarray I
    "maximum average subarray":                  "maximum average subarray i",

    // Subarray Sum Equals K (typo)
    "subaaray sum equals k":                     "subarray sum equals k",
    "subarray sum equal k":                      "subarray sum equals k",
    "sub array sum equals k":                    "subarray sum equals k",

    // Search a 2D Matrix variations
    "search in a 2d matrix":                     "search a 2d matrix",
    "search in 2d matrix":                       "search a 2d matrix",
    "search a 2d matrix 2":                      "search a 2d matrix ii",
    "search in a 2d matrix ii":                  "search a 2d matrix ii",

    // Pow(x,n) spacing
    "pow(x, n)":                                 "pow(x,n)",
    "pow (x,n)":                                 "pow(x,n)",

    // Max Consecutive Ones III
    "max consecutive ones 3":                    "max consecutive ones iii",
    "max consecutive ones":                      "max consecutive ones iii",

    // Reverse Words
    "reverse words in a string 3":               "reverse words in a string iii",
};
