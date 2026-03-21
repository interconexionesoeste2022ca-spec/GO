'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getToken, getSesion, cerrarSesion, tienePermiso } from '@/lib/api'

const NAV = [
  { href: '/dashboard',           icon: '◈', label: 'Dashboard'  },
  { href: '/dashboard/clientes',  icon: '👥', label: 'Clientes'   },
  { href: '/dashboard/pagos',     icon: '💳', label: 'Pagos'      },
  { href: '/dashboard/planes',    icon: '📡', label: 'Planes'     },
  { href: '/dashboard/cuentas',   icon: '🏦', label: 'Cuentas'    },
  { href: '/dashboard/reportes',  icon: '🔧', label: 'Reportes'   },
  { href: '/dashboard/fidelidad', icon: '🏆', label: 'Fidelidad'  },
  { href: '/dashboard/usuarios',  icon: '🔑', label: 'Usuarios', adminOnly: true },
]

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sesion, setSesion] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = getToken()
    const s = getSesion()
    if (!token || !s) { router.replace('/login'); return }
    setSesion(s)
  }, [router])

  const logout = useCallback(() => {
    cerrarSesion()
    router.push('/login')
  }, [router])

  const pageTitle = NAV.find(n => n.href === pathname)?.label || 'Dashboard'

  const navItems = NAV.filter(n => !n.adminOnly || sesion?.rol === 'admin')

  if (!mounted || !sesion) return (
    <div style={{ minHeight: '100vh', background: '#0a061e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#7c3aed', fontFamily: 'IBM Plex Mono, monospace', fontSize: 14 }}>Cargando…</div>
    </div>
  )

  return (
    <>
<style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg-0:#f4f2ff; --bg-1:#ffffff; --bg-2:#f8f7ff;
          --blue:#7c3aed; --green:#059669; --red:#dc2626; --amber:#d97706;
          --purple:#9333ea; --cyan:#0891b2;
          --txt-0:#1a1035; --txt-1:#4b4468; --txt-2:#8b82a8;
          --sidebar-w: 220px;
        }
        html, body { height: 100%; }
        body { font-family: 'DM Sans', sans-serif; background: var(--bg-0); color: var(--txt-0); }
        .layout { display: flex; min-height: 100vh; }

        /* SIDEBAR */
        .sidebar {
          width: var(--sidebar-w); background: #0f0826; color: #e2deff;
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; height: 100vh;
          z-index: 100; transition: transform 0.25s ease;
          border-right: 1px solid rgba(124,58,237,0.2);
        }
        .sidebar-brand {
          padding: 24px 20px 18px;
          border-bottom: 1px solid rgba(124,58,237,0.15);
        }
        .sidebar-brand .name {
          font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800;
          color: #fff; letter-spacing: -0.3px;
        }
        .sidebar-brand .name span { color: #7c3aed; }
        .sidebar-brand .ver {
          font-family: 'IBM Plex Mono', monospace; font-size: 10px;
          color: #8b82a8; margin-top: 3px;
        }
        .nav-list { flex: 1; padding: 16px 12px; list-style: none; overflow-y: auto; }
        .nav-list li a, .nav-list li button {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 9px; text-decoration: none;
          font-size: 14px; font-weight: 500; color: #a89ec8; cursor: pointer;
          background: none; border: none; width: 100%; text-align: left;
          transition: background 0.15s, color 0.15s;
        }
        .nav-list li a:hover, .nav-list li button:hover { background: rgba(124,58,237,0.1); color: #e2deff; }
        .nav-list li a.active { background: rgba(124,58,237,0.2); color: #d8b4fe; font-weight: 600; }
        .nav-list li a .icon { font-size: 16px; width: 22px; text-align: center; }
        .sidebar-bottom {
          padding: 16px 12px;
          border-top: 1px solid rgba(124,58,237,0.15);
        }
        .user-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 9px;
          background: rgba(124,58,237,0.08); margin-bottom: 10px;
        }
        .user-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #9333ea);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .user-info .uname { font-size: 13px; font-weight: 600; color: #e2deff; }
        .user-info .urol {
          font-size: 10px; color: #8b82a8;
          font-family: 'IBM Plex Mono', monospace; text-transform: uppercase;
        }
        .btn-logout {
          width: 100%; padding: 8px 12px; border-radius: 9px;
          background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.2);
          color: #fca5a5; font-size: 13px; font-weight: 500; cursor: pointer;
          transition: background 0.15s;
        }
        .btn-logout:hover { background: rgba(220,38,38,0.16); }

        /* TOPBAR */
        .topbar {
          position: fixed; top: 0; left: var(--sidebar-w); right: 0; height: 58px;
          background: rgba(255,255,255,0.9); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(124,58,237,0.1);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; z-index: 50;
        }
        .topbar-title {
          font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700;
          color: var(--txt-0); display: flex; align-items: center; gap: 10px;
        }
        .topbar-actions { display: flex; align-items: center; gap: 10px; }
        .topbar-rol {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          background: rgba(124,58,237,0.1); color: var(--blue);
          padding: 3px 10px; border-radius: 20px; font-weight: 600; text-transform: uppercase;
        }
        .hamburger {
          display: none; background: none; border: none; cursor: pointer;
          font-size: 22px; color: var(--txt-0);
        }

        /* MAIN */
        .main { margin-left: var(--sidebar-w); margin-top: 58px; padding: 28px 28px; min-height: calc(100vh - 58px); }

        /* OVERLAY */
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .topbar { left: 0; }
          .main { margin-left: 0; padding: 20px 16px; }
          .hamburger { display: block; }
          .overlay.open { display: block; }
        }

        /* UTILS */
        .badge {
          display: inline-flex; align-items: center; padding: 2px 10px;
          border-radius: 20px; font-size: 11px; font-weight: 600;
          font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .badge-green  { background: rgba(5,150,105,0.12); color: #059669; }
        .badge-red    { background: rgba(220,38,38,0.12); color: #dc2626; }
        .badge-amber  { background: rgba(217,119,6,0.12); color: #d97706; }
        .badge-blue   { background: rgba(124,58,237,0.12); color: #7c3aed; }
        .badge-gray   { background: rgba(139,130,168,0.12); color: #8b82a8; }
        .badge-cyan   { background: rgba(8,145,178,0.12); color: #0891b2; }

        .card {
          background: var(--bg-1); border: 1px solid rgba(124,58,237,0.1);
          border-radius: 14px; padding: 22px;
          box-shadow: 0 2px 12px rgba(26,16,53,0.06);
        }
        .card-title {
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          color: var(--txt-0); margin-bottom: 16px;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
          text-align: left; padding: 10px 14px;
          font-size: 11px; font-weight: 600; color: var(--txt-2);
          text-transform: uppercase; letter-spacing: 0.8px;
          font-family: 'IBM Plex Mono', monospace;
          border-bottom: 1px solid rgba(124,58,237,0.08);
          background: var(--bg-2);
        }
        td {
          padding: 11px 14px; font-size: 14px; color: var(--txt-0);
          border-bottom: 1px solid rgba(124,58,237,0.05);
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(124,58,237,0.025); }
        .mono { font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer; border: none;
          transition: opacity 0.15s, transform 0.1s; font-family: 'DM Sans', sans-serif;
        }
        .btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn-primary { background: var(--blue); color: #fff; }
        .btn-danger  { background: var(--red); color: #fff; }
        .btn-ghost   { background: rgba(124,58,237,0.08); color: var(--blue); }
        .btn-sm      { padding: 5px 11px; font-size: 12px; }
        .input {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(124,58,237,0.2); background: var(--bg-0);
          color: var(--txt-0); font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .select {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(124,58,237,0.2); background: var(--bg-0);
          color: var(--txt-0); font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; cursor: pointer;
        }
        .form-row { display: grid; gap: 14px; }
        .form-row.cols-2 { grid-template-columns: 1fr 1fr; }
        .form-row.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 12px; font-weight: 600; color: var(--txt-2); text-transform: uppercase; letter-spacing: 0.8px; font-family: 'IBM Plex Mono', monospace; }

        /* MODAL */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          z-index: 200; display: flex; align-items: center; justify-content: center;
          padding: 20px; backdrop-filter: blur(4px);
          animation: fade-in 0.15s ease;
        }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        .modal {
          background: var(--bg-1); border-radius: 16px;
          width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0,0,0,0.25);
          animation: slide-up 0.2s ease;
        }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .modal-header {
          padding: 20px 24px 16px; border-bottom: 1px solid rgba(124,58,237,0.08);
          display: flex; align-items: center; justify-content: space-between;
        }
        .modal-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; }
        .modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--txt-2); padding: 4px; }
        .modal-body { padding: 22px 24px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid rgba(124,58,237,0.08); display: flex; gap: 10px; justify-content: flex-end; }

        /* KPI */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card {
          background: var(--bg-1); border: 1px solid rgba(124,58,237,0.1);
          border-radius: 14px; padding: 18px 20px;
          box-shadow: 0 2px 8px rgba(26,16,53,0.05);
        }
        .kpi-label { font-size: 11px; font-weight: 600; color: var(--txt-2); text-transform: uppercase; letter-spacing: 0.8px; font-family: 'IBM Plex Mono', monospace; margin-bottom: 8px; }
        .kpi-val { font-family: 'IBM Plex Mono', monospace; font-size: 28px; font-weight: 600; color: var(--blue); line-height: 1; }
        .kpi-sub { font-size: 12px; color: var(--txt-2); margin-top: 5px; }

        .empty { text-align: center; padding: 48px; color: var(--txt-2); font-size: 15px; }
        .loading-row td { text-align: center; color: var(--txt-2); padding: 32px; }

        @media (max-width: 640px) {
          .form-row.cols-2, .form-row.cols-3 { grid-template-columns: 1fr; }
          .kpi-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="layout">
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-brand">
            <div className="name">GALANET <span>OESTE</span></div>
            <div className="ver">v8.0 · Next.js + Supabase</div>
          </div>
          <ul className="nav-list">
            {navItems.map(item => (
              <li key={item.href}>
                <a href={item.href} className={pathname === item.href ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="sidebar-bottom">
            <div className="user-chip">
              <div className="user-avatar">{sesion.usuario?.[0]?.toUpperCase()}</div>
              <div className="user-info">
                <div className="uname">{sesion.usuario}</div>
                <div className="urol">{sesion.rol}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={logout}>⟵ Cerrar sesión</button>
          </div>
        </aside>

        <div className={`overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <header className="topbar">
          <div className="topbar-title">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            {pageTitle}
          </div>
          <div className="topbar-actions">
            <span className="topbar-rol">{sesion.rol}</span>
          </div>
        </header>

        <main className="main">{children}</main>
      </div>
    </>
  )
}
