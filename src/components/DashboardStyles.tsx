"use client";

export default function DashboardStyles() {
  const css = `
    @keyframes pulseRed {
      0%, 100% { box-shadow: 0 0 40px rgba(227,27,35,0.3); }
      50% { box-shadow: 0 0 60px rgba(227,27,35,0.5); }
    }
    @keyframes xpGlow {
      0%, 100% { box-shadow: 0 0 8px rgba(227,27,35,0.5); }
      50% { box-shadow: 0 0 18px rgba(227,27,35,0.9), 0 0 32px rgba(227,27,35,0.3); }
    }
    @keyframes levelIconEntrance {
      0% { opacity: 0; transform: scale(0.5) rotate(-15deg); filter: blur(10px); }
      100% { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0px); }
    }
    @keyframes contourPulse {
      0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.1)); }
      50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.4)); }
    }
    @keyframes contourPulseGold {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(197, 160, 89, 0.3)); }
      50% { filter: drop-shadow(0 0 20px rgba(197, 160, 89, 0.7)); }
    }
    .level-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .level-icon-contour-glow {
      animation: contourPulse 3s infinite ease-in-out;
    }
    .level-icon-contour-gold {
      animation: contourPulseGold 3s infinite ease-in-out;
    }
    .checkin-btn {
      animation: pulseRed 2.5s ease-in-out infinite;
      transition: filter 0.2s, transform 0.15s;
    }
    .checkin-btn:hover {
      filter: brightness(1.15) !important;
      transform: translateY(-1px) !important;
    }
    .checkin-btn:active {
      transform: translateY(0) !important;
    }
    .xp-bar-fill {
      animation: xpGlow 2s ease-in-out infinite;
    }
    .nav-link:hover {
      color: rgba(255,255,255,0.6) !important;
    }
    .leaderboard-item:hover {
      background: rgba(255,255,255,0.04) !important;
    }
    .btn-outline-hover {
      transition: all 0.2s ease !important;
    }
    .btn-outline-hover:hover {
      border-color: var(--volt) !important;
      color: white !important;
      background: rgba(225, 255, 0, 0.05) !important;
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
