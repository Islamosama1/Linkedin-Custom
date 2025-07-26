if (!window.domObserver) {
    window.domObserver = null;
}

if (!window.jobDescriptionObserver) {
    window.jobDescriptionObserver = null;
}
if (!window.isContentScriptInitialized) {
    window.isContentScriptInitialized = true;

    // Final Initialization Logic
    chrome.storage.local.get(['keywords'], (result) => {
        const keywords = result.keywords || [];

        highlightJobs(keywords); // Initial highlights for job cards
        observeDOMChanges(); // Monitor job list dynamically
        monitorJobDescription(keywords); // Monitor and highlight job descriptions
    });
    // Listen for Keyword Updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.keywords) {
            highlightKeywords(message.keywords); // Apply updated highlights
            highlightJobs(message.keywords); // Apply updated job card highlights
            sendResponse({ status: "success", keywords: message.keywords });
        } else {
            sendResponse({ status: "error", message: "No keywords provided." });
        }
    });
}
// ===============================
// Observe DOM Changes for Job Cards
// ===============================
// Updated Observe DOM Changes function
function observeDOMChanges() {
    const targetNode = document.body; // Monitor the entire page for changes
    const observerConfig = { childList: true, subtree: true };

    // Disconnect and reset the existing observer if it's already active
    if (window.domObserver) {
        window.domObserver.disconnect();
    }

    window.domObserver = new MutationObserver(() => {
        // Get current keywords from storage for both job description and title highlighting
        chrome.storage.local.get(['keywords'], (result) => {
            const keywords = result.keywords || [];
            highlightJobs(keywords); // Reapply highlights when the DOM changes
        });
    });

    window.domObserver.observe(targetNode, observerConfig);
}
// ===============================
// Detect LinkedIn Dark Mode
// ===============================
function isLinkedInDarkMode() {
    const htmlClassList = document.documentElement.classList;
    return htmlClassList.contains('theme--dark-lix'); // LinkedIn dark mode indicator
}
// ===============================
// Highlight Job Cards Based on State
// ===============================
// ===============================
// Updated Highlight Job Cards
// ===============================
function highlightJobs(keywords = []) {
    const jobCards = document.querySelectorAll('.job-card-container'); // Select all job cards
    const darkMode = isLinkedInDarkMode(); // Detect if dark mode is active

    jobCards.forEach((jobCard) => {
        // Try multiple selectors to find the job title
        let titleElement = null;
        let titleText = '';

        // Try different possible selectors for job titles
        const titleSelectors = [
            '.artdeco-entity-lockup__title a span[aria-hidden="true"]',
            '.artdeco-entity-lockup__title a',
            '.artdeco-entity-lockup__title span',
            '.artdeco-entity-lockup__title',
            '.job-card-list__title',
            '.job-card-list__title a',
            'h3 a',
            'h3',
            '[data-job-title]'
        ];

        for (const selector of titleSelectors) {
            titleElement = jobCard.querySelector(selector);
            if (titleElement) {
                titleText = titleElement.textContent || titleElement.innerText || '';
                if (titleText.trim()) {
                    break;
                }
            }
        }

        // Check if job title contains any of the user's keywords
        const shouldHighlight = keywords.some(keyword =>
            titleText.toLowerCase().includes(keyword.toLowerCase().trim())
        );

        const jobStateElement = jobCard.querySelector('.job-card-container__footer-job-state');
        const jobState = jobStateElement ? jobStateElement.textContent.trim() : ''; // Get the job state text, or empty string if no state

        // FIRST: Reset all styles
        jobCard.style.backgroundColor = "";
        jobCard.style.border = "";
        jobCard.style.borderRadius = "";
        jobCard.style.filter = "";
        jobCard.style.opacity = "";

        // SECOND: Apply blur/grayscale for viewed/saved/applied jobs
        const isViewedSavedOrApplied = jobState === "Viewed" || jobState === "Saved" || jobState === "Applied";
        if (isViewedSavedOrApplied) {
            jobCard.style.filter = "blur(2px) grayscale(50%)";
            jobCard.style.opacity = "0.7";
        }

        // THIRD: Apply red highlighting for jobs matching user's keywords (only if NOT viewed/saved/applied)
        if (shouldHighlight && keywords.length > 0 && !isViewedSavedOrApplied) {
            const matchedKeywords = keywords.filter(keyword =>
                titleText.toLowerCase().includes(keyword.toLowerCase().trim())
            );

            // jobCard.style.backgroundColor = "rgba(20, 134, 9, 0.8)"; // Darker red background
            // jobCard.style.border = "2px solid green"; // Red border
            jobCard.style.backgroundColor = "rgba(200, 230, 201, 0.8)"; // Soft mint green
            jobCard.style.border = "2px solid #A5D6A7"; // Lighter, pastel green

            jobCard.style.borderRadius = "8px"; // Rounded corners
        }

        // Apply dark/light mode styling to additional job card elements
        const title = jobCard.querySelector('.artdeco-entity-lockup__title');
        if (title) title.style.color = darkMode ? "white" : "black";

        const subtitle = jobCard.querySelector('.artdeco-entity-lockup__subtitle span');
        if (subtitle) subtitle.style.color = darkMode ? "white" : "black";

        const caption = jobCard.querySelector('.artdeco-entity-lockup__caption span');
        if (caption) caption.style.color = darkMode ? "white" : "black";

        const metadata = jobCard.querySelectorAll('.artdeco-entity-lockup__metadata span, .job-card-container__job-insight-text');
        metadata.forEach((item) => {
            item.style.color = darkMode ? "white" : "black";
        });

        const footerItems = jobCard.querySelectorAll('.job-card-container__footer-wrapper li span');
        footerItems.forEach((item) => {
            item.style.color = darkMode ? "white" : "black";
        });

        if (jobStateElement) {
            jobStateElement.style.color = darkMode ? "white" : "black";
            jobStateElement.style.fontWeight = "bold"; // Bold styling for job state
        }
    });
}
// Highlight keywords in a specific element
function highlightKeywordsInElement(element, keywords) {
    if (!element || keywords.length === 0) return;

    // Clear existing highlights
    clearHighlights();

    const escapedKeywords = keywords.map((keyword) =>
        keyword.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').trim()
    );
    const regexPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const matches = node.nodeValue.match(regexPattern);
            if (matches) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;

                matches.forEach((match) => {
                    const matchIndex = node.nodeValue.indexOf(match, lastIndex);

                    if (matchIndex > lastIndex) {
                        fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, matchIndex)));
                    }

                    const span = document.createElement('span');
                    span.className = 'highlight';
                    span.style.backgroundColor = 'yellow';
                    span.style.color = 'black';
                    span.textContent = match;
                    fragment.appendChild(span);

                    lastIndex = matchIndex + match.length;
                });

                if (lastIndex < node.nodeValue.length) {
                    fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
                }

                node.replaceWith(fragment);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach((child) => processNode(child));
        }
    }

    Array.from(element.childNodes).forEach((child) => processNode(child));
}

