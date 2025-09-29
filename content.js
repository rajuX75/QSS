let isSelecting = false;
let startX, startY;
let overlay, selectionBox, toolbar;
let screenshotData;
let isActive = false;

// Prevent Ctrl+S default behavior
document.addEventListener(
  'keydown',
  function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!isActive) {
        captureAndStartSelection();
      }
      return false;
    }

    // ESC to cancel
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

  chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (response) => {
    if (response && response.dataUrl) {
      screenshotData = response.dataUrl;
      createOverlay();
      startSelection();
    }
  });
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'screenshot-overlay';

  selectionBox = document.createElement('div');
  selectionBox.id = 'screenshot-selection';

  // Create instruction toolbar
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
}

function startSelection() {
  isSelecting = false;

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

  // Update dimensions display
  const dimensionsText = selectionBox.querySelector('.dimensions-label');
  if (dimensionsText) {
    dimensionsText.textContent = `${Math.round(width)} × ${Math.round(height)}`;
  } else {
    const label = document.createElement('div');
    label.className = 'dimensions-label';
    label.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    selectionBox.appendChild(label);
  }
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
    cropAndCopyToClipboard(x, y, width, height);
  }

  cleanup();
}

function cropAndCopyToClipboard(x, y, width, height) {
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

    canvas.toBlob((blob) => {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard
        .write([item])
        .then(() => {
          showNotification('Screenshot copied to clipboard!');
        })
        .catch((err) => {
          console.error('Failed to copy:', err);
          showNotification('Failed to copy screenshot');
        });
    });
  };
  img.src = screenshotData;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 2147483647;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function cleanup() {
  if (overlay) {
    overlay.removeEventListener('mousedown', handleMouseDown);
    overlay.removeEventListener('mousemove', handleMouseMove);
    overlay.removeEventListener('mouseup', handleMouseUp);
    overlay.remove();
  }
  if (selectionBox) {
    selectionBox.remove();
  }
  if (toolbar) {
    toolbar.remove();
  }
  overlay = null;
  selectionBox = null;
  toolbar = null;
  screenshotData = null;
  isActive = false;
}
