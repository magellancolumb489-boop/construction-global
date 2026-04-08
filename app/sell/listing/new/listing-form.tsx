"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  createListing,
  updateListing,
  deleteListing,
  uploadListingImage,
  deleteListingImage,
  checkSlugAvailable,
  type Listing,
  type ListingInsert,
  type ListingUpdate,
} from "@/lib/api/listings-client"
import { createClient } from "@/lib/supabase/client"
import { ListingWizardStepper } from "@/components/sell/listing-wizard/listing-wizard-stepper"
import { WizardStepType } from "@/components/sell/listing-wizard/wizard-step-type"
import { WizardStepDetailsConcrete } from "@/components/sell/listing-wizard/wizard-step-details-concrete"
import { WizardStepDetailsMaterials } from "@/components/sell/listing-wizard/wizard-step-details-materials"
import { WizardStepDetailsEquipment } from "@/components/sell/listing-wizard/wizard-step-details-equipment"
import { WizardStepDetailsServices } from "@/components/sell/listing-wizard/wizard-step-details-services"
import { WizardStepImages } from "@/components/sell/listing-wizard/wizard-step-images"
import { WizardStepReview } from "@/components/sell/listing-wizard/wizard-step-review"
import {
  emptyWizardState,
  wizardStateFromListing,
  transportModesFromFlags,
  type WizardFormState,
} from "@/lib/listing-wizard-form-state"
import type { ListingWizardType } from "@/lib/listing-wizard-types"

interface CategoryOption {
  id: number
  name: string
}

interface ExistingImage {
  id: number
  storage_path: string
  display_order: number
}

interface ListingFormProps {
  categories: CategoryOption[]
  editMode?: boolean
  listing?: Listing
  existingImages?: ExistingImage[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80)
}

/** True if changing listing type would discard user input (create flow). */
function hasMeaningfulWizardData(f: WizardFormState): boolean {
  return Boolean(
    f.title.trim() ||
      f.price.trim() ||
      f.pickupAddress.trim() ||
      f.description.trim() ||
      f.availableQty !== "0" ||
      f.transportFee.trim() ||
      f.minOrderQty.trim() ||
      f.serviceArea.trim() ||
      f.equipmentModel.trim(),
  )
}

/** Step-local validation before Continue. */
function validateStep(step: number, form: WizardFormState): string | null {
  if (step === 1) {
    if (!form.listingType) return "Selectati tipul anuntului."
    return null
  }
  if (step === 2 && form.listingType) {
    return validateDetailsStep(form.listingType, form)
  }
  return null
}

function validateDetailsStep(t: ListingWizardType, f: WizardFormState): string | null {
  switch (t) {
    case "concrete": {
      if (!f.title.trim()) return "Titlul este obligatoriu."
      if (!f.pickupAddress.trim()) return "Adresa de incarcare este obligatorie."
      if (f.pickupLat == null || f.pickupLng == null) {
        return "Geocodati adresa sau introduceti latitudinea si longitudinea."
      }
      if (!f.transportCifa && !f.transportPompa && !f.transportVrac) {
        return "Selectati cel putin un mod de transport (CIFA, POMPĂ sau VRAC)."
      }
      if (!f.minOrderQty.trim() || Number(f.minOrderQty) <= 0) {
        return "Comanda minima trebuie sa fie mai mare ca zero."
      }
      if (!f.price.trim() || Number(f.price) < 0) return "Pretul este obligatoriu."
      if (f.unit !== "M3" && f.unit !== "TON") {
        return "Pentru beton, unitatea trebuie sa fie M3 sau TON."
      }
      if (Number(f.availableQty) < 0) return "Cantitatea disponibila este invalida."
      return null
    }
    case "materials": {
      if (!f.title.trim()) return "Titlul este obligatoriu."
      if (!f.price.trim() || Number(f.price) < 0) return "Pretul este obligatoriu."
      if (!f.availableQty.trim() || Number(f.availableQty) < 0) {
        return "Cantitatea disponibila este obligatorie."
      }
      if (f.transportFee.trim() && Number(f.transportFee) < 0) {
        return "Costul de transport nu poate fi negativ."
      }
      return null
    }
    case "equipment": {
      if (!f.title.trim()) return "Titlul este obligatoriu."
      if (!f.price.trim() || Number(f.price) < 0) return "Pretul este obligatoriu."
      if (f.transportFee.trim() && Number(f.transportFee) < 0) {
        return "Costul de transport nu poate fi negativ."
      }
      return null
    }
    case "services": {
      if (!f.title.trim()) return "Titlul este obligatoriu."
      if (!f.price.trim() || Number(f.price) < 0) return "Tariful este obligatoriu."
      return null
    }
    default:
      return null
  }
}

