'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { DesignBuild } from '@/lib/db-types'
import { StackChainView } from '@/components/stack-chain-view'
import { Bell, Calendar, FileSignature, Flame, Pencil, Sparkles, Trash2, Users } from 'lucide-react'
import { DesignBuildForm } from './DesignBuildForm'
import type { Habit, IdentityOption } from './types'
import { EMPTY_DESIGN_BUILD, formatReminderTime, isEmptyDesignBuild, trimDesignBuild } from './utils'

interface HabitCardProps {
  habit: Habit
  identityStatement: string | null
  identities: IdentityOption[]
  linkToIdentityId: string | null
  linkToIdentityStatement: string | null
  getStackLabel: (h: Habit) => string | null
  intentionString: (h: Habit) => string | null
  hasDesignFields: boolean
  editingId: string | null
  setEditingId: (id: string | null) => void
  onUpdate: (updates: Partial<Habit>) => void
  onDelete: () => void
  expandedCalendarHabitId: string | null
  calendarCompletions: Record<string, Set<string>>
  calendarLoading: string | null
  onToggleCalendar: (habitId: string) => void
  sharedWithNames: string[]
}

export function HabitCard({
  habit,
  identityStatement,
  identities,
  linkToIdentityId,
  linkToIdentityStatement,
  getStackLabel,
  intentionString,
  hasDesignFields,
  editingId,
  setEditingId,
  onUpdate,
  onDelete,
  expandedCalendarHabitId,
  calendarCompletions,
  calendarLoading,
  onToggleCalendar,
  sharedWithNames,
}: HabitCardProps) {
  const [editName, setEditName] = useState(habit.name)
  const [editIdentityId, setEditIdentityId] = useState<string | null>(habit.identity_id)
  const [editEmailReminderTime, setEditEmailReminderTime] = useState<string>(
    habit.email_reminder_time ? String(habit.email_reminder_time).slice(0, 5) : ''
  )
  const prevEditingRef = useRef(false)
  useEffect(() => {
    if (editingId === habit.id && !prevEditingRef.current) {
      setEditName(habit.name)
      setEditIdentityId(habit.identity_id)
      setEditEmailReminderTime(habit.email_reminder_time ? String(habit.email_reminder_time).slice(0, 5) : '')
    }
    prevEditingRef.current = editingId === habit.id
  }, [editingId, habit.id, habit.name, habit.identity_id, habit.email_reminder_time])
  const [editDesignBuild, setEditDesignBuild] = useState<DesignBuild>(() => ({
    ...EMPTY_DESIGN_BUILD,
    ...habit.design_build,
    obvious: { ...EMPTY_DESIGN_BUILD.obvious, ...habit.design_build?.obvious },
    attractive: { ...EMPTY_DESIGN_BUILD.attractive, ...habit.design_build?.attractive },
    easy: { ...EMPTY_DESIGN_BUILD.easy, ...habit.design_build?.easy },
    satisfying: { ...EMPTY_DESIGN_BUILD.satisfying, ...habit.design_build?.satisfying },
  }))
  const isEditing = editingId === habit.id

  const saveEdit = () => {
    const db = trimDesignBuild(editDesignBuild)
    const intentionFromBuild = db?.obvious?.implementation_intention?.trim()
    const twoMinRaw = (db?.easy?.two_minute_rule?.trim() ?? habit.two_minute_version ?? '').trim().slice(0, 200)
    const temptationRaw = (db?.attractive?.temptation_bundling?.trim() ?? habit.temptation_bundle ?? '').trim().slice(0, 500)
    const emailTime = editEmailReminderTime.trim() ? editEmailReminderTime.trim().slice(0, 5) : null
    onUpdate({
      name: editName.trim().slice(0, 200) || habit.name,
      identity_id: editIdentityId || null,
      design_build: isEmptyDesignBuild(db ?? null) ? null : db,
      implementation_intention: intentionFromBuild ? { behavior: intentionFromBuild.slice(0, 200), time: undefined, location: undefined } : habit.implementation_intention,
      two_minute_version: twoMinRaw || null,
      temptation_bundle: temptationRaw || null,
      email_reminder_time: emailTime,
    })
  }

  const stackLabel = getStackLabel(habit)
  const intention = intentionString(habit)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {isEditing ? (
        <div className="space-y-3">
          <label className="font-body block text-xs font-medium text-muted-foreground">Habit name</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-body w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground" />
          <div>
            <label className="font-body block text-xs font-medium text-muted-foreground mb-1">Identity</label>
            <select
              value={editIdentityId ?? ''}
              onChange={(e) => setEditIdentityId(e.target.value || null)}
              className="font-body w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Unlinked</option>
              {identities.map((idn) => (
                <option key={idn.id} value={idn.id}>{idn.statement}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={habit.push_notification_enabled ?? false}
              onChange={(e) => onUpdate({ push_notification_enabled: e.target.checked })}
              className="rounded border-gray-300 text-[#e87722] focus:ring-[#e87722]"
            />
            <span className="text-xs font-medium text-gray-700">Push reminders</span>
          </label>
          <div>
            <label htmlFor={`email-reminder-${habit.id}`} className="font-body block text-xs font-medium text-muted-foreground mb-1">Email reminder at</label>
            <input
              id={`email-reminder-${habit.id}`}
              type="time"
              value={editEmailReminderTime}
              onChange={(e) => setEditEmailReminderTime(e.target.value)}
              className="font-body h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-0.5">You’ll get an email at this time (your timezone from Settings) to check in on this habit. Leave empty for no email.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">4 laws: build this habit</p>
            <DesignBuildForm value={editDesignBuild} onChange={setEditDesignBuild} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={saveEdit} className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium">Save</button>
            <button type="button" onClick={() => setEditingId(null)} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link href={`/dashboard/habits/${habit.id}`} className="font-heading font-medium text-foreground hover:text-primary">
                {habit.name}
              </Link>
              {identityStatement && <p className="font-body text-xs text-muted-foreground mt-0.5">{identityStatement}</p>}
              {sharedWithNames.length > 0 && (
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Shared with: {sharedWithNames.join(', ')}
                </p>
              )}
              {habit.email_reminder_time && (
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Email reminder at {formatReminderTime(habit.email_reminder_time)}
                </p>
              )}
              {(habit.current_streak > 0) && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/25 text-primary font-body text-xs font-semibold">
                  <Flame className="h-3.5 w-3.5 text-primary" />
                  {habit.current_streak}d streak
                </span>
              )}
              {stackLabel && <StackChainView anchorLabel={stackLabel.replace(/^After "/, '').replace(/"$/, '')} habitName={habit.name} className="mt-1" />}
              {intention && <p className="font-body text-xs text-muted-foreground mt-0.5">{intention}</p>}
              {habit.two_minute_version && <p className="font-body text-xs text-muted-foreground mt-0.5">2-min: {habit.two_minute_version}</p>}
              {habit.temptation_bundle && <p className="font-body text-xs text-muted-foreground mt-0.5">Reward: {habit.temptation_bundle}</p>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-card" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onToggleCalendar(habit.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 font-body text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-muted"
              aria-label="View calendar"
              aria-expanded={expandedCalendarHabitId === habit.id}
            >
              <Calendar className="h-3.5 w-3.5" /> {expandedCalendarHabitId === habit.id ? 'Close calendar' : 'View calendar'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(habit.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 font-body text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-muted"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <Link
              href="/dashboard/partners"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/70 bg-emerald-50 px-3 py-1.5 font-body text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 hover:border-emerald-600/80"
            >
              <Users className="h-3.5 w-3.5" /> {sharedWithNames.length > 0 ? `Shared with ${sharedWithNames.join(', ')}` : 'Share with partners'}
            </Link>
            <button
              type="button"
              onClick={() => onUpdate({ push_notification_enabled: !(habit.push_notification_enabled ?? false) })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                habit.push_notification_enabled
                  ? 'border-sky-500/80 bg-sky-100 text-sky-900 hover:bg-sky-200'
                  : 'border-sky-500/70 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:border-sky-600/80'
              }`}
            >
              <Bell className="h-3.5 w-3.5" /> {habit.push_notification_enabled ? 'Reminders on' : 'Reminders'}
            </button>
            <Link
              href={`/dashboard/habits/${habit.id}/contract`}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/70 bg-amber-50 px-3 py-1.5 font-body text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 hover:border-amber-600/80"
            >
              <FileSignature className="h-3.5 w-3.5" /> Contract
            </Link>
          </div>
          {expandedCalendarHabitId === habit.id && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="font-body text-[10px] text-muted-foreground mb-1.5">Last 30 days</p>
              {calendarLoading === habit.id ? (
                <p className="font-body text-xs text-muted-foreground">Loading…</p>
              ) : (
                <div
                  className="grid gap-0.5 max-w-[200px]"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                >
                  {(() => {
                    const completedSet = calendarCompletions[habit.id]
                    const todayStr = format(new Date(), 'yyyy-MM-dd')
                    const cells: string[] = []
                    const d = new Date()
                    for (let i = 29; i >= 0; i--) {
                      const x = new Date(d)
                      x.setDate(d.getDate() - i)
                      cells.push(x.toISOString().slice(0, 10))
                    }
                    return cells.map((dateStr) => {
                      const completed = completedSet?.has(dateStr) ?? false
                      const isToday = dateStr === todayStr
                      return (
                        <div
                          key={dateStr}
                          title={dateStr}
                          className={`aspect-square rounded flex items-center justify-center text-[9px] font-body ${
                            completed
                              ? 'bg-primary text-primary-foreground'
                              : isToday
                                ? 'bg-muted text-foreground ring-1 ring-primary'
                                : 'bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {new Date(dateStr + 'T12:00:00').getDate()}
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          )}
          {linkToIdentityId && linkToIdentityStatement && (
            <button
              type="button"
              onClick={() => onUpdate({ identity_id: linkToIdentityId })}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 font-body text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Add to identity
            </button>
          )}
          {!hasDesignFields && (
            <button
              type="button"
              onClick={() => setEditingId(habit.id)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-body text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Sparkles className="h-3.5 w-3.5" /> Design this habit
            </button>
          )}
        </>
      )}
    </div>
  )
}
