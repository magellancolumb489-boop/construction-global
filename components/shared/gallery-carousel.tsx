"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GalleryCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)

  if (!images.length) return null

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="group relative aspect-video overflow-hidden rounded-2xl bg-muted">
        <Image
          src={images[current]}
          alt={`Imagine ${current + 1}`}
          fill
          className="object-cover transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 66vw"
          priority
        />
        {/* Counter badge */}
        <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          {current + 1} / {images.length}
        </div>
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl bg-white/80 shadow-md backdrop-blur-sm hover:bg-white dark:bg-black/60 dark:hover:bg-black/80"
              onClick={() =>
                setCurrent((p) => (p === 0 ? images.length - 1 : p - 1))
              }
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Imaginea anterioara</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl bg-white/80 shadow-md backdrop-blur-sm hover:bg-white dark:bg-black/60 dark:hover:bg-black/80"
              onClick={() =>
                setCurrent((p) => (p === images.length - 1 ? 0 : p + 1))
              }
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Imaginea urmatoare</span>
            </Button>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                i === current
                  ? "border-primary ring-2 ring-primary/30 shadow-sm"
                  : "border-transparent opacity-50 hover:opacity-90"
              }`}
            >
              <Image
                src={img}
                alt={`Miniatura ${i + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
