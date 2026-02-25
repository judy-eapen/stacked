'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  UserPlus,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Circle,
  Flame,
} from 'lucide-react'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type Partner = {
  partnership_id: string
  partner_id: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
  accepted_at: string | null
  last_active: string | null
  shared_habit_ids: string[]
}

type MyHabit = { id: string; name: string }

type PendingInvite = {
  id: string
  created_at: string
  invite_url: string
}

type SharedHabit = {
  id: string
  name: string
  identity: string | null
  current_streak: number
  completed_today: boolean
  week_completion: boolean[]
}

type ReceivedCheckin = {
  id: string
  sender_id: string
  sender_name: string | null
  checkin_date: string
  personal_message: string | null
  summary_text: string
  created_at: string
}

type ApiResponse = {
  partners: Partner[]
  pending_invites: PendingInvite[]
  shared_habits_count: number
  shared_habits: SharedHabit[]
  received_checkins?: ReceivedCheckin[]
  my_habits?: MyHabit[]
  habit_shares_by_habit?: Record<string, { partner_id: string; display_name: string | null }[]>
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
}

function formatSentAt(createdAt: string): string {
  const d = daysAgo(createdAt.slice(0, 10))
  if (d === 0) return 'Sent today'
  if (d === 1) return 'Sent 1 day ago'
  return `Sent ${d} days ago`
}

