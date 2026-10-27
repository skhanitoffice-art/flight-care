import { Platform } from 'react-native';

export const C = {
  ink: '#0E2A47',
  bg: '#F7F9FC',
  amber: '#F5A300',
  soft: '#FFF4DC',
  green: '#00794F',
  gsoft: '#E5F4EE',
  line: '#E3E9F1',
  muted: '#5C6B7E',
  gold: '#D97706',
  goldLight: '#FEF3C7',
  sky: '#0284C7',
  skyLight: '#E0F2FE',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  rose: '#E11D48',
  roseLight: '#FFE4E6',
};

export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE || '+880 1700-000000';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@flightcare.com.bd';
export const SETTINGS_STORAGE = '@flightcare/settings';
export const DEFAULT_NOTIFICATION_PREFERENCES = { in_app: true, email: false, sms: false };

export function injectWeb3DStyles() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const styleId = 'flightcare-3d-web-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      /* =========================================================
         WORLD-CLASS LUXURY 3D & GLASSMORPHIC DESIGN SYSTEM
         ========================================================= */

      /* 3D Global Scene Setup with Luxury Ambient Gradient */
      html, body {
        background: radial-gradient(circle at 50% 0%, #EBF4FD 0%, #F1F5F9 60%, #E2E8F0 100%);
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      #root {
        width: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      /* Custom Smooth Scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #F1F5F9;
      }
      ::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 999px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94A3B8;
      }

      /* Keyframes Animations */
      @keyframes float3D {
        0%, 100% {
          transform: translateY(0px) rotateX(0deg) rotateY(0deg);
        }
        50% {
          transform: translateY(-8px) rotateX(3deg) rotateY(-2deg);
        }
      }

      @keyframes pulseGlow3D {
        0%, 100% {
          box-shadow: 0 6px 0 #B45309, 0 14px 30px -4px rgba(245, 163, 0, 0.45);
        }
        50% {
          box-shadow: 0 8px 0 #B45309, 0 22px 42px -2px rgba(245, 163, 0, 0.72), 0 0 25px rgba(245, 163, 0, 0.38);
        }
      }

      @keyframes shineSweep {
        0% {
          left: -140%;
        }
        30%, 100% {
          left: 230%;
        }
      }

      @keyframes planeFly3D {
        0%, 100% {
          transform: translateY(0) rotate(0deg) scale(1);
        }
        30% {
          transform: translateY(-6px) rotate(-8deg) scale(1.14);
        }
        70% {
          transform: translateY(3px) rotate(5deg) scale(0.96);
        }
      }

      @keyframes pingPulse {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.75);
        }
        70% {
          transform: scale(1.05);
          box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
        }
      }

      @keyframes sceneEnter3D {
        0% {
          opacity: 0;
          transform: translateY(22px) perspective(1000px) rotateX(3deg);
        }
        100% {
          opacity: 1;
          transform: translateY(0) perspective(1000px) rotateX(0deg);
        }
      }

      @keyframes arrowNudge {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(6px); }
      }

      /* 3D Scene Entrance */
      .flightcare-scene-3d {
        animation: sceneEnter3D 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }

      /* Glassmorphism Classes */
      .flightcare-glass {
        background: rgba(255, 255, 255, 0.88) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.7) !important;
      }

      /* Live Status Dot */
      .flightcare-live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #10B981;
        display: inline-block;
        animation: pingPulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        margin-right: 7px;
      }

      /* 3D Luxury Cards */
      .flightcare-card-3d {
        transform-style: preserve-3d !important;
        transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.32s ease !important;
        box-shadow: 0 16px 36px -10px rgba(14, 42, 71, 0.12), 0 4px 14px -2px rgba(14, 42, 71, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
        position: relative !important;
      }
      .flightcare-card-3d:hover {
        transform: translateY(-6px) perspective(1000px) rotateX(1.6deg) !important;
        box-shadow: 0 28px 56px -12px rgba(14, 42, 71, 0.18), 0 10px 22px -4px rgba(14, 42, 71, 0.08), inset 0 1px 0 #ffffff !important;
      }

      /* 3D Interactive Service Cards */
      .flightcare-hover-lift {
        transform-style: preserve-3d !important;
        perspective: 900px !important;
        transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease !important;
        cursor: pointer !important;
        position: relative !important;
      }
      .flightcare-hover-lift:hover {
        transform: perspective(900px) translateY(-10px) translateZ(24px) rotateX(4deg) scale(1.06) !important;
        box-shadow: 0 24px 44px -8px rgba(14, 42, 71, 0.24), 0 10px 20px -4px rgba(14, 42, 71, 0.12) !important;
        z-index: 10 !important;
      }
      .flightcare-hover-lift:active {
        transform: perspective(900px) translateY(-2px) scale(0.97) !important;
        transition-duration: 0.1s !important;
      }
      .flightcare-hover-lift:hover .package-card-icon-wrap,
      .flightcare-hover-lift:hover [data-3d-icon="true"] {
        transform: scale(1.15) translateY(-4px) rotate(4deg) !important;
      }

      /* 3D Luxury Extruded Button with Light Sheen */
      .flightcare-btn-3d {
        position: relative !important;
        overflow: hidden !important;
        transform-style: preserve-3d !important;
        transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease, filter 0.18s ease !important;
        cursor: pointer !important;
        box-shadow: 0 7px 0 #B45309, 0 18px 36px -4px rgba(245, 163, 0, 0.52) !important;
        animation: pulseGlow3D 3.5s ease-in-out infinite !important;
      }
      .flightcare-btn-3d:hover {
        transform: translateY(-5px) scale(1.02) !important;
        box-shadow: 0 11px 0 #B45309, 0 26px 48px -4px rgba(245, 163, 0, 0.7) !important;
        filter: brightness(1.04) !important;
      }
      .flightcare-btn-3d:active {
        transform: translateY(4px) scale(0.99) !important;
        box-shadow: 0 2px 0 #B45309, 0 6px 12px rgba(245, 163, 0, 0.4) !important;
        transition-duration: 0.08s !important;
      }
      .flightcare-btn-3d::after {
        content: '';
        position: absolute;
        top: 0;
        left: -140%;
        width: 60%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
        transform: skewX(-25deg);
        animation: shineSweep 4.2s ease-in-out infinite;
        pointer-events: none;
      }
      .flightcare-btn-3d:hover .btn-arrow {
        animation: arrowNudge 0.9s ease-in-out infinite;
      }

      /* 3D Floating Airplane Badge */
      .flightcare-brand-3d {
        animation: planeFly3D 4.5s ease-in-out infinite !important;
        display: inline-block !important;
        transform-style: preserve-3d !important;
      }

      /* 3D Desktop Nav Pills */
      .flightcare-nav-pill-3d {
        transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        cursor: pointer !important;
      }
      .flightcare-nav-pill-3d:hover {
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 20px -3px rgba(14, 42, 71, 0.16) !important;
      }
      .flightcare-nav-pill-3d:active {
        transform: translateY(1px) scale(0.97) !important;
      }

      /* 3D Airport Selector Pills */
      .flightcare-airport-pill-3d {
        transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        cursor: pointer !important;
      }
      .flightcare-airport-pill-3d:hover {
        transform: translateY(-4px) scale(1.05) !important;
        box-shadow: 0 12px 24px -3px rgba(14, 42, 71, 0.18) !important;
      }
      .flightcare-airport-pill-3d:active {
        transform: translateY(1px) scale(0.97) !important;
      }

      /* 3D Hero Banner */
      .flightcare-banner-3d {
        transform-style: preserve-3d !important;
        perspective: 1100px !important;
        box-shadow: 0 20px 48px -8px rgba(14, 42, 71, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
        transition: transform 0.4s ease, box-shadow 0.4s ease !important;
      }
      .flightcare-banner-3d:hover {
        transform: translateY(-4px) scale(1.008) !important;
        box-shadow: 0 28px 60px -10px rgba(14, 42, 71, 0.32) !important;
      }

      /* 3D Section Icon Float */
      .flightcare-icon-float-3d {
        animation: float3D 5s ease-in-out infinite !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* 3D Guidance Items */
      .flightcare-guidance-item-3d {
        transform-style: preserve-3d !important;
        perspective: 800px !important;
        transition: transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        cursor: pointer !important;
      }
      .flightcare-guidance-item-3d:hover {
        transform: perspective(800px) translateY(-8px) translateZ(18px) rotateX(4deg) scale(1.07) !important;
        z-index: 5 !important;
      }
      .flightcare-guidance-item-3d:hover .guidance-icon-wrap {
        transform: scale(1.15) translateY(-4px) rotate(4deg) !important;
        box-shadow: 0 16px 28px -4px rgba(0, 0, 0, 0.25) !important;
      }
      .flightcare-guidance-item-3d:active {
        transform: perspective(800px) translateY(-1px) scale(0.97) !important;
      }

      /* Bulletproof fixed bottom navigation bar for mobile web */
      .flightcare-mobile-nav-fixed,
      [data-flightcare-fixed-nav="true"] {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        max-width: 100vw !important;
        height: auto !important;
        z-index: 99999 !important;
        transform: translate3d(0, 0, 0) !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
        -webkit-backface-visibility: hidden !important;
        backface-visibility: hidden !important;
        background-color: #FFFFFF !important;
        border-top: 1px solid #E2E8F0 !important;
        box-shadow: 0 -2px 16px rgba(15, 23, 42, 0.10) !important;
        padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px) !important;
        margin: 0 !important;
        pointer-events: auto !important;
      }
      @media (min-width: 768px) {
        .flightcare-mobile-nav-fixed,
        [data-flightcare-fixed-nav="true"] {
          display: none !important;
        }
      }
    `;
  }
}
