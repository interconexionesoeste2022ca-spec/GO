// lib/supabase.js
// Cliente Supabase — usado en API routes (server-side)
import { createClient } from '@supabase/supabase-js'

// Client público (para el browser si lo necesitas)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Client con service_role — SOLO usar en API routes (nunca en el browser)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)