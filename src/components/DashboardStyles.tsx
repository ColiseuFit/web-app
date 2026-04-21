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

    /* WhatsApp CTA Button */
    .whatsapp-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #25D366;
      color: #FFF;
      border: 2px solid #000;
      padding: 12px 20px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-decoration: none;
      box-shadow: 4px 4px 0px #000;
      margin-bottom: 20px;
      transition: all 0.1s ease;
      cursor: pointer;
    }

    .whatsapp-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 5px 5px 0px #000;
    }

    .whatsapp-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0px #000;
    }

    /* Blue Mode (Running Hub) */
    :root {
      --nb-blue: #3498DB;
      --nb-blue-dark: #2980B9;
    }

    .nb-card-blue {
      border: 3px solid #000;
      box-shadow: 4px 4px 0px #000;
      background: #FFF;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .nb-card-blue:hover {
      transform: translate(-3px, -3px);
      box-shadow: 7px 7px 0px var(--nb-blue);
    }
  `;


  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
