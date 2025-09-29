document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const imageFormat = document.getElementById('image-format');
  const jpegQualityContainer = document.getElementById('jpeg-quality-container');
  const jpegQuality = document.getElementById('jpeg-quality');
  const jpegQualityValue = document.getElementById('jpeg-quality-value');
  const afterCaptureAction = document.getElementById('after-capture-action');
  const borderColor = document.getElementById('border-color');
  const borderWidth = document.getElementById('border-width');
  const borderWidthValue = document.getElementById('border-width-value');
  const captureDelay = document.getElementById('capture-delay');
  const takeScreenshotBtn = document.getElementById('take-screenshot');
  const captureFullPageBtn = document.getElementById('capture-full-page');
  const resetSettingsBtn = document.getElementById('reset-settings');
  const shortcutLink = document.getElementById('shortcut-link');
  const delayIndicator = document.getElementById('delay-indicator');
  const delayCountdown = document.getElementById('delay-countdown');

  const CONFIG_KEY = 'qss_config';
  let currentConfig = {};

  // Load the configuration from storage, using defaultConfig as a fallback
  function loadSettings() {
    chrome.storage.sync.get({ [CONFIG_KEY]: defaultConfig }, (result) => {
      currentConfig = result[CONFIG_KEY];
      updateUIFromConfig();
    });
  }

  // Update all UI elements based on the current configuration
  function updateUIFromConfig() {
    imageFormat.value = currentConfig.imageFormat;
    jpegQuality.value = currentConfig.jpegQuality;
    jpegQualityValue.textContent = currentConfig.jpegQuality;
    afterCaptureAction.value = currentConfig.afterCaptureAction;
    borderColor.value = currentConfig.borderColor;
    borderWidth.value = currentConfig.borderWidth;
    borderWidthValue.textContent = `${currentConfig.borderWidth}px`;
    captureDelay.value = currentConfig.captureDelay;

    updateJpegQualityVisibility();
  }

  // Save the current state of the UI to the configuration object in storage
  function saveSettings() {
    const newConfig = {
      ...currentConfig, // Preserve any settings not in the UI yet
      imageFormat: imageFormat.value,
      jpegQuality: parseInt(jpegQuality.value, 10),
      afterCaptureAction: afterCaptureAction.value,
      borderColor: borderColor.value,
      borderWidth: parseInt(borderWidth.value, 10),
      captureDelay: parseInt(captureDelay.value, 10),
    };
    currentConfig = newConfig;
    chrome.storage.sync.set({ [CONFIG_KEY]: currentConfig });
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
  captureDelay.addEventListener('change', saveSettings);

  // Take Screenshot button
  takeScreenshotBtn.addEventListener('click', () => {
    const delay = currentConfig.captureDelay || 0;

    if (delay > 0) {
      // Show countdown
      takeScreenshotBtn.disabled = true;
      delayIndicator.classList.remove('hidden');
      let countdown = delay;
      delayCountdown.textContent = countdown;

      const interval = setInterval(() => {
        countdown--;
        delayCountdown.textContent = countdown;
        if (countdown <= 0) {
          clearInterval(interval);
          startCapture();
        }
      }, 1000);
    } else {
      startCapture();
    }
  });

  function startCapture() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startScreenshot' });
      window.close();
    });
  }

  // Reset Settings button
  resetSettingsBtn.addEventListener('click', () => {
    currentConfig = { ...defaultConfig };
    chrome.storage.sync.set({ [CONFIG_KEY]: currentConfig }, () => {
      updateUIFromConfig();
    });
  });

  // Shortcut link
  shortcutLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Full Page Capture button
  captureFullPageBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startScrollingCapture' });
      window.close();
    });
  });

  // Initial load
  loadSettings();
});