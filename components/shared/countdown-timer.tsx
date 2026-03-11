"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

function getTimeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

export function CountdownTimer({
  deadline,
  compact = false,
}: {
  deadline: string
  compact?: boolean
}) {
  // Initialize as undefined so the server and first client render match (both show placeholder)
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft> | undefined>(undefined)

  useEffect(() => {
    setTimeLeft(getTimeLeft(deadline))
    const interval = setInterval(() => {
      const tl = getTimeLeft(deadline)
      setTimeLeft(tl)
      if (!tl) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  // Pre-hydration placeholder -- both server and client render this identically
  if (timeLeft === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        --:--:--
      </span>
    )
  }

  if (!timeLeft) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
        <Clock className="h-3.5 w-3.5" />
        Expirat
      </span>
    )
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        {timeLeft.days > 0 && `${timeLeft.days}z `}
        {String(timeLeft.hours).padStart(2, "0")}:
        {String(timeLeft.minutes).padStart(2, "0")}:
        {String(timeLeft.seconds).padStart(2, "0")}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center rounded bg-muted px-2 py-1">
            <span className="text-lg font-bold leading-none">{timeLeft.days}</span>
            <span className="text-xs text-muted-foreground">zile</span>
          </div>
        )}
        <div className="flex flex-col items-center rounded bg-muted px-2 py-1">
          <span className="text-lg font-bold leading-none">
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="text-xs text-muted-foreground">ore</span>
        </div>
        <span className="text-lg font-bold text-muted-foreground">:</span>
        <div className="flex flex-col items-center rounded bg-muted px-2 py-1">
          <span className="text-lg font-bold leading-none">
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="text-xs text-muted-foreground">min</span>
        </div>
        <span className="text-lg font-bold text-muted-foreground">:</span>
        <div className="flex flex-col items-center rounded bg-muted px-2 py-1">
          <span className="text-lg font-bold leading-none">
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
          <span className="text-xs text-muted-foreground">sec</span>
        </div>
      </div>
    </div>
  )
}
