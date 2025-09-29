chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureVisibleTab') {
    const { format = 'png', quality = 92 } = request;

    const options = { format };
    if (format === 'jpeg') {
      options.quality = quality;
    }

    chrome.tabs.captureVisibleTab(null, options, (dataUrl) => {
      if (chrome.runtime.lastError) {
        // Handle error, e.g., if the page is protected
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // Indicates an asynchronous response
  }
});