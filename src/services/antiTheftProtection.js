/**
 * Flight Care - Anti-Theft, Anti-Inspect & Source Code Protection Shield
 * Prevents unauthorized viewing, scraping, copying, and DevTools inspection.
 */

import { Platform } from 'react-native';

export function initAntiTheftProtection() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. Frame Defense (Anti-Clickjacking / Anti-Embedding)
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
  } catch (e) {}

  // 2. Disable Context Menu (Right-Click)
  document.addEventListener('contextmenu', function (e) {
    // Allow right click ONLY inside inputs or textareas if needed for paste
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return true;
    }
    e.preventDefault();
    return false;
  }, { capture: true });

  // 3. Block Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P)
  document.addEventListener('keydown', function (e) {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = (e.key || '').toLowerCase();
    const keyCode = e.keyCode || e.which;

    // F12 (DevTools)
    if (keyCode === 123 || key === 'f12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspect / Console)
    if (isCtrlOrCmd && isShift && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U (View Page Source)
    if (isCtrlOrCmd && key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S (Save Web Page)
    if (isCtrlOrCmd && key === 's') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+P (Print Page)
    if (isCtrlOrCmd && key === 'p') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+A (Select All outside form inputs)
    if (isCtrlOrCmd && key === 'a') {
      const active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        return false;
      }
    }
  }, { capture: true });

  // 4. Block Drag & Drop of Images and Content
  document.addEventListener('dragstart', function (e) {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 5. Block Clipboard Copy/Cut outside of form input fields
  document.addEventListener('copy', function (e) {
    const active = document.activeElement;
    if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  document.addEventListener('cut', function (e) {
    const active = document.activeElement;
    if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  // 6. Production Console Shield & Scraper Silencer
  // Silences console logging in production so internal state and objects cannot be inspected
  if (typeof window !== 'undefined' && window.location && !window.location.hostname.includes('localhost')) {
    try {
      const noop = () => {};
      console.log = noop;
      console.info = noop;
      console.debug = noop;
      console.dir = noop;
      console.table = noop;
      console.warn = noop;
    } catch (e) {}
  }

  // 7. Active DevTools Detection & Console Wiper
  try {
    const threshold = 160;
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        try {
          console.clear();
        } catch (e) {}
      }
    };
    window.addEventListener('resize', checkDevTools);
    setInterval(checkDevTools, 2000);
  } catch (e) {}
}

export default initAntiTheftProtection;
