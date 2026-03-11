"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { pollAuctionData } from "@/lib/api/auctions-client"
import type { AuctionDetail, BidRow } from "@/types/domain"

const POLL_INTERVAL = 4000

export function useAuctionPoll(
  initialAuction: AuctionDetail | null,
  initialBids: BidRow[]
) {
  const [auction, setAuction] = useState(initialAuction)
  const [bids, setBids] = useState(initialBids)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const visibleRef = useRef(true)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const poll = useCallback(async () => {
    if (!initialAuction?.id || !visibleRef.current) return
    try {
      const result = await pollAuctionData(Number(initialAuction.id))
      if (result.auction) setAuction(result.auction)
      if (result.bids.length) setBids(result.bids)
      if (result.auction?.status !== "active") stopPolling()
    } catch {
      // silently ignore poll errors
    }
  }, [initialAuction?.id, stopPolling])

  useEffect(() => {
    if (!initialAuction || initialAuction.status !== "active") return

    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === "visible"
      if (visibleRef.current && !intervalRef.current) {
        intervalRef.current = setInterval(poll, POLL_INTERVAL)
      } else if (!visibleRef.current) {
        stopPolling()
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [initialAuction, poll, stopPolling])

  return { auction, bids }
}
