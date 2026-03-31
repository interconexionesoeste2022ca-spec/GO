'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cargarSesion, cerrarSesion } from '@/lib/api'

const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  clientes:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  pagos:     <><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/><circle cx="12" cy="15" r="2"/></>,
  planes:    <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
  cuentas:   <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
  reportes:  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  tasa:      <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  fidelidad: <><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></>,
  usuarios:  <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 11v1"/></>,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  cobranza: <><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/><line x1="12" y1="14" x2="12" y2="17"/><circle cx="12" cy="14" r="2"/></>,
  mapa:     <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  rentabilidad: <><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></>,
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
  const [hovered, setHovered] = useState(null)

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
    <div style={{minHeight:'100vh',background:'#f6f8fa',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid #e2e8f0',borderTop:'3px solid #16a34a',borderRadius:'50%',animation:'_sp .7s linear infinite'}}/>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
<style suppressHydrationWarning>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  html,body{height:100%;background:#f6f8fa!important;}
  body{font-family:'Inter',sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;background:#f6f8fa!important;}

  /* ─── SIDEBAR ───────────────────────────────── */
  .gn-side{
    position:fixed;left:0;top:0;bottom:0;width:72px;
    background:#ffffff;
    border-right:1px solid #e2e8f0;
    display:flex;flex-direction:column;align-items:center;
    padding:16px 0;z-index:200;overflow:visible;
  }

  .gn-logo{
    width:40px;height:40px;border-radius:12px;
    background:#16a34a;
    display:flex;align-items:center;justify-content:center;
    margin-bottom:28px;flex-shrink:0;
    box-shadow:0 2px 8px rgba(22,163,74,0.35);
  }
  .gn-logo svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:1.8;stroke-linecap:round;}

  .gn-nav{flex:1;display:flex;flex-direction:column;gap:2px;width:100%;padding:0 10px;}

  .gn-item{
    position:relative;
    display:flex;align-items:center;justify-content:center;
    width:52px;height:48px;border-radius:12px;
    color:#94a3b8;
    text-decoration:none;cursor:pointer;
    border:none;background:transparent;
    transition:background 0.15s,color 0.15s;
    flex-shrink:0;
  }
  .gn-item:hover{background:#f0fdf4;color:#16a34a;}
  .gn-item.on{background:#dcfce7;color:#15803d;}
  .gn-item.on::before{
    content:'';position:absolute;left:-10px;top:50%;
    transform:translateY(-50%);
    width:3px;height:24px;border-radius:0 3px 3px 0;
    background:#16a34a;
  }

  /* Tooltip */
  .gn-tip{
    position:absolute;left:calc(100% + 10px);top:50%;
    transform:translateY(-50%) scale(0.92);
    transform-origin:left center;
    background:#0f172a;color:#fff;
    border-radius:8px;padding:6px 12px;
    font-family:'Inter',sans-serif;font-size:13px;font-weight:500;
    white-space:nowrap;pointer-events:none;
    opacity:0;transition:opacity 0.12s,transform 0.12s;
    box-shadow:0 4px 12px rgba(0,0,0,0.18);z-index:999;
    letter-spacing:0;
  }
  .gn-tip::before{
    content:'';position:absolute;right:100%;top:50%;
    transform:translateY(-50%);
    border:5px solid transparent;
    border-right-color:#0f172a;
  }
  .gn-item:hover .gn-tip{opacity:1;transform:translateY(-50%) scale(1);}

  .gn-sep{width:32px;height:1px;background:#e2e8f0;margin:8px auto;flex-shrink:0;}

  .gn-avatar{
    width:38px;height:38px;border-radius:10px;
    background:#dcfce7;border:1px solid #bbf7d0;
    display:flex;align-items:center;justify-content:center;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:700;
    color:#15803d;margin-bottom:6px;cursor:pointer;position:relative;
    flex-shrink:0;
  }

  .gn-logout{
    width:52px;height:44px;border-radius:12px;
    display:flex;align-items:center;justify-content:center;
    color:#cbd5e1;cursor:pointer;border:none;background:transparent;
    transition:background 0.15s,color 0.15s;
  }
  .gn-logout:hover{background:#fef2f2;color:#ef4444;}

  /* ─── TOPBAR ─────────────────────────────────── */
  .gn-top{
    position:fixed;top:0;left:72px;right:0;height:60px;
    background:#ffffff;
    border-bottom:1px solid #e2e8f0;
    display:flex;align-items:center;padding:0 28px;z-index:100;gap:16px;
  }
  .gn-top-title{
    font-family:'Inter',sans-serif;font-size:18px;font-weight:700;
    color:#0f172a;flex:1;letter-spacing:-0.4px;
  }
  .gn-top-path{
    font-family:'JetBrains Mono',monospace;font-size:11px;
    color:#94a3b8;
  }
  .gn-top-path b{color:#16a34a;font-weight:500;}
  .gn-top-badge{
    font-family:'Inter',sans-serif;font-size:12px;font-weight:600;
    color:#15803d;background:#dcfce7;
    border:1px solid #bbf7d0;
    padding:4px 14px;border-radius:20px;text-transform:capitalize;
    letter-spacing:0;
  }
  .gn-dot{
    width:8px;height:8px;border-radius:50%;
    background:#22c55e;
    box-shadow:0 0 0 3px #dcfce7;
    animation:_pdot 2.5s ease-in-out infinite;
  }
  @keyframes _pdot{0%,100%{opacity:1}50%{opacity:.4}}

  /* ─── MAIN ───────────────────────────────────── */
  .gn-main{
    margin-left:72px;margin-top:60px;
    min-height:calc(100vh - 60px);
    padding:28px 32px;
    background:#f6f8fa;
  }

  /* ─── CARDS ──────────────────────────────────── */
  .card{
    background:#ffffff;
    border:1px solid #e2e8f0;
    border-radius:16px;
    padding:22px;
    box-shadow:0 1px 4px rgba(0,0,0,0.04);
  }
  .card-title{
    font-size:14px;font-weight:600;color:#0f172a;
    margin-bottom:18px;display:flex;align-items:center;gap:8px;
  }
  .card-title .acc{width:3px;height:16px;background:#16a34a;border-radius:2px;flex-shrink:0;}

  /* ─── KPI ────────────────────────────────────── */
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:24px;}
  .kpi-card{
    background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;
    padding:18px 20px;
    box-shadow:0 1px 3px rgba(0,0,0,0.04);
    transition:box-shadow 0.2s,border-color 0.2s;
  }
  .kpi-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.08);border-color:#cbd5e1;}
  .kpi-label{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;}
  .kpi-val{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:#0f172a;line-height:1;}
  .kpi-sub{font-size:11px;color:#94a3b8;margin-top:6px;font-weight:500;}

  /* ─── TABLE ──────────────────────────────────── */
  table{width:100%;border-collapse:collapse;}
  th{
    text-align:left;padding:10px 16px;
    font-size:11px;font-weight:600;color:#94a3b8;
    text-transform:uppercase;letter-spacing:.8px;
    border-bottom:1px solid #f1f5f9;
    background:#f8fafc;
  }
  td{padding:12px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;}
  tr:last-child td{border-bottom:none;}
  tbody tr:hover td{background:#f8fafc;}
  .mono{font-family:'JetBrains Mono',monospace;font-size:12px;}

  /* ─── BADGES ─────────────────────────────────── */
  .badge{
    display:inline-flex;align-items:center;padding:3px 10px;
    border-radius:20px;font-size:11px;font-weight:600;
    letter-spacing:.3px;
  }
  .badge-green {background:#dcfce7;color:#166534;}
  .badge-red   {background:#fee2e2;color:#991b1b;}
  .badge-amber {background:#fef9c3;color:#854d0e;}
  .badge-blue  {background:#dbeafe;color:#1e40af;}
  .badge-gray  {background:#f1f5f9;color:#475569;}
  .badge-cyan  {background:#cffafe;color:#155e75;}
  .badge-purple{background:#f3e8ff;color:#6b21a8;}

  /* ─── BUTTONS ────────────────────────────────── */
  .btn{
    display:inline-flex;align-items:center;gap:6px;
    padding:9px 18px;border-radius:10px;
    font-size:13px;font-weight:600;font-family:'Inter',sans-serif;
    cursor:pointer;border:none;letter-spacing:-.1px;
    transition:all 0.15s;
  }
  .btn:hover{transform:translateY(-1px);}
  .btn:active{transform:none;}
  .btn:disabled{opacity:.45;cursor:not-allowed;transform:none;}
  .btn-primary{background:#16a34a;color:#fff;box-shadow:0 2px 8px rgba(22,163,74,0.3);}
  .btn-primary:hover{background:#15803d;box-shadow:0 4px 16px rgba(22,163,74,0.35);}
  .btn-danger {background:#fee2e2;color:#991b1b;border:1px solid #fecaca;}
  .btn-danger:hover{background:#fecaca;}
  .btn-ghost  {background:#f8fafc;color:#334155;border:1px solid #e2e8f0;}
  .btn-ghost:hover{background:#f1f5f9;border-color:#cbd5e1;}
  .btn-sm     {padding:6px 13px;font-size:12px;border-radius:8px;}

  /* ─── INPUTS ─────────────────────────────────── */
  .input,.select{
    width:100%;padding:10px 13px;border-radius:10px;
    border:1px solid #e2e8f0;background:#ffffff;
    color:#0f172a;font-size:13px;font-family:'Inter',sans-serif;
    outline:none;transition:border-color .2s,box-shadow .2s;
  }
  .input:focus,.select:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,0.1);}
  .input::placeholder{color:#cbd5e1;}
  .select{cursor:pointer;}

  .form-row{display:grid;gap:14px;}
  .form-row.cols-2{grid-template-columns:1fr 1fr;}
  .form-row.cols-3{grid-template-columns:1fr 1fr 1fr;}
  .field-group{display:flex;flex-direction:column;gap:5px;}
  .field-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.8px;}

  /* ─── MODAL ──────────────────────────────────── */
  .modal-backdrop{
    position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:300;
    display:flex;align-items:center;justify-content:center;
    padding:20px;backdrop-filter:blur(4px);
    animation:_fi .15s ease;
  }
  @keyframes _fi{from{opacity:0}to{opacity:1}}
  .modal{
    background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;
    width:100%;max-width:580px;max-height:92vh;overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,0.15);
    animation:_su .2s ease;
  }
  @keyframes _su{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-header{padding:22px 26px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;}
  .modal-title{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px;}
  .modal-close{background:none;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:18px;transition:background .15s,color .15s;}
  .modal-close:hover{background:#f1f5f9;color:#334155;}
  .modal-body{padding:22px 26px;}
  .modal-footer{padding:16px 26px;border-top:1px solid #f1f5f9;display:flex;gap:10px;justify-content:flex-end;}

  /* ─── MISC ───────────────────────────────────── */
  .empty{text-align:center;padding:48px 24px;color:#94a3b8;font-size:14px;}
  .error-msg{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:11px 14px;font-size:13px;margin-bottom:16px;}

  .upload-zone{
    border:2px dashed #e2e8f0;border-radius:12px;
    padding:28px 20px;text-align:center;cursor:pointer;
    transition:all .2s;background:#f8fafc;
  }
  .upload-zone:hover,.upload-zone.drag{border-color:#16a34a;background:#f0fdf4;}
  .upload-zone.has-file{border-color:#16a34a;background:#f0fdf4;border-style:solid;}

  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:#f8fafc;}
  ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}
  ::-webkit-scrollbar-thumb:hover{background:#cbd5e1;}

  @media(max-width:640px){
    .form-row.cols-2,.form-row.cols-3{grid-template-columns:1fr;}
    .kpi-grid{grid-template-columns:1fr 1fr;}
    .gn-main{padding:16px;}
  }
  @keyframes spin{to{transform:rotate(360deg)}}
`}</style>

      {/* SIDEBAR */}
      <aside className="gn-side">
        <div className="gn-logo">
          <svg viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"/>
          </svg>
        </div>

        <nav className="gn-nav">
          {navItems.map(item => {
            const on = item.href==='/dashboard' ? pathname==='/dashboard' : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`gn-item${on?' on':''}`}>
                <Ico k={item.key} s={18}/>
                <span className="gn-tip">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="gn-sep"/>

        <div className="gn-avatar gn-item" style={{marginBottom:4}}>
          {sesion.usuario?.[0]?.toUpperCase()}
          <span className="gn-tip">{sesion.usuario} · {sesion.rol}</span>
        </div>

        <button className="gn-logout gn-item" onClick={logout}>
          <Ico k="logout" s={17}/>
          <span className="gn-tip">Cerrar sesión</span>
        </button>
      </aside>

      {/* TOPBAR */}
      <header className="gn-top">
        <div className="gn-top-title">{pageTitle}</div>
        <span className="gn-top-path">galanet / <b>{pageTitle.toLowerCase()}</b></span>
        <div className="gn-dot"/>
        <div className="gn-top-badge">{sesion.rol}</div>
      </header>

      <main className="gn-main">{children}</main>
    </>
  )
}