import { useEffect, useMemo, useState } from 'react'
import {
  buildHasContent,
  buildShareUrl,
  emptyBuild,
  emptyReforgeFlags,
  emptySlotState,
  loadBuild,
  readSharedBuildFromHash,
  resolveBuildItemImage,
  needsBuildItemImageBackfill,
  saveBuild,
  type PersonalizedBuild,
  type ReforgePriority,
} from '../lib/builds'
import {
  fetchManyEnchantDropSources,
  type EnchantDropSource,
  type WikiInlineSegment,
} from '../lib/enchantDrops'
import {
  fetchMabibaseItemImage,
  searchMabibaseEnchants,
  searchMabibaseItems,
} from '../lib/mabibase'
import {
  ALL_ECHOSTONE_AWAKENINGS,
  ALL_REFORGES,
  BUILD_SLOTS,
  detectEchostoneColor,
  getSlotDef,
  type BuildSlotId,
  formatReforgeLabel,
  reforgesForSlot,
  resolveReforgeLabel,
  searchEchostoneItems,
} from '../lib/reforges'
import { ItemSearch, type ItemSearchHit } from './ItemSearch'
import { ReforgePicker } from './ReforgePicker'
import { Tooltip } from './Tooltip'

type BuildMode = 'edit' | 'view'

function initialBuild(): PersonalizedBuild {
  return readSharedBuildFromHash() ?? loadBuild()
}

function locationPlainText(segments: WikiInlineSegment[]): string {
  return segments.map((s) => s.text).join('')
}

function WikiInlineText({ segments }: { segments: WikiInlineSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={`${seg.href}-${i}`}
            className="build-farm-inline-link"
            href={seg.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {seg.text}
          </a>
        ) : (
          <span key={`t-${i}`}>{seg.text}</span>
        ),
      )}
    </>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path
        d="M3.2 8.2 6.4 11.4 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function YieldIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path
        d="M8 13.2V7.4M8 7.4c0-2.2 1.5-3.8 3.6-4.2-.2 2.4-1.4 3.8-3.6 4.2Zm0 0c0-2.2-1.5-3.8-3.6-4.2.2 2.4 1.4 3.8 3.6 4.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 13.2h5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PriorityBadge({
  priority,
  selected,
  interactive,
  onClick,
}: {
  priority: ReforgePriority
  selected?: boolean
  interactive?: boolean
  onClick?: () => void
}) {
  const className = `reforge-priority p${priority}${
    selected ? ' is-selected' : ''
  }${interactive ? ' is-interactive' : ''}`
  const label = <span className="badge-glyph">{priority}</span>
  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={Boolean(selected)}
        aria-label={`Priority ${priority}`}
        onClick={onClick}
      >
        {label}
      </button>
    )
  }
  return (
    <span className={className} aria-label={`Priority ${priority}`}>
      {label}
    </span>
  )
}

function EnchantKindBadge({ kind }: { kind: 'P' | 'S' }) {
  return (
    <span
      className={`enchant-kind k${kind}`}
      aria-label={kind === 'P' ? 'Prefix' : 'Suffix'}
      title={kind === 'P' ? 'Prefix' : 'Suffix'}
    >
      <span className="badge-glyph">{kind}</span>
    </span>
  )
}

function FlagButton({
  pressed,
  label,
  tip,
  yieldStyle,
  onClick,
}: {
  pressed: boolean
  label: string
  tip: string
  yieldStyle?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip content={tip} wide={yieldStyle}>
      <button
        type="button"
        className={`build-flag${yieldStyle ? ' yield' : ''}${
          pressed ? ' is-on' : ''
        }`}
        aria-pressed={pressed}
        aria-label={label}
        onClick={onClick}
      >
        {yieldStyle ? <YieldIcon /> : <CheckIcon />}
      </button>
    </Tooltip>
  )
}

