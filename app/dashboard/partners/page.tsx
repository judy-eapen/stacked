'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function PartnerRow({
  partnershipId,
  partnerId,
  displayName,
  onRemoved,
}: {
  partnershipId: string
  partnerId: string
  displayName: string | null
  onRemoved: () => void
}) {
  const [removing, setRemoving] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleRemove() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setRemoving(true)
    const res = await fetch(`/api/partnerships/${partnershipId}`, { method: 'PATCH' })
    setRemoving(false)
    setConfirm(false)
    if (res.ok) onRemoved()
  }

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white border border-gray-200/80 p-4 hover:bg-gray-50/80 group">
      <Link href={`/dashboard/partners/${partnerId}`} className="flex-1 flex items-center gap-3 min-w-0">
        <span className="font-medium text-gray-900 truncate">{displayName || 'Partner'}</span>
        <span className="text-gray-400 shrink-0">→</span>
      </Link>
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className={`text-sm shrink-0 ${confirm ? 'text-red-600 font-medium' : 'text-gray-500 hover:text-red-600'}`}
      >
        {removing ? 'Removing…' : confirm ? 'Click again to remove' : 'Remove'}
      </button>
    </li>
  )
}

type Partner = {
  partnership_id: string
  partner_id: string
  display_name: string | null
  avatar_url: string | null
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/partners')
      .then((r) => r.json())
      .then((data) => {
        setPartners(data.partners ?? [])
      })
      .catch(() => setPartners([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleInvite() {
    setError(null)
    setInviteUrl(null)
    setInviting(true)
    const res = await fetch('/api/partnerships/invite', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setInviting(false)
    if (!res.ok) {
      setError(data.error || 'Failed to create invite')
      return
    }
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/invite/${data.invite_token}`
        : data.invite_url || ''
    setInviteUrl(url)
  }

  function copyInviteUrl() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Partners</h1>
          <p className="text-sm text-gray-500">Accountability partners can see your shared habits and cheer you on.</p>
        </div>
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Partners</h1>
        <p className="text-sm text-gray-500">Accountability partners can see your shared habits and cheer you on.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3" role="alert">
          {error}
        </div>
      )}

      {inviteUrl && (
        <div className="rounded-xl bg-white border border-gray-200/80 p-5 space-y-3">
          <p className="text-sm font-medium text-gray-900">Invite link (valid 7 days)</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-gray-50"
            />
            <button
              type="button"
              onClick={copyInviteUrl}
              className="rounded-lg bg-[#e87722] text-white font-medium px-4 py-2 hover:bg-[#d96b1e] whitespace-nowrap"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {partners.length === 0 && !inviteUrl && (
        <div className="rounded-xl bg-white border border-gray-200/80 p-8 text-center">
          <p className="text-gray-600 mb-4">No partners yet. Invite someone to see your shared habits and progress.</p>
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviting}
            className="rounded-lg bg-[#e87722] text-white font-semibold px-5 py-2.5 hover:bg-[#d96b1e] disabled:opacity-60"
          >
            {inviting ? 'Creating link…' : 'Invite a partner'}
          </button>
        </div>
      )}

      {partners.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Your partners</h2>
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting}
              className="text-sm font-medium text-[#e87722] hover:underline disabled:opacity-60"
            >
              {inviting ? 'Creating…' : 'Invite a partner'}
            </button>
          </div>
          <ul className="space-y-2">
            {partners.map((p) => (
              <PartnerRow
                key={p.partnership_id}
                partnershipId={p.partnership_id}
                partnerId={p.partner_id}
                displayName={p.display_name}
                onRemoved={() => setPartners((prev) => prev.filter((x) => x.partnership_id !== p.partnership_id))}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
