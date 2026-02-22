'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { ScorecardRating, TimeOfDay } from '@/lib/db-types'

type Rating = ScorecardRating
interface ScorecardEntry {
  id: string
  habit_name: string
  rating: Rating
  time_of_day: TimeOfDay
  sort_order: number
}

function mapRow(row: { id: string; habit_name: string; rating: string; time_of_day: string | null; sort_order: number }): ScorecardEntry {
  return {
    id: row.id,
    habit_name: row.habit_name,
    rating: row.rating as Rating,
    time_of_day: (row.time_of_day as TimeOfDay) ?? 'anytime',
    sort_order: row.sort_order,
  }
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
}

const TIME_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime']

function flatEntriesInOrder(entries: ScorecardEntry[]): ScorecardEntry[] {
  const result: ScorecardEntry[] = []
  for (const time of TIME_ORDER) {
    const list = entries.filter((e) => e.time_of_day === time).sort((a, b) => a.sort_order - b.sort_order)
    result.push(...list)
  }
  return result
}

function SortableScorecardRow({
  entry,
  setRating,
  savingId,
  openMenuId,
  setOpenMenuId,
  setEditingId,
  editingId,
  fetchEntries,
  setError,
}: {
  entry: ScorecardEntry
  setRating: (id: string, r: Rating) => void
  savingId: string | null
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  setEditingId: (id: string | null) => void
  editingId: string | null
  fetchEntries: () => void
  setError: (msg: string | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const [editName, setEditName] = useState(entry.habit_name)
  const [editRating, setEditRating] = useState<Rating>(entry.rating)
  const [editTime, setEditTime] = useState<TimeOfDay>(entry.time_of_day)
  const [savingEdit, setSavingEdit] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  const isEditing = editingId === entry.id
  useEffect(() => {
    if (isEditing) {
      setEditName(entry.habit_name)
      setEditRating(entry.rating)
      setEditTime(entry.time_of_day)
    }
  }, [isEditing, entry.habit_name, entry.rating, entry.time_of_day])

  useLayoutEffect(() => {
    if (openMenuId === entry.id && menuButtonRef.current && typeof window !== 'undefined') {
      const r = menuButtonRef.current.getBoundingClientRect()
      setMenuPos({
        top: r.bottom + 4,
        left: Math.min(r.right - 120, window.innerWidth - 128),
      })
    }
  }, [openMenuId, entry.id])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const menuContent = openMenuId === entry.id && typeof document !== 'undefined' ? createPortal(
    <>
      <div
        className="fixed inset-0 z-10"
        aria-hidden
        onClick={() => setOpenMenuId(null)}
      />
      <div
        className="fixed z-20 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        style={{ top: menuPos.top, left: menuPos.left }}
      >
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          onClick={() => { setEditingId(entry.id); setOpenMenuId(null); }}
        >
          Edit
        </button>
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          onClick={async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase.from('scorecard_entries').delete().eq('id', entry.id).eq('user_id', user.id)
            setOpenMenuId(null)
            fetchEntries()
          }}
        >
          Delete
        </button>
      </div>
    </>,
    document.body
  ) : null

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between gap-3 px-4 py-3 ${isDragging ? 'opacity-60 bg-gray-50 z-10' : ''}`}
    >
      <button
        type="button"
        className="touch-none p-1 -ml-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z" />
        </svg>
      </button>
      {isEditing ? (
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2 py-1">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-[120px] h-9 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 text-sm"
            placeholder="Habit name"
          />
          <div className="inline-flex rounded-lg border border-gray-200/60 bg-gray-100/40 p-0.5">
            {(['+', '-', '='] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setEditRating(r)}
                className={`min-w-[2rem] px-2 py-1 rounded-md text-sm font-medium ${
                  editRating === r ? 'bg-[#e87722] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <select
            value={editTime}
            onChange={(e) => setEditTime(e.target.value as TimeOfDay)}
            className="h-9 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="anytime">Anytime</option>
          </select>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={savingEdit || !editName.trim()}
              onClick={async () => {
                setSavingEdit(true)
                setError(null)
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { setSavingEdit(false); return }
                const { error: err } = await supabase
                  .from('scorecard_entries')
                  .update({
                    habit_name: editName.trim().slice(0, 200),
                    rating: editRating,
                    time_of_day: editTime,
                  })
                  .eq('id', entry.id)
                  .eq('user_id', user.id)
                setSavingEdit(false)
                if (err) {
                  setError(err.message)
                  return
                }
                setEditingId(null)
                fetchEntries()
              }}
              className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => setEditingId(null)}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-gray-900 block">{entry.habit_name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="inline-flex rounded-lg border border-gray-200/60 bg-gray-100/40 p-0.5"
              role="group"
              aria-label="Rate habit"
            >
              {(['+', '-', '='] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(entry.id, r)}
                  disabled={savingId === entry.id}
                  className={`min-w-[2rem] px-2 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 disabled:opacity-60 ${
                    entry.rating === r
                      ? 'bg-[#e87722] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 transition-colors"
                aria-label="Edit or delete"
                aria-expanded={openMenuId === entry.id}
              >
                <span className="sr-only">Edit or delete</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
              {menuContent}
            </div>
          </div>
        </>
      )}
    </li>
  )
}

const DEFAULT_ADD_RATING: Rating = '='
const DEFAULT_ADD_TIME: TimeOfDay = 'anytime'

export default function ScorecardPage() {
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<ScorecardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitRating, setNewHabitRating] = useState<Rating>(DEFAULT_ADD_RATING)
  const [newHabitTime, setNewHabitTime] = useState<TimeOfDay>(DEFAULT_ADD_TIME)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error: err } = await supabase
      .from('scorecard_entries')
      .select('id, habit_name, rating, time_of_day, sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
      setEntries([])
      return
    }
    const list = (data ?? []).map(mapRow)
    setEntries(list)
    setError(null)
  }, [])

  useEffect(() => {
    fetchEntries().finally(() => setLoading(false))
  }, [fetchEntries])

  useEffect(() => {
    if (searchParams.get('add') === '1') setShowAddForm(true)
  }, [searchParams])

  const grouped = (time: TimeOfDay) =>
    entries.filter((e) => e.time_of_day === time).sort((a, b) => a.sort_order - b.sort_order)

  const setRating = async (entryId: string, rating: Rating) => {
    setSavingId(entryId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase
      .from('scorecard_entries')
      .update({ rating })
      .eq('id', entryId)
      .eq('user_id', user.id)
    setSavingId(null)
    if (err) {
      setError(err.message)
      return
    }
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, rating } : e)))
  }

  const flatOrder = flatEntriesInOrder(entries)
  const flatIds = flatOrder.map((e) => e.id)

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = flatOrder.findIndex((e) => e.id === active.id)
      const newIndex = flatOrder.findIndex((e) => e.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(flatOrder, oldIndex, newIndex)
      const draggedEntry = reordered[newIndex]!
      const newTime = reordered[newIndex + 1]?.time_of_day ?? reordered[newIndex - 1]?.time_of_day ?? draggedEntry.time_of_day

      const nextEntries = reordered.map((e) =>
        e.id === draggedEntry.id ? { ...e, time_of_day: newTime } : e
      )
      const toUpdate: { id: string; time_of_day: TimeOfDay; sort_order: number }[] = []
      for (const time of TIME_ORDER) {
        const section = nextEntries.filter((e) => e.time_of_day === time)
        section.forEach((e, i) => {
          toUpdate.push({ id: e.id, time_of_day: time, sort_order: i })
        })
      }
      setEntries(
        nextEntries.map((e) => {
          const u = toUpdate.find((u) => u.id === e.id)
          return u ? { ...e, time_of_day: u.time_of_day, sort_order: u.sort_order } : e
        })
      )
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      for (const u of toUpdate) {
        await supabase
          .from('scorecard_entries')
          .update({ time_of_day: u.time_of_day, sort_order: u.sort_order })
          .eq('id', u.id)
          .eq('user_id', user.id)
      }
    },
    [entries]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const hasEntries = entries.length > 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Habit Scorecard</h1>
          <p className="text-sm text-gray-500">List your current habits. Rate each one: positive (+), negative (-), or neutral (=).</p>
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Concept explainer */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Habit Scorecard
        </h1>
        <p className="text-sm text-gray-500">
          List your current habits. Rate each one: positive (+), negative (-), or neutral (=).
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {hasEntries ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">Your habits by time of day</p>
            <button
              type="button"
              onClick={() => {
                setShowAddForm((v) => !v)
                if (!showAddForm) {
                  setNewHabitName('')
                  setNewHabitRating(DEFAULT_ADD_RATING)
                  setNewHabitTime(DEFAULT_ADD_TIME)
                }
              }}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              + Add habit
            </button>
          </div>

          {showAddForm && (
            <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">New habit</p>
              <input
                type="text"
                placeholder="e.g. Drink water after waking"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
              />
              <div className="flex flex-wrap gap-3">
                <span className="text-xs text-gray-500">Rating:</span>
                {(['+', '-', '='] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewHabitRating(r)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 ${
                      newHabitRating === r ? 'border-[#e87722] bg-[#e87722]/10 text-[#e87722]' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <span className="text-xs text-gray-500 ml-2">Time:</span>
                <select
                  value={newHabitTime}
                  onChange={(e) => setNewHabitTime(e.target.value as TimeOfDay)}
                  className="h-9 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="anytime">Anytime</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const name = newHabitName.trim().slice(0, 200)
                    if (!name) return
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const { error: err } = await supabase.from('scorecard_entries').insert({
                      user_id: user.id,
                      habit_name: name,
                      rating: newHabitRating,
                      time_of_day: newHabitTime,
                      sort_order: entries.length,
                    })
                    if (err) {
                      setError(err.message)
                      return
                    }
                    setShowAddForm(false)
                    fetchEntries()
                  }}
                  className="h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
              {(['morning', 'afternoon', 'evening', 'anytime'] as const).map((time) => {
                const list = grouped(time)
                if (list.length === 0) return null
                return (
                  <div key={time} className="rounded-xl bg-white border border-gray-200/80 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200/80">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {TIME_LABELS[time]}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {list.map((entry) => (
                        <SortableScorecardRow
                          key={entry.id}
                          entry={entry}
                          setRating={setRating}
                          savingId={savingId}
                          openMenuId={openMenuId}
                          setOpenMenuId={setOpenMenuId}
                          setEditingId={setEditingId}
                          editingId={editingId}
                          fetchEntries={fetchEntries}
                          setError={setError}
                        />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </SortableContext>
          </DndContext>
        </>
      ) : showAddForm ? (
        <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">New habit</p>
          <input
            type="text"
            placeholder="e.g. Drink water after waking"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
          />
          <div className="flex flex-wrap gap-3">
            <span className="text-xs text-gray-500">Rating:</span>
            {(['+', '-', '='] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNewHabitRating(r)}
                className={`w-9 h-9 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2 ${
                  newHabitRating === r ? 'border-[#e87722] bg-[#e87722]/10 text-[#e87722]' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
            <span className="text-xs text-gray-500 ml-2">Time:</span>
            <select
              value={newHabitTime}
              onChange={(e) => setNewHabitTime(e.target.value as TimeOfDay)}
              className="h-9 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="anytime">Anytime</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={async () => {
                const name = newHabitName.trim().slice(0, 200)
                if (!name) return
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { error: err } = await supabase.from('scorecard_entries').insert({
                  user_id: user.id,
                  habit_name: name,
                  rating: newHabitRating,
                  time_of_day: newHabitTime,
                  sort_order: entries.length,
                })
                if (err) {
                  setError(err.message)
                  return
                }
                setShowAddForm(false)
                setNewHabitName('')
                setNewHabitRating(DEFAULT_ADD_RATING)
                setNewHabitTime(DEFAULT_ADD_TIME)
                fetchEntries()
              }}
              className="h-9 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-[20px] bg-white shadow-xl border border-black/6 p-8 text-center">
            <p className="text-gray-600 mb-6">
              Walk through your day. What do you do when you wake up? After breakfast? Before bed? List each habit and rate it.
            </p>
            <Link
              href="/dashboard/scorecard?add=1"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#e87722] text-white font-semibold hover:bg-[#d96b1e] transition-colors"
            >
              Add your first habit
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
