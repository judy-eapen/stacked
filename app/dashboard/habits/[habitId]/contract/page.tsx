'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Contract = {
  id: string
  commitment: string
  consequence: string | null
  start_date: string
  end_date: string | null
  witness_partner_id: string | null
}

export default function HabitContractPage() {
  const params = useParams()
  const router = useRouter()
  const habitId = typeof params.habitId === 'string' ? params.habitId : ''
  const [habitName, setHabitName] = useState<string>('')
  const [contract, setContract] = useState<Contract | null>(null)
  const [commitment, setCommitment] = useState('')
  const [consequence, setConsequence] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!habitId) {
      setLoading(false)
      return
    }
    fetch(`/api/habits/${habitId}/contract`)
      .then((r) => r.json())
      .then((res) => {
        const c = res.contract ?? null
        setContract(c)
        setHabitName(res.habit_name ?? 'Habit')
        if (c) {
          setCommitment(c.commitment)
          setConsequence(c.consequence ?? '')
          setStartDate(c.start_date)
          setEndDate(c.end_date ?? '')
        } else {
          setStartDate(new Date().toISOString().slice(0, 10))
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [habitId])

  async function handleSave() {
    const c = commitment.trim().slice(0, 1000)
    if (!c) {
      setError('Commitment is required')
      return
    }
    if (!startDate) {
      setError('Start date is required')
      return
    }
    setError(null)
    setSaving(true)
    const res = await fetch(`/api/habits/${habitId}/contract`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commitment: c,
        consequence: consequence.trim().slice(0, 500) || null,
        start_date: startDate,
        end_date: endDate.trim() || null,
      }),
    })
    setSaving(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Failed to save')
      return
    }
    router.push('/dashboard/habits')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/habits" className="text-sm text-gray-500 hover:text-gray-700">
          ← Habits
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-2">Habit contract</h1>
        <p className="text-sm text-gray-500 mt-1">{habitName}</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-xl bg-white border border-gray-200/80 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Commitment (required)</label>
          <textarea
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            placeholder="e.g. I will write for 10 minutes every day for 30 days"
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Consequence (optional)</label>
          <input
            type="text"
            value={consequence}
            onChange={(e) => setConsequence(e.target.value)}
            placeholder="e.g. I buy my partner coffee if I miss"
            maxLength={500}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e87722]/70"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !commitment.trim()}
            className="h-10 px-4 rounded-lg bg-[#e87722] text-white text-sm font-medium hover:bg-[#d96b1e] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save contract'}
          </button>
          <Link
            href="/dashboard/habits"
            className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium flex items-center"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
