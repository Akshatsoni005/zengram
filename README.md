# 🔒 ZenGram — Distraction-Free Instagram Chat Client (Phone & Web)

A minimal, distraction-free Instagram client engineered exclusively for **Direct Messages, in-chat Reels, person-specific Stories, and high-performance Voice & Video Calling**.

---

## 🎯 What ZenGram Solves

| Feature | Standard Instagram Web / App | 🔒 ZenGram Solution |
| :--- | :--- | :--- |
| **Home Feed** | Infinite algorithmic posts, suggested ads | **Completely blocked** (auto-redirects to DMs) |
| **Explore / Discover** | Infinite recommendation rabbit hole | **Completely blocked** |
| **Reels Tab** | Addictive vertical video swipe loop | **Completely blocked** |
| **Reels Sent in Chat** | Clicking opens infinite Reels feed | **Plays inside isolated single-reel sandbox** |
| **Saved Section** | Often distracts with reel discovery | **Clean Access Allowed**: view study notes & diagrams; reels play only in single sandbox |
| **Content Creators** | Feeds distract creators during publishing | **Post & Ghost Allowed**: `/create` path & media uploads work cleanly without feed exposure |
| **Voice & Video Calling** | Disabled / missing on Instagram Web | **Fully enabled** (WebRTC hardware-accelerated calling) |
| **Stories** | Global top tray tempting you to click | **Filtered**: visible **only** for chat partner or profile search |
| **Data Privacy** | 3rd-party clients often steal cookies/tokens | **100% Zero-Data-Collection**: runs locally on device, 0 telemetry, authenticates strictly with official Meta SSL servers |

---

## 📱 How to Use on Phone (Android & iOS)

Since Instagram updates frequently break third-party binary patchers (like ReVanced), ZenGram provides two resilient, 100% open-source mobile methods:

### Option 1: Zero-Install Standalone PWA (Recommended for Android & iOS)
No APK compile or root required:
1. Open the [phone-pwa](file:///home/akshat/zengram-insta-chat/phone-pwa/index.html) or host it on your site.
2. Tap **Share** (iOS Safari) or **Menu ⋮** (Android Chrome) → **Add to Home Screen**.
3. It installs as a native, full-screen app icon that opens directly into Direct Messages with zero browser address bar!

### Option 2: Transparent Native Android WebView Client (`mobile-android/`)
Inside [mobile-android/](file:///home/akshat/zengram-insta-chat/mobile-android/):
- **100% Auditable Java Source:** Inspect [MainActivity.java](file:///home/akshat/zengram-insta-chat/mobile-android/app/src/main/java/com/zengram/chat/MainActivity.java) — zero trackers, zero analytics, zero background services.
- **Creator File Uploads:** Implements `WebChromeClient.onShowFileChooser` so creators can upload photos, carousels, and reels from Android photo storage directly.
- **Hardware WebRTC Calling:** Auto-grants `CAMERA` and `RECORD_AUDIO` inside `onPermissionRequest`.
- **Smart Back Handling:** Pressing Android back button inside a chat or saved post safely returns to DM inbox instead of exiting or popping into a feed.

### Option 3: Mobile Extension (Kiwi Browser / Firefox Android)
1. Install **Kiwi Browser** or **Firefox Nightly** on Android.
2. Load `web-extension` or install `userscript/zengram.user.js` via Tampermonkey.
3. Add `instagram.com` to Home Screen.

---

## 💻 How to Use on Web / Desktop

### Method 1: Universal NPX / NPM Launcher (Windows, Linux, macOS)
Run directly from terminal without manual configuration:
```bash
# Launch ZenGram Desktop Client (Auto-detects Electron or native app mode)
npx zengram
# Or inside this repository:
npm start

# Test the live interactive simulator locally:
npx zengram --demo
```

### Method 2: 1-Click Windows Launcher (`ZenGram-Windows.bat`)
On Windows (10/11), double-click:
```cmd
ZenGram-Windows.bat
```
*Zero setup needed*: If Electron is installed, it runs the full isolated client; otherwise it instantly opens a dedicated standalone app window using Windows' built-in Microsoft Edge!

### Method 3: Standalone Linux AppImage (`ZenGram-x86_64.AppImage`)
Direct, portable standalone executable for any Linux distribution:
```bash
chmod +x ZenGram-x86_64.AppImage
./ZenGram-x86_64.AppImage
```
Self-contained with all dependencies and sandbox switches included.

### Method 4: 1-Click Linux / macOS Shell Script (`./ZenGram-Linux.sh`)
```bash
./ZenGram-Linux.sh
```
Runs the client with `--no-sandbox` pre-configured.

### Method 5: Chrome / Brave / Edge / Opera Extension (Unpacked)
1. Open your Chromium browser and go to: `chrome://extensions`
2. Toggle **Developer mode** (top-right corner).
3. Click **Load unpacked**.
4. Select the directory:
   `/home/akshat/zengram-insta-chat/web-extension`
5. Visit [instagram.com](https://www.instagram.com).
   - ZenGram automatically locks to Direct Messages (`/direct/inbox/`) and Saved section (`/username/saved/`).
   - Feed and reels navigation items are removed.
   - Calling buttons are injected in your DM chat headers.

### Method 6: Tampermonkey / Violentmonkey Userscript (1-Click)
1. Install the **Tampermonkey** or **Violentmonkey** extension in your browser.
2. Create a new script and paste the contents of:
   `/home/akshat/zengram-insta-chat/userscript/zengram.user.js`
3. Save and open Instagram.

---

## 🔬 Testing the Live Interactive Simulator

We have created an interactive simulator demonstrating all behaviors (Phone view vs Desktop view, In-Chat Reel Sandboxing, Calling, Stories filtering, and feed blockers):

```bash
# Start a quick local web server to test the simulator
python3 -m http.server 8080 --directory /home/akshat/zengram-insta-chat/preview-demo
```
Then open `http://localhost:8080` in your web browser!

---

## 📂 Project Structure

```
zengram-insta-chat/
├── README.md               # This documentation
├── core/
│   ├── zengram-engine.js   # Core route guard, reel sandboxing, call injector, story filter
│   └── zengram-style.css   # Distraction-free CSS stylesheet
├── web-extension/          # Manifest V3 browser extension for Chrome, Brave, Edge, Kiwi
│   ├── manifest.json
│   ├── background.js       # Network-level redirect interceptor
│   ├── content.js
│   ├── popup/              # Extension status popup
│   └── icons/              # Extension icons
├── userscript/
│   └── zengram.user.js     # Single-file Tampermonkey/Violentmonkey script
├── desktop/                # Electron standalone desktop application
│   ├── package.json
│   └── main.js             # Window & WebRTC call permissions manager
├── mobile-android/         # Native Android WebView app with WebRTC video/audio calling
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       └── java/com/zengram/chat/MainActivity.java
└── preview-demo/           # Interactive live web demo to test all features
    ├── index.html
    ├── demo.css
    └── demo.js
```
