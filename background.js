chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ["content.js"]
    });
});
