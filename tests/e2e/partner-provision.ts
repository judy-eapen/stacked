import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

type EnvMap = Record<string, string>
let cachedEnv: EnvMap | null = null

function parseDotEnv(content: string): EnvMap {
  const out: EnvMap = {}
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    out[key] = value
  }
  return out
}

function loadEnvLocal(): EnvMap {
  if (cachedEnv) return cachedEnv
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    cachedEnv = {}
    return cachedEnv
  }
  cachedEnv = parseDotEnv(fs.readFileSync(envPath, 'utf8'))
  return cachedEnv
}

function envValue(key: string): string | undefined {
  return process.env[key] || loadEnvLocal()[key]
}

export async function provisionPartnerUser(): Promise<{ email: string; password: string; userId: string }> {
  const supabaseUrl = envValue('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = envValue('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for partner provisioning')
  }

  const rand = Math.random().toString(36).slice(2, 8)
  const stamp = Date.now()
  const email = `stacked_partner_${stamp}_${rand}@yopmail.com`
  const password = `Tst${stamp.toString().slice(-6)}!Aa`

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Partner E2E' },
  })
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message || 'Failed to create partner user')
  }

  const userId = created.data.user.id

  // Ensure partner avoids onboarding redirect after guided-tour dismissal.
  const { data: existingIdentity } = await admin
    .from('identities')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (!existingIdentity || existingIdentity.length === 0) {
    await admin.from('identities').insert({
      user_id: userId,
      statement: 'I am a person who supports my partner daily.',
      sort_order: 0,
    })
  }

  return { email, password, userId }
}

export async function deletePartnerUser(userId: string): Promise<void> {
  const supabaseUrl = envValue('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = envValue('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for partner cleanup')
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const deleted = await admin.auth.admin.deleteUser(userId)
  if (deleted.error) {
    throw new Error(deleted.error.message || `Failed to delete partner user: ${userId}`)
  }
}
