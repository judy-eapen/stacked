import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, identity_id, identities(statement)')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 })
  }

  const { data: completions, error: compError } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_date, completed')
    .eq('user_id', user.id)
    .order('completed_date', { ascending: true })

  if (compError) {
    return NextResponse.json({ error: compError.message }, { status: 500 })
  }

  const habitById: Record<string, { name: string; identity: string }> = {}
  for (const h of habits ?? []) {
    const raw = h as { id: string; name: string; identities: { statement: string } | { statement: string }[] | null }
    const identity = Array.isArray(raw.identities) ? raw.identities[0]?.statement ?? '' : raw.identities?.statement ?? ''
    habitById[raw.id] = { name: raw.name, identity }
  }

  const rows = (completions ?? []).map((r) => ({
    habit_id: r.habit_id,
    completed_date: r.completed_date,
    completed: r.completed,
  }))

  const streakByHabitByDate: Record<string, Record<string, number>> = {}
  for (const h of habits ?? []) {
    const hid = (h as { id: string }).id
    streakByHabitByDate[hid] = {}
    const habitRows = rows.filter((row) => row.habit_id === hid && row.completed).sort((a, b) => a.completed_date.localeCompare(b.completed_date))
    let streak = 0
    let prev: string | null = null
    for (const row of habitRows) {
      if (prev === null || row.completed_date !== prev) {
        const d = new Date(row.completed_date + 'T12:00:00')
        if (prev) {
          const prevD = new Date(prev + 'T12:00:00')
          const diff = (d.getTime() - prevD.getTime()) / (24 * 60 * 60 * 1000)
          if (diff > 1) streak = 0
        }
        streak++
      }
      streakByHabitByDate[hid][row.completed_date] = streak
      prev = row.completed_date
    }
  }

  const header = 'habit_name,identity,date,completed,streak_at_time'
  const lines = [header]
  for (const row of rows) {
    const h = habitById[row.habit_id]
    const name = h?.name ?? ''
    const identity = (h?.identity ?? '').replace(/"/g, '""')
    const streak = streakByHabitByDate[row.habit_id]?.[row.completed_date] ?? 0
    lines.push(`"${name.replace(/"/g, '""')}","${identity}","${row.completed_date}",${row.completed},${streak}`)
  }

  const csv = lines.join('\n')
  const dateStr = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stacked-export-${dateStr}.csv"`,
    },
  })
}
