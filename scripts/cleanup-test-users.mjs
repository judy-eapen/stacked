#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const KEEP_EMAIL = 'automation_stacked@yopmail.com'

function parseDotEnv(content) {
  const out = {}
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

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return {}
  return parseDotEnv(fs.readFileSync(envPath, 'utf8'))
}

function envValue(key, envLocal) {
  return process.env[key] || envLocal[key]
}

async function listAllUsers(admin) {
  const all = []
  let page = 1
  const perPage = 200

  while (true) {
    const res = await admin.auth.admin.listUsers({ page, perPage })
    if (res.error) {
      throw new Error(`Failed to list users on page ${page}: ${res.error.message}`)
    }

    const users = res.data?.users ?? []
    all.push(...users)
    if (users.length < perPage) break
    page += 1
  }

  return all
}

function isTestUserEmail(email) {
  return email.endsWith('@yopmail.com')
}

async function main() {
  const envLocal = loadEnvLocal()
  const supabaseUrl = envValue('NEXT_PUBLIC_SUPABASE_URL', envLocal)
  const serviceRole = envValue('SUPABASE_SERVICE_ROLE_KEY', envLocal)
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const users = await listAllUsers(admin)
  const targets = users.filter((u) => {
    const email = (u.email || '').toLowerCase()
    if (!email) return false
    if (email === KEEP_EMAIL) return false
    return isTestUserEmail(email)
  })

  if (targets.length === 0) {
    console.log('No deletable test users found.')
    return
  }

  const deleted = []
  const failed = []

  for (const user of targets) {
    const email = (user.email || '').toLowerCase()
    const res = await admin.auth.admin.deleteUser(user.id)
    if (res.error) {
      failed.push({ id: user.id, email, error: res.error.message })
    } else {
      deleted.push({ id: user.id, email })
    }
  }

  console.log(`Deleted ${deleted.length} test users (kept ${KEEP_EMAIL}).`)
  for (const d of deleted) {
    console.log(` - ${d.email}`)
  }

  if (failed.length > 0) {
    console.log(`Failed to delete ${failed.length} users:`)
    for (const f of failed) {
      console.log(` - ${f.email} (${f.id}): ${f.error}`)
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
