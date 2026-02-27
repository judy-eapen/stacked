import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function generateToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('partnerships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', today + 'T00:00:00Z')
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Rate limit: max 10 invites per day' }, { status: 429 })
  }

  const invite_token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const invite_url = origin ? `${origin}/invite/${invite_token}` : `/invite/${invite_token}`

  const { error } = await supabase.from('partnerships').insert({
    user_id: user.id,
    partner_id: null,
    status: 'pending',
    invite_token,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      invite_url,
      invite_token,
      expires_at: expiresAt.toISOString(),
    },
    { status: 201 }
  )
}
