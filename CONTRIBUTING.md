# Contributing to Bunny

Thank you for your interest in contributing to Bunny! We welcome all contributions, including bug fixes, feature requests, documentation improvements, and feedback.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📖 Table of Contents
1. [Reporting Bugs](#1-reporting-bugs)
2. [Suggesting Features](#2-suggesting-features)
3. [Local Development Setup](#3-local-development-setup)
4. [Coding Standards](#4-coding-standards)
5. [Submitting a Pull Request](#5-submitting-a-pull-request)

---

## 1. Reporting Bugs

If you find a bug, please check the existing GitHub Issues to see if it has already been reported. If not, open a new issue and include:
*   A clear, descriptive title.
*   Steps to reproduce the bug.
*   Expected behavior vs. actual behavior.
*   Your environment details (device model, Android OS version, Bunny version).
*   Logs, screenshots, or screen recordings if applicable.

---

## 2. Suggesting Features

We welcome new feature requests! Please open a GitHub Issue and explain:
*   What the feature is and how it should work.
*   Why it would be beneficial to the community.
*   Mockups or references to similar features if possible.

---

## 3. Local Development Setup

To work on Bunny locally, make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (LTS recommended)
*   [JDK 17](https://openjdk.org/) (for compiling Android native Kotlin modules)
*   [Android SDK](https://developer.android.com/studio) and Emulator

### Setup Steps
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Kowsik-Y/Bunny.git
    cd Bunny
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Generate Native Directories**:
    Generate the React Native/Expo native Android wrappers:
    ```bash
    npx expo prebuild --platform android --clean
    ```
4.  **Run Development Server**:
    Start the local metro packager and deploy to your connected device/emulator:
    ```bash
    npm run android
    ```

---

## 4. Coding Standards

### TypeScript / React Native
*   Write clean, functional code with TypeScript type annotations.
*   Avoid using `any` type whenever possible.
*   Maintain consistent formatting by using Prettier.
*   Preserve existing layouts and styling rules (e.g. dynamic light/dark theme color bindings).

### Kotlin / Android Native
*   Keep helper methods and classes private inside Kotlin modules.
*   Document any additions to `modules/equalizer` or native media services.
*   Ensure backward compatibility (e.g., support standard/legacy ID3 tag versions).

---

## 5. Submitting a Pull Request

When you are ready to submit your code changes:
1.  **Create a Feature Branch**:
    ```bash
    git checkout -b feature/your-awesome-feature
    ```
2.  **Commit Your Changes**:
    Write clear, concise commit messages.
3.  **Push and Open a PR**:
    Push your branch and open a Pull Request against the `main` branch. 
4.  **Code Review**:
    Maintainers will review your code, suggest edits if necessary, and merge it once approved.
