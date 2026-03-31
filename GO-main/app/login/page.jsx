'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { guardarSesion, cargarSesion } from '@/lib/api'

export default function LoginPage() {
  const router    = useRouter()
  const canvasRef = useRef(null)
  const [form, setForm]         = useState({ usuario: '', password: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [show, setShow]         = useState(false)
  const [phase, setPhase]       = useState('idle') // idle | connecting | success | error-shake
  const animRef = useRef(null)

  useEffect(() => {
    cargarSesion().then(s => { if (s) router.replace('/dashboard') })
  }, [router])

  // ── Canvas fondo ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf, w, h

    const resize = () => {
      w = canvas.width  = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Partículas de señal — círculos concéntricos + líneas
    const NODES = 20
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      r:  Math.random() * 2.5 + .5,
      pulse: Math.random() * Math.PI * 2,
      ps: .008 + Math.random() * .012,
    }))

    // Ondas de señal expansivas
    const waves = []
    let waveTimer = 0

    function draw(t) {
      ctx.fillStyle = 'rgba(4,15,9,.14)'
      ctx.fillRect(0, 0, w, h)

      // Conexiones entre nodos cercanos
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d  = Math.sqrt(dx*dx + dy*dy)
          if (d < 180) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(16,185,129,${(1 - d/180) * .12})`
            ctx.lineWidth = .6
            ctx.stroke()
          }
        }
      }

      // Nodos
      nodes.forEach(n => {
        n.pulse += n.ps
        n.x = (n.x + n.vx + w) % w
        n.y = (n.y + n.vy + h) % h
        const a = .15 + Math.sin(n.pulse) * .1
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(52,211,153,${a})`
        ctx.fill()
      })

      // Ondas de señal periódicas
      waveTimer++
      if (waveTimer > 90) {
        waveTimer = 0
        waves.push({ x: w*.65, y: h*.5, r: 0, max: 200, a: .4 })
      }
      waves.forEach((w2, i) => {
        w2.r += 2.5
        w2.a *= .97
        ctx.beginPath()
        ctx.arc(w2.x, w2.y, w2.r, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(16,185,129,${w2.a * .25})`
        ctx.lineWidth = 1
        ctx.stroke()
        if (w2.r > w2.max) waves.splice(i, 1)
      })

      raf = requestAnimationFrame(draw)
    }
    draw(0)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  // ── Login con animación ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.usuario || !form.password) return
    setError(''); setPhase('connecting'); setLoading(true)

    // Pequeña pausa para que se vea la animación
    await new Promise(r => setTimeout(r, 400))

    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ usuario: form.usuario.trim().toLowerCase(), password: form.password }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.msg)

      setPhase('success')
      guardarSesion(data.usuario, data.rol)
      await new Promise(r => setTimeout(r, 1400)) // deja ver la animación de éxito
      router.push('/dashboard')
    } catch (err) {
      setPhase('error-shake')
      setError(err.message || 'Error al iniciar sesión')
      setTimeout(() => setPhase('idle'), 700)
    } finally {
      setLoading(false)
    }
  }

  const isConnecting = phase === 'connecting'
  const isSuccess    = phase === 'success'
  const isError      = phase === 'error-shake'

  return (
    <>
<style suppressHydrationWarning>{`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:#040e07;}

  .lw{
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    position:relative;overflow:hidden;
    background:radial-gradient(ellipse at 25% 60%,#061a0d 0%,#040e07 65%);
    font-family:'Inter',sans-serif;
  }
  canvas{position:absolute;inset:0;pointer-events:none;z-index:0;}

  .l-inner{position:relative;z-index:1;display:flex;align-items:center;gap:0;}

  /* ─ Panel branding ─ */
  .l-brand{width:340px;padding-right:52px;}
  .l-signal{display:flex;align-items:center;gap:10px;margin-bottom:32px;}
  .l-signal-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 10px rgba(16,185,129,.9);animation:blink 2.5s ease-in-out infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
  .l-signal-txt{font-family:'JetBrains Mono',monospace;font-size:11px;color:#34d399;letter-spacing:2.5px;text-transform:uppercase;}

  .l-title{font-family:'Cormorant Garamond',serif;font-size:54px;font-weight:700;line-height:1;color:#f0fdf4;letter-spacing:-1px;margin-bottom:6px;}
  .l-title em{font-style:normal;color:#10b981;}
  .l-sub{font-size:13px;color:#4b5563;font-weight:300;margin-bottom:44px;letter-spacing:.2px;}

  .l-features{display:flex;flex-direction:column;gap:16px;}
  .l-feat{display:flex;align-items:flex-start;gap:12px;}
  .l-feat-icon{width:30px;height:30px;border-radius:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
  .l-feat-icon svg{width:14px;height:14px;stroke:#10b981;fill:none;stroke-width:1.5;}
  .l-feat-title{font-size:13px;font-weight:500;color:#d1fae5;margin-bottom:2px;}
  .l-feat-desc{font-size:12px;color:#4b5563;line-height:1.4;}

  /* ─ Divisor ─ */
  .l-div{width:1px;height:380px;background:linear-gradient(to bottom,transparent,rgba(16,185,129,.18),rgba(124,58,237,.08),transparent);margin:0 52px;align-self:center;}

  /* ─ Card login ─ */
  .l-card{
    width:360px;
    background:rgba(6,15,9,.75);
    border:1px solid rgba(16,185,129,.14);
    border-radius:22px;padding:40px 36px;
    backdrop-filter:blur(28px);
    box-shadow:0 0 0 1px rgba(255,255,255,.03),0 32px 64px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.04);
    transition:border-color .4s;
  }
  .l-card.connecting{border-color:rgba(16,185,129,.45);}
  .l-card.success{border-color:rgba(16,185,129,.8);box-shadow:0 0 0 1px rgba(255,255,255,.03),0 32px 64px rgba(0,0,0,.55),0 0 40px rgba(16,185,129,.15),inset 0 1px 0 rgba(255,255,255,.04);}
  .l-card.error-shake{animation:shake .55s ease;}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}

  /* ─── LOGO ANIMADO ─── */
  .l-logo-wrap{margin-bottom:32px;min-height:80px;position:relative;}

  /* Estado idle/error: GALANET OESTE */
  .l-logo-full{
    transition:opacity .35s, transform .35s;
  }
  .l-logo-full.hidden{opacity:0;transform:scale(.92);pointer-events:none;position:absolute;}

  .l-logo-tag{font-family:'JetBrains Mono',monospace;font-size:10px;color:#10b981;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
  .l-logo-tag::before{content:'';display:inline-block;width:20px;height:1px;background:#10b981;}

  .l-logo-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;color:#f0fdf4;letter-spacing:-.3px;line-height:1.1;}
  .l-logo-name span{display:block;font-size:15px;font-family:'Inter',sans-serif;font-weight:300;color:#4b5563;margin-top:4px;letter-spacing:0;}

  /* Estado connecting/success: GO con animación de señal */
  .l-logo-go{
    opacity:0;transform:scale(.85);
    transition:opacity .4s, transform .4s;
    position:absolute;top:0;left:0;width:100%;
    display:flex;flex-direction:column;align-items:flex-start;gap:8px;
    pointer-events:none;
  }
  .l-logo-go.visible{opacity:1;transform:scale(1);pointer-events:auto;}

  .go-letters{
    font-family:'JetBrains Mono',monospace;
    font-size:52px;font-weight:600;
    color:#10b981;letter-spacing:-3px;line-height:1;
    position:relative;display:inline-block;
  }
  .go-letters .g{display:inline-block;}
  .go-letters .o{
    display:inline-block;
    animation:o-spin 1.4s ease-in-out infinite;
    transform-origin:center;
  }
  @keyframes o-spin{
    0%,100%{transform:rotate(0deg) scale(1);}
    25%{transform:rotate(180deg) scale(1.05);}
    50%{transform:rotate(360deg) scale(1);}
    75%{transform:rotate(180deg) scale(.95);}
  }

  /* Barras de señal tipo WiFi */
  .go-signal{display:flex;align-items:flex-end;gap:3px;height:22px;margin-top:2px;}
  .go-bar{
    width:4px;border-radius:2px;background:#10b981;
    animation:bar-pulse 1.1s ease-in-out infinite;
    opacity:.25;
  }
  .go-bar:nth-child(1){height:6px; animation-delay:0s;}
  .go-bar:nth-child(2){height:10px;animation-delay:.15s;}
  .go-bar:nth-child(3){height:15px;animation-delay:.3s;}
  .go-bar:nth-child(4){height:20px;animation-delay:.45s;}
  .go-bar:nth-child(5){height:15px;animation-delay:.6s;}
  .go-bar.active{opacity:1;}
  @keyframes bar-pulse{
    0%,100%{opacity:.2;}
    50%{opacity:1;}
  }

  /* Dots de estado */
  .go-status{font-family:'JetBrains Mono',monospace;font-size:11px;color:#4b5563;letter-spacing:1px;display:flex;align-items:center;gap:6px;}
  .go-status.conn{color:#10b981;}
  .go-status.ok{color:#34d399;}
  .go-dots::after{content:'';animation:dots 1.2s steps(4,end) infinite;}
  @keyframes dots{0%{content:'';}25%{content:'.';}50%{content:'..';}75%{content:'...';}100%{content:'';}}

  /* Checkmark de éxito */
  .go-check{
    display:flex;align-items:center;gap:8px;
    opacity:0;transform:translateY(4px);
    transition:opacity .3s, transform .3s;
  }
  .go-check.visible{opacity:1;transform:translateY(0);}
  .go-check svg{stroke:#10b981;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;width:18px;height:18px;}
  .go-check span{font-family:'JetBrains Mono',monospace;font-size:12px;color:#34d399;}

  /* ─ Campos ─ */
  .l-field{margin-bottom:18px;}
  .l-label{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;color:#374151;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;}
  .l-iw{position:relative;}
  .l-input{
    width:100%;padding:11px 14px 11px 40px;border-radius:10px;
    background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
    color:#f0fdf4;font-size:14px;font-family:'Inter',sans-serif;
    outline:none;transition:border-color .2s,background .2s,box-shadow .2s;
  }
  .l-input:focus{border-color:rgba(16,185,129,.5);background:rgba(16,185,129,.04);box-shadow:0 0 0 3px rgba(16,185,129,.08);}
  .l-input::placeholder{color:#1f2937;}
  .l-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);pointer-events:none;}
  .l-icon svg{width:15px;height:15px;stroke:#374151;fill:none;stroke-width:1.5;transition:stroke .2s;}
  .l-iw:focus-within .l-icon svg{stroke:#10b981;}
  .l-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:2px;}
  .l-eye svg{width:15px;height:15px;stroke:#374151;fill:none;stroke-width:1.5;transition:stroke .2s;}
  .l-eye:hover svg{stroke:#10b981;}

  /* ─ Botón ─ */
  .l-btn{
    width:100%;padding:13px;border:none;border-radius:11px;
    background:linear-gradient(135deg,#059669,#10b981);
    color:#fff;font-size:14px;font-weight:600;
    font-family:'Inter',sans-serif;cursor:pointer;margin-top:8px;
    letter-spacing:.2px;
    transition:opacity .2s,transform .15s,box-shadow .2s;
    box-shadow:0 4px 20px rgba(16,185,129,.25);
    position:relative;overflow:hidden;
  }
  .l-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.1),transparent);border-radius:inherit;}
  .l-btn:hover:not(:disabled){opacity:.92;transform:translateY(-1px);box-shadow:0 8px 28px rgba(16,185,129,.35);}
  .l-btn:active:not(:disabled){transform:translateY(0);}
  .l-btn:disabled{opacity:.45;cursor:not-allowed;}
  .l-btn.success-btn{background:linear-gradient(135deg,#047857,#059669);}

  .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:_sp .7s linear infinite;margin-right:8px;vertical-align:middle;}
  @keyframes _sp{to{transform:rotate(360deg)}}

  /* ─ Error ─ */
  .l-error{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);border-radius:9px;padding:10px 14px;margin-top:14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#fca5a5;}
  .l-error svg{width:14px;height:14px;stroke:#f87171;fill:none;stroke-width:1.5;flex-shrink:0;}

  /* ─ Footer ─ */
  .l-footer{margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:space-between;}
  .l-footer-txt{font-family:'JetBrains Mono',monospace;font-size:10px;color:#111827;letter-spacing:.5px;}
  .l-version{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(16,185,129,.35);letter-spacing:1px;}

  @media(max-width:860px){.l-brand,.l-div{display:none;}.l-card{width:100%;max-width:380px;margin:20px;}}
`}</style>

    <div className="lw">
      <canvas ref={canvasRef}/>
      <div className="l-inner">

        {/* Branding */}
        <div className="l-brand">
          <div className="l-signal">
            <div className="l-signal-dot"/>
            <span className="l-signal-txt">Sistema activo</span>
          </div>
          <div className="l-title">Galanet<br/><em>Oeste</em></div>
          <div className="l-sub">Plataforma de gestión ISP · v8.1</div>
          <div className="l-features">
            {[
              { icon:<path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>, title:'Gestión de clientes', desc:'Control completo de suscriptores y contratos' },
              { icon:<><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></>, title:'Pagos y facturación', desc:'Registro, verificación y mora automática' },
              { icon:<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>, title:'Fidelidad inteligente', desc:'Ranking automático NUEVO → PLATINO' },
            ].map((f,i)=>(
              <div key={i} className="l-feat">
                <div className="l-feat-icon"><svg viewBox="0 0 24 24">{f.icon}</svg></div>
                <div><div className="l-feat-title">{f.title}</div><div className="l-feat-desc">{f.desc}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="l-div"/>

        {/* Card */}
        <div className={`l-card ${phase !== 'idle' && phase !== 'error-shake' ? phase : ''}`}>

          {/* ── LOGO ANIMADO ── */}
          <div className="l-logo-wrap">

            {/* Estado normal */}
            <div className={`l-logo-full ${isConnecting || isSuccess ? 'hidden' : ''}`}>
              <div className="l-logo-tag">Acceso seguro</div>
              <div className="l-logo-name">
                Iniciar sesión
                <span>Ingresa tus credenciales para continuar</span>
              </div>
            </div>

            {/* Estado connecting / success */}
            <div className={`l-logo-go ${isConnecting || isSuccess ? 'visible' : ''}`}>
              <div className="go-letters">
                <span className="g">G</span><span className="o">O</span>
              </div>

              {/* Barras de señal */}
              {isConnecting && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div className="go-signal">
                    {[0,1,2,3,4].map(i=>(
                      <div key={i} className={`go-bar active`} style={{animationDelay:`${i*.15}s`}}/>
                    ))}
                  </div>
                  <div className="go-status conn">
                    <span>Conectando</span><span className="go-dots"/>
                  </div>
                </div>
              )}

              {/* Éxito */}
              {isSuccess && (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div className="go-signal">
                    {[0,1,2,3,4].map(i=>(
                      <div key={i} className="go-bar" style={{opacity:1,background:'#10b981'}}/>
                    ))}
                  </div>
                  <div className={`go-check visible`}>
                    <svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>
                    <span>Conexión establecida</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="l-field">
              <label className="l-label">Usuario</label>
              <div className="l-iw">
                <div className="l-icon">
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg>
                </div>
                <input className="l-input" type="text" placeholder="tu usuario"
                  autoComplete="username" value={form.usuario} disabled={isConnecting||isSuccess}
                  onChange={e=>setForm(p=>({...p,usuario:e.target.value}))} required autoFocus/>
              </div>
            </div>

            <div className="l-field">
              <label className="l-label">Contraseña</label>
              <div className="l-iw">
                <div className="l-icon">
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                </div>
                <input className="l-input" type={show?'text':'password'} placeholder="••••••••"
                  autoComplete="current-password" value={form.password} disabled={isConnecting||isSuccess}
                  onChange={e=>setForm(p=>({...p,password:e.target.value}))} required/>
                <button type="button" className="l-eye" onClick={()=>setShow(s=>!s)} tabIndex={-1}>
                  <svg viewBox="0 0 24 24">
                    {show
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" className={`l-btn${isSuccess?' success-btn':''}`}
              disabled={loading||isConnecting||isSuccess}>
              {isConnecting && <><span className="spin"/>Autenticando…</>}
              {isSuccess    && <>✓ Acceso concedido — entrando…</>}
              {!isConnecting && !isSuccess && 'Iniciar sesión'}
            </button>

            {error && (
              <div className="l-error">
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                {error}
              </div>
            )}
          </form>

          <div className="l-footer">
            <span className="l-footer-txt">© 2026 Galanet Oeste</span>
            <span className="l-version">v8.1</span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}