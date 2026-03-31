'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cargarSesion, cerrarSesion } from '@/lib/api'

// Material Symbols Icons via CSS
const ICONS = {
  dashboard: 'dashboard',
  clientes:  'group',
  pagos:     'payment',
  planes:    'layers',
  cuentas:   'home',
  reportes:  'description',
  tasa:      'trending_up',
  fidelidad: 'star',
  usuarios:  'admin_panel_settings',
  logout:    'logout',
  cobranza:  'account_balance',
  mapa:      'map',
  rentabilidad: 'bar_chart',
}

const NAV = [
  { href:'/dashboard',           key:'dashboard', label:'Dashboard'  },
  { href:'/dashboard/clientes',  key:'clientes',  label:'Clientes'   },
  { href:'/dashboard/pagos',     key:'pagos',     label:'Pagos'      },
  { href:'/dashboard/planes',    key:'planes',    label:'Planes'     },
  { href:'/dashboard/cuentas',   key:'cuentas',   label:'Cuentas'    },
  { href:'/dashboard/reportes',  key:'reportes',  label:'Reportes'   },
  { href:'/dashboard/tasa-bcv',  key:'tasa',      label:'Tasa BCV'   },
  { href:'/dashboard/rentabilidad', key:'rentabilidad', label:'Rentabilidad' },
  { href:'/dashboard/fidelidad', key:'fidelidad', label:'Fidelidad'  },
  { href:'/dashboard/cobranza',  key:'cobranza', label:'Cobranza'   },
  { href:'/dashboard/mapa',      key:'mapa',     label:'Mapa'        },
  { href:'/dashboard/usuarios',  key:'usuarios',  label:'Usuarios',  adminOnly:true },
]

function Ico({ k, s=18 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[k]}
    </svg>
  )
}

