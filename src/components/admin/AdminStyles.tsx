"use client";

/**
 * AdminStyles: High-Contrast Operational Theme (B&W).
 * 
 * @design Philosophy: "Gestão do Box" — Máxima legibilidade, foco absoluto nos dados
 * e interface ultra-limpa para administração profissional de treinamento.
 */
export default function AdminStyles() {
  return (
    <style jsx global>{`
      :root {
        /* Primary Palette */
        --admin-bg: #FFFFFF;
        --admin-surface: #F9FAFB;
        --admin-border: #000000;
        --admin-border-subtle: #E5E7EB;
        
        --admin-text: #000000;
        --admin-text-secondary: #4B5563;
        --admin-text-muted: #9CA3AF;
        
        --admin-accent: #000000;
        --admin-accent-hover: #333333;
        
        --admin-danger: #DC2626;
        --admin-success: #16A34A;
        --admin-warning: #CA8A04;
      }

      .admin-shell {
        background: var(--admin-bg) !important;
        color: var(--admin-text) !important;
        font-family: 'Inter', -apple-system, sans-serif;
        min-height: 100vh;
        width: 100%;
        -webkit-font-smoothing: antialiased;
      }

      /* ─── FLUID CONTAINERS ─── */
      .admin-container-fluid {
        width: 100% !important;
        max-width: none !important;
        padding: 40px;
        animation: fadeIn 0.3s ease-out;
      }

      @media (max-width: 1024px) {
        .admin-container-fluid {
          padding: 24px;
        }
      }

      /* ─── CONTAINERS ─── */
      .admin-card {
        background: #FFF !important;
        border: 2px solid var(--admin-border);
        padding: 24px;
        box-shadow: 4px 4px 0px rgba(0,0,0,0.05);
        margin-bottom: 24px;
      }

      /* ─── TABLES ─── */
      .admin-table {
        width: 100%;
        border-collapse: collapse;
      }

      .admin-table th {
        text-align: left;
        padding: 16px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #000;
        background: #F3F4F6;
        border-bottom: 2px solid #000;
      }

      .admin-table td {
        padding: 16px;
        border-bottom: 1px solid var(--admin-border-subtle);
        font-size: 14px;
        vertical-align: middle;
        color: #000;
      }

      .admin-table tr:hover td {
        background: #FAFAFA;
      }

      /* ─── FORMS ─── */
      .admin-shell label {
        display: block;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #000;
        margin-bottom: 8px;
      }

      .admin-shell input, 
      .admin-shell select, 
      .admin-shell textarea {
        width: 100%;
        padding: 12px 16px;
        background: #FFF;
        border: 2px solid #000;
        font-size: 14px;
        font-weight: 600;
        color: #000;
        transition: all 0.1s ease;
        border-radius: 0px;
        outline: none;
      }

      .admin-shell textarea {
        line-height: 1.6;
      }

      .admin-shell input:focus, 
      .admin-shell select:focus,
      .admin-shell textarea:focus {
        background: #FFF;
        box-shadow: 4px 4px 0px #000;
        transform: translate(-2px, -2px);
      }

      /* ─── BUTTONS ─── */
      .admin-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 24px;
        height: 48px;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid #000;
        background: transparent;
        color: #000;
        border-radius: 0px;
      }

      .admin-btn-primary {
        background: #000;
        color: #FFF;
      }

      .admin-btn-primary:hover {
        background: #222;
        transform: translate(-2px, -2px);
        box-shadow: 4px 4px 0px rgba(0,0,0,1);
      }

      .admin-btn-ghost {
        border: none;
        padding: 0 12px;
        color: #666;
      }
      
      .admin-btn-ghost:hover {
        background: #F3F4F6;
        color: #000;
      }

      /* ─── BADGES ─── */
      .admin-badge {
        display: inline-flex;
        padding: 6px 12px;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        border: 1px solid #000;
      }

      .badge-iniciante { background: #FFFFFF; color: #000000; border-color: #E5E7EB; }
      .badge-scale { background: #DCFCE7; color: #166534; border-color: #86EFAC; }
      .badge-intermediario { background: #DBEAFE; color: #1E40AF; border-color: #93C5FD; }
      .badge-rx { background: #FEE2E2; color: #991B1B; border-color: #FCA5A5; }
      .badge-elite { background: #FEF3C7; color: #92400E; border-color: #FCD34D; }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}
