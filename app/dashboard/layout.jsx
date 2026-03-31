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
  const [theme, setTheme] = useState('light')
  const [glassEnabled, setGlassEnabled] = useState(true)

  useEffect(() => {
    setMounted(true)
    // Cargar preferencias guardadas
    const savedTheme = localStorage.getItem('galanet-theme') || 'light'
    const savedGlass = localStorage.getItem('galanet-glass') !== 'false'
    setTheme(savedTheme)
    setGlassEnabled(savedGlass)
    
    cargarSesion().then(s => {
      if (!s) { router.replace('/login'); return }
      setSesion(s)
    })
  }, [router])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('galanet-theme', newTheme)
  }, [theme])

  const toggleGlass = useCallback(() => {
    const newGlass = !glassEnabled
    setGlassEnabled(newGlass)
    localStorage.setItem('galanet-glass', newGlass.toString())
  }, [glassEnabled])

  const logout = useCallback(async () => {
    await fetch('/api/auth/login', { method:'DELETE', credentials:'same-origin' }).catch(()=>{})
    cerrarSesion()
    router.push('/login')
  }, [router])

  const navItems  = NAV.filter(n => !n.adminOnly || sesion?.rol === 'admin')
  const pageTitle = NAV.find(n => n.href==='/dashboard' ? pathname==='/dashboard' : pathname.startsWith(n.href))?.label || 'Dashboard'

  if (!mounted || !sesion) return (
    <div style={{minHeight:'100vh',background:theme === 'dark' ? '#0f172a' : '#f6f8fa',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid #e2e8f0',borderTop:'3px solid #16a34a',borderRadius:'50%',animation:'_sp .7s linear infinite'}}/>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
<style suppressHydrationWarning>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  html,body{height:100%;}
  body{font-family:'Inter',sans-serif;color:var(--text-on-surface);-webkit-font-smoothing:antialiased;background:var(--surface-background);}

  /* ─── CSS VARIABLES ───────────────────────────────── */
  :root {
    --primary: #006b2c;
    --primary-container: #00873a;
    --on-primary: #ffffff;
    --on-primary-container: #f7fff2;
    --primary-fixed: #7ffc97;
    --primary-fixed-dim: #62df7d;
    --on-primary-fixed: #002109;
    --on-primary-fixed-variant: #005320;
    
    --secondary: #0051d5;
    --secondary-container: #316bf3;
    --on-secondary: #ffffff;
    --on-secondary-container: #fefcff;
    --secondary-fixed: #dbe1ff;
    --secondary-fixed-dim: #b4c5ff;
    --on-secondary-fixed: #00174b;
    --on-secondary-fixed-variant: #003ea8;
    
    --tertiary: #bb0112;
    --tertiary-container: #e02928;
    --on-tertiary: #ffffff;
    --on-tertiary-container: #fffbff;
    --tertiary-fixed: #ffdad6;
    --tertiary-fixed-dim: #ffb4ab;
    --on-tertiary-fixed: #410002;
    --on-tertiary-fixed-variant: #93000b;
    
    --surface: #f9f9ff;
    --surface-container: #e7eeff;
    --surface-container-low: #f0f3ff;
    --surface-container-high: #dee8ff;
    --surface-container-highest: #d8e3fb;
    --surface-container-lowest: #ffffff;
    --surface-bright: #f9f9ff;
    --surface-dim: #cfdaf2;
    --surface-variant: #d8e3fb;
    
    --background: #f9f9ff;
    --on-background: #111c2d;
    --on-surface: #111c2d;
    --on-surface-variant: #3e4a3d;
    
    --outline: #6e7b6c;
    --outline-variant: #bdcaba;
    
    --error: #ba1a1a;
    --error-container: #ffdad6;
    --on-error: #ffffff;
    --on-error-container: #93000a;
    
    --inverse-surface: #263143;
    --inverse-on-surface: #ecf1ff;
    --inverse-primary: #62df7d;
    
    --shadow-color: rgba(0, 0, 0, 0.1);
    --glass-bg: rgba(249, 249, 255, 0.8);
    --glass-border: rgba(255, 255, 255, 0.2);
  }

  [data-theme="dark"] {
    --surface: #0f172a;
    --surface-container: #1e293b;
    --surface-container-low: #1e293b;
    --surface-container-high: #334155;
    --surface-container-highest: #475569;
    --surface-container-lowest: #0f172a;
    --surface-bright: #1e293b;
    --surface-dim: #0f172a;
    --surface-variant: #334155;
    
    --background: #0f172a;
    --on-background: #f8fafc;
    --on-surface: #f8fafc;
    --on-surface-variant: #cbd5e1;
    
    --outline: #64748b;
    --outline-variant: #475569;
    
    --shadow-color: rgba(0, 0, 0, 0.3);
    --glass-bg: rgba(30, 41, 59, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
  }

  /* ─── SIDEBAR ───────────────────────────────── */
  .gn-side{
    position:fixed;left:0;top:0;bottom:0;width:72px;
    background:var(--surface);
    border-right:1px solid var(--outline-variant);
    display:flex;flex-direction:column;align-items:center;
    padding:16px 0;z-index:200;overflow:visible;
    ${glassEnabled ? 'backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);' : ''}
  }

  .gn-logo{
    width:40px;height:40px;border-radius:12px;
    background:var(--primary);
    display:flex;align-items:center;justify-content:center;
    margin-bottom:28px;flex-shrink:0;
    box-shadow:0 4px 16px rgba(0, 107, 44, 0.3);
    transition:transform 0.2s, box-shadow 0.2s;
  }
  .gn-logo:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0, 107, 44, 0.4);}
  .gn-logo svg{width:22px;height:22px;stroke:var(--on-primary);fill:none;stroke-width:1.8;stroke-linecap:round;}

  .gn-nav{flex:1;display:flex;flex-direction:column;gap:2px;width:100%;padding:0 10px;}

  .gn-item{
    position:relative;
    display:flex;align-items:center;justify-content:center;
    width:52px;height:48px;border-radius:12px;
    color:var(--on-surface-variant);
    text-decoration:none;cursor:pointer;
    border:none;background:transparent;
    transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink:0;
  }
  .gn-item:hover{background:var(--primary-container);color:var(--on-primary-container);transform:translateX(2px);}
  .gn-item.on{background:var(--primary);color:var(--on-primary);box-shadow:0 4px 12px rgba(0, 107, 44, 0.3);}
  .gn-item.on::before{
    content:'';position:absolute;left:-10px;top:50%;
    transform:translateY(-50%);
    width:3px;height:24px;border-radius:0 3px 3px 0;
    background:var(--primary);
  }

  /* Tooltip */
  .gn-tip{
    position:absolute;left:calc(100% + 10px);top:50%;
    transform:translateY(-50%) scale(0.92);
    transform-origin:left center;
    background:var(--inverse-surface);color:var(--inverse-on-surface);
    border-radius:8px;padding:6px 12px;
    font-family:'Inter',sans-serif;font-size:13px;font-weight:500;
    white-space:nowrap;pointer-events:none;
    opacity:0;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:0 8px 32px var(--shadow-color);z-index:999;
    letter-spacing:0;
  }
  .gn-tip::before{
    content:'';position:absolute;right:100%;top:50%;
    transform:translateY(-50%);
    border:5px solid transparent;
    border-right-color:var(--inverse-surface);
  }
  .gn-item:hover .gn-tip{opacity:1;transform:translateY(-50%) scale(1);}

  .gn-sep{width:32px;height:1px;background:var(--outline-variant);margin:8px auto;flex-shrink:0;}

  .gn-avatar{
    width:38px;height:38px;border-radius:10px;
    background:var(--primary-container);border:1px solid var(--primary);
    display:flex;align-items:center;justify-content:center;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:700;
    color:var(--on-primary);margin-bottom:6px;cursor:pointer;position:relative;
    flex-shrink:0;transition:all 0.2s;
  }
  .gn-avatar:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0, 107, 44, 0.3);}

  .gn-logout{
    width:52px;height:44px;border-radius:12px;
    display:flex;align-items:center;justify-content:center;
    color:var(--on-surface-variant);cursor:pointer;border:none;background:transparent;
    transition:all 0.2s;
  }
  .gn-logout:hover{background:var(--tertiary-container);color:var(--on-tertiary);transform:translateX(2px);}

  /* ─── TOPBAR ─────────────────────────────────── */
  .gn-top{
    position:fixed;top:0;left:72px;right:0;height:60px;
    background:var(--surface);
    border-bottom:1px solid var(--outline-variant);
    display:flex;align-items:center;padding:0 28px;z-index:100;gap:16px;
    ${glassEnabled ? 'backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);' : ''}
  }
  .gn-top-title{
    font-family:'Inter',sans-serif;font-size:18px;font-weight:700;
    color:var(--on-surface);flex:1;letter-spacing:-0.4px;
  }
  .gn-top-path{
    font-family:'JetBrains Mono',monospace;font-size:11px;
    color:var(--on-surface-variant);
  }
  .gn-top-path b{color:var(--primary);font-weight:500;}
  .gn-top-badge{
    font-family:'Inter',sans-serif;font-size:12px;font-weight:600;
    color:var(--on-primary);background:var(--primary-container);
    border:1px solid var(--primary);
    padding:4px 14px;border-radius:20px;text-transform:capitalize;
    letter-spacing:0;transition:all 0.2s;
  }
  .gn-top-badge:hover{transform:scale(1.05);}
  .gn-dot{
    width:8px;height:8px;border-radius:50%;
    background:var(--primary);
    box-shadow:0 0 0 3px var(--primary-container);
    animation:_pdot 2.5s ease-in-out infinite;
  }
  @keyframes _pdot{0%,100%{opacity:1}50%{opacity:.4}}

  /* ─── SETTINGS PANEL ───────────────────────────── */
  .gn-settings{
    position:fixed;top:80px;right:28px;
    background:var(--glass-bg);
    border:1px solid var(--glass-border);
    border-radius:16px;padding:16px;
    box-shadow:0 8px 32px var(--shadow-color);
    z-index:150;
    min-width:200px;
    ${glassEnabled ? 'backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);' : ''}
  }
  .gn-settings-item{
    display:flex;align-items:center;justify-content:space-between;
    padding:8px 0;border-bottom:1px solid var(--outline-variant);
  }
  .gn-settings-item:last-child{border-bottom:none;}
  .gn-settings-label{
    font-size:12px;font-weight:600;color:var(--on-surface);
  }
  .gn-settings-toggle{
    width:44px;height:24px;background:var(--surface-container-high);
    border-radius:12px;position:relative;cursor:pointer;
    transition:background 0.2s;
  }
  .gn-settings-toggle.active{background:var(--primary);}
  .gn-settings-toggle-knob{
    position:absolute;top:2px;left:2px;width:20px;height:20px;
    background:white;border-radius:50%;transition:transform 0.2s;
    box-shadow:0 2px 4px rgba(0,0,0,0.2);
  }
  .gn-settings-toggle.active .gn-settings-toggle-knob{transform:translateX(20px);}

  /* ─── MAIN ───────────────────────────────────── */
  .gn-main{
    margin-left:72px;margin-top:60px;
    min-height:calc(100vh - 60px);
    padding:28px 32px;
    background:var(--background);
  }

  /* ─── CARDS ──────────────────────────────────── */
  .card{
    background:var(--surface-container-lowest);
    border:1px solid var(--outline-variant);
    border-radius:16px;
    padding:22px;
    box-shadow:0 1px 4px var(--shadow-color);
    transition:all 0.2s;
  }
  .card:hover{box-shadow:0 8px 32px var(--shadow-color);transform:translateY(-2px);}
  .card-title{
    font-size:14px;font-weight:600;color:var(--on-surface);
    margin-bottom:18px;display:flex;align-items:center;gap:8px;
  }
  .card-title .acc{width:3px;height:16px;background:var(--primary);border-radius:2px;flex-shrink:0;}

  /* ─── KPI ────────────────────────────────────── */
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:24px;}
  .kpi-card{
    background:var(--surface-container-lowest);border:1px solid var(--outline-variant);border-radius:14px;
    padding:18px 20px;
    box-shadow:0 1px 3px var(--shadow-color);
    transition:all 0.2s;
  }
  .kpi-card:hover{box-shadow:0 8px 24px var(--shadow-color);transform:translateY(-2px);}
  .kpi-label{font-size:11px;font-weight:600;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;}
  .kpi-val{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:var(--on-surface);line-height:1;}
  .kpi-sub{font-size:11px;color:var(--on-surface-variant);margin-top:6px;font-weight:500;}

  /* ─── TABLE ──────────────────────────────────── */
  table{width:100%;border-collapse:collapse;}
  th{
    text-align:left;padding:10px 16px;
    font-size:11px;font-weight:600;color:var(--on-surface-variant);
    text-transform:uppercase;letter-spacing:.8px;
    border-bottom:1px solid var(--outline-variant);
    background:var(--surface-container);
  }
  td{padding:12px 16px;font-size:13px;color:var(--on-surface);border-bottom:1px solid var(--outline-variant);}
  tr:last-child td{border-bottom:none;}
  tbody tr:hover td{background:var(--surface-container);}
  .mono{font-family:'JetBrains Mono',monospace;font-size:12px;}

  /* ─── BADGES ─────────────────────────────────── */
  .badge{
    display:inline-flex;align-items:center;padding:3px 10px;
    border-radius:20px;font-size:11px;font-weight:600;
    letter-spacing:.3px;transition:all 0.2s;
  }
  .badge-green {background:var(--primary-container);color:var(--on-primary-container);}
  .badge-red   {background:var(--tertiary-container);color:var(--on-tertiary-container);}
  .badge-amber {background:var(--surface-container-high);color:var(--on-surface);}
  .badge-blue  {background:var(--secondary-container);color:var(--on-secondary-container);}
  .badge-gray  {background:var(--surface-container);color:var(--on-surface);}
  .badge-cyan  {background:var(--surface-container-high);color:var(--on-surface);}
  .badge-purple{background:var(--surface-container);color:var(--on-surface);}

  /* ─── BUTTONS ────────────────────────────────── */
  .btn{
    display:inline-flex;align-items:center;gap:6px;
    padding:9px 18px;border-radius:10px;
    font-size:13px;font-weight:600;font-family:'Inter',sans-serif;
    cursor:pointer;border:none;letter-spacing:-.1px;
    transition:all 0.2s;
  }
  .btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px var(--shadow-color);}
  .btn:active{transform:none;}
  .btn:disabled{opacity:.45;cursor:not-allowed;transform:none;}
  .btn-primary{background:var(--primary);color:var(--on-primary);box-shadow:0 2px 8px rgba(0, 107, 44, 0.3);}
  .btn-primary:hover{background:var(--primary-container);box-shadow:0 4px 16px rgba(0, 107, 44, 0.35);}
  .btn-danger {background:var(--tertiary-container);color:var(--on-tertiary);border:1px solid var(--tertiary);}
  .btn-danger:hover{background:var(--tertiary);}
  .btn-ghost  {background:var(--surface-container);color:var(--on-surface);border:1px solid var(--outline-variant);}
  .btn-ghost:hover{background:var(--surface-container-high);border-color:var(--outline);}
  .btn-sm     {padding:6px 13px;font-size:12px;border-radius:8px;}

  /* ─── INPUTS ─────────────────────────────────── */
  .input,.select{
    width:100%;padding:10px 13px;border-radius:10px;
    border:1px solid var(--outline-variant);background:var(--surface-container-lowest);
    color:var(--on-surface);font-size:13px;font-family:'Inter',sans-serif;
    outline:none;transition:all .2s;
  }
  .input:focus,.select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(0, 107, 44, 0.1);}
  .input::placeholder{color:var(--on-surface-variant);}
  .select{cursor:pointer;}

  .form-row{display:grid;gap:14px;}
  .form-row.cols-2{grid-template-columns:1fr 1fr;}
  .form-row.cols-3{grid-template-columns:1fr 1fr 1fr;}
  .field-group{display:flex;flex-direction:column;gap:5px;}
  .field-label{font-size:11px;font-weight:600;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:.8px;}

  /* ─── MODAL ──────────────────────────────────── */
  .modal-backdrop{
    position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;
    display:flex;align-items:center;justify-content:center;
    padding:20px;backdrop-filter:blur(4px);
    animation:_fi .15s ease;
  }
  @keyframes _fi{from{opacity:0}to{opacity:1}}
  .modal{
    background:var(--surface-container-lowest);border:1px solid var(--outline-variant);border-radius:20px;
    width:100%;max-width:580px;max-height:92vh;overflow-y:auto;
    box-shadow:0 20px 60px var(--shadow-color);
    animation:_su .2s ease;
  }
  @keyframes _su{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-header{padding:22px 26px 18px;border-bottom:1px solid var(--outline-variant);display:flex;align-items:center;justify-content:space-between;}
  .modal-title{font-size:17px;font-weight:700;color:var(--on-surface);letter-spacing:-.3px;}
  .modal-close{background:none;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;color:var(--on-surface-variant);display:flex;align-items:center;justify-content:center;font-size:18px;transition:all .15s;}
  .modal-close:hover{background:var(--surface-container);color:var(--on-surface);}
  .modal-body{padding:22px 26px;}
  .modal-footer{padding:16px 26px;border-top:1px solid var(--outline-variant);display:flex;gap:10px;justify-content:flex-end;}

  /* ─── MISC ───────────────────────────────────── */
  .empty{text-align:center;padding:48px 24px;color:var(--on-surface-variant);font-size:14px;}
  .error-msg{background:var(--tertiary-container);border:1px solid var(--tertiary);color:var(--on-tertiary);border-radius:10px;padding:11px 14px;font-size:13px;margin-bottom:16px;}

  .upload-zone{
    border:2px dashed var(--outline-variant);border-radius:12px;
    padding:28px 20px;text-align:center;cursor:pointer;
    transition:all .2s;background:var(--surface-container);
  }
  .upload-zone:hover,.upload-zone.drag{border-color:var(--primary);background:var(--primary-container);}
  .upload-zone.has-file{border-color:var(--primary);background:var(--primary-container);border-style:solid;}

  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:var(--surface-container);}
  ::-webkit-scrollbar-thumb{background:var(--outline-variant);border-radius:3px;}
  ::-webkit-scrollbar-thumb:hover{background:var(--outline);}

  @media(max-width:640px){
    .form-row.cols-2,.form-row.cols-3{grid-template-columns:1fr;}
    .kpi-grid{grid-template-columns:1fr 1fr;}
    .gn-main{padding:16px;}
    .gn-top{padding:0 16px;}
    .gn-settings{right:16px;}
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
        
        {/* Settings Button */}
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => setHovered(hovered === 'settings' ? null : 'settings')}
          style={{padding: '6px 10px'}}
        >
          <Ico k="usuarios" s={16}/>
        </button>
      </header>

      {/* Settings Panel */}
      {hovered === 'settings' && (
        <div className="gn-settings">
          <div className="gn-settings-item">
            <span className="gn-settings-label">Modo {theme === 'light' ? 'claro' : 'oscuro'}</span>
            <div className={`gn-settings-toggle ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme}>
              <div className="gn-settings-toggle-knob"/>
            </div>
          </div>
          <div className="gn-settings-item">
            <span className="gn-settings-label">Efecto Glass</span>
            <div className={`gn-settings-toggle ${glassEnabled ? 'active' : ''}`} onClick={toggleGlass}>
              <div className="gn-settings-toggle-knob"/>
            </div>
          </div>
        </div>
      )}

      <main className="gn-main" data-theme={theme}>
        {children}
      </main>
    </>
  )
}
