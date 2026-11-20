"use client"

import { Font } from "@react-pdf/renderer"

/**
 * Helvetica (the react-pdf default) has no ă/ș/ț glyphs, which is why the old
 * deviz printed broken Romanian text. DejaVu Sans covers Latin Extended.
 * Pinned version; to self-host, copy the two TTFs to /public/fonts and point
 * the src values at "/fonts/DejaVuSans.ttf" (then remove the CSP entry).
 */
export const PDF_FONT_FAMILY = "DejaVuSans"

let registered = false

export function registerPdfFonts(): void {
  if (registered) return
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf", fontWeight: 400 },
      { src: "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf", fontWeight: 700 },
    ],
  })
  // No automatic hyphenation of Romanian words.
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}