/** Map wizard state to DB columns for create/update. */
function toListingPayload(
  form: WizardFormState,
  isDraft: boolean,
): Omit<ListingInsert, "seller_id" | "slug"> {
  const active = isDraft ? false : form.isActive
  const lt = form.listingType!
  const base = {
    listing_type: lt,
    title: form.title.trim(),
    description: form.description.trim() || null,
    category_id: form.categoryId ? Number(form.categoryId) : null,
    currency: form.currency,
    is_active: active,
  }

  if (lt === "concrete") {
    const modes = transportModesFromFlags(
      form.transportCifa,
      form.transportPompa,
      form.transportVrac,
    )
    const firstLine = form.pickupAddress.split("\n")[0]?.trim() || null
    return {
      ...base,
      price: Number(form.price),
      unit: form.unit,
      available_qty: Number(form.availableQty) >= 0 ? Number(form.availableQty) : 0,
      location: firstLine,
      pickup_address: form.pickupAddress.trim(),
      pickup_lat: form.pickupLat,
      pickup_lng: form.pickupLng,
      transport_modes: modes.length ? modes : null,
      min_order_qty: Number(form.minOrderQty),
      transport_fee: null,
      service_area: null,
      equipment_condition: null,
      equipment_model: null,
      equipment_year: null,
    }
  }

  if (lt === "materials") {
    return {
      ...base,
      price: Number(form.price),
      unit: form.unit,
      available_qty: Number(form.availableQty) || 0,
      location: form.location.trim() || null,
      pickup_address: null,
      pickup_lat: null,
      pickup_lng: null,
      transport_modes: null,
      min_order_qty: null,
      transport_fee: form.transportFee.trim() === "" ? 0 : Number(form.transportFee),
      service_area: null,
      equipment_condition: null,
      equipment_model: null,
      equipment_year: null,
    }
  }

  if (lt === "equipment") {
    const y = form.equipmentYear.trim()
    const yearParsed = y ? parseInt(y, 10) : NaN
    return {
      ...base,
      price: Number(form.price),
      unit: "BUC",
      available_qty: 1,
      location: form.location.trim() || null,
      pickup_address: null,
      pickup_lat: null,
      pickup_lng: null,
      transport_modes: null,
      min_order_qty: null,
      transport_fee:
        form.transportFee.trim() === "" ? null : Number(form.transportFee),
      service_area: null,
      equipment_condition: form.equipmentCondition.trim() || null,
      equipment_model: form.equipmentModel.trim() || null,
      equipment_year: Number.isFinite(yearParsed) ? yearParsed : null,
    }
  }

  // services
  return {
    ...base,
    price: Number(form.price),
    unit: "BUC",
    available_qty: 1,
    location: form.serviceArea.trim() || null,
    pickup_address: null,
    pickup_lat: null,
    pickup_lng: null,
    transport_modes: null,
    min_order_qty: null,
    transport_fee: null,
    service_area: form.serviceArea.trim() || null,
    equipment_condition: null,
    equipment_model: null,
    equipment_year: null,
  }
}

