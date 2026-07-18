import { useEffect, useMemo, useState } from 'react'
import {
  applyPeriodResets,
  createActivityId,
  loadContent,
  saveContent,
  type ContentActivity,
  type ContentCadence,
  type ContentState,
} from '../lib/content'
import { ItemSearch, type ItemSearchHit } from './ItemSearch'
import { Tooltip } from './Tooltip'

type ContentMode = 'edit' | 'view'

function clampMax(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(99, Math.floor(value)))
}

function RunButtons({
  activity,
  onSetRuns,
}: {
  activity: ContentActivity
  onSetRuns: (runs: number) => void
}) {
  return (
    <div
      className="content-run-buttons"
      role="group"
      aria-label={`${activity.title} runs`}
    >
      {Array.from({ length: activity.maxRuns }, (_, i) => {
        const value = i + 1
        const filled = activity.runs >= value
        return (
          <button
            key={value}
            type="button"
            className={`content-run-btn${filled ? ' is-filled' : ''}`}
            aria-pressed={filled}
            aria-label={`Mark ${value} of ${activity.maxRuns} runs`}
            onClick={() =>
              onSetRuns(activity.runs === value ? value - 1 : value)
            }
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

function ActivityTrackCard({
  activity,
  onSetRuns,
}: {
  activity: ContentActivity
  onSetRuns: (runs: number) => void
}) {
  const done = activity.runs >= activity.maxRuns
  return (
    <article className={`content-track-card${done ? ' is-done' : ''}`}>
      <div className="content-track-head">
        <div className="content-track-copy">
          {activity.url ? (
            <a
              className="content-track-title"
              href={activity.url}
              target="_blank"
              rel="noreferrer"
            >
              {activity.title}
            </a>
          ) : (
            <span className="content-track-title">{activity.title}</span>
          )}
          <p className="content-track-count">
            {activity.runs} / {activity.maxRuns}
          </p>
        </div>
      </div>
      <RunButtons activity={activity} onSetRuns={onSetRuns} />
    </article>
  )
}

export function ContentPage() {
  const [state, setState] = useState<ContentState>(() => loadContent())
  const [mode, setMode] = useState<ContentMode>(() =>
    loadContent().activities.length > 0 ? 'view' : 'edit',
  )
  const [draftTitle, setDraftTitle] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [draftCadence, setDraftCadence] = useState<ContentCadence>('daily')
  const [draftMax, setDraftMax] = useState('1')
  const [formError, setFormError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)

  useEffect(() => {
    setState((prev) => applyPeriodResets(prev))
  }, [])

  useEffect(() => {
    saveContent(state)
  }, [state])

  const daily = useMemo(
    () => state.activities.filter((a) => a.cadence === 'daily'),
    [state.activities],
  )
  const weekly = useMemo(
    () => state.activities.filter((a) => a.cadence === 'weekly'),
    [state.activities],
  )

  function selectActivity(item: ItemSearchHit) {
    setDraftTitle(item.title)
    setDraftUrl(item.url)
    setFormError(null)
  }

  function addActivity() {
    const title = draftTitle.trim()
    if (!title) {
      setFormError('Search or type an activity name.')
      return
    }
    const maxRuns = clampMax(Number(draftMax))
    const activity: ContentActivity = {
      id: createActivityId(),
      title,
      url:
        draftUrl.trim() ||
        `https://wiki.mabinogiworld.com/view/${encodeURIComponent(
          title.replace(/ /g, '_'),
        )}`,
      cadence: draftCadence,
      maxRuns,
      runs: 0,
    }
    setState((prev) => ({
      ...prev,
      activities: [...prev.activities, activity],
    }))
    setDraftTitle('')
    setDraftUrl('')
    setDraftMax('1')
    setSearchKey((key) => key + 1)
    setFormError(null)
  }

  function removeActivity(id: string) {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }))
  }

  function updateMaxRuns(id: string, maxRuns: number) {
    const nextMax = clampMax(maxRuns)
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.id === id
          ? { ...a, maxRuns: nextMax, runs: Math.min(a.runs, nextMax) }
          : a,
      ),
    }))
  }

  function setRuns(id: string, runs: number) {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.id === id
          ? { ...a, runs: Math.max(0, Math.min(a.maxRuns, runs)) }
          : a,
      ),
    }))
  }

  function saveAndTrack() {
    if (state.activities.length === 0) {
      setFormError('Add at least one activity before saving.')
      return
    }
    setFormError(null)
    setMode('view')
  }

  function EditList({
    title,
    rows,
  }: {
    title: string
    rows: ContentActivity[]
  }) {
    return (
      <section className="content-section">
        <h3 className="content-section-title">{title}</h3>
        {rows.length === 0 ? (
          <p className="content-empty">None yet.</p>
        ) : (
          <ul className="content-edit-list">
            {rows.map((activity) => (
              <li key={activity.id}>
                <div className="content-edit-main">
                  {activity.url ? (
                    <a
                      href={activity.url}
                      target="_blank"
                      rel="noreferrer"
                      className="content-edit-title"
                    >
                      {activity.title}
                    </a>
                  ) : (
                    <span className="content-edit-title">{activity.title}</span>
                  )}
                  <label className="content-max-field">
                    <span className="sr-only">Times to run</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={activity.maxRuns}
                      onChange={(e) =>
                        updateMaxRuns(activity.id, Number(e.target.value))
                      }
                    />
                    <span aria-hidden>×</span>
                  </label>
                </div>
                <Tooltip content="Remove activity">
                  <button
                    type="button"
                    className="btn ghost compact"
                    onClick={() => removeActivity(activity.id)}
                  >
                    ×
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <section className={`panel content-page${mode === 'view' ? ' is-view' : ''}`}>
      <header className="panel-header form-header-row">
        <div>
          <h2>Content</h2>
          <p>
            {mode === 'edit'
              ? 'Add daily and weekly activities, then save to track runs.'
              : 'Mark how many times you’ve cleared each activity.'}
          </p>
        </div>
        <div className="builds-header-actions">
          {mode === 'edit' ? (
            <Tooltip content="Save and track progress">
              <button
                type="button"
                className="btn primary compact"
                onClick={saveAndTrack}
              >
                Save
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Edit activities">
              <button
                type="button"
                className="btn ghost compact"
                onClick={() => setMode('edit')}
              >
                Edit
              </button>
            </Tooltip>
          )}
        </div>
      </header>

      {mode === 'edit' ? (
        <>
          <div className="content-add-form">
            <ItemSearch
              key={searchKey}
              id="content-activity-search"
              label="Activity"
              hideLabel
              onSelect={selectActivity}
              onQueryChange={(q) => {
                setDraftTitle(q)
                if (!q.trim()) setDraftUrl('')
                setFormError(null)
              }}
              placeholder="Search activity…"
              allowCustom
              emptyMessage="No wiki pages matched. Press Enter to use what you typed."
            />
            <div
              className="content-cadence"
              role="group"
              aria-label="Daily or weekly"
            >
              <button
                type="button"
                className={`btn ghost compact${
                  draftCadence === 'daily' ? ' active' : ''
                }`}
                aria-pressed={draftCadence === 'daily'}
                onClick={() => setDraftCadence('daily')}
              >
                Daily
              </button>
              <button
                type="button"
                className={`btn ghost compact${
                  draftCadence === 'weekly' ? ' active' : ''
                }`}
                aria-pressed={draftCadence === 'weekly'}
                onClick={() => setDraftCadence('weekly')}
              >
                Weekly
              </button>
            </div>
            <label className="content-max-field content-max-draft">
              <span className="sr-only">Times to run</span>
              <input
                type="number"
                min={1}
                max={99}
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
              />
              <span>runs</span>
            </label>
            <button
              type="button"
              className="btn primary compact"
              onClick={addActivity}
            >
              Add
            </button>
          </div>
          {formError ? <p className="field-error">{formError}</p> : null}

          <div className="content-columns">
            <EditList title="Daily" rows={daily} />
            <EditList title="Weekly" rows={weekly} />
          </div>
        </>
      ) : (
        <div className="content-columns">
          <section className="content-section">
            <h3 className="content-section-title">Daily</h3>
            {daily.length === 0 ? (
              <p className="content-empty">No daily activities.</p>
            ) : (
              <div className="content-track-list">
                {daily.map((activity) => (
                  <ActivityTrackCard
                    key={activity.id}
                    activity={activity}
                    onSetRuns={(runs) => setRuns(activity.id, runs)}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="content-section">
            <h3 className="content-section-title">Weekly</h3>
            {weekly.length === 0 ? (
              <p className="content-empty">No weekly activities.</p>
            ) : (
              <div className="content-track-list">
                {weekly.map((activity) => (
                  <ActivityTrackCard
                    key={activity.id}
                    activity={activity}
                    onSetRuns={(runs) => setRuns(activity.id, runs)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
