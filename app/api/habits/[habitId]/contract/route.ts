import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: habit } = await supabase
    .from('habits')
    .select('id, user_id, name')
    .eq('id', habitId)
    .single()
  if (!habit || (habit as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  const { data: row } = await supabase
    .from('habit_contracts')
    .select('id, commitment, consequence, start_date, end_date, witness_partner_id')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({
      contract: null,
      habit_name: (habit as { name: string }).name,
    })
  }
  return NextResponse.json({
    contract: {
      id: row.id,
      commitment: row.commitment,
      consequence: row.consequence ?? null,
      start_date: row.start_date,
      end_date: row.end_date ?? null,
      witness_partner_id: row.witness_partner_id ?? null,
    },
    habit_name: (habit as { name: string }).name,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: habit } = await supabase
    .from('habits')
    .select('id, user_id')
    .eq('id', habitId)
    .single()
  if (!habit || (habit as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  let body: {
    commitment?: string
    consequence?: string | null
    start_date?: string
    end_date?: string | null
    witness_partner_id?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const commitment = typeof body.commitment === 'string' ? body.commitment.trim().slice(0, 1000) : ''
  if (!commitment) {
    return NextResponse.json({ error: 'commitment required (1–1000 chars)' }, { status: 422 })
  }
  const consequence =
    body.consequence === null || body.consequence === undefined
      ? null
      : typeof body.consequence === 'string'
        ? body.consequence.trim().slice(0, 500) || null
        : null
  const start_date = typeof body.start_date === 'string' ? body.start_date.slice(0, 10) : ''
  if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return NextResponse.json({ error: 'start_date required (YYYY-MM-DD)' }, { status: 422 })
  }
  const end_date =
    body.end_date === null || body.end_date === undefined
      ? null
      : typeof body.end_date === 'string'
        ? body.end_date.slice(0, 10) || null
        : null
  const witness_partner_id =
    body.witness_partner_id === null || body.witness_partner_id === undefined
      ? null
      : typeof body.witness_partner_id === 'string'
        ? body.witness_partner_id || null
        : null

  const { data: existing } = await supabase
    .from('habit_contracts')
    .select('id')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error: updateErr } = await supabase
      .from('habit_contracts')
      .update({ commitment, consequence, start_date, end_date, witness_partner_id })
      .eq('id', existing.id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  } else {
    const { error: insertErr } = await supabase.from('habit_contracts').insert({
      user_id: user.id,
      habit_id: habitId,
      commitment,
      consequence,
      start_date,
      end_date,
      witness_partner_id,
    })
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
