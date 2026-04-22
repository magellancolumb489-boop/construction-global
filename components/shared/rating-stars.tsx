"use client"

import { Star } from "lucide-react"
import { useId, useState } from "react"

interface RatingStarsProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  readonly?: boolean
  onChange?: (next: number) => void
  className?: string
  label?: string
}

const sizeClasses: Record<NonNullable<RatingStarsProps["size"]>, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
}

// Accessible rating widget: readonly renders a row of stars with aria-label;
// interactive renders a radiogroup so screen readers can navigate with arrows.
export function RatingStars({
  value,
  max = 5,
  size = "md",
  readonly = true,
  onChange,
  className,
  label,
}: RatingStarsProps) {
  const groupId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const effective = hover ?? value
  const iconClass = sizeClasses[size]

  if (readonly || !onChange) {
    return (
      <span
        role="img"
        aria-label={label ?? `${value.toFixed(1)} din ${max}`}
        className={["inline-flex items-center gap-0.5", className].filter(Boolean).join(" ")}
      >
        {Array.from({ length: max }, (_, i) => {
          const isFilled = i + 1 <= Math.floor(value)
          const isHalf = !isFilled && i + 0.5 <= value
          return (
            <Star
              key={i}
              className={[
                iconClass,
                "transition-colors",
                isFilled || isHalf ? "fill-amber-400 text-amber-400" : "fill-transparent text-zinc-300",
              ].join(" ")}
              aria-hidden="true"
            />
          )
        })}
      </span>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={label ?? "Evaluare"}
      className={["inline-flex items-center gap-1", className].filter(Boolean).join(" ")}
    >
      {Array.from({ length: max }, (_, i) => {
        const idx = i + 1
        const active = idx <= effective
        return (
          <button
            key={idx}
            id={`${groupId}-${idx}`}
            role="radio"
            aria-checked={idx === value}
            aria-label={`${idx} din ${max}`}
            type="button"
            onClick={() => onChange(idx)}
            onMouseEnter={() => setHover(idx)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(idx)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault()
                onChange(Math.min(max, idx + 1))
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault()
                onChange(Math.max(1, idx - 1))
              }
            }}
            className="rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
          >
            <Star
              className={[
                iconClass,
                "transition-colors",
                active ? "fill-amber-400 text-amber-400" : "fill-transparent text-zinc-300 hover:text-amber-300",
              ].join(" ")}
            />
          </button>
        )
      })}
    </div>
  )
}
