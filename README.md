# 🎵 Bunny - Premium Audio Streaming Client

Bunny is a premium, lightweight, and minimalist audio streaming client designed for personal media playback. Engineered with React Native and Expo, Bunny provides a highly responsive, modern interface for indexing and listening to audio from public feeds.

---

## 🌟 Key Features

* **Native Audio Engine**: High-fidelity playback with low latency, background audio support, and media controls powered by `react-native-track-player`.
* **LrcLib Lyrics Scroller**: Synchronized word-by-word active text highlights driven smoothly on native UI-thread frame clocks (60/120fps) with dynamic scroll measurements, fetching lyrics dynamically from LrcLib.
* **Architecture ABI Splitting**: Native binaries are split per-architecture (`arm64-v8a`, `armeabi-v7a`), reducing installation footprints from 112MB to under 47MB.
* **On-Device Cache Manager**: Fast metadata lookup caches and media stream segment indexing to optimize networking traffic and minimize loading times.
* **Customization Suite**: Built-in dark/light mode configurations, custom accent palettes, and multiple font faces.

---

## 🛡️ Privacy, Security & Legal Compliance

Bunny is developed strictly as a client-side interface and adheres to standard media streaming compliance guidelines:

1. **No Content Hosting**: Bunny does not host, upload, or re-distribute any audio, video, or image files. All metadata and media streams are accessed directly from public source URLs on the user's device.
2. **API Integrity**: Integrates with open-source YouTube Extractor modules (`NewPipeExtractor` and `InnerTube`) to parse publicly available WebM/MP4 audio streams. It does not circumvent digital rights management (DRM) or user-monetization elements.
3. **Data Privacy**: No user authentication tokens, private passwords, or search queries are uploaded to third-party tracking services. All searches and caches remain local to the device.
4. **Fair Use**: Bunny is intended strictly for personal, non-commercial streaming, educational research, and development.

---

## 🚀 Getting Started

To run Bunny locally in development mode:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Native Android Project**:
   ```bash
   npx expo prebuild --platform android --clean
   ```

3. **Launch on Emulator/Device**:
   ```bash
   npm run android
   ```

4. **Build Release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   *Optimized APK outputs will be placed under `/android/app/build/outputs/apk/release`.*
