"use client";

export default function DashboardStyles() {
  const css = `

    /* ============================
       NEO-BRUTALIST ATOMICS
       ============================ */
    
    .nb-card {
      background: var(--nb-surface);
      border: 2px solid var(--nb-border);
      box-shadow: var(--nb-shadow);
      transition: transform 0.1s, box-shadow 0.1s;
    }

    .nb-card-hover:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px #000;
    }

    .nb-card-hover:active {
      transform: translate(2px, 2px);
      box-shadow: 0px 0px 0px #000;
    }

    .nb-button-main {
      background: var(--nb-red);
      color: white;
      border: 2px solid #000;
      box-shadow: 4px 4px 0px #000;
      font-weight: 900;
      text-transform: uppercase;
      transition: all 0.1s;
    }

    .nb-button-main:hover {
      transform: translate(-1px, -1px);
      box-shadow: 5px 5px 0px #000;
    }

    .nb-button-main:active {
      transform: translate(3px, 3px);
      box-shadow: 0px 0px 0px #000;
    }

    /* Animations */
    @keyframes slideInUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .animate-in {
      animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Stats & Metrics */
    .font-mono {
      font-family: var(--font-mono) !important;
      letter-spacing: -0.05em;
    }

    /* Specific Overrides */
    .checkin-btn {
      border: 2px solid #000 !important;
      box-shadow: 4px 4px 0px #000 !important;
      animation: none !important;
    }

    .checkin-btn:hover {
      transform: translate(-1px, -1px) !important;
      box-shadow: 5px 5px 0px #000 !important;
    }

    .checkin-btn:active {
      transform: translate(3px, 3px) !important;
      box-shadow: 0px 0px 0px #000 !important;
    }

    .nav-floating-dock {
      background: #FFF;
      border-top: 2px solid #000;
      padding-bottom: env(safe-area-inset-bottom);
    }
  `;


  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
