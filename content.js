// Initialize global observer variables
if (!window.domObserver) {
  window.domObserver = null;
}

if (!window.jobDescriptionObserver) {
  window.jobDescriptionObserver = null;
}

// ===============================
// SINGLE INITIALIZATION BLOCK
// ===============================
if (!window.isContentScriptInitialized) {
  window.isContentScriptInitialized = true;

  // Initialize everything once
  chrome.storage.local.get(['keywords'], (result) => {
    const keywords = result.keywords || [];

    // Initialize all functionality
    highlightJobs(keywords);
    observeDOMChanges();
    monitorJobDescription(keywords);
  });

  // Listen for keyword updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.keywords) {
      highlightKeywords(message.keywords);
      highlightJobs(message.keywords);
      sendResponse({ status: 'success', keywords: message.keywords });
    } else {
      sendResponse({ status: 'error', message: 'No keywords provided.' });
    }
  });
}

// ===============================
// Observe DOM Changes for Job Cards
// ===============================
function observeDOMChanges() {
  const targetNode = document.body;
  const observerConfig = { childList: true, subtree: true };

  // Disconnect existing observer to prevent duplicates
  if (window.domObserver) {
    window.domObserver.disconnect();
  }

  window.domObserver = new MutationObserver(debounce(() => {
    chrome.storage.local.get(['keywords'], (result) => {
      const keywords = result.keywords || [];
      highlightJobs(keywords);
    });
  }, 100)); // Debounce to reduce frequency

  window.domObserver.observe(targetNode, observerConfig);
}

// ===============================
// Detect LinkedIn Dark Mode
// ===============================
function isLinkedInDarkMode() {
  const htmlClassList = document.documentElement.classList;
  return htmlClassList.contains('theme--dark-lix');
}

// ===============================
// Highlight Job Cards Based on Keywords
// ===============================
function highlightJobs(keywords = []) {
  const jobCards = document.querySelectorAll('.job-card-container');
  const darkMode = isLinkedInDarkMode();

  jobCards.forEach((jobCard) => {
    // Try multiple selectors to find the job title
    let titleElement = null;
    let titleText = '';

    const titleSelectors = [
      '.artdeco-entity-lockup__title a span[aria-hidden="true"]',
      '.artdeco-entity-lockup__title a',
      '.artdeco-entity-lockup__title span',
      '.artdeco-entity-lockup__title',
      '.job-card-list__title',
      '.job-card-list__title a',
      'h3 a',
      'h3',
      '[data-job-title]',
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

    // Check if job title contains any keywords
    const shouldHighlight = keywords.some((keyword) =>
      titleText.toLowerCase().includes(keyword.toLowerCase().trim())
    );

    const jobStateElement = jobCard.querySelector(
      '.job-card-container__footer-job-state'
    );
    const jobState = jobStateElement ? jobStateElement.textContent.trim() : '';

    // Reset all styles first
    jobCard.style.backgroundColor = '';
    jobCard.style.border = '';
    jobCard.style.borderRadius = '';
    jobCard.style.filter = '';
    jobCard.style.opacity = '';

    // Apply blur/grayscale for viewed/saved/applied jobs
    const isViewedSavedOrApplied =
      jobState === 'Viewed' || jobState === 'Saved' || jobState === 'Applied';
    if (isViewedSavedOrApplied) {
      jobCard.style.filter = 'blur(2px) grayscale(50%)';
      jobCard.style.opacity = '0.7';
    }

    // Highlight matching jobs that aren't viewed/saved/applied
    if (shouldHighlight && keywords.length > 0 && !isViewedSavedOrApplied) {
      jobCard.style.backgroundColor = "rgba(200, 230, 201, 0.8)";
      jobCard.style.border = "2px solid #A5D6A7";
      jobCard.style.borderRadius = "8px";
    }

    // Apply dark/light mode styling
    const title = jobCard.querySelector('.artdeco-entity-lockup__title');
    if (title) title.style.color = darkMode ? 'white' : 'black';

    const subtitle = jobCard.querySelector(
      '.artdeco-entity-lockup__subtitle span'
    );
    if (subtitle) subtitle.style.color = darkMode ? 'white' : 'black';

    const caption = jobCard.querySelector(
      '.artdeco-entity-lockup__caption span'
    );
    if (caption) caption.style.color = darkMode ? 'white' : 'black';

    const metadata = jobCard.querySelectorAll(
      '.artdeco-entity-lockup__metadata span, .job-card-container__job-insight-text'
    );
    metadata.forEach((item) => {
      item.style.color = darkMode ? 'white' : 'black';
    });

    const footerItems = jobCard.querySelectorAll(
      '.job-card-container__footer-wrapper li span'
    );
    footerItems.forEach((item) => {
      item.style.color = darkMode ? 'white' : 'black';
    });

    if (jobStateElement) {
      jobStateElement.style.color = darkMode ? 'white' : 'black';
      jobStateElement.style.fontWeight = 'bold';
    }
  });
}

// ===============================
// Utility Functions
// ===============================
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
  const jobDescriptionContainer = document.querySelector(
    '.jobs-box__html-content'
  );
  if (!jobDescriptionContainer) return;

  jobDescriptionContainer
    .querySelectorAll('span.highlight')
    .forEach((highlightedSpan) => {
      const parent = highlightedSpan.parentNode;
      parent.replaceChild(
        document.createTextNode(highlightedSpan.textContent),
        highlightedSpan
      );
      parent.normalize();
    });
}

