'use client'

import type { DesignBuild } from '@/lib/db-types'
import { EMPTY_DESIGN_BUILD } from './utils'

export function DesignBuildForm({ value, onChange }: { value: DesignBuild; onChange: (v: DesignBuild) => void }) {
  const d = {
    obvious: { ...EMPTY_DESIGN_BUILD.obvious, ...value?.obvious },
    attractive: { ...EMPTY_DESIGN_BUILD.attractive, ...value?.attractive },
    easy: { ...EMPTY_DESIGN_BUILD.easy, ...value?.easy },
    satisfying: { ...EMPTY_DESIGN_BUILD.satisfying, ...value?.satisfying },
  }
  const set = (law: keyof DesignBuild, field: string, val: string) => {
    onChange({
      ...value,
      [law]: { ...d[law], [field]: val },
    })
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">1. Make it obvious</p>
        <input placeholder="Clear cue" value={d.obvious?.clear_cue ?? ''} onChange={(e) => set('obvious', 'clear_cue', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Visible trigger" value={d.obvious?.visible_trigger ?? ''} onChange={(e) => set('obvious', 'visible_trigger', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Implementation intention (e.g. After I pour coffee, I journal.)" value={d.obvious?.implementation_intention ?? ''} onChange={(e) => set('obvious', 'implementation_intention', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
        <p className="text-[11px] text-gray-500 mt-0.5">Stacking: After [current habit], I will [new habit].</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">2. Make it attractive</p>
        <input placeholder="Pair with something you enjoy" value={d.attractive?.pair_with_enjoyment ?? ''} onChange={(e) => set('attractive', 'pair_with_enjoyment', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Reframe as identity-driven" value={d.attractive?.identity_reframe ?? ''} onChange={(e) => set('attractive', 'identity_reframe', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Temptation bundling" value={d.attractive?.temptation_bundling ?? ''} onChange={(e) => set('attractive', 'temptation_bundling', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
        <p className="text-[11px] text-gray-500 mt-0.5">Pair the habit with something you enjoy (e.g. podcast only while walking).</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">3. Make it easy</p>
        <input placeholder="Reduce friction" value={d.easy?.reduce_friction ?? ''} onChange={(e) => set('easy', 'reduce_friction', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="2-minute rule" value={d.easy?.two_minute_rule ?? ''} onChange={(e) => set('easy', 'two_minute_rule', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <p className="text-[11px] text-gray-500 mt-0.5">Start with a version that takes under 2 minutes so you can do it every day.</p>
        <input placeholder="Environment design" value={d.easy?.environment_design ?? ''} onChange={(e) => set('easy', 'environment_design', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">4. Make it satisfying</p>
        <input placeholder="Immediate reward" value={d.satisfying?.immediate_reward ?? ''} onChange={(e) => set('satisfying', 'immediate_reward', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Track streak" value={d.satisfying?.track_streak ?? ''} onChange={(e) => set('satisfying', 'track_streak', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm mb-1" />
        <input placeholder="Celebrate completion" value={d.satisfying?.celebrate_completion ?? ''} onChange={(e) => set('satisfying', 'celebrate_completion', e.target.value)} className="w-full h-9 px-3 rounded border border-gray-200 text-sm" />
      </div>
    </div>
  )
}