function formatPartnerSince(acceptedAt: string | null): string {
  if (!acceptedAt) return ''
  const d = new Date(acceptedAt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function partnerDisplayName(partner: Partner): string {
  if (partner.display_name?.trim()) return partner.display_name.trim()
  if (partner.email?.trim()) return partner.email.trim()
  return 'Partner'
}

function getInitials(partner: Partner): string {
  const name = partner.display_name?.trim() || partner.email?.trim() || ''
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function PartnersPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null)
  const [partnerSelectedHabits, setPartnerSelectedHabits] = useState<Record<string, Set<string>>>({})
  const [savingPartnerId, setSavingPartnerId] = useState<string | null>(null)
  const [partnerViewData, setPartnerViewData] = useState<
    Record<string, Record<string, { completedDates: Set<string>; current_streak: number }>>
  >({})
  const [partnerViewLoading, setPartnerViewLoading] = useState<Record<string, boolean>>({})

  const fetchPartners = useCallback(() => {
    return fetch('/api/partners', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setData({
          partners: d.partners ?? [],
          pending_invites: d.pending_invites ?? [],
          shared_habits_count: d.shared_habits_count ?? 0,
          shared_habits: d.shared_habits ?? [],
          received_checkins: d.received_checkins ?? [],
          my_habits: d.my_habits ?? [],
          habit_shares_by_habit: d.habit_shares_by_habit ?? {},
        })
      })
  }, [])

  useEffect(() => {
    fetchPartners()
      .catch(() => setData({ partners: [], pending_invites: [], shared_habits_count: 0, shared_habits: [], received_checkins: [], my_habits: [], habit_shares_by_habit: {} }))
      .finally(() => setLoading(false))
  }, [fetchPartners])

  const partnerViewIdsKey =
    expandedPartnerId ? [...(partnerSelectedHabits[expandedPartnerId] ?? [])].sort().join(',') : ''

  useEffect(() => {
    if (!expandedPartnerId) return
    const ids = partnerViewIdsKey ? partnerViewIdsKey.split(',') : []
    if (ids.length === 0) {
      setPartnerViewLoading((prev) => ({ ...prev, [expandedPartnerId]: false }))
      return
    }
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 29)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)
    setPartnerViewLoading((prev) => ({ ...prev, [expandedPartnerId]: true }))
    Promise.all(
      ids.map((habitId) =>
        fetch(`/api/habits/${habitId}/streaks?from=${fromStr}&to=${toStr}`, { credentials: 'include' }).then((r) =>
          r.json().then((body) => ({ habitId, body }))
        )
      )
    )
      .then((results) => {
        const byHabit: Record<string, { completedDates: Set<string>; current_streak: number }> = {}
        for (const { habitId, body } of results) {
          const dates = (body.completions ?? [])
            .filter((c: { completed: boolean }) => c.completed)
            .map((c: { date: string }) => c.date)
          byHabit[habitId] = {
            completedDates: new Set(dates),
            current_streak: typeof body.current_streak === 'number' ? body.current_streak : 0,
          }
        }
        setPartnerViewData((prev) => ({
          ...prev,
          [expandedPartnerId]: { ...prev[expandedPartnerId], ...byHabit },
        }))
      })
      .catch(() => {})
      .finally(() => setPartnerViewLoading((prev) => ({ ...prev, [expandedPartnerId]: false })))
  }, [expandedPartnerId, partnerViewIdsKey])

  async function handleInvite() {
    setError(null)
    setInviteUrl(null)
    setInviting(true)
    const res = await fetch('/api/partnerships/invite', { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    setInviting(false)
    if (!res.ok) {
      setError(body.error || 'Failed to create invite')
      return
    }
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/invite/${body.invite_token}`
        : body.invite_url || ''
    setInviteUrl(url)
    fetchPartners().catch(() => {})
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleCancelInvite(id: string) {
    setCancelInviteId(id)
    const res = await fetch(`/api/partnerships/${id}`, { method: 'PATCH' })
    setCancelInviteId(null)
    if (res.ok && data) setData({ ...data, pending_invites: data.pending_invites.filter((i) => i.id !== id) })
  }

  async function handleRemovePartnership(partnershipId: string) {
    if (confirmRemoveId !== partnershipId) {
      setConfirmRemoveId(partnershipId)
      return
    }
    setRemovingId(partnershipId)
    const res = await fetch(`/api/partnerships/${partnershipId}`, { method: 'PATCH' })
    setRemovingId(null)
    setConfirmRemoveId(null)
    if (res.ok && data) setData({ ...data, partners: data.partners.filter((p) => p.partnership_id !== partnershipId) })
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Accountability Partners
            </h1>
            <p className="font-body text-sm text-muted-foreground mt-0.5">
              Share your habits with people who will cheer you on and keep you honest. They can see your streaks and check-ins — nothing more.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviting}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 disabled:opacity-60 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Invite Partner
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 font-body text-sm p-3" role="alert">
            {error}
          </div>
        )}

        {inviteUrl && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-body text-sm font-medium text-foreground mb-2">Invite link (valid 7 days)</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="font-body flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => copyInviteUrl(inviteUrl)}
                className="rounded-lg bg-primary text-primary-foreground font-body font-medium px-4 py-2 hover:opacity-90 whitespace-nowrap"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Partners</p>
            <p className="font-heading text-2xl font-bold text-foreground mt-0.5">{data?.partners?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">Shared Habits</p>
            <p className="font-heading text-2xl font-bold text-foreground mt-0.5">{data?.shared_habits_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Invites</p>
            <p className="font-heading text-2xl font-bold text-foreground mt-0.5">{data?.pending_invites?.length ?? 0}</p>
          </div>
        </div>

        {data?.pending_invites && data.pending_invites.length > 0 && (
          <div>
            <h2 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Pending Invites
            </h2>
            <ul className="space-y-2">
              {data.pending_invites.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-body text-sm text-foreground">{formatSentAt(inv.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyInviteUrl(inv.invite_url)}
                      className="font-body text-sm font-medium text-primary hover:underline"
                    >
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(inv.id)}
                      disabled={cancelInviteId === inv.id}
                      className="p-1 text-muted-foreground hover:text-foreground rounded disabled:opacity-50"
                      aria-label="Cancel invite"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Your Partners
          </h2>
          {!data?.partners?.length ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <p className="font-body text-muted-foreground mb-4">No partners yet. Invite someone to see your shared habits and progress.</p>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" /> Invite Partner
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.partners.map((partner) => {
                const isExpanded = expandedPartnerId === partner.partner_id
                const lastActive = partner.last_active ? daysAgo(partner.last_active) : null
                const activeText = lastActive !== null ? (lastActive === 0 ? 'active today' : lastActive === 1 ? 'active 1 day ago' : `active ${lastActive} days ago`) : 'no activity yet'
                const sharedCount = partner.shared_habit_ids?.length ?? 0
                const selectedSet = partnerSelectedHabits[partner.partner_id] ?? new Set(partner.shared_habit_ids ?? [])
                return (
                  <li
                    key={partner.partnership_id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-heading text-sm font-semibold">
                        {getInitials(partner)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/partners/${partner.partner_id}`}
                            className="font-heading font-medium text-foreground hover:text-primary"
                          >
                            {partnerDisplayName(partner)}
                          </Link>
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-0.5">
                          {sharedCount} shared habit{sharedCount !== 1 ? 's' : ''} — {activeText}
                        </p>
                        {partner.accepted_at && (
                          <p className="font-body text-xs text-muted-foreground mt-0.5">
                            Partner since {formatPartnerSince(partner.accepted_at)}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/partners/${partner.partner_id}`}
                            className="font-body text-xs font-medium text-primary hover:underline"
                          >
                            View their shared habits
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPartnerId(isExpanded ? null : partner.partner_id)
                              if (!isExpanded && !partnerSelectedHabits[partner.partner_id])
                                setPartnerSelectedHabits((prev) => ({ ...prev, [partner.partner_id]: new Set(partner.shared_habit_ids ?? []) }))
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 font-body text-xs font-medium text-foreground hover:bg-muted/50"
                          >
                            {isExpanded ? 'Hide habits' : 'Select habits to share'}
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePartnership(partner.partnership_id)}
                            disabled={removingId === partner.partnership_id}
                            className={`font-body text-xs font-medium ${confirmRemoveId === partner.partnership_id ? 'text-red-600' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {removingId === partner.partnership_id ? 'Removing…' : confirmRemoveId === partner.partnership_id ? 'Click again to remove' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 border-t border-border pt-4 space-y-3">
                        <p className="font-body text-sm font-medium text-foreground">
                          Select which habits to share with {partnerDisplayName(partner)}
                        </p>
                        {data?.my_habits && data.my_habits.length > 0 ? (
                          <>
                            <ul className="space-y-2">
                              {data.my_habits.map((h) => (
                                <li key={h.id} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`share-${partner.partner_id}-${h.id}`}
                                    checked={selectedSet.has(h.id)}
                                    onChange={() => {
                                      setPartnerSelectedHabits((prev) => {
                                        const next = new Set(prev[partner.partner_id] ?? [])
                                        if (next.has(h.id)) next.delete(h.id)
                                        else next.add(h.id)
                                        return { ...prev, [partner.partner_id]: next }
                                      })
                                    }}
                                    className="rounded border-border text-primary focus:ring-primary"
                                  />
                                  <label htmlFor={`share-${partner.partner_id}-${h.id}`} className="font-body text-sm text-foreground cursor-pointer">
                                    {h.name}
                                  </label>
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              disabled={savingPartnerId === partner.partner_id}
                              onClick={async () => {
                                setSavingPartnerId(partner.partner_id)
                                try {
                                  const res = await fetch(`/api/partners/${partner.partner_id}/shared`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ habit_ids: [...selectedSet] }),
                                  })
                                  if (res.ok) await fetchPartners()
                                } finally {
                                  setSavingPartnerId(null)
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-body text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            >
                              {savingPartnerId === partner.partner_id ? 'Saving…' : 'Save'}
                            </button>
                            {selectedSet.size > 0 && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <p className="font-body text-sm font-medium text-foreground mb-3">
                                  What {partnerDisplayName(partner)} sees (calendar and streaks)
                                </p>
                                {partnerViewLoading[partner.partner_id] ? (
                                  <p className="font-body text-xs text-muted-foreground">Loading…</p>
                                ) : (
                                  <ul className="space-y-4">
                                    {data.my_habits
                                      ?.filter((h) => selectedSet.has(h.id))
                                      .map((h) => {
                                        const view = partnerViewData[partner.partner_id]?.[h.id]
                                        const completedDates = view?.completedDates ?? new Set<string>()
                                        const streak = view?.current_streak ?? 0
                                        const cells: string[] = []
                                        const d = new Date()
                                        for (let i = 29; i >= 0; i--) {
                                          const x = new Date(d)
                                          x.setDate(d.getDate() - i)
                                          cells.push(x.toISOString().slice(0, 10))
                                        }
                                        return (
                                          <li key={h.id} className="rounded-xl border border-border bg-muted/20 p-3">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                              <span className="font-body text-sm font-medium text-foreground">{h.name}</span>
                                              {streak > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-400/60 text-amber-900 dark:bg-amber-900/30 dark:border-amber-500/50 dark:text-amber-100 px-2 py-0.5 font-body text-xs font-semibold">
                                                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                                                  {streak} day{streak !== 1 ? 's' : ''}
                                                </span>
                                              )}
                                            </div>
                                            <p className="font-body text-[10px] text-muted-foreground mb-1.5">Last 30 days</p>
                                            <div
                                              className="grid gap-0.5 max-w-[200px]"
                                              style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                                            >
                                              {cells.map((dateStr) => {
                                                const completed = completedDates.has(dateStr)
                                                const todayStr = new Date().toISOString().slice(0, 10)
                                                const isToday = dateStr === todayStr
                                                return (
                                                  <div
                                                    key={dateStr}
                                                    title={dateStr}
                                                    aria-label={completed ? `${dateStr} completed` : dateStr}
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
                                              })}
                                            </div>
                                          </li>
                                        )
                                      })}
                                  </ul>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="font-body text-xs text-muted-foreground">No habits yet. Add habits on the Habits page first.</p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {data?.received_checkins && data.received_checkins.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-heading text-sm font-semibold text-foreground mb-3">Check-ins from partners</h2>
            <ul className="space-y-3">
              {data.received_checkins.map((c) => (
                <li key={c.id} className="font-body text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-foreground">{c.sender_name || 'Partner'}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{c.checkin_date}</p>
                  {c.personal_message && (
                    <p className="text-foreground mt-1 italic">&ldquo;{c.personal_message}&rdquo;</p>
                  )}
                  <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-24 overflow-y-auto">
                    {c.summary_text}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-foreground mb-3">How Partners Work</h2>
          <ol className="font-body text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li><strong className="text-foreground">Copy and send the invite link</strong> — Share it with anyone over text, email, etc.</li>
            <li><strong className="text-foreground">Choose what to share</strong> — Pick specific habits they can see</li>
            <li><strong className="text-foreground">They see your streaks</strong> — View-only access to your check-ins</li>
            <li><strong className="text-foreground">Stay accountable</strong> — Check in regularly; they will notice</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-foreground mb-2">Your Privacy</h2>
          <p className="font-body text-sm text-muted-foreground">
            Partners can <strong className="text-foreground">only</strong> see the specific habits you choose to share. They see whether you checked in and your streak — nothing else.
          </p>
          <p className="font-body text-sm text-muted-foreground mt-2">
            Choose which habits to share per partner above (Select habits to share). On the Habits page you will see &ldquo;Shared with: [names]&rdquo; for each habit.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <blockquote className="font-body text-sm italic text-foreground">
            One of the most effective things you can do to build better habits is to join a culture where your desired behavior is the normal behavior.
          </blockquote>
          <cite className="font-body text-xs text-primary mt-1 block">— James Clear, Atomic Habits</cite>
        </div>
      </div>
    </div>
  )
}
