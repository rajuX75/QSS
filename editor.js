// --- QSS Annotation Editor ---

// --- SETUP ---
const canvas = document.getElementById('qss-editor-canvas');
const ctx = canvas.getContext('2d');

// Get data passed from content script
const { imageDataUrl, config } = canvas.dataset;
const settings = JSON.parse(config);
const annotationSettings = settings.annotationSettings;

// DOM Elements
const editorContainer = document.getElementById('qss-editor-container');
const colorPaletteContainer = document.getElementById('qss-color-palette');
const lineWidthsContainer = document.getElementById('qss-line-widths');
const confirmBtn = document.getElementById('qss-editor-confirm');
const cancelBtn = document.getElementById('qss-editor-cancel');
const toolButtons = document.querySelectorAll('.qss-tool-button');

// --- STATE ---
let isDrawing = false;
let startX, startY;
let currentTool = annotationSettings.defaultTool;
let currentColor = annotationSettings.colors[0];
let currentLineWidth = annotationSettings.lineWidths[1];
let savedCanvasState; // To store canvas state for drawing previews

// --- INITIALIZATION ---

// Load the cropped screenshot onto the canvas
const image = new Image();
image.onload = () => {
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
};
image.src = imageDataUrl;

// Populate the toolbar from config
function initializeToolbar() {
  // Colors
  annotationSettings.colors.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;
    if (index === 0) swatch.classList.add('active');
    colorPaletteContainer.appendChild(swatch);
  });

  // Line Widths
  annotationSettings.lineWidths.forEach((width, index) => {
    const option = document.createElement('div');
    option.className = 'line-width-option';
    option.style.width = `${width * 2}px`;
    option.style.height = `${width * 2}px`;
    option.dataset.width = width;
    if (index === 1) option.classList.add('active');
    lineWidthsContainer.appendChild(option);
  });

  // Set initial active tool button
  document.querySelector(`.qss-tool-button[data-tool="${currentTool}"]`).classList.add('active');
}

initializeToolbar();

// --- EVENT LISTENERS ---

// Toolbar interactions
toolButtons.forEach(button => {
  button.addEventListener('click', () => {
    toolButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentTool = button.dataset.tool;
  });
});

colorPaletteContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('color-swatch')) {
    colorPaletteContainer.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.remove('active'));
    e.target.classList.add('active');
    currentColor = e.target.dataset.color;
  }
});

lineWidthsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('line-width-option')) {
    lineWidthsContainer.querySelectorAll('.line-width-option').forEach(option => option.classList.remove('active'));
    e.target.classList.add('active');
    currentLineWidth = parseInt(e.target.dataset.width, 10);
  }
});

// Canvas drawing events
canvas.addEventListener('mousedown', (e) => {
  if (currentTool === 'text') return; // Text tool handled separately
  isDrawing = true;
  startX = e.offsetX;
  startY = e.offsetY;
  // Save the current canvas content
  savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;

  // Restore the canvas to its state before this drawing operation started
  ctx.putImageData(savedCanvasState, 0, 0);

  const currentX = e.offsetX;
  const currentY = e.offsetY;

  // Draw the preview of the shape
  drawShape(startX, startY, currentX, currentY);
});

canvas.addEventListener('mouseup', (e) => {
  if (!isDrawing) return;
  isDrawing = false;

  const endX = e.offsetX;
  const endY = e.offsetY;

  // The final shape is already on the canvas from the last mousemove,
  // so we don't need to redraw. The `savedCanvasState` will be overwritten
  // on the next mousedown.
});

// Editor actions
confirmBtn.addEventListener('click', () => {
  const finalDataUrl = canvas.toDataURL(`image/${settings.imageFormat}`, settings.jpegQuality / 100);
  document.dispatchEvent(new CustomEvent('qss:process-image', { detail: { dataUrl: finalDataUrl } }));
  closeEditor();
});

cancelBtn.addEventListener('click', () => {
  closeEditor();
});

// --- DRAWING LOGIC ---

function drawShape(fromX, fromY, toX, toY) {
  ctx.strokeStyle = currentColor;
  ctx.fillStyle = currentColor;
  ctx.lineWidth = currentLineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (currentTool) {
    case 'rectangle':
      drawRectangle(fromX, fromY, toX, toY);
      break;
    case 'arrow':
      drawArrow(fromX, fromY, toX, toY);
      break;
    case 'text':
      // To be implemented: could create an input field on the canvas
      break;
  }
}

function drawRectangle(x1, y1, x2, y2) {
  const width = x2 - x1;
  const height = y2 - y1;
  ctx.strokeRect(x1, y1, width, height);
}

function drawArrow(fromX, fromY, toX, toY) {
  const headlen = currentLineWidth * 5; // length of head in pixels
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  // Line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

// --- CLEANUP ---

function closeEditor() {
  // Remove all UI
  editorContainer.remove();
  // Notify content script that we're done
  document.dispatchEvent(new CustomEvent('qss:editor-closed'));
  // Note: The editor.js script tag will remain, but it's inert.
}