export function ListingForm({
  categories,
  editMode = false,
  listing,
  existingImages = [],
}: ListingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardFormState>(() =>
    editMode && listing ? wizardStateFromListing(listing) : emptyWizardState(),
  )

  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<Set<number>>(new Set())
  const [typeChangeOpen, setTypeChangeOpen] = useState(false)
  const [pendingListingType, setPendingListingType] =
    useState<ListingWizardType | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remainingExisting = existingImages.filter((img) => !deletedImageIds.has(img.id))

  const clearNewFiles = useCallback(() => {
    newPreviews.forEach((url) => URL.revokeObjectURL(url))
    setNewFiles([])
    setNewPreviews([])
  }, [newPreviews])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setNewFiles((prev) => [...prev, ...files])
    const previews = files.map((f) => URL.createObjectURL(f))
    setNewPreviews((prev) => [...prev, ...previews])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeNewFile(index: number) {
    URL.revokeObjectURL(newPreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function markExistingForDeletion(imageId: number) {
    setDeletedImageIds((prev) => new Set(prev).add(imageId))
  }

  function requestListingType(next: ListingWizardType) {
    if (form.listingType === next) return
    if (!editMode && hasMeaningfulWizardData(form)) {
      setPendingListingType(next)
      setTypeChangeOpen(true)
      return
    }
    setForm({ ...emptyWizardState(), listingType: next })
    clearNewFiles()
  }

  function confirmListingTypeChange() {
    if (!pendingListingType) return
    setForm({ ...emptyWizardState(), listingType: pendingListingType })
    clearNewFiles()
    setPendingListingType(null)
    setTypeChangeOpen(false)
  }

  async function generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title)
    if (!slug) slug = "anunt"
    const available = await checkSlugAvailable(slug)
    if (available) return slug
    const suffix = Math.random().toString(36).substring(2, 7)
    return `${slug}-${suffix}`
  }

  function handleNext() {
    setError(null)
    const msg = validateStep(step, form)
    if (msg) {
      setError(msg)
      return
    }
    setStep((s) => Math.min(4, s + 1))
  }

  function handleBack() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  async function runSubmit(isDraft: boolean) {
    setError(null)
    if (!form.listingType) {
      setError("Selectati tipul anuntului.")
      return
    }
    const detailErr = validateDetailsStep(form.listingType, form)
    if (detailErr) {
      setError(detailErr)
      setStep(2)
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Nu esti autentificat.")
        setSaving(false)
        return
      }

      const payload = toListingPayload(form, isDraft)

      if (editMode && listing) {
        const updates: ListingUpdate = {
          ...payload,
        }
        if (form.title.trim() !== listing.title) {
          updates.slug = await generateUniqueSlug(form.title.trim())
        }
        const res = await updateListing(listing.id, updates)
        if (!res.success) {
          setError(res.error ?? "Eroare la actualizare.")
          setSaving(false)
          return
        }
        for (const imgId of deletedImageIds) {
          const img = existingImages.find((i) => i.id === imgId)
          if (img) await deleteListingImage(img.id, img.storage_path)
        }
        const baseOrder = remainingExisting.length
        for (let i = 0; i < newFiles.length; i++) {
          await uploadListingImage(listing.id, newFiles[i], baseOrder + i)
        }
        const finalSlug = (updates.slug as string) ?? listing.slug
        router.push(`/products/${finalSlug}-${listing.id}`)
        router.refresh()
        return
      }

      const slug = await generateUniqueSlug(form.title.trim())
      const res = await createListing({
        seller_id: user.id,
        slug,
        ...payload,
      })
      if (!res.success || !res.data) {
        setError(res.error ?? "Eroare la creare.")
        setSaving(false)
        return
      }
      for (let i = 0; i < newFiles.length; i++) {
        await uploadListingImage(res.data.id, newFiles[i], i)
      }
      router.push(`/products/${slug}-${res.data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare neasteptata.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!listing) return
    setDeleting(true)
    const res = await deleteListing(listing.id)
    if (res.success) {
      router.push("/account?tab=listings")
      router.refresh()
    } else {
      setError(res.error ?? "Eroare la stergere.")
      setDeleting(false)
    }
  }

  const footerPrimaryLabel =
    step === 4 ? (editMode ? "Salveaza modificarile" : "Publica anuntul") : "Continua"

  return (
    <div className="pb-28 md:pb-6">
      <ListingWizardStepper currentStep={step} />

      <p className="mb-4 text-sm text-muted-foreground md:hidden">
        Pasul {step} din 4
      </p>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Alege tipul anuntului</h2>
          <WizardStepType
            value={form.listingType}
            onChange={requestListingType}
          />
        </div>
      )}

      {step === 2 && form.listingType === "concrete" && (
        <WizardStepDetailsConcrete
          form={form}
          setForm={setForm}
          categories={categories}
        />
      )}
      {step === 2 && form.listingType === "materials" && (
        <WizardStepDetailsMaterials
          form={form}
          setForm={setForm}
          categories={categories}
        />
      )}
      {step === 2 && form.listingType === "equipment" && (
        <WizardStepDetailsEquipment
          form={form}
          setForm={setForm}
          categories={categories}
        />
      )}
      {step === 2 && form.listingType === "services" && (
        <WizardStepDetailsServices
          form={form}
          setForm={setForm}
          categories={categories}
        />
      )}

      {step === 3 && (
        <WizardStepImages
          listingType={form.listingType}
          remainingExisting={remainingExisting}
          newPreviews={newPreviews}
          fileInputRef={fileInputRef}
          onPickFiles={handleFileSelect}
          onRemoveNew={removeNewFile}
          onMarkExistingDeleted={markExistingForDeletion}
        />
      )}

      {step === 4 && <WizardStepReview form={form} setForm={setForm} />}

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Sticky mobile footer + desktop inline actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:static md:z-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={handleBack}
                disabled={saving || deleting}
              >
                Inapoi
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {step < 4 && (
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                onClick={handleNext}
                disabled={saving || deleting}
              >
                {footerPrimaryLabel}
              </Button>
            )}
            {step === 4 && (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                {!editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={saving}
                    onClick={() => runSubmit(true)}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salveaza ca ciorna
                  </Button>
                )}
                <Button
                  type="button"
                  className="min-h-11 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={saving || deleting}
                  onClick={() => runSubmit(false)}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editMode ? "Salveaza modificarile" : "Publica anuntul"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type change confirmation */}
      <AlertDialog open={typeChangeOpen} onOpenChange={setTypeChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schimbi tipul anuntului?</AlertDialogTitle>
            <AlertDialogDescription>
              Datele completate vor fi resetate. Puteti selecta din nou tipul si
              completati campurile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingListingType(null)}>
              Anuleaza
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmListingTypeChange}>
              Continua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editMode && listing && (
        <div className="mt-8 flex justify-end border-t border-border pt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={saving || deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-1 h-4 w-4" />
                Sterge anuntul
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sterge anuntul?</AlertDialogTitle>
                <AlertDialogDescription>
                  Aceasta actiune este ireversibila. Anuntul si toate imaginile asociate vor fi
                  sterse permanent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuleaza</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sterge definitiv
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
