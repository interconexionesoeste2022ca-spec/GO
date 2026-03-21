'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { guardarSesion, getToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [form, setForm] = useState({ usuario: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirigir si ya hay sesión
  useEffect(() => {
    if (getToken()) router.replace('/dashboard')
  }, [router])

  // Animación fibra óptica
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const LINES = 22
    const lines = Array.from({ length: LINES }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      angle: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
      len: 80 + Math.random() * 160,
      hue: 260 + Math.random() * 60,
      pulse: Math.random() * Math.PI * 2,
    }))

    function draw() {
      ctx.fillStyle = 'rgba(10,6,30,0.18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      lines.forEach(l => {
        l.pulse += 0.03
        l.x += Math.cos(l.angle) * l.speed
        l.y += Math.sin(l.angle) * l.speed
        if (l.x < -200 || l.x > canvas.width + 200 || l.y < -200 || l.y > canvas.height + 200) {
          l.x = Math.random() * canvas.width
          l.y = Math.random() * canvas.height
          l.angle = Math.random() * Math.PI * 2
        }
        const alpha = 0.25 + Math.sin(l.pulse) * 0.2
        const grad = ctx.createLinearGradient(l.x, l.y, l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len)
        grad.addColorStop(0, `hsla(${l.hue},80%,70%,0)`)
        grad.addColorStop(0.5, `hsla(${l.hue},90%,75%,${alpha})`)
        grad.addColorStop(1, `hsla(${l.hue},80%,70%,0)`)
        ctx.beginPath()
        ctx.moveTo(l.x, l.y)
        ctx.lineTo(l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.stroke()
        // Punto brillante
        ctx.beginPath()
        ctx.arc(l.x + Math.cos(l.angle) * l.len * 0.5, l.y + Math.sin(l.angle) * l.len * 0.5, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${l.hue},100%,90%,${alpha * 1.5})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: form.usuario.trim().toLowerCase(), password: form.password }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.msg)
      guardarSesion(data.token, data.usuario, data.rol)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
<style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a061e; }
        .login-wrap {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden; background: #0a061e;
          font-family: 'DM Sans', sans-serif;
        }
        canvas { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .login-card {
          position: relative; z-index: 1;
          background: rgba(20,12,50,0.82);
          border: 1px solid rgba(124,58,237,0.35);
          border-radius: 20px;
          padding: 48px 44px 40px;
          width: 100%; max-width: 400px;
          box-shadow: 0 0 60px rgba(124,58,237,0.18), 0 24px 48px rgba(0,0,0,0.5);
          backdrop-filter: blur(18px);
        }
        .login-logo {
          text-align: center; margin-bottom: 32px;
        }
        .login-logo .brand {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: #fff; letter-spacing: -0.5px;
        }
        .login-logo .brand span { color: #7c3aed; }
        .login-logo .sub {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          color: #8b82a8; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase;
        }
        .orb {
          width: 60px; height: 60px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #a855f7, #7c3aed, #4c1d95);
          margin: 0 auto 16px;
          box-shadow: 0 0 30px rgba(124,58,237,0.6);
          animation: pulse-orb 3s ease-in-out infinite;
        }
        @keyframes pulse-orb {
          0%,100% { box-shadow: 0 0 30px rgba(124,58,237,0.6); }
          50% { box-shadow: 0 0 50px rgba(124,58,237,0.9), 0 0 80px rgba(168,85,247,0.4); }
        }
        .field { margin-bottom: 18px; }
        .field label {
          display: block; font-size: 12px; font-weight: 600; color: #8b82a8;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .field input {
          width: 100%; padding: 12px 16px; border-radius: 10px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.25);
          color: #f4f2ff; font-size: 15px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.2);
        }
        .field input::placeholder { color: #4b4468; }
        .btn-login {
          width: 100%; padding: 13px; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #9333ea);
          color: #fff; font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; margin-top: 8px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(124,58,237,0.4);
          letter-spacing: 0.3px;
        }
        .btn-login:hover:not(:disabled) {
          opacity: 0.92; transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(124,58,237,0.55);
        }
        .btn-login:active:not(:disabled) { transform: translateY(0); }
        .btn-login:disabled { opacity: 0.55; cursor: not-allowed; }
        .error-msg {
          background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3);
          color: #fca5a5; padding: 10px 14px; border-radius: 8px;
          font-size: 13px; margin-top: 14px; text-align: center;
          font-family: 'IBM Plex Mono', monospace;
        }
        .footer-note {
          text-align: center; margin-top: 24px;
          font-size: 11px; color: #4b4468;
          font-family: 'IBM Plex Mono', monospace;
        }
      `}</style>
      <div className="login-wrap">
        <canvas ref={canvasRef} />
        <div className="login-card">
          <div className="login-logo">
            <div className="orb" />
            <div className="brand">GALANET <span>OESTE</span></div>
            <div className="sub">Sistema de Gestión ISP · v8.0</div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Usuario</label>
              <input
                type="text" placeholder="Ingresa tu usuario" autoComplete="username"
                value={form.usuario} onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))}
                required autoFocus
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password" placeholder="••••••••" autoComplete="current-password"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
            </button>
            {error && <div className="error-msg">⚠ {error}</div>}
          </form>
          <div className="footer-note">© 2025 Galanet Oeste · Todos los derechos reservados</div>
        </div>
      </div>
    </>
  )
}
