'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DesignBreakForm, EMPTY_DESIGN_BREAK, trimDesignBreak } from '@/components/DesignBreakForm'
import { Plus, TrendingUp, MinusCircle } from 'lucide-react'
import { DesignBuildForm } from './DesignBuildForm'
import { HabitCard } from './HabitCard'
import { BlockerCard } from './BlockerCard'
import { hasDesignFields } from './utils'
import { useHabitsPageState } from './useHabitsPageState'

export default function HabitsPage() {
  const {
    router,
    identityParam,
    modeParam,
    addBlockerFor,
    loading,
    error,
    setError,
    showAddForm,
    setShowAddForm,
    showDesignSection,
    setShowDesignSection,
    editingId,
    setEditingId,
    draftName,
    setDraftName,
    draftIdentityId,
    setDraftIdentityId,
    draftStackScorecardId,
    setDraftStackScorecardId,
    draftStackHabitId,
    setDraftStackHabitId,
    draftDesignBuild,
    setDraftDesignBuild,
    habitsToBreak,
    showBlockerForm,
    setShowBlockerForm,
    blockerDraftName,
    setBlockerDraftName,
    blockerDraftHabitId,
    setBlockerDraftHabitId,
    blockerDraftDesign,
    setBlockerDraftDesign,
    editingBlockerId,
    setEditingBlockerId,
    addingBlockerHabitId,
    habitFilter,
    setHabitFilter,
    expandedCalendarHabitId,
    setExpandedCalendarHabitId,
    calendarCompletions,
    calendarLoading,
    habitSharesByHabit,
    fetchAll,
    activeHabits,
    addBlockerForIdentity,
    unlinkedHabitsForBlocker,
    addAsBlockerForIdentity,
    habitsByIdentity,
    blockersByIdentity,
    identityGroups,
    activeCount,
    onStreakCount,
    identitiesWithHabitsCount,
    resetCreateForm,
    createHabit,
    updateHabit,
    deleteHabit,
    getStackLabel,
    intentionString,
    habits,
    identities,
    scorecardEntries,
  } = useHabitsPageState()
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e87722] border-t-transparent" />
        <p className="text-sm text-gray-500 mt-3">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header: title, subtitle, + Add habit button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Habits
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-0.5">
            Design habits with implementation intentions, stacking, and two-minute versions. Blocking habits are shown with strategies to overcome them.
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add habit
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      {addBlockerFor && addBlockerForIdentity && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="font-body text-sm font-medium text-foreground">
            Pick a habit to add as a blocker for &ldquo;{addBlockerForIdentity.statement}&rdquo;
          </p>
          <p className="font-body text-xs text-muted-foreground">
            Only unlinked habits (not tied to an identity) can be blockers. Select one below, then you&rsquo;ll return to the identity.
          </p>
          <Link
            href={`/dashboard/identities/${addBlockerFor}`}
            className="inline-flex items-center font-body text-sm font-medium text-primary hover:underline"
          >
            ← Back to identity
          </Link>
          {unlinkedHabitsForBlocker.length === 0 ? (
            <div className="space-y-2">
              <p className="font-body text-sm text-muted-foreground">
                No unlinked habits. Create a new habit below and it will be added as a blocker for this identity (not as a reinforcing habit).
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Create habit and add as blocker
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {unlinkedHabitsForBlocker.map((habit) => (
                <li key={habit.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                  <span className="font-body text-sm text-foreground">{habit.name}</span>
                  <button
                    type="button"
                    onClick={() => addAsBlockerForIdentity(habit.id)}
                    disabled={addingBlockerHabitId === habit.id}
                    className="font-body text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {addingBlockerHabitId === habit.id ? 'Adding…' : 'Add as blocker'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Counters and filter tabs */}
      {(activeHabits.length > 0 || habitsToBreak.length > 0) && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 font-body text-xs font-medium text-green-800">
              {activeCount} REINFORCING
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-body text-xs font-medium text-emerald-800">
              {onStreakCount} ON STREAK
            </span>
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 font-body text-xs font-medium text-red-800">
              {habitsToBreak.length} BLOCKING
            </span>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-body text-xs font-medium text-blue-800">
              {identitiesWithHabitsCount} IDENTITIES
            </span>
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
            {(['all', 'reinforcing', 'blocking'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setHabitFilter(f)}
                className={`inline-flex items-center px-3 py-1.5 rounded-md font-body text-xs font-medium transition-colors ${
                  habitFilter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' && `All (${activeHabits.length + habitsToBreak.length})`}
                {f === 'reinforcing' && `Reinforcing (${activeCount})`}
                {f === 'blocking' && `Blocking (${habitsToBreak.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="font-body text-xs text-muted-foreground">
        4 Laws (obvious, attractive, easy, satisfying) and stacking (after [X], I will [Y]) from Atomic Habits.
      </p>

      {modeParam === 'fix' && identityParam && (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Blockers for this identity</h2>
          <p className="text-sm text-gray-500">Habits that undermine this identity. Pick one from your habits or add by name, then design how to break it.</p>
          {habitsToBreak.filter((h) => h.identity_id === identityParam).length === 0 && !showBlockerForm && (
            <p className="text-sm text-gray-500">No blockers linked yet.</p>
          )}
          <ul className="space-y-2">
            {habitsToBreak.filter((h) => h.identity_id === identityParam).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                {editingBlockerId === h.id ? (
                  <div className="flex-1 space-y-2">
                    <input value={blockerDraftName} onChange={(e) => setBlockerDraftName(e.target.value)} placeholder="Habit name" className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
                    <DesignBreakForm value={blockerDraftDesign} onChange={setBlockerDraftDesign} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const name = blockerDraftName.trim().slice(0, 200)
                          if (!name) return
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) return
                          const db = trimDesignBreak(blockerDraftDesign)
                          const { error: err } = await supabase.from('habits_to_break').update({ name, design_break: db }).eq('id', h.id).eq('user_id', user.id)
                          if (err) setError(err.message)
                          else { setEditingBlockerId(null); fetchAll(); }
                        }}
                        className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingBlockerId(null)} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">{h.name}</span>
                    <button type="button" onClick={() => { setEditingBlockerId(h.id); setBlockerDraftName(h.name); setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK, ...h.design_break }); }} className="text-[#e87722] hover:underline text-xs">Edit</button>
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
                <button
                  type="button"
                  onClick={async () => {
                    const name = blockerDraftName.trim().slice(0, 200)
                    if (!name) return
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const db = trimDesignBreak(blockerDraftDesign)
                    const { error: err } = await supabase.from('habits_to_break').upsert({ user_id: user.id, identity_id: identityParam, habit_id: blockerDraftHabitId || null, name, design_break: db }, { onConflict: 'identity_id' })
                    if (err) setError(err.message)
                    else { setShowBlockerForm(false); setBlockerDraftName(''); setBlockerDraftHabitId(null); setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK }); fetchAll(); }
                  }}
                  disabled={!blockerDraftName.trim()}
                  className="h-9 px-3 rounded-lg bg-[#e87722] text-white text-sm font-medium disabled:opacity-50"
                >
                  Save
                </button>
                <button type="button" onClick={() => { setShowBlockerForm(false); setBlockerDraftName(''); setBlockerDraftHabitId(null); setBlockerDraftDesign({ ...EMPTY_DESIGN_BREAK }); }} className="h-9 px-3 rounded-lg border text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Pick from existing habits</p>
              <ul className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {activeHabits
                  .filter((habit) => habit.identity_id == null)
                  .map((habit) => (
                    <li key={habit.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-gray-50">
                      <span className="text-sm text-gray-900">{habit.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBlockerDraftName(habit.name)
                          setBlockerDraftHabitId(habit.id)
                          setShowBlockerForm(true)
                        }}
                        className="text-xs font-medium text-[#e87722] hover:underline"
                      >
                        Add as blocker
                      </button>
                    </li>
                  ))}
              </ul>
              {activeHabits.filter((h) => h.identity_id == null).length === 0 && (
                <p className="text-sm text-gray-500">
                  {activeHabits.length === 0 ? 'No habits yet. Create one first, then you can add it as a blocker here.' : 'No unlinked habits. Only habits not linked as reinforcing any identity can be added as blockers; add a blocker by name below.'}
                </p>
              )}
              <p className="text-xs text-gray-500">Or add by name:</p>
              <button type="button" onClick={() => { setBlockerDraftName(''); setBlockerDraftHabitId(null); setShowBlockerForm(true); }} className="text-sm font-medium text-[#e87722] hover:underline">
                + Add habit to break (enter name)
              </button>
            </div>
          )}
        </div>
      )}

      {showAddForm ? (
        <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              {addBlockerFor && addBlockerForIdentity ? 'New habit (will be added as blocker)' : 'New habit'}
            </p>
            <button type="button" onClick={resetCreateForm} className="text-sm text-gray-500 hover:underline">Cancel</button>
          </div>
          {addBlockerFor && addBlockerForIdentity && (
            <p className="font-body text-xs text-muted-foreground rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              This habit will be added as a <strong>blocking</strong> habit for &ldquo;{addBlockerForIdentity.statement}&rdquo;, not as a reinforcing habit.
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Habit name (required)</label>
            <input
              type="text"
              placeholder="e.g. Read 10 pages"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70 focus:ring-offset-2"
            />
          </div>
          {!(addBlockerFor && addBlockerForIdentity) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Identity (optional)</label>
            <select
              value={draftIdentityId ?? ''}
              onChange={(e) => setDraftIdentityId(e.target.value || null)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
            >
              <option value="">Unlinked</option>
              {identities.map((idn) => (
                <option key={idn.id} value={idn.id}>{idn.statement}</option>
              ))}
            </select>
          </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => setShowDesignSection((v) => !v)}
              className="text-sm font-medium text-[#e87722] hover:underline"
            >
              {showDesignSection ? 'Hide design' : 'Design this habit'}
            </button>
            {showDesignSection && (
              <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">4 laws: build this habit</p>
                <DesignBuildForm
                  value={draftDesignBuild}
                  onChange={setDraftDesignBuild}
                />
                <p className="text-xs font-medium text-gray-700 mt-2 pt-2 border-t border-gray-200">Stack after (optional)</p>
                <select value={draftStackScorecardId ?? ''} onChange={(e) => { setDraftStackScorecardId(e.target.value || null); setDraftStackHabitId(null); }} className="w-full h-9 px-3 rounded border border-gray-200 text-sm">
                  <option value="">No scorecard anchor</option>
                  {scorecardEntries.map((e) => (
                    <option key={e.id} value={e.id}>{e.habit_name}</option>
                  ))}
                </select>
                <select value={draftStackHabitId ?? ''} onChange={(e) => { setDraftStackHabitId(e.target.value || null); setDraftStackScorecardId(null); }} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mt-1">
                  <option value="">No habit anchor</option>
                  {activeHabits.filter((h) => h.id !== editingId).map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={createHabit}
            disabled={!draftName.trim()}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50"
          >
            {addBlockerFor && addBlockerForIdentity ? 'Create habit and add as blocker' : 'Create habit'}
          </button>
        </div>
      ) : null}

      {activeHabits.length === 0 && habitsToBreak.length === 0 && !showAddForm ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="font-body text-muted-foreground mb-6">
            Add habits to track. Start with a name and optional identity; you can add implementation intentions and stacking later.
          </p>
          <Link
            href="/dashboard/habits?add=1"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-body font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add your first habit
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {identityGroups.length === 0 && (habitFilter === 'blocking' || (habitsByIdentity.get(null) ?? []).length === 0) && (
            <p className="font-body text-sm text-muted-foreground">No habits match this filter.</p>
          )}
          {identityGroups.map((idn) => {
            const reinforcing = habitsByIdentity.get(idn.id) ?? []
            const blocking = blockersByIdentity.get(idn.id) ?? []
            const showReinforcing = (habitFilter === 'all' || habitFilter === 'reinforcing') && reinforcing.length > 0
            const showBlocking = (habitFilter === 'all' || habitFilter === 'blocking') && blocking.length > 0
            return (
              <div key={idn.id} className="space-y-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">{idn.statement}</h2>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    {reinforcing.length} habit{reinforcing.length !== 1 ? 's' : ''} {blocking.length} blocker{blocking.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {showReinforcing && (
                  <div className="space-y-2">
                    <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-green-700 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Reinforcing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reinforcing.map((h) => (
                        <HabitCard
                          key={h.id}
                          habit={h}
                          identityStatement={idn.statement}
                          identities={identities}
                          linkToIdentityId={null}
                          linkToIdentityStatement={null}
                          getStackLabel={getStackLabel}
                          intentionString={intentionString}
                          hasDesignFields={hasDesignFields(h)}
                          editingId={editingId}
                          setEditingId={setEditingId}
                          onUpdate={(updates) => updateHabit(h.id, updates)}
                          onDelete={() => deleteHabit(h.id)}
                          expandedCalendarHabitId={expandedCalendarHabitId}
                          calendarCompletions={calendarCompletions}
                          calendarLoading={calendarLoading}
                          onToggleCalendar={(id) => setExpandedCalendarHabitId((prev) => (prev === id ? null : id))}
                          sharedWithNames={(habitSharesByHabit[h.id] ?? []).map((s) => s.display_name || 'Partner')}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {showBlocking && (
                  <div className="space-y-2">
                    <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-red-700 flex items-center gap-1.5">
                      <MinusCircle className="h-3.5 w-3.5" /> Undermining
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {blocking.map((h) => (
                        <BlockerCard
                          key={h.id}
                          blocker={h}
                          editingBlockerId={editingBlockerId}
                          setEditingBlockerId={setEditingBlockerId}
                          draftName={blockerDraftName}
                          setDraftName={setBlockerDraftName}
                          draftDesign={blockerDraftDesign}
                          setDraftDesign={setBlockerDraftDesign}
                          onSave={async () => {
                            const name = blockerDraftName.trim().slice(0, 200)
                            if (!name) return
                            const supabase = createClient()
                            const { data: { user } } = await supabase.auth.getUser()
                            if (!user) return
                            const db = trimDesignBreak(blockerDraftDesign)
                            const { error: err } = await supabase.from('habits_to_break').update({ name, design_break: db }).eq('id', h.id).eq('user_id', user.id)
                            if (err) setError(err.message)
                            else { setEditingBlockerId(null); fetchAll(); }
                          }}
                          onDelete={async () => {
                            const supabase = createClient()
                            const { data: { user } } = await supabase.auth.getUser()
                            if (!user) return
                            const { error: err } = await supabase.from('habits_to_break').delete().eq('id', h.id).eq('user_id', user.id)
                            if (err) setError(err.message)
                            else fetchAll()
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {(habitFilter === 'all' || habitFilter === 'reinforcing') && (habitsByIdentity.get(null) ?? []).length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Unlinked habits</h2>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  ({(habitsByIdentity.get(null) ?? []).length} habit{(habitsByIdentity.get(null) ?? []).length !== 1 ? 's' : ''})
                </p>
              </div>
              {identityParam && modeParam === 'reinforce' && identities.find((idn) => idn.id === identityParam) && (
                <p className="font-body text-xs text-muted-foreground">Click &quot;Add to identity&quot; on a habit below to link it to <strong>{identities.find((idn) => idn.id === identityParam)?.statement}</strong>.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(habitsByIdentity.get(null) ?? []).map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    identityStatement={null}
                    identities={identities}
                    linkToIdentityId={identityParam && modeParam === 'reinforce' ? identityParam : null}
                    linkToIdentityStatement={identityParam && modeParam === 'reinforce' ? identities.find((idn) => idn.id === identityParam)?.statement ?? null : null}
                    getStackLabel={getStackLabel}
                    intentionString={intentionString}
                    hasDesignFields={hasDesignFields(h)}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    onUpdate={(updates) => updateHabit(h.id, updates)}
                    onDelete={() => deleteHabit(h.id)}
                    expandedCalendarHabitId={expandedCalendarHabitId}
                    calendarCompletions={calendarCompletions}
                    calendarLoading={calendarLoading}
                    onToggleCalendar={(id) => setExpandedCalendarHabitId((prev) => (prev === id ? null : id))}
                    sharedWithNames={(habitSharesByHabit[h.id] ?? []).map((s) => s.display_name || 'Partner')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