// ===============================
// Highlight Keywords in Job Descriptions
// ===============================
function highlightKeywords(keywords) {
  const jobDescriptionContainer = document.querySelector(
    '.jobs-box__html-content'
  );
  if (!jobDescriptionContainer || !keywords || keywords.length === 0) return;

  clearHighlights();

  const escapedKeywords = keywords.map((keyword) =>
    keyword.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').trim()
  );

  const regexPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

  // Keywords for green highlighting
  const greenKeywords = [
    'U.S. Security Clearance',
    'Clearance',
    'Secret',
    'Citizen',
    'GC',
    'Citizenship',
  ];
  const greenKeywordsRegex = new RegExp(
    `\\b(${greenKeywords
      .map((k) => k.replace(/([.*+?^${}()|[\]\\])/g, '\\$1'))
      .join('|')})\\b`,
    'gi'
  );

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const matches = node.nodeValue.match(regexPattern);
      if (matches) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach((match) => {
          const matchIndex = node.nodeValue.indexOf(match, lastIndex);

          if (matchIndex > lastIndex) {
            fragment.appendChild(
              document.createTextNode(
                node.nodeValue.slice(lastIndex, matchIndex)
              )
            );
          }

          const span = document.createElement('span');
          span.className = 'highlight';

          if (greenKeywordsRegex.test(match)) {
            span.style.backgroundColor = 'green';
            span.style.color = 'white';
          } else {
            span.style.backgroundColor = 'yellow';
            span.style.color = 'black';
          }
          span.textContent = match;
          fragment.appendChild(span);

          lastIndex = matchIndex + match.length;
        });

        if (lastIndex < node.nodeValue.length) {
          fragment.appendChild(
            document.createTextNode(node.nodeValue.slice(lastIndex))
          );
        }

        node.replaceWith(fragment);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach((child) => processNode(child));
    }
  }

  Array.from(jobDescriptionContainer.childNodes).forEach((child) =>
    processNode(child)
  );
}

// ===============================
// Monitor Job Descriptions for Changes
// ===============================
function monitorJobDescription(keywords) {
  waitForElement(
    '.jobs-box__html-content',
    (jobDescriptionContainer) => {
      // Disconnect existing observer to prevent duplicates
      if (window.jobDescriptionObserver) {
        window.jobDescriptionObserver.disconnect();
      }

      // Create new observer with debouncing
      window.jobDescriptionObserver = new MutationObserver(
        debounce(() => {
          highlightKeywords(keywords);
        }, 300)
      );

      window.jobDescriptionObserver.observe(jobDescriptionContainer, {
        childList: true,
        subtree: true,
      });

      // Apply initial highlights
      highlightKeywords(keywords);
    },
    100,
    10000
  );
}