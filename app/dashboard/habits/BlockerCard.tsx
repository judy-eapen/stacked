'use client'

import Link from 'next/link'
import type { DesignBreak } from '@/lib/db-types'
import { DesignBreakForm, EMPTY_DESIGN_BREAK } from '@/components/DesignBreakForm'
import { Calendar, FileSignature, Pencil, Sparkles, Trash2, Users } from 'lucide-react'
import type { HabitToBreak } from './types'
import { designBreakStrategySummary, hasDesignBreakFields } from './utils'

interface BlockerCardProps {
  blocker: HabitToBreak
  editingBlockerId: string | null
  setEditingBlockerId: (id: string | null) => void
  draftName: string
  setDraftName: (s: string) => void
  draftDesign: DesignBreak
  setDraftDesign: (d: DesignBreak) => void
  onSave: () => void
  onDelete: () => void
}

export function BlockerCard({
  blocker,
  editingBlockerId,
  setEditingBlockerId,
  draftName,
  setDraftName,
  draftDesign,
  setDraftDesign,
  onSave,
  onDelete,
}: BlockerCardProps) {
  const isEditing = editingBlockerId === blocker.id
  const hasDesign = hasDesignBreakFields(blocker.design_break)
  const strategySummary = designBreakStrategySummary(blocker.design_break)

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 shadow-sm overflow-hidden flex">
      <div className="w-1 shrink-0 bg-red-400" aria-hidden />
      <div className="flex-1 min-w-0 p-4">
        {isEditing ? (
          <div className="space-y-3">
            <label className="font-body block text-xs font-medium text-muted-foreground">Habit to break (name)</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="font-body w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground"
            />
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">4 laws: break this habit</p>
              <DesignBreakForm value={draftDesign} onChange={setDraftDesign} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onSave} className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setEditingBlockerId(null)} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-heading font-medium text-red-800 line-through">{blocker.name}</p>
                <p className="font-body text-xs text-red-700/80 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
                  Still active
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={onDelete} className="p-1.5 text-red-700/70 hover:text-red-600 rounded-md hover:bg-red-100" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {strategySummary ? (
              <div className="mt-3 pt-3 border-t border-red-200/60">
                <p className="font-body text-xs font-semibold uppercase tracking-wide text-red-800 mb-1">Strategy to break it</p>
                <p className="font-body text-sm text-red-900/90">{strategySummary}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/identities/${blocker.identity_id}?blockers=1`}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3 py-1.5 font-body text-xs font-medium text-red-800 transition-colors hover:border-red-400 hover:bg-red-100"
              >
                <Users className="h-3.5 w-3.5" /> View on identity
              </Link>
              <button
                type="button"
                onClick={() => { setEditingBlockerId(blocker.id); setDraftName(blocker.name); setDraftDesign({ ...EMPTY_DESIGN_BREAK, ...blocker.design_break }); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3 py-1.5 font-body text-xs font-medium text-red-800 transition-colors hover:border-red-400 hover:bg-red-100"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              {blocker.habit_id && (
                <Link
                  href={`/dashboard/habits/${blocker.habit_id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3 py-1.5 font-body text-xs font-medium text-red-800 transition-colors hover:border-red-400 hover:bg-red-100"
                  aria-label="View calendar"
                >
                  <Calendar className="h-3.5 w-3.5" /> View calendar
                </Link>
              )}
              <Link
                href={`/dashboard/identities/${blocker.identity_id}?blockers=1`}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3 py-1.5 font-body text-xs font-medium text-red-800 transition-colors hover:border-red-400 hover:bg-red-100"
              >
                <FileSignature className="h-3.5 w-3.5" /> Contract
              </Link>
            </div>
            {!hasDesign && (
              <button
                type="button"
                onClick={() => { setEditingBlockerId(blocker.id); setDraftName(blocker.name); setDraftDesign({ ...EMPTY_DESIGN_BREAK, ...blocker.design_break }); }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-400 bg-red-100/80 px-3 py-1.5 font-body text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
              >
                <Sparkles className="h-3.5 w-3.5" /> Design this habit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
