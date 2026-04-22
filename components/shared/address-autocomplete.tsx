"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import {
  searchAddress,
  RoutingError,
  type GeocodeResult,
} from "@/lib/api/routing"

export type AddressStatus = "idle" | "loading" | "error" | "resolved"

export interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, coords: GeocodeResult | null) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  onStatusChange?: (status: AddressStatus, errorMessage?: string) => void
  // Extra id to associate with an external label if needed.
  inputId?: string
}

const DEBOUNCE_MS = 400
const MIN_CHARS = 3

// Accessible combobox over /api/geocode. Keeps the dropdown controlled,
// debounces typing, cancels in-flight requests, and emits a status stream
// to the parent so it can show a single source of truth for validation UI.
export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Introduceti adresa de livrare...",
  className,
  inputClassName,
  disabled,
  onStatusChange,
  inputId,
}: AddressAutocompleteProps) {
  const generatedId = useId()
  const resolvedInputId = inputId ?? `addr-${generatedId}`
  const listboxId = `addr-list-${generatedId}`

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<GeocodeResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [status, setStatus] = useState<AddressStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  // Track the value associated with the current resolved coords so we can
  // invalidate the coords as soon as the user edits away from the selection.
  const resolvedLabelRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const pushStatus = useCallback(
    (next: AddressStatus, msg?: string) => {
      setStatus(next)
      setErrorMessage(msg)
      onStatusChange?.(next, msg)
    },
    [onStatusChange],
  )

  // Debounced async search. Abort previous in-flight when a new one starts.
  useEffect(() => {
    // If the current text equals the resolved selection, keep status.
    if (value === resolvedLabelRef.current) return

    if (!value || value.trim().length < MIN_CHARS) {
      abortRef.current?.abort()
      setItems([])
      setOpen(false)
      pushStatus("idle")
      return
    }

    const handle = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      pushStatus("loading")
      try {
        const results = await searchAddress(value, 5, controller.signal)
        if (controller.signal.aborted) return
        setItems(results)
        setActiveIndex(results.length > 0 ? 0 : -1)
        setOpen(results.length > 0)
        pushStatus(results.length > 0 ? "idle" : "idle")
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return
        const re =
          err instanceof RoutingError
            ? err
            : new RoutingError("unknown", "Eroare la cautare.")
        pushStatus("error", re.message)
        setItems([])
        setOpen(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(handle)
  }, [value, pushStatus])

  // Close on outside click / focusout.
  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    return () => document.removeEventListener("mousedown", onPointer)
  }, [])

  // Cleanup pending fetch on unmount.
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      // Any free-text edit invalidates the previous resolution.
      if (resolvedLabelRef.current && next !== resolvedLabelRef.current) {
        resolvedLabelRef.current = null
      }
      onChange(next, null)
    },
    [onChange],
  )

  const selectItem = useCallback(
    (item: GeocodeResult) => {
      resolvedLabelRef.current = item.displayName
      onChange(item.displayName, item)
      setOpen(false)
      setItems([])
      pushStatus("resolved")
    },
    [onChange, pushStatus],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        if (items.length > 0) {
          setOpen(true)
          setActiveIndex(0)
          e.preventDefault()
          return
        }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (items.length === 0 ? -1 : (i + 1) % items.length))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) =>
          items.length === 0 ? -1 : (i - 1 + items.length) % items.length,
        )
      } else if (e.key === "Enter") {
        if (open && activeIndex >= 0 && items[activeIndex]) {
          e.preventDefault()
          selectItem(items[activeIndex])
        }
      } else if (e.key === "Escape") {
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
      }
    },
    [open, items, activeIndex, selectItem],
  )

  const showSpinner = status === "loading"

  return (
    <div
      ref={wrapperRef}
      className={["relative", className].filter(Boolean).join(" ")}
    >
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          id={resolvedInputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0
              ? `${listboxId}-opt-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (items.length > 0) setOpen(true)
          }}
          placeholder={placeholder}
          className={
            inputClassName ??
            "w-full h-9 pl-9 pr-9 rounded-md border border-zinc-200 bg-white text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
          }
        />
        {showSpinner && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin motion-reduce:animate-none" />
        )}
      </div>

      {open && items.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg"
        >
          {items.map((item, idx) => {
            const id = `${listboxId}-opt-${idx}`
            const active = idx === activeIndex
            return (
              <li
                id={id}
                key={`${item.lat},${item.lng},${idx}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  // Prevent blur before click fires.
                  e.preventDefault()
                  selectItem(item)
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={[
                  "flex items-start gap-2 px-3 py-2 text-sm cursor-pointer",
                  active ? "bg-zinc-100" : "bg-white hover:bg-zinc-50",
                ].join(" ")}
              >
                <MapPin className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-700 leading-tight">
                  {item.displayName}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {status === "error" && errorMessage && (
        <p
          className="mt-1.5 text-[10px] text-rose-600"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}
