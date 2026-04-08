"use client"

import Image from "next/image"
import { Upload, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getImagePublicUrl } from "@/lib/api/listings-client"
import type { ListingWizardType } from "@/lib/listing-wizard-types"

interface ExistingImage {
  id: number
  storage_path: string
  display_order: number
}

interface Props {
  listingType: ListingWizardType | null
  remainingExisting: ExistingImage[]
  newPreviews: string[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onPickFiles: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveNew: (index: number) => void
  onMarkExistingDeleted: (id: number) => void
}

/** Step 3: image upload zone + previews (same behavior as legacy listing form). */
export function WizardStepImages({
  listingType,
  remainingExisting,
  newPreviews,
  fileInputRef,
  onPickFiles,
  onRemoveNew,
  onMarkExistingDeleted,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Imagini</CardTitle>
        {listingType === "concrete" && (
          <p className="text-sm text-muted-foreground">
            Fotografii de la santier sau camion ajuta cumparatorii sa inteleaga mai bine oferta.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {remainingExisting.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Imagini existente
            </p>
            <div className="flex flex-wrap gap-3">
              {remainingExisting.map((img) => (
                <div
                  key={img.id}
                  className="group relative h-24 w-32 overflow-hidden rounded-lg border"
                >
                  <Image
                    src={getImagePublicUrl(img.storage_path)}
                    alt="Imagine anunt"
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                  <button
                    type="button"
                    onClick={() => onMarkExistingDeleted(img.id)}
                    className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {newPreviews.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Imagini noi</p>
            <div className="flex flex-wrap gap-3">
              {newPreviews.map((url, i) => (
                <div
                  key={i}
                  className="group relative h-24 w-32 overflow-hidden rounded-lg border"
                >
                  <Image
                    src={url}
                    alt={`Preview ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveNew(i)}
                    className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Click pentru a adauga imagini</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP (max 5MB)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onPickFiles}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}
