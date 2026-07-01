<p align="center">
  <img src="assets/images/logo.png" width="140" height="140" alt="Bunny Logo"/>
</p>

<h1 align="center">🎵 Bunny</h1>

<p align="center">
  <b>A state-of-the-art, high-fidelity audio streaming client for Android.</b><br/>
  Synthesized using React Native, Expo Router, and native Kotlin extraction engines.
</p>

<p align="center">
  <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/Framework-React_Native_0.85-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native"/></a>
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Platform-Expo_56-000000?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"/></a>
  <a href="https://kotlinlang.org/"><img src="https://img.shields.io/badge/Native_Core-Kotlin_1.9-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin"/></a>
  <img src="https://img.shields.io/badge/Created_By-Antigravity-9E00FF?style=for-the-badge&logo=google&logoColor=white" alt="Created By Antigravity"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v1.0.0-blue?style=flat-square&logo=github" alt="Version"/>
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/github/downloads/Kowsik-Y/Bunny/total?style=flat-square&color=orange&logo=github" alt="GitHub Downloads"/>
  <img src="https://img.shields.io/github/last-commit/Kowsik-Y/Bunny?style=flat-square&color=red" alt="Last Commit"/>
</p>

---

## 📖 Table of Contents
*   [✨ Unique Selling Points](#-unique-selling-points)
*   [📱 User Interface Showcase](#-user-interface-showcase)
*   [🛠️ Deep Technical Specs](#️-deep-technical-specs)
*   [🚀 Installation & Quick Start](#-installation--quick-start)
*   [🧑‍💻 Troubleshooting & FAQ](#-troubleshooting--faq)
*   [🛡️ Privacy, Compliance & Disclaimer](#️-privacy-compliance--disclaimer)
*   [🏆 Credits & Inspiration](#-credits--inspiration)

---

## ✨ Unique Selling Points

*   **⚡ Hybrid Engine Architecture**: On Android, metadata queries bypass web browser restrictions and heavy proxies via custom native Kotlin modules. Non-Android builds seamlessly fall back to public client-side Javascript Piped API handlers.
*   **🌍 Radio Garden Explorer**: Discover, query, and stream thousands of live radio stations from around the globe using local geo-location APIs or manual presets.
*   **🎤 Ultra-Smooth Sync Lyrics**: Displays synchronized active lyrics with fluid 60/120 FPS micro-scroll animations driven directly by the native UI-thread.
*   **📦 Sub-47MB Installation footprint**: By leveraging Android ABI splits (`arm64-v8a`, `armeabi-v7a`), Bunny avoids native binary bloat, bringing the install footprint down from 112MB.
*   **🎨 Ultimate Personalization Suite**: Full theme configurations (dynamic dark/light modes, user-selectable accent palettes, custom fonts) and audio playback behaviors (cache management, update notifications).

---

## 📱 User Interface Showcase
<p align="center">
  <table>
    <tr>
      <td align="center"><b>Dashboard (Home)</b></td>
      <td align="center"><b>Explore &amp; Charts</b></td>
      <td align="center"><b>Live Radio</b></td>
    </tr>
    <tr>
      <td><code>Home Screen</code></td>
      <td><code>Trending / Playlists</code></td>
      <td><code>Global Tuner</code></td>
    </tr>
    <tr>
      <td align="center"><b>Lyrics Scroller</b></td>
      <td align="center"><b>Library &amp; Offline</b></td>
      <td align="center"><b>System Settings</b></td>
    </tr>
    <tr>
      <td><code>Sync Lyrics</code></td>
      <td><code>Downloads &amp; Favorites</code></td>
      <td><code>Accents &amp; Themes</code></td>
    </tr>
  </table>
</p>

---

## 🛠️ Deep Technical Specs

### 1. Dual-Path Stream Processing
*   **Android Native Client**: Custom Gradle scripts compile [`modules/innertube`](file:///modules/innertube) and [`modules/youtube-extractor`](file:///modules/youtube-extractor) into highly-optimized Kotlin packages. They interact directly with YouTube Music client components via OkHttp and NewPipe bindings.
*   **Web/iOS Failover**: Uses client-side AJAX calls to standard public Piped API gateways, providing universal cross-platform portability.

### 2. Micro-Animated Lyrics Sync
Bunny queries [LrcLib](https://github.com/valeriangalliat/lrclib) to match active songs by name, artist, and duration.
*   The lyrics scroller computes vertical line offsets in real-time.
*   Scroll transitions are fed directly to **React Native Reanimated** UI-thread clocks, ensuring micro-animations never stutter, even during heavy UI interaction.

### 3. Build-Time Gradle Injection
The Expo plugin [`withAppConfiguration.js`](file:///plugins/withAppConfiguration.js) customizes compilation parameters:
*   Enforces Kotlin Compiler JVM Target version to `17`.
*   Enables Minification and Resource Shrinking in release profiles.
*   Protects reflection classes from obfuscation via dynamic `proguard-rules.pro` insertion.

---

## 🚀 Installation & Quick Start

Ensure you have [Node.js](https://nodejs.org/), [JDK 17](https://openjdk.org/projects/jdk/17/), and [Android SDK](https://developer.android.com/studio) installed.

### 1. Clone & Install
```bash
git clone https://github.com/Kowsik-Y/Bunny.git
cd Bunny
npm install
```

### 2. Prebuild Native Directories
Expo config plugins will run automatically to generate the native Android code:
```bash
npx expo prebuild --platform android --clean
```

### 3. Launch Development Server
```bash
npm run android
```

### 4. Build Production Split APKs
To generate architecture-optimized binaries:
```bash
cd android
./gradlew assembleRelease
```
*Outputs will be created under `android/app/build/outputs/apk/release/`.*

---

## 🧑‍💻 Troubleshooting & FAQ

#### Q1: Gradle build fails with JVM / JDK mismatch error?
Make sure your system's `JAVA_HOME` variable is pointing to **JDK 17**. You can check this by running `java -version` in your terminal.

#### Q2: TrackPlayer setup fails or throws an exception on iOS/Web?
Bunny uses platform detection to gracefully handle systems where `react-native-track-player` doesn't fully support native background bindings. Ensure you run on an emulator or real Android device to test native audio services.

#### Q3: How do I clear the cached files to free up space?
Go to **Settings** -> **Cache Manager** -> **Clear App Cache** to safely wipe local caching tables and indexing databases.

---
## 🛡️ Privacy, Compliance & Disclaimer

Bunny is developed strictly as a client-side interface and adheres to standard privacy and media compliance guidelines:
*   **Zero-Server Logging**: Search queries and playback metadata are never routed to intermediate servers. All requests go directly to source APIs from your device.
*   **No Content Storage**: All stream indexes are resolved on-the-fly from public domain links.
*   **Local Sandboxing**: Caches and downloads remain completely isolated inside the Android sandbox context.
*   **Disclaimer**: This project is not affiliated with, authorized, or endorsed by Google LLC, YouTube, or Radio Garden. For full legal terms, please read the [Disclaimer](file:///Users/kowsik/Documents/BlackBunny/DISCLAIMER.md) file.

---

## 🏆 Credits & Inspiration

*   **Extraction Libraries**: [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) & [InnerTube Client](https://github.com/TeamNewPipe/InnerTube).
*   **Streaming Gateways**: [Piped](https://github.com/TeamPiped/Piped) & [Radio Garden](https://radio.garden).
*   **Media Stack**: [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player) & [LrcLib API](https://lrclib.net/).
*   **Graphics & Vectors**: [SVG Repo](https://www.svgrepo.com/).
