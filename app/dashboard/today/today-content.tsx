'use client'

import React from 'react'
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns'
import { Share2, Check, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { GraduationPrompt } from '@/components/graduation-prompt'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export interface TodayContentHabit {
  id: string
  name: string
  identity: string | null
  identity_id: string | null
  two_minute_version: string | null
  implementation_intention: { time?: string; location?: string; behavior?: string } | null
  stack_context: string | null
  temptation_bundle: string | null
  time_of_day: string
  completed_today: boolean
  current_streak: number
  consecutive_misses: number
  total_completions: number
  missed_yesterday: boolean
  week_completion?: boolean[]
}

export interface TodayContentData {
  date: string
  days_since_last_visit: number
  habits: TodayContentHabit[]
}

export interface TodayContentProps {
  habits: TodayContentHabit[]
  todayDate: Date
  weekDates: Date[]
  completedCount: number
  remaining: number
  showWelcome: boolean
  showCelebration: boolean
  identityVoteSummary: Record<string, number> | null
  shareCopied: boolean
  sharePromptDismissed: boolean
  togglingId: string | null
  justCompletedId: string | null
  voteFeedback: { habitId: string; identity: string } | null
  showPastDays: boolean
  pastDaysDate: string | null
  pastDaysData: TodayContentData | null
  pastDaysLoading: boolean
  pastDaysTogglingId: string | null
  getLast7Days: () => string[]
  onShareCheckIn: () => void
  onDismissSharePrompt: () => void
  onDismissWelcome: () => void
  onDismissCelebration: () => void
  onToggle: (habit: TodayContentHabit) => void
  onPastDayToggle: (habit: TodayContentHabit, date: string) => void
  onTogglePastDays: () => void
  setPastDaysDate: (d: string | null) => void
}

export function TodayContent(props: TodayContentProps) {
  const {
    habits,
    todayDate,
    weekDates,
    completedCount,
    remaining,
    showWelcome,
    showCelebration,
    identityVoteSummary,
    shareCopied,
    sharePromptDismissed,
    togglingId,
    justCompletedId,
    voteFeedback,
    showPastDays,
    pastDaysDate,
    pastDaysData,
    pastDaysLoading,
    pastDaysTogglingId,
    getLast7Days,
    onShareCheckIn,
    onDismissSharePrompt,
    onDismissWelcome,
    onDismissCelebration,
    onToggle,
    onPastDayToggle,
    onTogglePastDays,
    setPastDaysDate,
  } = props

  return (
    <div className="bg-background min-h-screen -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Today
            </h1>
            <p className="font-body text-base text-foreground mt-0.5">
              {format(todayDate, 'EEEE, MMMM d')}
            </p>
          </div>
          <button
            type="button"
            onClick={onShareCheckIn}
            className="flex items-center gap-1.5 text-foreground hover:text-primary font-body text-sm font-medium shrink-0"
          >
            <Share2 className="w-4 h-4" />
            {shareCopied ? 'Copied' : 'Share'}
          </button>
        </div>
        {habits.length > 0 && (
          <>
            <p className="font-body text-foreground font-medium">
              {completedCount}/{habits.length} completed
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Never miss twice. One miss is fine, two breaks the streak.
            </p>
            <div className="flex gap-1 h-2 rounded-full bg-muted overflow-hidden">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    h.completed_today ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {completedCount} of {habits.length} completed
            </p>
          </>
        )}
      </div>

      {habits.length > 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
          <h2 className="font-heading font-semibold text-foreground mb-3">This Week</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDates.map((d, i) => {
              const isToday = isSameDay(d, todayDate)
              return (
                <div
                  key={d.toISOString()}
                  className={`shrink-0 flex flex-col items-center rounded-lg px-3 py-2 min-w-[56px] ${
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <span className="font-body text-xs font-semibold uppercase">
                    {format(d, 'EEE')}
                  </span>
                  <span className="font-heading text-lg font-bold">{format(d, 'd')}</span>
                  <div className="flex gap-0.5 mt-1.5">
                    {habits.map((_, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${
                          habits[j].week_completion?.[i]
                            ? isToday
                              ? 'bg-primary-foreground/80'
                              : 'bg-primary'
                            : 'bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {showWelcome && (
        <div className="rounded-2xl bg-card border border-primary/30 shadow-sm p-5 flex items-start justify-between gap-3 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden>👋</span>
            <div>
              <p className="font-heading font-semibold text-foreground">Welcome back.</p>
              <p className="font-body text-sm text-muted-foreground mt-0.5">
                Here&rsquo;s where things stand. Check in today.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissWelcome}
            className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {remaining === 0 && habits.length > 0 && habits.some((h) => h.total_completions >= 21) && (
        <GraduationPrompt
          habits={habits.map((h) => ({ habit_id: h.id, habit_name: h.name, total_completions: h.total_completions }))}
        />
      )}

      {showCelebration && identityVoteSummary && (
        <div className="rounded-2xl bg-card border border-primary/30 shadow-md p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="w-6 h-6" />
            </span>
            <div>
              <p className="font-heading font-bold text-foreground text-lg">All done for today!</p>
              <p className="font-body text-sm text-muted-foreground">
                You cast votes for your identities.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(identityVoteSummary)
              .filter(([, n]) => n > 0)
              .map(([identity, n]) => (
                <span
                  key={identity}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium font-body border border-border"
                >
                  <span className="text-primary">{n}×</span>
                  {identity}
                </span>
              ))}
          </div>
          {!sharePromptDismissed && (
            <div className="pt-4 border-t border-border space-y-3">
              <p className="font-body text-sm font-medium text-foreground">
                Share your check-in with your partner?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { onShareCheckIn(); onDismissSharePrompt(); }}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold font-body shadow-sm hover:opacity-90 transition-opacity"
                >
                  {shareCopied ? 'Copied' : 'Copy summary'}
                </button>
                <button
                  type="button"
                  onClick={onDismissSharePrompt}
                  className="h-10 px-4 rounded-lg border border-border text-sm font-medium font-body bg-card hover:bg-muted transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onDismissCelebration}
            className="font-body text-sm font-medium text-primary hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-8 text-center">
          <span className="text-4xl block mb-3" aria-hidden>📋</span>
          <p className="font-body font-medium text-foreground">No habits to track yet.</p>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Add habits from Identities or Habits to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className={`rounded-2xl bg-card border shadow-sm p-4 transition-all duration-200 hover:shadow-md ${
                h.completed_today
                  ? 'border-l-4 border-l-primary border-border'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(h)}
                  disabled={togglingId === h.id}
                  className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    justCompletedId === h.id ? 'animate-check-pop ' : ''
                  }${
                    h.completed_today
                      ? 'bg-primary text-primary-foreground'
                      : 'border-2 border-border hover:border-primary hover:bg-primary/10'
                  }`}
                  aria-label={h.completed_today ? 'Mark incomplete' : 'Mark complete'}
                >
                  {h.completed_today ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-heading font-semibold ${
                      h.completed_today ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {h.name}
                  </p>
                  {h.two_minute_version && (
                    <p className="font-body text-sm text-muted-foreground mt-0.5">
                      {h.two_minute_version}
                    </p>
                  )}
                  {h.stack_context && (
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{h.stack_context}</p>
                  )}
                  {h.consecutive_misses === 1 && !h.completed_today && (
                    <p className="font-body text-sm text-amber-700 mt-1.5">
                      You missed yesterday. Do it today and your streak continues.
                    </p>
                  )}
                  {voteFeedback?.habitId === h.id && voteFeedback?.identity && (
                    <p className="font-body text-sm font-medium text-primary mt-1">
                      +1 vote for &ldquo;{voteFeedback.identity}&rdquo;
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-body ${
                        h.current_streak > 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {h.current_streak > 0 && <Zap className="w-3 h-3" />}
                      {h.current_streak} day{h.current_streak !== 1 ? 's' : ''}
                    </span>
                    {h.total_completions > 0 && (
                      <span className="font-body text-xs text-muted-foreground">
                        {h.total_completions} total
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {WEEKDAY_LETTERS.map((letter, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <span className="font-body text-[10px] text-muted-foreground">{letter}</span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            h.week_completion?.[i] ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          {h.week_completion?.[i] ? (
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {habits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
          <button
            type="button"
            onClick={onTogglePastDays}
            className="flex items-center justify-between w-full font-body text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Edit past days
            {showPastDays ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showPastDays && (
            <div className="mt-4 space-y-3">
              <p className="font-body text-xs text-muted-foreground">
                Select a date (last 7 days) to mark habits complete or incomplete.
              </p>
              <div className="flex flex-wrap gap-2">
                {getLast7Days().map((d) => {
                  const dt = new Date(d + 'T12:00:00')
                  const today = new Date()
                  const diff = Math.floor(
                    (today.getTime() - dt.getTime()) / (24 * 60 * 60 * 1000)
                  )
                  const label =
                    diff === 1 ? 'Yesterday' : diff <= 7 ? `${diff} days ago` : d
                  const isSelected = pastDaysDate === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPastDaysDate(d)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium font-body transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {pastDaysDate && (
                <div className="border-t border-border pt-3">
                  {pastDaysLoading ? (
                    <p className="font-body text-sm text-muted-foreground">Loading…</p>
                  ) : pastDaysData ? (
                    <ul className="space-y-2">
                      {pastDaysData.habits.map((habit) => (
                        <li
                          key={habit.id}
                          className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0"
                        >
                          <span className="font-body text-sm text-foreground">
                            {habit.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => onPastDayToggle(habit, pastDaysDate)}
                            disabled={pastDaysTogglingId === habit.id}
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              habit.completed_today
                                ? 'bg-primary text-primary-foreground'
                                : 'border-2 border-border hover:border-primary'
                            }`}
                            aria-label={
                              habit.completed_today ? 'Mark incomplete' : 'Mark complete'
                            }
                          >
                            {habit.completed_today ? (
                              <Check className="w-4 h-4" strokeWidth={3} />
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
