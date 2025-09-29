let isSelecting = false;
let startX, startY;
let overlay, selectionBox, toolbar;
let screenshotData;
let isActive = false;
let settings = {};

const CONFIG_KEY = 'qss_config';

// Load settings from storage, with a fallback to defaultConfig
function loadSettings() {
  // defaultConfig is available from the injected default-config.js
  chrome.storage.sync.get({ [CONFIG_KEY]: defaultConfig }, (result) => {
    settings = result[CONFIG_KEY];
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes[CONFIG_KEY]) {
    settings = changes[CONFIG_KEY].newValue;
  }
});

// Initial load of settings
loadSettings();

// Listen for the editor to signal that it has closed
document.addEventListener('qss:editor-closed', () => {
  // Reset state after editor is done
  isActive = false;
  screenshotData = null;
});

// Prevent Ctrl+S default behavior
document.addEventListener(
  'keydown',
  (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!isActive) {
        captureAndStartSelection();
      }
      return false;
    }

    if (e.key === 'Escape' && isActive) {
      cleanup();
    }
  },
  true
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startScreenshot') {
    captureAndStartSelection();
  }
});

function captureAndStartSelection() {
  if (isActive) return;
  isActive = true;

  const message = {
    action: 'captureVisibleTab',
    format: settings.imageFormat,
    quality: settings.jpegQuality,
  };

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      showNotification('Error: Could not capture this page.');
      cleanup();
      return;
    }
    if (response && response.dataUrl) {
      screenshotData = response.dataUrl;
      createOverlay();
    } else {
      console.error('Failed to capture tab.');
      showNotification('Error: Failed to get screenshot data.');
      cleanup();
    }
  });
}

function createOverlay() {
  const imageUrl = `url("${screenshotData}")`;

  overlay = document.createElement('div');
  overlay.id = 'screenshot-overlay';
  overlay.style.backgroundImage = imageUrl;

  selectionBox = document.createElement('div');
  selectionBox.id = 'screenshot-selection';
  selectionBox.style.border = `${settings.borderWidth}px solid ${settings.borderColor}`;
  selectionBox.style.backgroundImage = imageUrl;

  toolbar = document.createElement('div');
  toolbar.id = 'screenshot-toolbar';
  toolbar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px;">
      <span>📸 Click and drag to select area</span>
      <span style="opacity: 0.7;">Press ESC to cancel</span>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(selectionBox);
  document.body.appendChild(toolbar);

  overlay.addEventListener('mousedown', handleMouseDown);
  overlay.addEventListener('mousemove', handleMouseMove);
  overlay.addEventListener('mouseup', handleMouseUp);
}

function handleMouseDown(e) {
  e.preventDefault();
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
}

function handleMouseMove(e) {
  if (!isSelecting) return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);

  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
  selectionBox.style.backgroundPosition = `-${left}px -${top}px`;

  let label = selectionBox.querySelector('.dimensions-label');
  if (!label) {
    label = document.createElement('div');
    label.className = 'dimensions-label';
    selectionBox.appendChild(label);
  }
  label.textContent = `${Math.round(width)} × ${Math.round(height)}`;
}

function handleMouseUp(e) {
  if (!isSelecting) return;
  isSelecting = false;

  const endX = e.clientX;
  const endY = e.clientY;

  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  if (width > 5 && height > 5) {
    // Clean up the selection UI before launching the editor
    if (overlay) overlay.remove();
    if (selectionBox) selectionBox.remove();
    if (toolbar) toolbar.remove();

    launchEditor(x, y, width, height);
  } else {
    cleanup();
  }
}

async function launchEditor(x, y, width, height) {
  const img = new Image();
  img.onload = async () => {
    // Create a canvas with the selected portion of the screenshot
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    croppedCanvas.width = width * dpr;
    croppedCanvas.height = height * dpr;

    ctx.drawImage(
      img,
      x * dpr,
      y * dpr,
      width * dpr,
      height * dpr,
      0,
      0,
      width * dpr,
      height * dpr
    );
    const croppedImageDataUrl = croppedCanvas.toDataURL();

    // Fetch and inject editor UI
    const editorWrapper = document.createElement('div');
    editorWrapper.id = 'qss-editor-wrapper';
    document.body.appendChild(editorWrapper);

    try {
      const editorUrl = chrome.runtime.getURL('editor.html');
      const response = await fetch(editorUrl);
      editorWrapper.innerHTML = await response.text();

      // Inject CSS
      const cssUrl = chrome.runtime.getURL('editor.css');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = cssUrl;
      document.head.appendChild(link);

      // Pass data to the editor's script
      const editorCanvas = document.getElementById('qss-editor-canvas');
      editorCanvas.dataset.imageDataUrl = croppedImageDataUrl;
      editorCanvas.dataset.config = JSON.stringify(settings);

      // Load editor script
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('editor.js');
      script.type = 'module';
      document.head.appendChild(script);
    } catch (error) {
      console.error('QSS Error: Failed to load the editor.', error);
      showNotification('Error: Could not load the annotation editor.');
      cleanup();
    }
  };
  img.onerror = () => {
    console.error('QSS Error: The screenshot image could not be loaded.');
    showNotification('Error: Failed to load screenshot image.');
    cleanup();
  };
  img.src = screenshotData;
}

// This listener is triggered by the editor when the user clicks "Confirm"
document.addEventListener('qss:process-image', (e) => {
  const { dataUrl } = e.detail;
  const mimeType = `image/${settings.imageFormat}`;
  const quality =
    settings.imageFormat === 'jpeg' ? settings.jpegQuality / 100 : undefined;

  switch (settings.afterCaptureAction) {
    case 'copy':
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const item = new ClipboardItem({ [mimeType]: blob });
          navigator.clipboard
            .write([item])
            .then(() => showNotification('Screenshot copied to clipboard!'))
            .catch((err) => {
              console.error('Failed to copy:', err);
              showNotification('Error: Failed to copy screenshot');
            });
        });
      break;
    case 'download':
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `Screenshot-${timestamp}.${settings.imageFormat}`;
      link.href = dataUrl;
      link.click();
      showNotification('Screenshot downloaded.');
      break;
    case 'new-tab':
      window.open(dataUrl, '_blank');
      showNotification('Screenshot opened in a new tab.');
      break;
  }
});

function showNotification(message) {
  const notification = document.createElement('div');
  notification.id = 'qss-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2500);
}

function cleanup() {
  if (overlay) overlay.remove();
  if (selectionBox) selectionBox.remove();
  if (toolbar) toolbar.remove();

  overlay = null;
  selectionBox = null;
  toolbar = null;
  // `isActive` and `screenshotData` are reset when the editor sends the 'qss:editor-closed' event.
}