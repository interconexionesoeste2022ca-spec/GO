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
  add:       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:     <><polyline points="20,6 9,17 4,12"/></>,
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

// Mobile Navigation Items (simplified for mobile)
const MOBILE_NAV = [
  { href:'/dashboard',           key:'dashboard', label:'Overview'  },
  { href:'/dashboard/clientes',  key:'clientes',  label:'Clients'   },
  { href:'/dashboard/mapa',      key:'mapa',     label:'Map'       },
  { href:'/dashboard/reportes',  key:'reportes',  label:'Reports'   },
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
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notificationCount, setNotificationCount] = useState(3)
  const [fabExpanded, setFabExpanded] = useState(false)
  const [fabActions, setFabActions] = useState([
    { label: 'Nuevo Cliente', icon: 'clientes', href: '/dashboard/clientes', color: '#16a34a' },
    { label: 'Nuevo Pago', icon: 'pagos', href: '/dashboard/pagos', color: '#0051d5' },
    { label: 'Nuevo Reporte', icon: 'reportes', href: '/dashboard/reportes', color: '#bb0112' },
  ])

  useEffect(() => {
    setMounted(true)
    
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Cargar preferencias guardadas
    const savedTheme = localStorage.getItem('galanet-theme') || 'light'
    const savedGlass = localStorage.getItem('galanet-glass') !== 'false'
    setTheme(savedTheme)
    setGlassEnabled(savedGlass)
    
    cargarSesion().then(s => {
      if (!s) { router.replace('/login'); return }
      setSesion(s)
    })

    return () => window.removeEventListener('resize', checkMobile)
  }, [router])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('galanet-theme', newTheme)
    
    // Add ripple effect
    document.body.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    setTimeout(() => {
      document.body.style.transition = ''
    }, 500)
  }, [theme])

  const toggleGlass = useCallback(() => {
    const newGlass = !glassEnabled
    setGlassEnabled(newGlass)
    localStorage.setItem('galanet-glass', newGlass.toString())
  }, [glassEnabled])

  const logout = useCallback(async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800)) // Simulate logout animation
    await fetch('/api/auth/login', { method:'DELETE', credentials:'same-origin' }).catch(()=>{})
    cerrarSesion()
    router.push('/login')
  }, [router])

  const handleFabClick = useCallback(() => {
    setFabExpanded(!fabExpanded)
  }, [fabExpanded])

  const handleFabAction = useCallback((action) => {
    setFabExpanded(false)
    setTimeout(() => {
      router.push(action.href)
    }, 300)
  }, [router])

  const navItems  = NAV.filter(n => !n.adminOnly || sesion?.rol === 'admin')
  const mobileNavItems = MOBILE_NAV
  const pageTitle = NAV.find(n => n.href==='/dashboard' ? pathname==='/dashboard' : pathname.startsWith(n.href))?.label || 'Dashboard'

  if (!mounted || !sesion) return (
    <div style={{minHeight:'100vh',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid var(--outline-variant)',borderTop:'3px solid var(--primary)',borderRadius:'50%',animation:'_sp .7s linear infinite'}}/>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
<style suppressHydrationWarning>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  /* ─── CSS VARIABLES ───────────────────────────────── */
  :root {
    /* Primary Colors */
    --primary: #006b2c;
    --primary-container: #00873a;
    --on-primary: #ffffff;
    --on-primary-container: #f7fff2;
    --primary-fixed: #7ffc97;
    --primary-fixed-dim: #62df7d;
    --on-primary-fixed: #002109;
    --on-primary-fixed-variant: #005320;
    
    /* Secondary Colors */
    --secondary: #0051d5;
    --secondary-container: #316bf3;
    --on-secondary: #ffffff;
    --on-secondary-container: #fefcff;
    --secondary-fixed: #dbe1ff;
    --secondary-fixed-dim: #b4c5ff;
    --on-secondary-fixed: #00174b;
    --on-secondary-fixed-variant: #003ea8;
    
    /* Tertiary Colors */
    --tertiary: #bb0112;
    --tertiary-container: #e02928;
    --on-tertiary: #ffffff;
    --on-tertiary-container: #fffbff;
    --tertiary-fixed: #ffdad6;
    --tertiary-fixed-dim: #ffb4ab;
    --on-tertiary-fixed: #410002;
    --on-tertiary-fixed-variant: #93000b;
    
    /* Surface Colors */
    --surface: #f9f9ff;
    --surface-container: #e7eeff;
    --surface-container-low: #f0f3ff;
    --surface-container-high: #dee8ff;
    --surface-container-highest: #d8e3fb;
    --surface-container-lowest: #ffffff;
    --surface-bright: #f9f9ff;
    --surface-dim: #cfdaf2;
    --surface-variant: #d8e3fb;
    
    /* Background Colors */
    --background: #f9f9ff;
    --on-background: #111c2d;
    --on-surface: #111c2d;
    --on-surface-variant: #3e4a3d;
    
    /* Outline Colors */
    --outline: #6e7b6c;
    --outline-variant: #bdcaba;
    
    /* Error Colors */
    --error: #ba1a1a;
    --error-container: #ffdad6;
    --on-error: #ffffff;
    --on-error-container: #93000a;
    
    /* Inverse Colors */
    --inverse-surface: #263143;
    --inverse-on-surface: #ecf1ff;
    --inverse-primary: #62df7d;
    
    /* Shadow and Glass */
    --shadow-color: rgba(0, 0, 0, 0.1);
    --glass-bg: rgba(249, 249, 255, 0.8);
    --glass-border: rgba(255, 255, 255, 0.2);
    
    /* Typography */
    --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
    --font-mono: "JetBrains Mono", monospace;
  }

  [data-theme="dark"] {
    /* Surface Colors - Dark */
    --surface: #0f172a;
    --surface-container: #1e293b;
    --surface-container-low: #1e293b;
    --surface-container-high: #334155;
    --surface-container-highest: #475569;
    --surface-container-lowest: #0f172a;
    --surface-bright: #1e293b;
    --surface-dim: #0f172a;
    --surface-variant: #334155;
    
    /* Background Colors - Dark */
    --background: #0f172a;
    --on-background: #f8fafc;
    --on-surface: #f8fafc;
    --on-surface-variant: #cbd5e1;
    
    /* Outline Colors - Dark */
    --outline: #64748b;
    --outline-variant: #475569;
    
    /* Shadow and Glass - Dark */
    --shadow-color: rgba(0, 0, 0, 0.3);
    --glass-bg: rgba(30, 41, 59, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
  }

  html,body{height:100%;background:var(--background);}
  body{font-family:var(--font-sans);color:var(--on-surface);-webkit-font-smoothing:antialiased;}

  /* ─── ADVANCED ANIMATIONS ───────────────────────── */
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px var(--primary);
    }
    50% {
      box-shadow: 0 0 20px var(--primary), 0 0 30px var(--primary);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }

  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translateY(0);
    }
    40%, 43% {
      transform: translateY(-10px);
    }
    70% {
      transform: translateY(-5px);
    }
    90% {
      transform: translateY(-2px);
    }
  }

  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes fabExpand {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(45deg) scale(1.1);
    }
    100% {
      transform: rotate(45deg) scale(1);
    }
  }

  @keyframes fabCollapse {
    0% {
      transform: rotate(45deg) scale(1);
    }
    50% {
      transform: rotate(225deg) scale(1.1);
    }
    100% {
      transform: rotate(225deg) scale(1);
    }
  }

  @keyframes fabActionAppear {
    from {
      opacity: 0;
      transform: scale(0) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes fabActionDisappear {
    from {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    to {
      opacity: 0;
      transform: scale(0) translateY(20px);
    }
  }

  /* ─── SIDEBAR (Desktop Only) ───────────────────────── */
  .gn-side{
    position:fixed;left:0;top:0;bottom:0;width:72px;
    background:var(--surface);
    border-right:1px solid var(--outline-variant);
    display:flex;flex-direction:column;align-items:center;
    padding:16px 0;z-index:200;overflow:visible;
    ${glassEnabled ? 'backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);' : ''}
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideInLeft 0.5s ease-out;
  }

  @media (max-width: 767px) {
    .gn-side { display: none; }
  }

  .gn-side:hover{
    box-shadow:0 8px 32px var(--shadow-color);
    transform: translateX(2px);
  }

  .gn-logo{
    width:40px;height:40px;border-radius:12px;
    background:linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
    display:flex;align-items:center;justify-content:center;
    margin-bottom:28px;flex-shrink:0;
    box-shadow:0 4px 16px rgba(0, 107, 44, 0.3);
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .gn-logo::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: rotate(45deg);
    animation: shimmer 3s infinite;
  }

  .gn-logo:hover{transform:scale(1.05) rotate(5deg);box-shadow:0 6px 20px rgba(0, 107, 44, 0.4);}
  .gn-logo svg{width:22px;height:22px;stroke:var(--on-primary);fill:none;stroke-width:1.8;stroke-linecap:round;position:relative;z-index:1;}

  .gn-nav{flex:1;display:flex;flex-direction:column;gap:2px;width:100%;padding:0 10px;}

  .gn-item{
    position:relative;
    display:flex;align-items:center;justify-content:center;
    width:52px;height:48px;border-radius:12px;
    color:var(--on-surface-variant);
    text-decoration:none;cursor:pointer;
    border:none;background:transparent;
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink:0;
    overflow: hidden;
  }

  .gn-item::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .gn-item:hover::before {
    width: 100px;
    height: 100px;
  }

  .gn-item:hover{background:var(--primary-container);color:var(--on-primary-container);transform:translateX(2px) scale(1.05);}
  .gn-item.on{background:linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);color:var(--on-primary);box-shadow:0 4px 12px rgba(0, 107, 44, 0.3);animation: pulse 2s ease-in-out infinite;}
  .gn-item.on::before{
    content:'';position:absolute;left:-10px;top:50%;
    transform:translateY(-50%);
    width:3px;height:24px;border-radius:0 3px 3px 0;
    background:linear-gradient(to bottom, var(--primary), var(--primary-container));
    animation: glow 2s ease-in-out infinite;
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
    opacity:0;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:0 8px 32px var(--shadow-color);z-index:999;
    letter-spacing:0;
  }
  .gn-tip::before{
    content:'';position:absolute;right:100%;top:50%;
    transform:translateY(-50%);
    border:5px solid transparent;
    border-right-color:var(--inverse-surface);
  }
  .gn-item:hover .gn-tip{opacity:1;transform:translateY(-50%) scale(1);animation: fadeInUp 0.3s ease-out;}

  .gn-sep{width:32px;height:1px;background:var(--outline-variant);margin:8px auto;flex-shrink:0;}

  .gn-avatar{
    width:38px;height:38px;border-radius:10px;
    background:linear-gradient(135deg, var(--primary-container) 0%, var(--primary) 100%);
    border:1px solid var(--primary);
    display:flex;align-items:center;justify-content:center;
    font-family:'Inter',sans-serif;font-size:14px;font-weight:700;
    color:var(--on-primary);margin-bottom:6px;cursor:pointer;position:relative;
    flex-shrink:0;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .gn-avatar::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent);
    transform: rotate(45deg);
    animation: shimmer 4s infinite;
  }

  .gn-avatar:hover{transform:scale(1.05) rotate(-5deg);box-shadow:0 4px 12px rgba(0, 107, 44, 0.3);}

  .gn-logout{
    width:52px;height:44px;border-radius:12px;
    display:flex;align-items:center;justify-content:center;
    color:var(--on-surface-variant);cursor:pointer;border:none;background:transparent;
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .gn-logout::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: var(--tertiary-container);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .gn-logout:hover::before {
    width: 100px;
    height: 100px;
  }

  .gn-logout:hover{background:var(--tertiary-container);color:var(--on-tertiary);transform:translateX(2px) scale(1.05);}

  /* ─── TOPBAR ─────────────────────────────────── */
  .gn-top{
    position:fixed;top:0;left:72px;right:0;height:60px;
    background:var(--surface);
    border-bottom:1px solid var(--outline-variant);
    display:flex;align-items:center;padding:0 28px;z-index:100;gap:16px;
    ${glassEnabled ? 'backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);' : ''}
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideInRight 0.5s ease-out;
  }

  @media (max-width: 767px) {
    .gn-top {
      left: 0;
      padding: 0 16px;
      height: 56px;
    }
  }

  .gn-top-title{
    font-family:var(--font-sans);font-size:18px;font-weight:700;
    color:var(--on-surface);flex:1;letter-spacing:-0.4px;
    position: relative;
    animation: fadeInUp 0.6s ease-out;
  }

  @media (max-width: 767px) {
    .gn-top-title {
      font-size: 16px;
    }
  }

  .gn-top-path{
    font-family:var(--font-mono);font-size:11px;
    color:var(--on-surface-variant);
    animation: fadeInUp 0.7s ease-out;
  }

  @media (max-width: 767px) {
    .gn-top-path {
      display: none;
    }
  }

  .gn-top-path b{color:var(--primary);font-weight:500;}
  .gn-top-badge{
    font-family:var(--font-sans);font-size:12px;font-weight:600;
    color:var(--on-primary);background:linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
    border:1px solid var(--primary);
    padding:4px 14px;border-radius:20px;text-transform:capitalize;
    letter-spacing:0;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.8s ease-out;
  }

  .gn-top-badge::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: rotate(45deg);
    animation: shimmer 3s infinite;
  }

  @media (max-width: 767px) {
    .gn-top-badge {
      font-size: 10px;
      padding: 3px 10px;
    }
  }

  .gn-top-badge:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0, 107, 44, 0.3);}
  .gn-dot{
    width:8px;height:8px;border-radius:50%;
    background:var(--primary);
    box-shadow:0 0 0 3px var(--primary-container);
    animation:_pdot 2.5s ease-in-out infinite;
    position: relative;
  }

  .gn-dot::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--primary);
    transform: translate(-50%, -50%);
    animation: ripple 1.5s ease-out infinite;
  }

  @keyframes _pdot{0%,100%{opacity:1}50%{opacity:.4}}

  /* ─── SETTINGS PANEL ───────────────────────────── */
  .gn-settings{
    position:fixed;top:80px;right:28px;
    background:var(--glass-bg);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border:1px solid var(--glass-border);
    border-radius:16px;padding:16px;
    box-shadow:0 8px 32px var(--shadow-color);
    z-index:150;
    min-width:200px;
    animation:contextMenuAppear 0.3s ease-out;
  }

  @media (max-width: 767px) {
    .gn-settings {
      top: 70px;
      right: 16px;
      min-width: 180px;
    }
  }

  @keyframes contextMenuAppear {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .gn-settings-item{
    display:flex;align-items:center;justify-content:space-between;
    padding:8px 0;border-bottom:1px solid var(--outline-variant);
    transition: all 0.2s;
  }

  .gn-settings-item:hover {
    padding-left: 4px;
  }

  .gn-settings-item:last-child{border-bottom:none;}
  .gn-settings-label{
    font-size:12px;font-weight:600;color:var(--on-surface);
    transition: color 0.2s;
  }

  .gn-settings-item:hover .gn-settings-label {
    color: var(--primary);
  }

  .gn-settings-toggle{
    position:relative;width:44px;height:24px;background:var(--surface-container-high);
    border-radius:12px;cursor:pointer;
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .gn-settings-toggle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    transform: translate(-50%, -50%);
    transition: width 0.4s, height 0.4s;
  }

  .gn-settings-toggle:hover::before {
    width: 60px;
    height: 60px;
  }

  .gn-settings-toggle.active{background:linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);box-shadow:0 2px 8px rgba(0, 107, 44, 0.3);}
  .gn-settings-toggle-knob{
    position:absolute;top:2px;left:2px;width:20px;height:20px;
    background:white;border-radius:50%;transition:transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:0 2px 4px rgba(0,0,0,0.2);
  }
  .gn-settings-toggle.active .gn-settings-toggle-knob{transform:translateX(20px);box-shadow:0 2px 8px rgba(0,0,0,0.3);}

  /* ─── MAIN ───────────────────────────────────── */
  .gn-main{
    margin-left:72px;margin-top:60px;
    min-height:calc(100vh - 60px);
    padding:28px 32px;
    background:var(--background);
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeInUp 0.8s ease-out;
  }

  @media (max-width: 767px) {
    .gn-main {
      margin-left: 0;
      margin-top: 56px;
      padding: 16px;
      padding-bottom: 80px; /* Space for bottom nav */
    }
  }

  /* ─── MOBILE BOTTOM NAVIGATION ───────────────────── */
  .gn-mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 200;
    background: var(--glass-bg);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--glass-border);
    border-top: 1px solid var(--outline-variant);
    border-radius: 20px 20px 0 0;
    padding: 12px 16px 20px;
    display: none;
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -4px 20px var(--shadow-color);
    animation: slideInUp 0.5s ease-out;
  }

  @keyframes slideInUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 767px) {
    .gn-mobile-nav {
      display: flex;
    }
  }

  .gn-mobile-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 12px;
    color: var(--on-surface-variant);
    text-decoration: none;
    cursor: pointer;
    border: none;
    background: transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 60px;
    position: relative;
    overflow: hidden;
  }

  .gn-mobile-item::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .gn-mobile-item:hover::before {
    width: 80px;
    height: 80px;
  }

  .gn-mobile-item:hover {
    background: var(--surface-container-low);
    color: var(--primary);
    transform: translateY(-2px) scale(1.05);
  }

  .gn-mobile-item.active {
    background: linear-gradient(135deg, var(--primary-container) 0%, var(--primary) 100%);
    color: var(--on-primary);
    box-shadow: 0 4px 12px rgba(0, 107, 44, 0.2);
    animation: pulse 2s ease-in-out infinite;
  }

  .gn-mobile-item svg {
    width: 20px;
    height: 20px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .gn-mobile-item.active svg {
    transform: scale(1.1);
    animation: bounce 2s ease-in-out infinite;
  }

  .gn-mobile-label {
    font-size: 10px;
    font-weight: 600;
    margin-top: 4px;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ─── FLOATING ACTION BUTTON ────────────────────── */
  .gn-fab-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 150;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }

  @media (max-width: 767px) {
    .gn-fab-container {
      bottom: 90px; /* Above mobile nav */
      right: 16px;
    }
  }

  .gn-fab-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-end;
  }

  .gn-fab-action {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-radius: 50px;
    background: var(--surface-container-lowest);
    border: 1px solid var(--outline-variant);
    box-shadow: 0 4px 16px var(--shadow-color);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-decoration: none;
    color: var(--on-surface);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-sans);
    position: relative;
    overflow: hidden;
  }

  .gn-fab-action::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .gn-fab-action:hover::before {
    width: 200px;
    height: 200px;
  }

  .gn-fab-action:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 24px var(--shadow-color);
  }

  .gn-fab-action-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .gn-fab-action-label {
    white-space: nowrap;
    position: relative;
    z-index: 1;
  }

  .gn-fab-main {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
    border: none;
    box-shadow: 0 8px 24px var(--shadow-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .gn-fab-main::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .gn-fab-main:hover::before {
    width: 150px;
    height: 150px;
  }

  .gn-fab-main:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px var(--shadow-color);
  }

  .gn-fab-main svg {
    width: 28px;
    height: 28px;
    stroke: var(--on-primary);
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
  }

  .gn-fab-main.expanded {
    animation: fabExpand 0.3s ease-out forwards;
  }

  .gn-fab-main.collapsed {
    animation: fabCollapse 0.3s ease-out forwards;
  }

  .gn-fab-action.appearing {
    animation: fabActionAppear 0.3s ease-out forwards;
  }

  .gn-fab-action.disappearing {
    animation: fabActionDisappear 0.3s ease-out forwards;
  }

  /* ─── CARDS ──────────────────────────────────── */
  .card{
    background:var(--surface-container-lowest);
    border:1px solid var(--outline-variant);
    border-radius:16px;
    padding:22px;
    box-shadow:0 1px 4px var(--shadow-color);
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: rotate(45deg);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .card:hover::before {
    opacity: 1;
    animation: shimmer 1s ease-out;
  }

  .card:hover{box-shadow:0 8px 32px var(--shadow-color);transform:translateY(-2px) scale(1.01);}
  .card-title{
    font-size:14px;font-weight:600;color:var(--on-surface);
    margin-bottom:18px;display:flex;align-items:center;gap:8px;
    position: relative;
    z-index: 1;
  }
  .card-title .acc{width:3px;height:16px;background:linear-gradient(to bottom, var(--primary), var(--primary-container));border-radius:2px;flex-shrink:0;}

  /* ─── KPI ────────────────────────────────────── */
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:24px;}

  @media (max-width: 767px) {
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }

  .kpi-card{
    background:var(--surface-container-lowest);border:1px solid var(--outline-variant);border-radius:14px;
    padding:18px 20px;
    box-shadow:0 1px 3px var(--shadow-color);
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .kpi-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: rotate(45deg);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .kpi-card:hover::before {
    opacity: 1;
    animation: shimmer 1s ease-out;
  }

  .kpi-card:hover{box-shadow:0 8px 24px var(--shadow-color);transform:translateY(-2px) scale(1.02);}
  .kpi-label{font-size:11px;font-weight:600;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;}
  .kpi-val{font-family:var(--font-mono);font-size:28px;font-weight:500;color:var(--on-surface);line-height:1;}

  @media (max-width: 767px) {
    .kpi-val {
      font-size: 24px;
    }
  }

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
  td{padding:12px 16px;font-size:13px;color:var(--on-surface);border-bottom:1px solid var(--outline-variant);transition: all 0.2s;}

  @media (max-width: 767px) {
    td {
      padding: 8px 12px;
      font-size: 12px;
    }
    th {
      padding: 8px 12px;
      font-size: 10px;
    }
  }

  tr:last-child td{border-bottom:none;}
  tbody tr:hover td{background:var(--surface-container);transform: scale(1.01);}
  .mono{font-family:var(--font-mono);font-size:12px;}

  /* ─── BADGES ─────────────────────────────────── */
  .badge{
    display:inline-flex;align-items:center;padding:3px 10px;
    border-radius:20px;font-size:11px;font-weight:600;
    letter-spacing:.3px;transition:all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .badge::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: rotate(45deg);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .badge:hover::before {
    opacity: 1;
    animation: shimmer 0.8s ease-out;
  }

  .badge-green {background:linear-gradient(135deg, var(--primary-container) 0%, var(--primary) 100%);color:var(--on-primary-container);}
  .badge-red   {background:linear-gradient(135deg, var(--tertiary-container) 0%, var(--tertiary) 100%);color:var(--on-tertiary-container);}
  .badge-amber {background:linear-gradient(135deg, var(--surface-container-high) 0%, var(--tertiary) 100%);color:var(--on-surface);}
  .badge-blue  {background:linear-gradient(135deg, var(--secondary-container) 0%, var(--secondary) 100%);color:var(--on-secondary-container);}
  .badge-gray  {background:linear-gradient(135deg, var(--surface-container) 0%, var(--surface-container-high) 100%);color:var(--on-surface);}
  .badge-cyan  {background:linear-gradient(135deg, var(--surface-container-high) 0%, var(--secondary) 100%);color:var(--on-surface);}
  .badge-purple{background:linear-gradient(135deg, var(--surface-container) 0%, var(--secondary-container) 100%);color:var(--on-surface);}

  /* ─── BUTTONS ────────────────────────────────── */
  .btn{
    display:inline-flex;align-items:center;gap:6px;
    padding:9px 18px;border-radius:10px;
    font-size:13px;font-weight:600;font-family:var(--font-sans);
    cursor:pointer;border:none;letter-spacing:-.1px;
    transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .btn:hover::before {
    width: 300px;
    height: 300px;
  }

  .btn:hover{transform:translateY(-1px) scale(1.02);box-shadow:0 4px 12px var(--shadow-color);}
  .btn:active{transform:none;}
  .btn:disabled{opacity:.45;cursor:not-allowed;transform:none;}
  .btn-primary{background:linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);color:var(--on-primary);box-shadow:0 2px 8px rgba(0, 107, 44, 0.3);}
  .btn-primary:hover{background:linear-gradient(135deg, var(--primary-container) 0%, var(--primary) 100%);box-shadow:0 4px 16px rgba(0, 107, 44, 0.35);}
  .btn-danger {background:linear-gradient(135deg, var(--tertiary-container) 0%, var(--tertiary) 100%);color:var(--on-tertiary);border:1px solid var(--tertiary);}
  .btn-danger:hover{background:linear-gradient(135deg, var(--tertiary) 0%, var(--tertiary-container) 100%);}
  .btn-ghost  {background:var(--surface-container);color:var(--on-surface);border:1px solid var(--outline-variant);}
  .btn-ghost:hover{background:var(--surface-container-high);border-color:var(--outline);}
  .btn-sm     {padding:6px 13px;font-size:12px;border-radius:8px;}

  /* ─── INPUTS ─────────────────────────────────── */
  .input,.select{
    width:100%;padding:10px 13px;border-radius:10px;
    border:1px solid var(--outline-variant);background:var(--surface-container-lowest);
    color:var(--on-surface);font-size:13px;font-family:var(--font-sans);
    outline:none;transition:all .3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .input:focus,.select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(0, 107, 44, 0.1);transform: scale(1.01);}
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
  .modal-close:hover{background:var(--surface-container);color:var(--on-surface);transform: rotate(90deg);}
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

  @keyframes spin{to{transform:rotate(360deg)}}
`}</style>

      {/* SIDEBAR (Desktop Only) */}
      <aside className="gn-side">
        <div className="gn-logo">
          <svg viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0z"/>
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

        <button className="gn-logout gn-item" onClick={logout} disabled={isLoading}>
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
        
        {/* Notification Bell */}
        <div style={{position: 'relative', marginRight: 8}}>
          <button 
            className="btn btn-ghost btn-sm"
            style={{padding: '6px 10px', position: 'relative'}}
            onClick={() => setNotificationCount(0)}
          >
            <Ico k="usuarios" s={16}/>
          </button>
          {notificationCount > 0 && (
            <div style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--tertiary)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              {notificationCount}
            </div>
          )}
        </div>
        
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

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="gn-mobile-nav">
        {mobileNavItems.map(item => {
          const isActive = item.href==='/dashboard' ? pathname==='/dashboard' : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`gn-mobile-item ${isActive ? 'active' : ''}`}>
              <Ico k={item.key} s={20}/>
              <span className="gn-mobile-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* FLOATING ACTION BUTTON */}
      <div className="gn-fab-container">
        <div className="gn-fab-actions">
          {fabActions.map((action, index) => (
            <div
              key={action.label}
              className={`gn-fab-action ${fabExpanded ? 'appearing' : 'disappearing'}`}
              style={{
                animationDelay: fabExpanded ? `${index * 100}ms` : '0ms',
                opacity: fabExpanded ? 1 : 0,
                transform: fabExpanded ? 'translateY(0)' : 'translateY(20px)',
                pointerEvents: fabExpanded ? 'auto' : 'none'
              }}
              onClick={() => handleFabAction(action)}
            >
              <div 
                className="gn-fab-action-icon"
                style={{background: `${action.color}15`}}
              >
                <Ico k={action.icon} s={16} style={{color: action.color}}/>
              </div>
              <span className="gn-fab-action-label">{action.label}</span>
            </div>
          ))}
        </div>
        
        <button
          className={`gn-fab-main ${fabExpanded ? 'expanded' : 'collapsed'}`}
          onClick={handleFabClick}
        >
          <Ico k={fabExpanded ? 'close' : 'add'} s={28}/>
        </button>
      </div>

      <main className="gn-main" data-theme={theme}>
        {children}
      </main>
    </>
  )
}
