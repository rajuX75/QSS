# 📸 Quick Screenshot Selector

A powerful Chrome extension that lets you capture and select screenshots with a simple keyboard shortcut. Press **Ctrl+S** to instantly take a screenshot and select any area to copy directly to your clipboard.

## ✨ Features

- **🎯 Quick Capture**: Press `Ctrl+S` (or `Cmd+S` on Mac) to activate screenshot mode
- **🖱️ Intuitive Selection**: Click and drag to select any area on the page
- **📋 Auto Copy**: Selected area is automatically copied to clipboard
- **🎨 Beautiful UI**: 
  - Smooth overlay with blur effect
  - Bright cyan selection border
  - Real-time dimension display
  - Dimmed area outside selection
- **⌨️ Keyboard Controls**: 
  - `Ctrl+S` / `Cmd+S` - Take screenshot
  - `Ctrl+Shift+S` / `Cmd+Shift+S` - Alternative trigger
  - `ESC` - Cancel screenshot mode
- **🚫 No Conflicts**: Completely overrides the default browser "Save Page" behavior

## 📦 Installation

### Option 1: Load Unpacked (Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the folder containing the extension files
6. The extension is now installed! You'll see a camera icon 📸 in your toolbar

### Option 2: Files Required

Create a folder with these files:
```
screenshot-extension/
├── manifest.json
├── background.js
├── content.js
└── content.css
```

## 🚀 Usage

### Taking a Screenshot

1. **Activate**: Press `Ctrl+S` on any webpage (or click the extension icon)
2. **Select**: Click where you want to start the selection
3. **Drag**: Move your mouse to select the area
4. **Release**: Let go of the mouse button - screenshot is automatically copied!
5. **Paste**: Use `Ctrl+V` anywhere to paste your screenshot

### Canceling

- Press `ESC` at any time to exit screenshot mode without capturing

### Alternative Trigger

- Click the 📸 extension icon in your Chrome toolbar
- Use `Ctrl+Shift+S` / `Cmd+Shift+S` keyboard shortcut

## 🎯 Use Cases

- Quickly capture parts of web pages
- Save sections of articles or documents
- Capture images, charts, or diagrams
- Create visual references without saving files
- Share specific content in chats or emails instantly

## 🛠️ Technical Details

### Permissions

- `activeTab` - Required to capture the current tab
- `scripting` - Needed to inject the selection overlay
- `<all_urls>` - Allows the extension to work on all websites

### Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Brave
- Other Chromium-based browsers

### How It Works

1. Captures the visible tab as a PNG image
2. Creates an interactive overlay with selection tool
3. Tracks mouse movements to draw selection box
4. Crops the selected area from the captured image
5. Copies the cropped image to clipboard using the Clipboard API

## ⚙️ Customization

### Change Keyboard Shortcut

1. Go to `chrome://extensions/shortcuts`
2. Find "Quick Screenshot Selector"
3. Click the pencil icon to change the shortcut
4. Enter your preferred key combination

### Modify Selection Color

Edit `content.css` and change the color values:
```css
#screenshot-selection {
  border: 3px solid #00d9ff; /* Change this color */
  background: rgba(0, 217, 255, 0.15); /* And this */
}
```

## 🐛 Troubleshooting

**Extension not working on certain pages:**
- Some pages (like `chrome://` URLs) restrict extensions for security
- Extension works on most regular web pages

**Ctrl+S still saves the page:**
- Reload the page after installing the extension
- Make sure the extension is enabled

**Screenshot not copying to clipboard:**
- Check that the browser has clipboard permissions
- Some browsers may require user interaction first

## 📝 File Structure

```
.
├── manifest.json       # Extension configuration
├── background.js       # Service worker for tab capture
├── content.js          # Main logic for selection and capture
├── content.css         # Styling for overlay and selection
└── README.md          # This file
```

## 🔒 Privacy

This extension:
- ✅ Works entirely locally in your browser
- ✅ Does NOT send data to any servers
- ✅ Does NOT collect or store any information
- ✅ Only captures what you explicitly select
- ✅ Clipboard data stays on your device

## 📄 License

This project is open source and available for personal and commercial use.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

If you encounter any issues or have questions, please create an issue in the repository.

---

**Made with ❤️ for productivity enthusiasts**

Press `Ctrl+S` and capture the world! 🌍📸