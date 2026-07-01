# Security Policy

## Reporting a Vulnerability

We take the security of Bunny very seriously. If you find a security vulnerability, we strongly encourage you to let us know immediately through responsible disclosure.

Please do not report security vulnerabilities through public GitHub issues. Instead, please email the developer directly or contact us through the private contact details listed in the repository profile.

## Supported Versions

We actively support and fix security issues in the following versions of Bunny:

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Our Security Standards

Bunny is designed with security-first guidelines:
1. **No External Servers**: The app does not route your search requests, playback patterns, or user metadata through custom proxy servers. All requests go directly from your device to the official public endpoints (LrcLib, YouTube/InnerTube APIs).
2. **Encrypted Network Traffic**: All network requests executed by the app use standard Transport Layer Security (TLS/HTTPS) protocols to protect against intercept and middleman tampering.
3. **Sandbox Isolation**: Native components (such as file storage and background execution services) are fully confined within the Android system sandbox.
