// Wait for the DOM content to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const addKeywordBtn = document.getElementById('add-keyword-btn');
  const keywordBox = document.getElementById('keyword-box');
  const keywordsContainer = document.getElementById('keywords-container');
  const applyHighlightsBtn = document.getElementById('apply-highlights-btn');
  const resetBtn = document.getElementById('reset-btn');

  /**
   * Function to add multiple keywords.
   * - Splits input by commas, trims whitespace, and removes empty entries.
  //  * - Creates a checkbox for each keyword.
   * - Appends each checkbox to the keywords container.
   */
  function addKeywords() {
    const input = keywordBox.value.trim();
    if (input === '') return; // Exit if input is empty

    // Split input into keywords and filter out empty strings
    const keywords = input
      .split(',')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword !== '');

    keywords.forEach((keyword) => {
      // Create a container for the keyword
      const keywordItem = document.createElement('div');
      keywordItem.className = 'keyword-item';

      // Create a checkbox for the keyword
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true; // Checked by default
      checkbox.value = keyword;

      // Create a label for the keyword
      const label = document.createElement('label');
      label.textContent = keyword;

      // Append checkbox and label to the container
      keywordItem.appendChild(checkbox);
      keywordItem.appendChild(label);

      // Add the container to the keywords list
      keywordsContainer.appendChild(keywordItem);
    });

    // Clear the input field and save the updated keywords
    keywordBox.value = '';
    saveKeywords();
  }

  /**
   * Function to save keywords to Chrome storage.
   * - Retrieves all checked keywords.
   * - Stores them in Chrome's local storage.
   */
  function saveKeywords() {
    const keywords = [];
    const checkboxes = keywordsContainer.querySelectorAll(
      'input[type="checkbox"]'
    );

    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        keywords.push(checkbox.value);
      }
    });

    // Save keywords to Chrome storage
    chrome.storage.local.set({ keywords });
  }

  /**
   * Function to load saved keywords from Chrome storage.
   * - Recreates the keyword checkboxes from stored data.
   */
  function loadKeywords() {
    chrome.storage.local.get(['keywords'], (result) => {
      const keywords = result.keywords || [];

      keywords.forEach((keyword) => {
        // Create a container for the keyword
        const keywordItem = document.createElement('div');
        keywordItem.className = 'keyword-item';

        // Create a checkbox for the keyword
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true; // Checked by default
        checkbox.value = keyword;

        // Create a label for the keyword
        const label = document.createElement('label');
        label.textContent = keyword;

        // Append checkbox and label to the container
        keywordItem.appendChild(checkbox);
        keywordItem.appendChild(label);

        // Add the container to the keywords list
        keywordsContainer.appendChild(keywordItem);
      });
    });
  }

  /**
   * Event listener for the "Add" button.
   * - Triggers the `addKeywords` function to process input keywords.
   */
  addKeywordBtn.addEventListener('click', addKeywords);

  /**
   * Event listener for the Enter key in the input box.
   * - Triggers the `addKeywords` function when Enter is pressed.
   */
  keywordBox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission
      addKeywords();
    }
  });

  /**
   * Event listener for the "Apply Highlights" button.
   * - Sends the list of keywords to the active tab.
   */
  applyHighlightsBtn.addEventListener('click', () => {
    const keywords = [];
    const checkboxes = keywordsContainer.querySelectorAll(
      'input[type="checkbox"]'
    );

    // Collect all checked keywords
    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        keywords.push(checkbox.value);
      }
    });

    // Send keywords to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { keywords }, (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              'Error sending message:',
              chrome.runtime.lastError.message
            );
          } else {
            console.log('Message sent successfully:', response);
          }
        });
      } else {
        console.error('No active tab found.');
      }
    });
  });

  /**
   * Event listener for the "Reset" button.
   * - Clears the keyword list and removes stored keywords from Chrome storage.
   */
  resetBtn.addEventListener('click', () => {
    keywordsContainer.innerHTML = ''; // Clear the keywords container
    chrome.storage.local.set({ keywords: [] }); // Remove stored keywords
  });

  // Load saved keywords when the popup opens
  loadKeywords();
});