export default function DashboardLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [sesion,  setSesion]  = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    cargarSesion().then(s => {
      if (!s) { router.replace('/login'); return }
      setSesion(s)
    })
  }, [router])

  const logout = useCallback(async () => {
    await fetch('/api/auth/login', { method:'DELETE', credentials:'same-origin' }).catch(()=>{})
    cerrarSesion()
    router.push('/login')
  }, [router])

  const navItems  = NAV.filter(n => !n.adminOnly || sesion?.rol === 'admin')
  const pageTitle = NAV.find(n => n.href==='/dashboard' ? pathname==='/dashboard' : pathname.startsWith(n.href))?.label || 'Dashboard'

  if (!mounted || !sesion) return (
    <div style={{minHeight:'100vh',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:40,height:40,border:'3px solid var(--outline-variant)',borderTop:'3px solid var(--tertiary)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style suppressHydrationWarning>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        html,body { height:100%; background:var(--surface); }
        body { font-family:'Inter',sans-serif; color:var(--on-surface); -webkit-font-smoothing:antialiased; }
        
        .ds-layout {
          display:flex;
          height:100vh;
        }
        
        /* ═══ SIDEBAR ═══════════════════════════════ */
        .ds-sidebar {
          position:fixed;
          left:0;
          top:0;
          bottom:0;
          width:var(--sidebar-width);
          background:var(--surface-container-lowest);
          border-right:1px solid var(--outline);
          display:flex;
          flex-direction:column;
          padding:24px 0;
          z-index:200;
          overflow-y:auto;
        }
        
        .ds-sidebar-header {
          display:flex;
          align-items:center;
          gap:12px;
          padding:0 24px;
          margin-bottom:32px;
          flex-shrink:0;
        }
        
        .ds-logo {
          width:40px;
          height:40px;
          border-radius:10px;
          background:var(--tertiary);
          display:flex;
          align-items:center;
          justify-content:center;
          color:var(--on-tertiary);
          font-size:24px;
          font-weight:700;
        }
        
        .ds-logo-text h2 {
          font-family:'Manrope',sans-serif;
          font-size:18px;
          font-weight:700;
          color:var(--on-surface);
          line-height:1.2;
        }
        
        .ds-logo-text p {
          font-size:10px;
          font-weight:600;
          letter-spacing:0.08em;
          color:var(--on-surface-variant);
          text-transform:uppercase;
        }
        
        .ds-nav {
          flex:1;
          display:flex;
          flex-direction:column;
          gap:4px;
          padding:0 12px;
          margin-bottom:12px;
        }
        
        .ds-nav-item {
          position:relative;
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 16px;
          border-radius:12px;
          color:var(--on-surface-variant);
          text-decoration:none;
          font-size:13px;
          font-weight:500;
          cursor:pointer;
          border:none;
          background:transparent;
          transition:all 0.2s;
        }
        
        .ds-nav-item:hover {
          background:var(--surface-container-low);
          color:var(--tertiary);
        }
        
        .ds-nav-item.active {
          background:transparent;
          color:var(--tertiary);
          font-weight:600;
          border-right:4px solid var(--tertiary);
          padding-right:12px;
        }
        
        .ds-nav-item .material-symbols-outlined {
          font-size:20px;
        }
        
        .ds-nav-divider {
          height:1px;
          background:var(--outline);
          margin:12px 0;
          opacity:0.3;
        }
        
        .ds-user-card {
          padding:12px 16px;
          margin:0 12px;
          border-radius:12px;
          background:var(--surface-container-low);
          display:flex;
          align-items:center;
          gap:10px;
          margin-top:auto;
        }
        
        .ds-user-avatar {
          width:36px;
          height:36px;
          border-radius:8px;
          background:var(--tertiary);
          color:var(--on-tertiary);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
          flex-shrink:0;
        }
        
        .ds-user-info {
          min-width:0;
          flex:1;
        }
        
        .ds-user-name {
          font-size:13px;
          font-weight:600;
          color:var(--on-surface);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        
        .ds-user-role {
          font-size:10px;
          font-weight:500;
          color:var(--on-surface-variant);
          text-transform:uppercase;
          letter-spacing:0.05em;
        }
        
        .ds-logout-btn {
          background:transparent;
          border:none;
          color:var(--on-surface-variant);
          cursor:pointer;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
          width:32px;
          height:32px;
          border-radius:8px;
          transition:all 0.2s;
          flex-shrink:0;
        }
        
        .ds-logout-btn:hover {
          background:var(--error-container);
          color:var(--error);
        }
        
        /* ═══ MAIN CONTAINER ═══════════════════════ */
        .ds-main-container {
          margin-left:var(--sidebar-width);
          display:flex;
          flex-direction:column;
          flex:1;
        }
        
        /* ═══ HEADER ═══════════════════════════════ */
        .ds-header {
          position:sticky;
          top:0;
          height:var(--header-height);
          background:var(--surface-container-lowest);
          border-bottom:1px solid var(--outline);
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 32px;
          z-index:100;
        }
        
        .ds-header-left {
          display:flex;
          align-items:center;
          gap:16px;
          flex:1;
        }
        
        .ds-page-title {
          font-family:'Manrope',sans-serif;
          font-size:20px;
          font-weight:700;
          color:var(--on-surface);
        }
        
        .ds-header-right {
          display:flex;
          align-items:center;
          gap:20px;
        }
        
        .ds-breadcrumb {
          font-size:13px;
          color:var(--on-surface-variant);
        }
        
        .ds-breadcrumb b {
          color:var(--on-surface);
          font-weight:600;
        }
        
        .ds-header-badge {
          background:var(--tertiary-fixed);
          color:var(--on-tertiary-fixed);
          padding:6px 14px;
          border-radius:20px;
          font-size:11px;
          font-weight:600;
          text-transform:uppercase;
          letter-spacing:0.05em;
        }
        
        /* ═══ MAIN CONTENT ═════════════════════════ */
        .ds-main {
          flex:1;
          overflow:auto;
          padding:32px;
          background:var(--surface);
        }
        
        /* ═══ CARDS ════════════════════════════════ */
        .card {
          background:var(--surface-container-lowest);
          border:1px solid var(--outline);
          border-radius:14px;
          padding:20px;
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          transition:box-shadow 0.2s;
        }
        
        .card:hover {
          box-shadow:0 4px 12px rgba(0,0,0,0.08);
        }
        
        .card-title {
          font-family:'Manrope',sans-serif;
          font-size:16px;
          font-weight:700;
          color:var(--on-surface);
          margin-bottom:16px;
        }
        
        /* ═══ BUTTONS ══════════════════════════════ */
        .btn {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 18px;
          border-radius:10px;
          font-size:13px;
          font-weight:600;
          font-family:'Inter',sans-serif;
          cursor:pointer;
          border:none;
          transition:all 0.15s;
        }
        
        .btn-primary {
          background:var(--tertiary);
          color:var(--on-tertiary);
        }
        
        .btn-primary:hover {
          background:var(--tertiary-dim);
          transform:translateY(-1px);
        }
        
        .btn-secondary {
          background:var(--surface-container-high);
          color:var(--on-surface);
          border:1px solid var(--outline);
        }
        
        .btn-secondary:hover {
          background:var(--surface-container-highest);
        }
        
        .btn-danger {
          background:var(--error-container);
          color:var(--on-error-container);
        }
        
        .btn:disabled {
          opacity:0.5;
          cursor:not-allowed;
          transform:none !important;
        }
        
        /* ═══ INPUTS ═══════════════════════════════ */
        .input,
        .select {
          width:100%;
          padding:10px 13px;
          border-radius:10px;
          border:1px solid var(--outline);
          background:var(--surface-container-lowest);
          color:var(--on-surface);
          font-size:13px;
          font-family:'Inter',sans-serif;
          outline:none;
          transition:border-color 0.2s;
        }
        
        .input:focus,
        .select:focus {
          border-color:var(--tertiary);
          box-shadow:0 0 0 3px rgba(0,109,75,0.1);
        }
        
        .input::placeholder {
          color:var(--outline-variant);
        }
        
        /* ═══ BADGES ═══════════════════════════════ */
        .badge {
          display:inline-flex;
          align-items:center;
          padding:4px 12px;
          border-radius:20px;
          font-size:11px;
          font-weight:600;
        }
        
        .badge-success {
          background:var(--tertiary-fixed);
          color:var(--on-tertiary-fixed);
        }
        
        .badge-error {
          background:var(--error-container);
          color:var(--on-error-container);
        }
        
        /* ═══ SCROLLBAR ════════════════════════════ */
        ::-webkit-scrollbar {
          width:8px;
          height:8px;
        }
        
        ::-webkit-scrollbar-track {
          background:transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background:var(--outline-variant);
          border-radius:4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background:var(--outline);
        }
      `}</style>
      
      <div className="ds-layout">
        {/* ═▶ SIDEBAR */}
        <aside className="ds-sidebar">
          <div className="ds-sidebar-header">
            <div className="ds-logo">⚡</div>
            <div className="ds-logo-text">
              <h2>Galant</h2>
              <p>Network Ops</p>
            </div>
          </div>
          
          <nav className="ds-nav">
            {navItems.map(item => {
              const isActive = item.href==='/dashboard' ? pathname==='/dashboard' : pathname.startsWith(item.href)
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`ds-nav-item${isActive?' active':''}`}
                >
                  <span className="material-symbols-outlined">{ICONS[item.key]}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          
          <div className="ds-nav-divider"/>
          
          <div className="ds-user-card">
            <div className="ds-user-avatar">{sesion.usuario?.[0]?.toUpperCase()}</div>
            <div className="ds-user-info">
              <div className="ds-user-name">{sesion.usuario}</div>
              <div className="ds-user-role">{sesion.rol}</div>
            </div>
            <button 
              className="ds-logout-btn" 
              onClick={logout}
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </aside>
        
        {/* ═▶ MAIN CONTAINER */}
        <div className="ds-main-container">
          {/* ═▶ HEADER */}
          <header className="ds-header">
            <div className="ds-header-left">
              <h1 className="ds-page-title">{pageTitle}</h1>
            </div>
            <div className="ds-header-right">
              <span className="ds-breadcrumb">galanet / <b>{pageTitle.toLowerCase()}</b></span>
              <span className="ds-header-badge">{sesion.rol}</span>
            </div>
          </header>
          
          {/* ═▶ CONTENT */}
          <main className="ds-main">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}