import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** List current user's accepted partners (people I invited or who invited me). */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: rows, error } = await supabase
    .from('partnerships')
    .select('id, user_id, partner_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const otherIds = (rows ?? []).map((r) => (r.user_id === user.id ? r.partner_id : r.user_id))
  if (otherIds.length === 0) {
    return NextResponse.json({ partners: [] })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', otherIds)

  const profileMap = (profiles ?? []).reduce(
    (acc: Record<string, { display_name: string | null; avatar_url: string | null }>, p) => {
      acc[p.id] = { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null }
      return acc
    },
    {}
  )

  const partners = (rows ?? []).map((r) => {
    const otherId = r.user_id === user.id ? r.partner_id : r.user_id
    const p = profileMap[otherId]
    return {
      partnership_id: r.id,
      partner_id: otherId,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    }
  })

  return NextResponse.json({ partners })
}
