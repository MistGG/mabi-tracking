import { useMemo, useState } from 'react'
import type { DailyProfit } from '../types'
import { estimateGoal, formatGoalEndDate } from '../lib/goals'
import { formatGold, parseNumberInput } from '../lib/finance'
import {
  loadGoalAmount,
  loadGoalMinimized,
  saveGoalAmount,
  saveGoalMinimized,
} from '../lib/storage'

type Props = {
  currentNet: number
  dailyProfits: DailyProfit[]
}

export function GoalPanel({ currentNet, dailyProfits }: Props) {
  const [goalInput, setGoalInput] = useState(() => {
    const saved = loadGoalAmount()
    return saved != null ? formatGold(saved) : ''
  })
  const [minimized, setMinimized] = useState(loadGoalMinimized)

  const target = parseNumberInput(goalInput)
  const estimate = useMemo(
    () =>
      Number.isFinite(target) && target > 0
        ? estimateGoal(target, currentNet, dailyProfits)
        : null,
    [target, currentNet, dailyProfits],
  )

  function commitGoal(raw: string) {
    const n = parseNumberInput(raw)
    if (Number.isFinite(n) && n > 0) {
      saveGoalAmount(n)
      setGoalInput(formatGold(n))
    } else {
      saveGoalAmount(null)
      setGoalInput('')
    }
  }

  function toggleMinimized() {
    setMinimized((prev) => {
      const next = !prev
      saveGoalMinimized(next)
      return next
    })
  }

  const etaSummary = estimate
    ? estimate.reached
      ? 'Goal reached'
      : estimate.daysNeeded != null && estimate.endDate
        ? `${estimate.daysNeeded} day${
            estimate.daysNeeded === 1 ? '' : 's'
          } · ${formatGoalEndDate(estimate.endDate)}`
        : 'ETA unavailable'
    : 'Set a target'

  return (
    <section
      className={`panel goal-panel${minimized ? ' goal-minimized' : ''}`}
    >
      <header className="panel-header form-header-row">
        <div>
          <h2>Goal</h2>
          {!minimized && (
            <p>Set a net gold target. ETA uses your recent daily average.</p>
          )}
        </div>
        <button
          type="button"
          className="btn ghost compact"
          onClick={toggleMinimized}
          aria-expanded={!minimized}
          aria-controls="goal-body"
        >
          {minimized ? 'Expand' : 'Minimize'}
        </button>
      </header>

      {minimized ? (
        <div id="goal-body" className="goal-compact">
          {estimate ? (
            <>
              <div className="goal-compact-main">
                <strong>
                  {Math.round(estimate.progress * 100)}%
                  <span className="goal-stat-of">
                    {' '}
                    · {formatGold(estimate.current)} /{' '}
                    {formatGold(estimate.target)}
                  </span>
                </strong>
                <span className="goal-compact-eta">{etaSummary}</span>
              </div>
              <div
                className="goal-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(estimate.progress * 100)}
              >
                <div
                  className="goal-bar-fill"
                  style={{ width: `${estimate.progress * 100}%` }}
                />
              </div>
              <span className="goal-stat-sub">
                {estimate.reached
                  ? 'Goal reached'
                  : `${formatGold(estimate.remaining)} remaining`}
              </span>
            </>
          ) : (
            <p className="goal-compact-empty">
              No target set. Expand to choose a goal amount.
            </p>
          )}
        </div>
      ) : (
        <div id="goal-body" className="goal-grid">
          <div className="field">
            <label htmlFor="goal-amount">Target net gold</label>
            <input
              id="goal-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 10,000,000"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onBlur={(e) => commitGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
            />
          </div>

          {estimate ? (
            <>
              <div className="goal-stat">
                <span className="goal-stat-label">Progress</span>
                <strong className="goal-stat-value">
                  {formatGold(estimate.current)}
                  <span className="goal-stat-of">
                    {' '}
                    / {formatGold(estimate.target)}
                  </span>
                </strong>
                <div
                  className="goal-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(estimate.progress * 100)}
                >
                  <div
                    className="goal-bar-fill"
                    style={{ width: `${estimate.progress * 100}%` }}
                  />
                </div>
                <span className="goal-stat-sub">
                  {Math.round(estimate.progress * 100)}% ·{' '}
                  {estimate.reached
                    ? 'Goal reached'
                    : `${formatGold(estimate.remaining)} remaining`}
                </span>
              </div>

              <div className="goal-stat">
                <span className="goal-stat-label">Avg daily net</span>
                <strong className="goal-stat-value">
                  {estimate.sampleDays > 0
                    ? formatGold(estimate.avgDailyNet)
                    : '—'}
                </strong>
                <span className="goal-stat-sub">
                  {estimate.sampleDays > 0
                    ? `from last ${estimate.sampleDays} day${
                        estimate.sampleDays === 1 ? '' : 's'
                      } with sales`
                    : 'Log some sold sales to estimate pace'}
                </span>
              </div>

              <div className="goal-stat">
                <span className="goal-stat-label">
                  {estimate.reached ? 'Status' : 'ETA'}
                </span>
                <strong className="goal-stat-value">
                  {estimate.reached
                    ? 'Done'
                    : estimate.daysNeeded != null
                      ? `${estimate.daysNeeded} day${
                          estimate.daysNeeded === 1 ? '' : 's'
                        }`
                      : '—'}
                </strong>
                <span className="goal-stat-sub">
                  {estimate.reached
                    ? 'Keep logging to raise the next target'
                    : estimate.endDate
                      ? `Around ${formatGoalEndDate(estimate.endDate)}`
                      : 'Need a positive daily average to project'}
                </span>
              </div>
            </>
          ) : (
            <div className="goal-empty">
              <p>
                Enter a target above to see progress and an estimated finish
                date.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
