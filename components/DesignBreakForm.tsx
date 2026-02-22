'use client'

import type { DesignBreak } from '@/lib/db-types'

export const EMPTY_DESIGN_BREAK: DesignBreak = {
  invisible: { remove_cues: '', change_environment: '', avoid_triggers: '' },
  unattractive: { reframe_cost: '', highlight_downside: '', negative_identity: '' },
  difficult: { increase_friction: '', add_steps: '', add_accountability: '' },
  unsatisfying: { immediate_consequence: '', accountability_partner: '', loss_based: '' },
}

export function trimDesignBreak(d: DesignBreak | null | undefined): DesignBreak | null {
  if (!d) return null
  const out: DesignBreak = {}
  const keys = ['invisible', 'unattractive', 'difficult', 'unsatisfying'] as const
  for (const law of keys) {
    const section = d[law]
    if (section && typeof section === 'object') {
      const trimmed: Record<string, string> = {}
      for (const [k, v] of Object.entries(section)) {
        if (typeof v === 'string') trimmed[k] = v.trim()
      }
      if (Object.keys(trimmed).length) (out as Record<string, unknown>)[law] = trimmed
    }
  }
  return Object.keys(out).length ? out : null
}

export function DesignBreakForm({ value, onChange }: { value: DesignBreak; onChange: (v: DesignBreak) => void }) {
  const d = {
    invisible: { ...EMPTY_DESIGN_BREAK.invisible, ...value?.invisible },
    unattractive: { ...EMPTY_DESIGN_BREAK.unattractive, ...value?.unattractive },
    difficult: { ...EMPTY_DESIGN_BREAK.difficult, ...value?.difficult },
    unsatisfying: { ...EMPTY_DESIGN_BREAK.unsatisfying, ...value?.unsatisfying },
  }
  const set = (law: keyof DesignBreak, field: string, val: string) => {
    onChange({ ...value, [law]: { ...d[law], [field]: val } })
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">1. Make it invisible</p>
        <input placeholder="Remove cues" value={d.invisible?.remove_cues ?? ''} onChange={(e) => set('invisible', 'remove_cues', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Change environment" value={d.invisible?.change_environment ?? ''} onChange={(e) => set('invisible', 'change_environment', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Avoid trigger situations" value={d.invisible?.avoid_triggers ?? ''} onChange={(e) => set('invisible', 'avoid_triggers', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">2. Make it unattractive</p>
        <input placeholder="Reframe the cost" value={d.unattractive?.reframe_cost ?? ''} onChange={(e) => set('unattractive', 'reframe_cost', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Highlight long-term downside" value={d.unattractive?.highlight_downside ?? ''} onChange={(e) => set('unattractive', 'highlight_downside', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Associate with negative identity" value={d.unattractive?.negative_identity ?? ''} onChange={(e) => set('unattractive', 'negative_identity', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">3. Make it difficult</p>
        <input placeholder="Increase friction" value={d.difficult?.increase_friction ?? ''} onChange={(e) => set('difficult', 'increase_friction', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Add steps" value={d.difficult?.add_steps ?? ''} onChange={(e) => set('difficult', 'add_steps', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Add accountability" value={d.difficult?.add_accountability ?? ''} onChange={(e) => set('difficult', 'add_accountability', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">4. Make it unsatisfying</p>
        <input placeholder="Immediate consequence" value={d.unsatisfying?.immediate_consequence ?? ''} onChange={(e) => set('unsatisfying', 'immediate_consequence', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Accountability partner" value={d.unsatisfying?.accountability_partner ?? ''} onChange={(e) => set('unsatisfying', 'accountability_partner', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Loss-based mechanism" value={d.unsatisfying?.loss_based ?? ''} onChange={(e) => set('unsatisfying', 'loss_based', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
    </div>
  )
}
