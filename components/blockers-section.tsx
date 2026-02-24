'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DesignBreakForm, EMPTY_DESIGN_BREAK, trimDesignBreak } from '@/components/DesignBreakForm'
import type { DesignBreak } from '@/lib/db-types'

interface HabitOption {
  id: string
  name: string
  identity_id: string | null
}

interface HabitToBreakRow {
  id: string
  user_id: string
  identity_id: string
  habit_id: string | null
  name: string
  design_break: DesignBreak | null
  created_at: string
  updated_at: string
}

export function BlockersSection({
  identityId,
  onError,
  onUpdated,
}: {
  identityId: string
  onError?: (msg: string | null) => void
  onUpdated?: () => void
}) {
  const [habits, setHabits] = useState<HabitOption[]>([])
  const [habitsToBreak, setHabitsToBreak] = useState<HabitToBreakRow[]>([])
  const [showBlockerForm, setShowBlockerForm] = useState(false)
  const [blockerDraftName, setBlockerDraftName] = useState('')
  const [blockerDraftHabitId, setBlockerDraftHabitId] = useState<string | null>(null)
  const [blockerDraftDesign, setBlockerDraftDesign] = useState<DesignBreak>(() => ({ ...EMPTY_DESIGN_BREAK }))
  const [editingBlockerId, setEditingBlockerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [habitsRes, breakRes] = await Promise.all([
      supabase.from('habits').select('id, name, identity_id').eq('user_id', user.id).is('archived_at', null).order('sort_order', { ascending: true }),
      supabase.from('habits_to_break').select('*').eq('user_id', user.id).eq('identity_id', identityId),
    ])
    if (habitsRes.error) {
      onError?.(habitsRes.error.message)
    } else {
      setHabits((habitsRes.data ?? []) as HabitOption[])
      onError?.(null)
    }
    if (breakRes.error) setHabitsToBreak([])
    else setHabitsToBreak((breakRes.data ?? []) as HabitToBreakRow[])
    setLoading(false)
  }, [identityId, onError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const blockers = habitsToBreak

  const handleSaveNew = async () => {
    const name = blockerDraftName.trim().slice(0, 200)
    if (!name) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const db = trimDesignBreak(blockerDraftDesign)
    const { error: err } = await supabase
      .from('habits_to_break')
      .upsert({ user_id: user.id, identity_id: identityId, habit_id: blockerDraftHabitId || null, name, design_break: db }, { onConflict: 'identity_id' })
    if (err) {
      onError?.(err.message)
    } else {
      setShowBlockerForm(false)
      setBlockerDraftName('')
      setBlockerDraftHabitId(null)
      setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK })
      fetchData()
      onUpdated?.()
    }
  }

  const handleSaveEdit = async (id: string) => {
    const name = blockerDraftName.trim().slice(0, 200)
    if (!name) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const db = trimDesignBreak(blockerDraftDesign)
    const { error: err } = await supabase.from('habits_to_break').update({ name, design_break: db }).eq('id', id).eq('user_id', user.id)
    if (err) {
      onError?.(err.message)
    } else {
      setEditingBlockerId(null)
      fetchData()
      onUpdated?.()
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading blockers…</p>
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Blockers for this identity</h2>
      <p className="text-sm text-gray-500">Habits that undermine this identity. Pick one from your habits or add by name, then design how to break it.</p>
      {blockers.length === 0 && !showBlockerForm && (
        <p className="text-sm text-gray-500">No blockers linked yet.</p>
      )}
      <ul className="space-y-2">
        {blockers.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
            {editingBlockerId === h.id ? (
              <div className="flex-1 space-y-2">
                <input value={blockerDraftName} onChange={(e) => setBlockerDraftName(e.target.value)} placeholder="Habit name" className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                <DesignBreakForm value={blockerDraftDesign} onChange={setBlockerDraftDesign} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleSaveEdit(h.id)} className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium">Save</button>
                  <button type="button" onClick={() => setEditingBlockerId(null)} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <span className="font-medium text-gray-900">{h.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlockerId(h.id)
                    setBlockerDraftName(h.name)
                    setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK, ...h.design_break })
                  }}
                  className="text-[#e87722] hover:underline text-xs"
                >
                  Edit
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {showBlockerForm ? (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">Add habit to break</p>
          <input value={blockerDraftName} onChange={(e) => setBlockerDraftName(e.target.value)} placeholder="Habit name" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
          <DesignBreakForm value={blockerDraftDesign} onChange={setBlockerDraftDesign} />
          <div className="flex gap-2">
            <button type="button" onClick={handleSaveNew} disabled={!blockerDraftName.trim()} className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50">Save</button>
            <button
              type="button"
              onClick={() => {
                setShowBlockerForm(false)
                setBlockerDraftName('')
                setBlockerDraftHabitId(null)
                setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK })
              }}
              className="h-9 px-3 rounded-lg border text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Pick a habit on the Habits page, then return here.</p>
          <Link
            href={`/dashboard/habits?addBlockerFor=${identityId}`}
            className="inline-flex items-center font-body text-sm font-medium text-[#e87722] hover:underline"
          >
            Add blocker → pick on Habits page
          </Link>
          <p className="text-xs text-gray-500 pt-1">Or add by name:</p>
          <button
            type="button"
            onClick={() => {
              setBlockerDraftName('')
              setBlockerDraftHabitId(null)
              setShowBlockerForm(true)
            }}
            className="text-sm font-medium text-[#e87722] hover:underline"
          >
            + Add habit to break (enter name)
          </button>
        </div>
      )}
    </div>
  )
}
