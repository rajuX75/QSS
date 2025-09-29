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
  } else if (request.action === 'startScrollingCapture') {
    executeScrollingCapture();
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
  processFinalImage(e.detail.dataUrl);

// A generic function to handle the final image dataUrl, whether from the editor or scrolling capture
function processFinalImage(dataUrl) {
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
  // `isActive` and `screenshotData` are reset when the editor sends the 'qss:editor-closed' event.
}

// --- SCROLLING CAPTURE LOGIC ---

// A helper function to pause execution
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// A helper to find and hide elements that might interfere with screenshots
function hideFixedElements() {
  const fixedElements = [];
  // A more specific query to avoid iterating over everything
  document.querySelectorAll('body *').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      fixedElements.push({ element: el, originalDisplay: el.style.display });
      el.style.display = 'none';
    }
  });
  return fixedElements;
}

// A helper to restore hidden elements
function showFixedElements(elements) {
  elements.forEach(({ element, originalDisplay }) => {
    element.style.display = originalDisplay || '';
  });
}

async function executeScrollingCapture() {
  if (isActive) return;
  isActive = true;

  showNotification('Starting full page capture...');
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  const hiddenElements = hideFixedElements();

  const totalHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;

  window.scrollTo(0, 0);
  await sleep(settings.scrollingCapture.scrollDelay);

  const capturedParts = [];
  let currentY = 0;

  while (currentY < totalHeight) {
    window.scrollTo(0, currentY);
    await sleep(settings.scrollingCapture.scrollDelay);

    const message = {
      action: 'captureVisibleTab',
      format: settings.imageFormat,
      quality: settings.jpegQuality,
    };

    const response = await new Promise(resolve => {
      chrome.runtime.sendMessage(message, resolve);
    });

    if (response && response.dataUrl) {
      const isLastCapture = (currentY + viewportHeight) >= totalHeight;
      capturedParts.push({ dataUrl: response.dataUrl, y: currentY, isLast: isLastCapture });
    } else {
      showNotification('Error: Failed to capture a part of the page.');
      showFixedElements(hiddenElements);
      window.scrollTo(originalScrollX, originalScrollY);
      cleanup();
      return;
    }

    currentY += viewportHeight;
  }

  showNotification('Stitching images together...');

  // Pass dimensions needed for stitching
  const totalWidth = document.documentElement.scrollWidth;
  stitchImages(capturedParts, totalWidth, totalHeight);

  showFixedElements(hiddenElements);
  window.scrollTo(originalScrollX, originalScrollY);
}

async function stitchImages(parts, totalWidth, totalHeight) {
  const finalCanvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  const ctx = finalCanvas.getContext('2d');

  // Set the canvas size in physical pixels
  finalCanvas.width = totalWidth * dpr;
  finalCanvas.height = totalHeight * dpr;

  // Scale the context to use logical pixels for drawing
  ctx.scale(dpr, dpr);

  // Load all image parts
  const imagePromises = parts.map(part => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ img, y: part.y, isLast: part.isLast });
      img.onerror = reject;
      img.src = part.dataUrl;
    });
  });

  try {
    const loadedImages = await Promise.all(imagePromises);

    loadedImages.forEach(({ img, y, isLast }) => {
      const drawY = y; // Use logical y position for drawing
      let sourceHeight = img.height; // Physical pixel height from the source image

      // If it's the last image, crop it to the exact remaining page height
      if (isLast) {
        const remainingPageHeight = totalHeight - y;
        const requiredSourceHeight = remainingPageHeight * dpr;
        if (sourceHeight > requiredSourceHeight) {
          sourceHeight = requiredSourceHeight;
        }
      }

      // Draw the partial screenshot onto the final canvas
      // Source dimensions are in physical pixels; destination dimensions are in logical pixels
      ctx.drawImage(
        img,
        0, // sx
        0, // sy
        img.width, // sWidth (physical)
        sourceHeight, // sHeight (physical)
        0, // dx
        drawY, // dy (logical)
        img.width / dpr, // dWidth (logical)
        sourceHeight / dpr // dHeight (logical)
      );
    });

    const finalDataUrl = finalCanvas.toDataURL(
      `image/${settings.imageFormat}`,
      settings.jpegQuality / 100
    );

    processFinalImage(finalDataUrl);
    showNotification('Full page capture complete!');

  } catch (error) {
    console.error('QSS Error: Failed to load one or more image parts for stitching.', error);
    showNotification('Error: Could not stitch the full page image.');
  } finally {
    cleanup();
    isActive = false; // Reset state
  }
}