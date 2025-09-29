const defaultConfig = {
  // Image settings
  imageFormat: 'png', // 'png' or 'jpeg'
  jpegQuality: 92, // 0-100 (only for 'jpeg')

  // Action after capture
  afterCaptureAction: 'copy', // 'copy', 'download', or 'new-tab'

  // Appearance
  borderColor: '#00d9ff',
  borderWidth: 3, // in pixels

  // Advanced
  captureDelay: 0, // in seconds

  // Annotation Settings
  annotationSettings: {
    defaultTool: 'rectangle', // 'rectangle', 'arrow', 'text'
    colors: [
      '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF',
      '#000000', '#FFFFFF'
    ],
    lineWidths: [2, 5, 10], // in pixels
  },

  // Scrolling Capture Settings
  scrollingCapture: {
    scrollDelay: 500, // ms to wait after a scroll before taking a screenshot
  },

  borderWidth: 3, // in pixel

  // Advanced
  captureDelay: 0, // in seconds

};