export function BuildsPage() {
  const [build, setBuild] = useState<PersonalizedBuild>(initialBuild)
  const [mode, setMode] = useState<BuildMode>(() => {
    const shared = readSharedBuildFromHash()
    if (shared) return 'view'
    return buildHasContent(loadBuild()) ? 'view' : 'edit'
  })
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [farmByEnchant, setFarmByEnchant] = useState<
    Record<string, EnchantDropSource>
  >({})
  const [farmLoading, setFarmLoading] = useState(false)
  const [farmOpenKey, setFarmOpenKey] = useState<string | null>(null)

  const enchantNamesKey = useMemo(() => {
    const names: string[] = []
    for (const slot of BUILD_SLOTS) {
      for (const enchant of build.slots[slot.id].enchants) {
        if (enchant?.title) names.push(enchant.title)
      }
    }
    return [...new Set(names)].sort().join('|')
  }, [build.slots])

  const farmEnchants = useMemo(() => {
    if (!enchantNamesKey) return []
    return enchantNamesKey
      .split('|')
      .filter(Boolean)
      .map((name) => {
        const source = farmByEnchant[name.toLowerCase()]
        return {
          name,
          wikiUrl: source?.wikiUrl ?? `https://wiki.mabinogiworld.com/view/${encodeURIComponent(name.replace(/ /g, '_'))}`,
          locations: source?.locations ?? [],
        }
      })
  }, [enchantNamesKey, farmByEnchant])

  useEffect(() => {
    if (!enchantNamesKey) setFarmOpenKey(null)
  }, [enchantNamesKey])

  useEffect(() => {
    saveBuild(build)
  }, [build])

  useEffect(() => {
    if (mode !== 'view' || !enchantNamesKey) {
      setFarmByEnchant({})
      setFarmLoading(false)
      return
    }

    const names = enchantNamesKey.split('|').filter(Boolean)
    const controller = new AbortController()
    setFarmLoading(true)

    void fetchManyEnchantDropSources(names, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return
        const next: Record<string, EnchantDropSource> = {}
        for (const row of rows) {
          next[row.enchantName.toLowerCase()] = row
        }
        setFarmByEnchant(next)
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setFarmByEnchant({})
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setFarmLoading(false)
      })

    return () => controller.abort()
  }, [mode, enchantNamesKey])

  useEffect(() => {
    const onHash = () => {
      const shared = readSharedBuildFromHash()
      if (shared) {
        setBuild(shared)
        setMode('view')
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const iconBackfillKey = useMemo(
    () =>
      BUILD_SLOTS.map((slot) => {
        const item = build.slots[slot.id].item
        if (!item || !needsBuildItemImageBackfill(item)) return ''
        return `${slot.id}:${item.title}`
      }).join('|'),
    [build.slots],
  )

  useEffect(() => {
    if (!iconBackfillKey) return

    const controllers: AbortController[] = []

    for (const slot of BUILD_SLOTS) {
      const item = build.slots[slot.id].item
      if (!item || !needsBuildItemImageBackfill(item)) continue

      const resolved = resolveBuildItemImage(item)
      if (resolved && resolved !== item.imageUrl) {
        setBuild((prev) => {
          const current = prev.slots[slot.id].item
          if (!current || current.title !== item.title) return prev
          if (current.imageUrl === resolved) return prev
          return {
            ...prev,
            slots: {
              ...prev.slots,
              [slot.id]: {
                ...prev.slots[slot.id],
                item: { ...current, imageUrl: resolved },
              },
            },
          }
        })
        continue
      }
      if (resolved) continue

      const controller = new AbortController()
      controllers.push(controller)
      const title = item.title
      const slotId = slot.id

      void fetchMabibaseItemImage(title, controller.signal)
        .then((imageUrl) => {
          if (!imageUrl || controller.signal.aborted) return
          setBuild((prev) => {
            const current = prev.slots[slotId].item
            if (!current || current.title !== title) return prev
            if (current.imageUrl === imageUrl) return prev
            return {
              ...prev,
              slots: {
                ...prev.slots,
                [slotId]: {
                  ...prev.slots[slotId],
                  item: { ...current, imageUrl },
                },
              },
            }
          })
        })
        .catch(() => {
          // ignore fetch failures
        })
    }

    return () => {
      for (const controller of controllers) controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconBackfillKey])

  const optionsBySlot = useMemo(() => {
    const map = {} as Record<BuildSlotId, ReturnType<typeof reforgesForSlot>>
    for (const slot of BUILD_SLOTS) {
      map[slot.id] = reforgesForSlot(
        slot.id,
        build.slots[slot.id].item?.title,
      )
    }
    return map
  }, [build.slots])

  const reforgeById = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of ALL_REFORGES) {
      map.set(option.id, formatReforgeLabel(option))
    }
    for (const option of ALL_ECHOSTONE_AWAKENINGS) {
      map.set(option.id, formatReforgeLabel(option))
    }
    return map
  }, [])

  function updateSlot(
    slotId: BuildSlotId,
    patch: Partial<PersonalizedBuild['slots'][BuildSlotId]>,
  ) {
    setBuild((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slotId]: {
          ...prev.slots[slotId],
          ...patch,
        },
      },
    }))
  }

  function setItem(slotId: BuildSlotId, item: ItemSearchHit) {
    const slot = getSlotDef(slotId)
    setBuild((prev) => {
      const current = prev.slots[slotId]
      const nextItem = {
        title: item.title,
        url: item.url,
        ...(item.imageUrl
          ? { imageUrl: item.imageUrl }
          : (() => {
              const resolved = resolveBuildItemImage({
                title: item.title,
                url: item.url,
              })
              return resolved ? { imageUrl: resolved } : {}
            })()),
      }
      let reforgeIds = current.reforgeIds
      let reforgeFlags = current.reforgeFlags
      let enchants = current.enchants

      if (slot.reforgeCount === 0) {
        reforgeIds = [null, null, null]
        reforgeFlags = [
          emptyReforgeFlags(),
          emptyReforgeFlags(),
          emptyReforgeFlags(),
        ]
      } else if (slot.kind === 'echostone') {
        const prevColor = detectEchostoneColor(current.item?.title)
        const nextColor = detectEchostoneColor(item.title)
        if (prevColor !== nextColor) {
          reforgeIds = [null, null, null]
          reforgeFlags = [
            emptyReforgeFlags(),
            emptyReforgeFlags(),
            emptyReforgeFlags(),
          ]
        } else {
          reforgeIds = [current.reforgeIds[0], null, null]
          reforgeFlags = [
            current.reforgeFlags[0],
            emptyReforgeFlags(),
            emptyReforgeFlags(),
          ]
        }
      }

      if (!slot.canEnchant) {
        enchants = [null, null]
      }

      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotId]: {
            ...current,
            item: nextItem,
            reforgeIds,
            reforgeFlags,
            enchants,
          },
        },
      }
    })

    if (item.imageUrl) return

    void fetchMabibaseItemImage(item.title)
      .then((imageUrl) => {
        if (!imageUrl) return
        setBuild((prev) => {
          const current = prev.slots[slotId].item
          if (!current || current.title !== item.title) return prev
          return {
            ...prev,
            slots: {
              ...prev.slots,
              [slotId]: {
                ...prev.slots[slotId],
                item: { ...current, imageUrl },
              },
            },
          }
        })
      })
      .catch(() => {
        // ignore fetch failures
      })
  }

  function setReforge(
    slotId: BuildSlotId,
    index: 0 | 1 | 2,
    reforgeId: string | null,
  ) {
    const slot = getSlotDef(slotId)
    if (index >= slot.reforgeCount) return
    setBuild((prev) => {
      const current = prev.slots[slotId]
      const nextIds = [...current.reforgeIds] as [
        string | null,
        string | null,
        string | null,
      ]
      nextIds[index] = reforgeId
      if (slot.reforgeCount === 1) {
        nextIds[1] = null
        nextIds[2] = null
      }
      const nextFlags = current.reforgeFlags.map((flags, i) => {
        if (i === index && !reforgeId) {
          return { complete: false, inheritable: false, priority: null }
        }
        if (slot.reforgeCount === 1 && i > 0) return emptyReforgeFlags()
        return flags
      }) as typeof current.reforgeFlags
      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotId]: {
            ...current,
            reforgeIds: nextIds,
            reforgeFlags: nextFlags,
          },
        },
      }
    })
  }

  function setEnchant(
    slotId: BuildSlotId,
    index: 0 | 1,
    hit: ItemSearchHit | null,
  ) {
    if (!getSlotDef(slotId).canEnchant) return
    setBuild((prev) => {
      const current = prev.slots[slotId]
      const nextEnchants = [...current.enchants] as typeof current.enchants
      nextEnchants[index] = hit
        ? {
            title: hit.title,
            url: `https://wiki.mabinogiworld.com/view/${encodeURIComponent(
              hit.title.replace(/ /g, '_'),
            )}`,
            complete: false,
            inheritable: false,
          }
        : null
      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotId]: { ...current, enchants: nextEnchants },
        },
      }
    })
  }

  function toggleReforgeFlag(
    slotId: BuildSlotId,
    index: 0 | 1 | 2,
    key: 'complete' | 'inheritable',
  ) {
    if (key === 'inheritable' && !getSlotDef(slotId).canInherit) return
    setBuild((prev) => {
      const current = prev.slots[slotId]
      const nextFlags = current.reforgeFlags.map((flags, i) =>
        i === index ? { ...flags, [key]: !flags[key] } : flags,
      ) as typeof current.reforgeFlags
      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotId]: { ...current, reforgeFlags: nextFlags },
        },
      }
    })
  }

  function toggleEnchantFlag(
    slotId: BuildSlotId,
    index: 0 | 1,
    key: 'complete' | 'inheritable',
  ) {
    if (key === 'inheritable' && !getSlotDef(slotId).canInherit) return
    setBuild((prev) => {
      const current = prev.slots[slotId]
      const enchant = current.enchants[index]
      if (!enchant) return prev
      const nextEnchants = [...current.enchants] as typeof current.enchants
      nextEnchants[index] = { ...enchant, [key]: !enchant[key] }
      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotId]: { ...current, enchants: nextEnchants },
        },
      }
    })
  }

  function setReforgePriority(
    slotId: BuildSlotId,
    index: 0 | 1 | 2,
    priority: ReforgePriority,
  ) {
    if (index >= getSlotDef(slotId).reforgeCount) return
    setBuild((prev) => {
      const current = prev.slots[slotId]
      const currentPriority = current.reforgeFlags[index].priority
      const next = currentPriority === priority ? null : priority
      const nextFlags = current.reforgeFlags.map((flags, i) =>
        i === index ? { ...flags, priority: next } : flags,
      ) as typeof current.reforgeFlags
      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotId]: { ...current, reforgeFlags: nextFlags },
        },
      }
    })
  }

  function clearSlot(slotId: BuildSlotId) {
    updateSlot(slotId, emptySlotState())
  }

  function resetBuild() {
    if (!window.confirm('Clear this personalized build?')) return
    setBuild(emptyBuild(build.name))
    setMode('edit')
    window.location.hash = '#/builds'
  }

  async function shareBuild() {
    const shareUrl = buildShareUrl(build)
    window.history.replaceState(null, '', shareUrl)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus('Link copied')
    } catch {
      window.prompt('Copy this build link:', shareUrl)
      setShareStatus(null)
    }
    window.setTimeout(() => setShareStatus(null), 2200)
  }

  return (
    <section
      className={`panel builds-page${mode === 'view' ? ' is-view' : ''}`}
    >
      <header className="panel-header form-header-row">
        <div>
          <h2>{build.name.trim() || 'Personalized builds'}</h2>
          <p>
            {mode === 'edit'
              ? 'Pick gear and reforges, then save to track progress.'
              : 'Mark gear and reforges complete or inheritable as you go.'}
          </p>
        </div>
        <div className="build-actions">
          {shareStatus && (
            <span className="build-share-status" role="status">
              {shareStatus}
            </span>
          )}
          {mode === 'edit' ? (
            <Tooltip content="Switch to the readable progress view">
              <button
                type="button"
                className="btn compact"
                onClick={() => setMode('view')}
              >
                Save
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Edit gear and reforges">
              <button
                type="button"
                className="btn ghost compact"
                onClick={() => setMode('edit')}
              >
                Edit
              </button>
            </Tooltip>
          )}
          <Tooltip content="Copy a link that loads this build">
            <button
              type="button"
              className="btn ghost compact"
              onClick={shareBuild}
            >
              Share
            </button>
          </Tooltip>
          <Tooltip content="Clear every slot in this build">
            <button
              type="button"
              className="btn ghost compact"
              onClick={resetBuild}
            >
              Clear
            </button>
          </Tooltip>
        </div>
      </header>

      {mode === 'edit' ? (
        <>
          <div className="build-toolbar">
            <div className="field build-name-field field-compact">
              <label htmlFor="build-name" className="sr-only">
                Build name
              </label>
              <Tooltip content="Name shown when you share this build" wide>
                <input
                  id="build-name"
                  type="text"
                  autoComplete="off"
                  placeholder="Build name"
                  value={build.name}
                  onChange={(e) =>
                    setBuild((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </Tooltip>
            </div>
            <p className="build-toolbar-note">
              <Tooltip content="Open the wiki reforge full list">
                <a
                  href="https://wiki.mabinogiworld.com/view/Reforge/Full_List"
                  target="_blank"
                  rel="noreferrer"
                >
                  Reforge list
                </a>
              </Tooltip>
              <span aria-hidden> · </span>
              <Tooltip content="Open echostone color pages">
                <a
                  href="https://wiki.mabinogiworld.com/view/Echostone"
                  target="_blank"
                  rel="noreferrer"
                >
                  Echostones
                </a>
              </Tooltip>
            </p>
          </div>

          <div className="build-table-wrap">
            <table className="build-table">
              <thead>
                <tr>
                  <th scope="col">
                    <Tooltip content="Equipment slot">Slot</Tooltip>
                  </th>
                  <th scope="col">
                    <Tooltip content="Search Mabibase for gear">Item</Tooltip>
                  </th>
                  <th scope="col">
                    <Tooltip content="First reforge / echostone awakening">
                      Reforge 1
                    </Tooltip>
                  </th>
                  <th scope="col">
                    <Tooltip content="Second reforge line">Reforge 2</Tooltip>
                  </th>
                  <th scope="col">
                    <Tooltip content="Third reforge line">Reforge 3</Tooltip>
                  </th>
                  <th scope="col">
                    <Tooltip content="Prefix enchant">Prefix</Tooltip>
                  </th>
                  <th scope="col">
                    <Tooltip content="Suffix enchant">Suffix</Tooltip>
                  </th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {BUILD_SLOTS.map((slot) => {
                  const state = build.slots[slot.id]
                  const options = optionsBySlot[slot.id]
                  const isEchostone = slot.kind === 'echostone'
                  const echoColor = isEchostone
                    ? detectEchostoneColor(state.item?.title)
                    : null
                  const filled =
                    Boolean(state.item) ||
                    state.reforgeIds.some(Boolean) ||
                    state.enchants.some(Boolean)
                  return (
                    <tr
                      key={slot.id}
                      className={filled ? 'build-row-filled' : undefined}
                    >
                      <th scope="row" className="build-slot-cell">
                        <div className="build-slot-inner">
                          {state.item ? (
                            <Tooltip
                              content={`Open ${state.item.title} on Mabibase`}
                              wide
                            >
                              <a
                                className="build-slot-icon"
                                href={state.item.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {state.item.imageUrl ? (
                                  <img
                                    src={state.item.imageUrl}
                                    alt=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="item-fallback sm" aria-hidden>
                                    ◆
                                  </div>
                                )}
                              </a>
                            </Tooltip>
                          ) : (
                            <div className="build-slot-icon" aria-hidden>
                              <div className="build-slot-icon-empty" />
                            </div>
                          )}
                          <span className="build-slot-label">{slot.label}</span>
                        </div>
                      </th>
                      <td className="build-item-cell">
                        <ItemSearch
                          id={`build-item-${slot.id}`}
                          label={`${slot.label} item`}
                          hideLabel
                          selectedTitle={state.item?.title}
                          onSelect={(item) => setItem(slot.id, item)}
                          placeholder={
                            isEchostone
                              ? 'Pick echostone color…'
                              : slot.kind === 'wing'
                                ? 'Wing…'
                                : 'Item…'
                          }
                          searchFn={
                            isEchostone
                              ? searchEchostoneItems
                              : searchMabibaseItems
                          }
                          sourceHint={isEchostone ? 'color' : 'mabibase'}
                          errorMessage={
                            isEchostone
                              ? 'Could not load echostone colors.'
                              : 'Could not reach Mabibase. Try again.'
                          }
                          emptyMessage={
                            isEchostone
                              ? 'No matching echostone color.'
                              : 'No Mabibase items matched that name.'
                          }
                          minQueryLength={isEchostone ? 0 : 2}
                        />
                      </td>
                      {([0, 1, 2] as const).map((index) => {
                        if (index >= slot.reforgeCount) {
                          return (
                            <td
                              key={`${slot.id}-r${index}`}
                              className="build-reforge-cell is-na"
                            >
                              <span className="build-cell-na" aria-hidden>
                                —
                              </span>
                            </td>
                          )
                        }

                        const reforgeId = state.reforgeIds[index]
                        const priority = state.reforgeFlags[index].priority
                        const tip = isEchostone
                          ? !echoColor
                            ? 'Pick a colored echostone first'
                            : reforgeId
                              ? resolveReforgeLabel(reforgeId, reforgeById)
                              : `Search ${echoColor.toLowerCase()} echostone awakenings`
                          : reforgeId
                            ? resolveReforgeLabel(reforgeId, reforgeById)
                            : `Search reforges for ${slot.label.toLowerCase()}`

                        return (
                          <td
                            key={`${slot.id}-r${index}`}
                            className="build-reforge-cell"
                          >
                            <Tooltip content={tip} wide>
                              <div className="build-reforge-wrap">
                                <ReforgePicker
                                  label={
                                    isEchostone
                                      ? `${slot.label} awakening`
                                      : `${slot.label} reforge ${index + 1}`
                                  }
                                  hideLabel
                                  options={options}
                                  value={reforgeId}
                                  excludeIds={
                                    isEchostone
                                      ? []
                                      : state.reforgeIds.filter(
                                          (_, i) => i !== index,
                                        )
                                  }
                                  onChange={(id) =>
                                    setReforge(slot.id, index, id)
                                  }
                                  disabled={isEchostone && !echoColor}
                                  placeholder={
                                    isEchostone ? 'Awakening…' : undefined
                                  }
                                />
                              </div>
                            </Tooltip>
                            <div
                              className="reforge-priority-row"
                              role="group"
                              aria-label={
                                isEchostone
                                  ? `${slot.label} awakening priority`
                                  : `${slot.label} reforge ${index + 1} priority`
                              }
                            >
                              {([1, 2, 3] as const).map((value) => (
                                <PriorityBadge
                                  key={value}
                                  priority={value}
                                  interactive
                                  selected={priority === value}
                                  onClick={() =>
                                    setReforgePriority(slot.id, index, value)
                                  }
                                />
                              ))}
                            </div>
                          </td>
                        )
                      })}
                      {([0, 1] as const).map((index) => {
                        if (!slot.canEnchant) {
                          return (
                            <td
                              key={`${slot.id}-e${index}`}
                              className="build-enchant-cell is-na"
                            >
                              <span className="build-cell-na" aria-hidden>
                                —
                              </span>
                            </td>
                          )
                        }
                        const kind = index === 0 ? 'P' : 'S'
                        const enchantType = index === 0 ? 'Prefix' : 'Suffix'
                        const enchant = state.enchants[index]
                        return (
                          <td
                            key={`${slot.id}-e${index}`}
                            className="build-enchant-cell"
                          >
                            <div className="build-enchant-wrap">
                              <ItemSearch
                                id={`build-enchant-${slot.id}-${index}`}
                                label={`${slot.label} ${enchantType.toLowerCase()}`}
                                hideLabel
                                selectedTitle={enchant?.title}
                                onSelect={(item) =>
                                  setEnchant(slot.id, index, item)
                                }
                                placeholder={`${enchantType}…`}
                                searchFn={(q, signal) =>
                                  searchMabibaseEnchants(
                                    q,
                                    signal,
                                    12,
                                    enchantType,
                                  ).then((rows) =>
                                    rows.map((row) => ({
                                      title: row.title,
                                      url: row.url,
                                    })),
                                  )
                                }
                                sourceHint="mabibase"
                                errorMessage="Could not reach Mabibase. Try again."
                                emptyMessage={`No ${enchantType.toLowerCase()} enchants matched.`}
                                allowCustom
                              />
                              {enchant ? (
                                <button
                                  type="button"
                                  className="enchant-clear"
                                  aria-label={`Clear ${enchantType.toLowerCase()}`}
                                  onClick={() =>
                                    setEnchant(slot.id, index, null)
                                  }
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                            <div className="enchant-kind-row">
                              <EnchantKindBadge kind={kind} />
                            </div>
                          </td>
                        )
                      })}
                      <td className="build-row-actions">
                        <Tooltip content="Clear this slot">
                          <button
                            type="button"
                            className="btn ghost compact"
                            disabled={!filled}
                            onClick={() => clearSlot(slot.id)}
                          >
                            ×
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="build-view-layout">
          <div className="build-view-module">
            <h3 className="build-view-module-title">Gear</h3>
            <div className="build-readout">
              {BUILD_SLOTS.map((slot) => {
                const state = build.slots[slot.id]
                const reforges = state.reforgeIds
                  .map((id, index) =>
                    id && index < slot.reforgeCount
                      ? {
                          id,
                          index: index as 0 | 1 | 2,
                          label: resolveReforgeLabel(id, reforgeById),
                          flags: state.reforgeFlags[index],
                        }
                      : null,
                  )
                  .filter(
                    (row): row is NonNullable<typeof row> => row !== null,
                  )
                const enchants = slot.canEnchant
                  ? state.enchants
                      .map((enchant, index) =>
                        enchant
                          ? { enchant, index: index as 0 | 1 }
                          : null,
                      )
                      .filter(
                        (row): row is NonNullable<typeof row> => row !== null,
                      )
                  : []
                const empty =
                  !state.item &&
                  reforges.length === 0 &&
                  enchants.length === 0
                if (empty) return null

                const reforgeCategoryLabel =
                  slot.kind === 'echostone' ? 'Awakening' : 'Reforges'
                const showReforges = slot.reforgeCount > 0
                const showEnchants = slot.canEnchant

                return (
                  <article
                    key={slot.id}
                    className={`build-read-slot${
                      state.complete ? ' is-complete' : ''
                    }`}
                  >
                    <div className="build-read-gear">
                      {state.item ? (
                        <a
                          className="build-slot-icon"
                          href={state.item.url}
                          target="_blank"
                          rel="noreferrer"
                          title={`Open ${state.item.title} on Mabibase`}
                        >
                          {state.item.imageUrl ? (
                            <img
                              src={state.item.imageUrl}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="item-fallback sm" aria-hidden>
                              ◆
                            </div>
                          )}
                        </a>
                      ) : (
                        <div className="build-slot-icon" aria-hidden>
                          <div className="build-slot-icon-empty" />
                        </div>
                      )}
                      <div className="build-read-body">
                        <div className="build-read-gear-line">
                          <div className="build-read-gear-copy">
                            <span className="build-read-slot-label">
                              {slot.label}
                            </span>
                            {state.item ? (
                              <a
                                className="build-read-item-name"
                                href={state.item.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {state.item.title}
                              </a>
                            ) : (
                              <span className="build-read-item-empty">
                                No item
                              </span>
                            )}
                          </div>
                          <span className="build-read-gear-flags">
                            <FlagButton
                              pressed={state.complete}
                              label={`${slot.label} complete`}
                              tip="Complete"
                              onClick={() =>
                                updateSlot(slot.id, {
                                  complete: !state.complete,
                                })
                              }
                            />
                            <span
                              className="build-read-flag-spacer"
                              aria-hidden
                            />
                          </span>
                        </div>

                        {showReforges && (
                        <div className="build-read-category">
                          <p className="build-read-category-label">
                            {reforgeCategoryLabel}
                          </p>
                          {reforges.length > 0 ? (
                            <ul className="build-read-lines">
                              {reforges.map((row) => (
                                <li
                                  key={`${slot.id}-r${row.index}`}
                                  className={
                                    row.flags.priority
                                      ? `has-priority p${row.flags.priority}`
                                      : undefined
                                  }
                                >
                                  {row.flags.priority ? (
                                    <PriorityBadge
                                      priority={row.flags.priority}
                                    />
                                  ) : (
                                    <span
                                      className="build-read-line-bullet"
                                      aria-hidden
                                    >
                                      •
                                    </span>
                                  )}
                                  <span className="build-read-line-text">
                                    {row.label}
                                  </span>
                                  <span className="build-read-line-flags">
                                    <FlagButton
                                      pressed={row.flags.complete}
                                      label={`${slot.label} reforge ${row.index + 1} complete`}
                                      tip="Complete"
                                      onClick={() =>
                                        toggleReforgeFlag(
                                          slot.id,
                                          row.index,
                                          'complete',
                                        )
                                      }
                                    />
                                    {slot.canInherit && (
                                      <FlagButton
                                        pressed={row.flags.inheritable}
                                        label={`${slot.label} reforge ${row.index + 1} inheritable`}
                                        tip="Inheritable item available"
                                        yieldStyle
                                        onClick={() =>
                                          toggleReforgeFlag(
                                            slot.id,
                                            row.index,
                                            'inheritable',
                                          )
                                        }
                                      />
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="build-read-category-empty">None</p>
                          )}
                        </div>
                        )}

                        {showEnchants && (
                        <div className="build-read-category">
                          <p className="build-read-category-label">Enchants</p>
                          {enchants.length > 0 ? (
                            <ul className="build-read-lines">
                              {enchants.map((row) => (
                                <li key={`${slot.id}-e${row.index}`}>
                                  <EnchantKindBadge
                                    kind={row.index === 0 ? 'P' : 'S'}
                                  />
                                  <a
                                    className="build-read-line-text is-link"
                                    href={
                                      farmByEnchant[
                                        row.enchant.title.toLowerCase()
                                      ]?.wikiUrl ?? row.enchant.url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {row.enchant.title}
                                  </a>
                                  <span className="build-read-line-flags">
                                    <FlagButton
                                      pressed={row.enchant.complete}
                                      label={`${slot.label} enchant ${row.index + 1} complete`}
                                      tip="Complete"
                                      onClick={() =>
                                        toggleEnchantFlag(
                                          slot.id,
                                          row.index,
                                          'complete',
                                        )
                                      }
                                    />
                                    {slot.canInherit && (
                                      <FlagButton
                                        pressed={row.enchant.inheritable}
                                        label={`${slot.label} enchant ${row.index + 1} inheritable`}
                                        tip="Inheritable item available"
                                        yieldStyle
                                        onClick={() =>
                                          toggleEnchantFlag(
                                            slot.id,
                                            row.index,
                                            'inheritable',
                                          )
                                        }
                                      />
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="build-read-category-empty">None</p>
                          )}
                        </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <aside className="build-view-module build-farm-module">
            <h3 className="build-view-module-title">Farm</h3>
            <div className="build-farm-panel">
              {farmEnchants.length === 0 ? (
                <p className="build-read-category-empty">
                  Add enchants to see what to farm.
                </p>
              ) : farmLoading ? (
                <p className="build-read-category-empty">Looking up drops…</p>
              ) : (
                <ul className="build-farm-list">
                  {farmEnchants.map((row) => {
                    const key = row.name.toLowerCase()
                    const open = farmOpenKey === key
                    return (
                      <li
                        key={`farm-${row.name}`}
                        className={open ? 'is-open' : undefined}
                      >
                        <button
                          type="button"
                          className="build-farm-item"
                          aria-expanded={open}
                          onClick={() =>
                            setFarmOpenKey((prev) =>
                              prev === key ? null : key,
                            )
                          }
                        >
                          <span className="build-farm-item-name">{row.name}</span>
                          <span className="build-farm-item-meta" aria-hidden>
                            {open ? '−' : '+'}
                          </span>
                        </button>
                        {open && (
                          <div className="build-farm-detail">
                            {row.locations.length > 0 ? (
                              <ul>
                                {row.locations.map((location, locIdx) => (
                                  <li
                                    key={`${row.name}-${locIdx}-${locationPlainText(location)}`}
                                  >
                                    <WikiInlineText segments={location} />
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>No wiki drop data.</p>
                            )}
                            <a
                              className="build-farm-wiki-link"
                              href={row.wikiUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Wiki page
                            </a>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
