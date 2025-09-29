document.addEventListener('DOMContentLoaded', () => {
  const imageFormat = document.getElementById('image-format');
  const jpegQualityContainer = document.getElementById('jpeg-quality-container');
  const jpegQuality = document.getElementById('jpeg-quality');
  const jpegQualityValue = document.getElementById('jpeg-quality-value');
  const afterCaptureAction = document.getElementById('after-capture-action');
  const borderColor = document.getElementById('border-color');
  const borderWidth = document.getElementById('border-width');
  const borderWidthValue = document.getElementById('border-width-value');
  const takeScreenshotBtn = document.getElementById('take-screenshot');
  const resetSettingsBtn = document.getElementById('reset-settings');
  const shortcutLink = document.getElementById('shortcut-link');

  const defaults = {
    imageFormat: 'png',
    jpegQuality: 92,
    afterCaptureAction: 'copy',
    borderColor: '#00d9ff',
    borderWidth: 3,
  };

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(defaults, (items) => {
      imageFormat.value = items.imageFormat;
      jpegQuality.value = items.jpegQuality;
      jpegQualityValue.textContent = items.jpegQuality;
      afterCaptureAction.value = items.afterCaptureAction;
      borderColor.value = items.borderColor;
      borderWidth.value = items.borderWidth;
      borderWidthValue.textContent = `${items.borderWidth}px`;

      updateJpegQualityVisibility();
    });
  }

  // Save settings to storage
  function saveSettings() {
    const settings = {
      imageFormat: imageFormat.value,
      jpegQuality: parseInt(jpegQuality.value, 10),
      afterCaptureAction: afterCaptureAction.value,
      borderColor: borderColor.value,
      borderWidth: parseInt(borderWidth.value, 10),
    };
    chrome.storage.sync.set(settings);
  }

  function updateJpegQualityVisibility() {
    jpegQualityContainer.style.display =
      imageFormat.value === 'jpeg' ? 'flex' : 'none';
  }

  // Event Listeners
  imageFormat.addEventListener('change', () => {
    updateJpegQualityVisibility();
    saveSettings();
  });
  jpegQuality.addEventListener('input', () => {
    jpegQualityValue.textContent = jpegQuality.value;
  });
  jpegQuality.addEventListener('change', saveSettings);
  afterCaptureAction.addEventListener('change', saveSettings);
  borderColor.addEventListener('input', saveSettings);
  borderWidth.addEventListener('input', () => {
    borderWidthValue.textContent = `${borderWidth.value}px`;
  });
  borderWidth.addEventListener('change', saveSettings);

  // Take Screenshot button
  takeScreenshotBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startScreenshot' });
      window.close();
    });
  });

  // Reset Settings button
  resetSettingsBtn.addEventListener('click', () => {
    chrome.storage.sync.set(defaults, () => {
      loadSettings();
      // Optional: show a confirmation message
    });
  });

  // Shortcut link
  shortcutLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Initial load
  loadSettings();
});