function observeJobChanges() {
    const targetNode = document.querySelector('.jobs-search-results-list');
    if (!targetNode) return;

    const observer = new MutationObserver(() => {
        // Fetch stored keywords and re-monitor the job description
        chrome.storage.local.get(['keywords'], (result) => {
            const keywords = result.keywords || [];
            monitorJobDescription(keywords); // Monitor the new job description container
        });

    });

    observer.observe(targetNode, { childList: true, subtree: true });
}
function waitForElement(selector, callback, interval = 100, timeout = 5000) {
    const startTime = Date.now();

    const checkExist = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
            clearInterval(checkExist);
            callback(element);
        } else if (Date.now() - startTime > timeout) {
            clearInterval(checkExist);
        }
    }, interval);
}


function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ===============================
// Clear Existing Keyword Highlights
// ===============================
function clearHighlights() {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');
    if (!jobDescriptionContainer) return;

    jobDescriptionContainer.querySelectorAll('span.highlight').forEach((highlightedSpan) => {
        const parent = highlightedSpan.parentNode;
        parent.replaceChild(document.createTextNode(highlightedSpan.textContent), highlightedSpan);
        parent.normalize(); // Merge adjacent text nodes
    });
}

// ===============================
// Highlight Selected Keywords in Job Descriptions
// ===============================
function highlightKeywords(keywords) {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');
    if (!jobDescriptionContainer || !keywords || keywords.length === 0) return;

    // Clear existing highlights
    clearHighlights();

    // Escape special characters in keywords for regex
    const escapedKeywords = keywords.map((keyword) =>
        keyword.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').trim()
    );

    const regexPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

    // Define keywords for red highlighting
    const redKeywords = ['U.S. Security Clearance', 'Clearance', 'Secret', 'Citizen', 'GC', 'Citizenship'];
    const redKeywordsRegex = new RegExp(`\\b(${redKeywords.map((k) => k.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')).join('|')})\\b`, 'gi');

    // Highlight text nodes recursively
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const matches = node.nodeValue.match(regexPattern);
            if (matches) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;

                matches.forEach((match) => {
                    const matchIndex = node.nodeValue.indexOf(match, lastIndex);

                    if (matchIndex > lastIndex) {
                        fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, matchIndex)));
                    }

                    const span = document.createElement('span');
                    span.className = 'highlight';

                    if (redKeywordsRegex.test(match)) {
                        span.style.backgroundColor = 'red'; // Red for specific keywords
                        span.style.color = 'white';
                    } else {
                        span.style.backgroundColor = 'yellow'; // Yellow for others
                        span.style.color = 'black';
                    }
                    span.textContent = match;
                    fragment.appendChild(span);

                    lastIndex = matchIndex + match.length;
                });

                if (lastIndex < node.nodeValue.length) {
                    fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
                }

                node.replaceWith(fragment);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach((child) => processNode(child));
        }
    }

    Array.from(jobDescriptionContainer.childNodes).forEach((child) => processNode(child));
}
// ===============================
// Monitor Job Descriptions for Changes
// ===============================
function monitorJobDescription(keywords) {
    // Wait for the "About the job" container
    waitForElement('.jobs-box__html-content', (jobDescriptionContainer) => {
        // Disconnect any existing observer
        if (window.jobDescriptionObserver) {
            window.jobDescriptionObserver.disconnect();
        }

        // Create a new observer for the job description
        window.jobDescriptionObserver = new MutationObserver(debounce(() => {
            highlightKeywords(keywords); // Apply keyword highlights
        }, 300)); // Debounce by 300ms

        // Observe the container for changes
        window.jobDescriptionObserver.observe(jobDescriptionContainer, { childList: true, subtree: true });

        // Apply highlights initially
        highlightKeywords(keywords);
    }, 100, 10000); // Wait up to 10 seconds for the container
}
// ===============================
// Final Initialization
// ===============================
chrome.storage.local.get(['keywords'], (result) => {
    const keywords = result.keywords || [];
    // Initialize observers and highlights
    highlightJobs(keywords); // Initial highlights for job cards
    observeDOMChanges(); // Monitor job list dynamically
    monitorJobDescription(keywords); // Monitor and highlight job descriptions
});
// ===============================
// Listen for Keyword Updates
// ===============================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.keywords) {
        highlightKeywords(message.keywords); // Apply updated highlights to job descriptions
        highlightJobs(message.keywords); // Apply updated highlights to job cards
        sendResponse({ status: "success", keywords: message.keywords });
    } else {
        sendResponse({ status: "error", message: "No keywords provided." });
    }
});
// ===============================
// Initialize Observers and Highlights
// ===============================
observeDOMChanges();
observeJobChanges();
chrome.storage.local.get(['keywords'], (result) => {
    const keywords = result.keywords || [];
    highlightJobs(keywords);
});