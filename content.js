let isSelecting = false;
let startX, startY;
let overlay, selectionBox, toolbar;
let screenshotData;
let isActive = false;
let settings = {};

const defaults = {
  imageFormat: 'png',
  jpegQuality: 92,
  afterCaptureAction: 'copy',
  borderColor: '#00d9ff',
  borderWidth: 3,
};

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(defaults, (loadedSettings) => {
    settings = loadedSettings;
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { newValue }] of Object.entries(changes)) {
    settings[key] = newValue;
  }
});

// Initial load of settings
loadSettings();

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
  overlay = document.createElement('div');
  overlay.id = 'screenshot-overlay';

  selectionBox = document.createElement('div');
  selectionBox.id = 'screenshot-selection';
  selectionBox.style.border = `${settings.borderWidth}px solid ${settings.borderColor}`;

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
    processScreenshot(x, y, width, height);
  } else {
    cleanup();
  }
}

function processScreenshot(x, y, width, height) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

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

    const mimeType = `image/${settings.imageFormat}`;
    const quality = settings.imageFormat === 'jpeg' ? settings.jpegQuality / 100 : undefined;

    switch (settings.afterCaptureAction) {
      case 'copy':
        canvas.toBlob(
          (blob) => {
            const item = new ClipboardItem({ [mimeType]: blob });
            navigator.clipboard
              .write([item])
              .then(() => showNotification('Screenshot copied to clipboard!'))
              .catch((err) => {
                console.error('Failed to copy:', err);
                showNotification('Error: Failed to copy screenshot');
              });
          },
          mimeType,
          quality
        );
        break;
      case 'download':
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `Screenshot-${timestamp}.${settings.imageFormat}`;
        link.href = dataUrl;
        link.click();
        showNotification('Screenshot downloaded.');
        break;
      case 'new-tab':
        const tabDataUrl = canvas.toDataURL(mimeType, quality);
        window.open(tabDataUrl, '_blank');
        showNotification('Screenshot opened in a new tab.');
        break;
    }
    // Cleanup is now called after the async operation completes inside the switch
    setTimeout(cleanup, 100);
  };
  img.src = screenshotData;
}


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
  screenshotData = null;
  isActive = false;
}