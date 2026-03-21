// app/api/upload/route.js
// Sube comprobantes a Supabase Storage (bucket: comprobantes)
// Si tienes Google Drive configurado, también funciona con eso.
import { NextResponse } from 'next/server'
import { getSesion, assertRol, supabaseAdmin, respError } from '@/lib/apiHelpers'

const BUCKET = 'comprobantes'
const MAX_MB = 10

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin','staff'])

    const formData = await req.formData()
    const file     = formData.get('file')
    const nombre   = (formData.get('nombre') || 'comprobante').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-]/g,'')

    if (!file) return NextResponse.json({ok:false,msg:'No se recibió archivo.'},{status:400})

    const allowed = ['image/jpeg','image/png','image/webp','image/gif','application/pdf']
    if (!allowed.includes(file.type))
      return NextResponse.json({ok:false,msg:'Solo imágenes JPG/PNG/WEBP o PDF.'},{status:400})

    if (file.size > MAX_MB * 1024 * 1024)
      return NextResponse.json({ok:false,msg:`El archivo supera ${MAX_MB}MB.`},{status:400})

    const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const ts   = Date.now()
    const path = `${nombre}_${ts}.${ext}`

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Intentar Google Drive primero si está configurado
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID) {
      try {
        const result = await subirGoogleDrive(buffer, file.type, path)
        return NextResponse.json({ ok:true, ...result })
      } catch(e) {
        console.warn('[Upload] Google Drive falló, usando Supabase:', e.message)
      }
    }

    // Fallback: Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      // Si el bucket no existe, crearlo y reintentar
      if (error.message?.includes('not found') || error.statusCode === 404) {
        await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
        const { data: d2, error: e2 } = await supabaseAdmin.storage
          .from(BUCKET).upload(path, buffer, { contentType: file.type })
        if (e2) throw new Error(e2.message)
      } else {
        throw new Error(error.message)
      }
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    return NextResponse.json({
      ok: true,
      fileId: path,
      name:   path,
      viewUrl: publicUrl,
      directUrl: publicUrl,
      capture_url: publicUrl,
      fuente: 'supabase',
    })

  } catch(e) { return respError(e) }
}

async function subirGoogleDrive(buffer, mimeType, filename) {
  const email    = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const keyRaw   = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n')
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  // JWT Google
  const now = Math.floor(Date.now()/1000)
  const header  = {alg:'RS256',typ:'JWT'}
  const payload = {iss:email,scope:'https://www.googleapis.com/auth/drive.file',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}
  const b64     = o => Buffer.from(JSON.stringify(o)).toString('base64url')
  const input   = `${b64(header)}.${b64(payload)}`
  const { createSign } = await import('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(input)
  const jwt = `${input}.${sign.sign(keyRaw,'base64url')}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),
  })
  const {access_token} = await tokenRes.json()
  if (!access_token) throw new Error('Token Google inválido')

  const boundary = 'galanet_bound'
  const meta     = JSON.stringify({name:filename,parents:[folderId]})
  const body     = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const upRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{
    method:'POST',
    headers:{Authorization:`Bearer ${access_token}`,'Content-Type':`multipart/related; boundary=${boundary}`},
    body,
  })
  const {id,name} = await upRes.json()
  if (!id) throw new Error('Drive no devolvió ID')

  await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`,{
    method:'POST',
    headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},
    body:JSON.stringify({role:'reader',type:'anyone'}),
  })

  return {
    fileId:id, name,
    viewUrl:`https://drive.google.com/file/d/${id}/view`,
    directUrl:`https://drive.google.com/uc?export=view&id=${id}`,
    capture_url:`https://drive.google.com/file/d/${id}/view`,
    fuente:'google_drive',
  }
}