"use client"

import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { User, Phone, Mail, Save, Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateMyProfileAction, uploadAvatarAction } from "@/app/account/actions"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/api/profile-client"

// Storage public URL. Matches the helper used elsewhere in the codebase.
function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/avatars/${path}`
}

interface ProfileTabProps {
  userEmail: string
  profile: Profile | null
}

export function ProfileTab({ userEmail, profile }: ProfileTabProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const [form, setForm] = useState({
    displayName: profile?.display_name ?? "",
    phone: profile?.phone ?? "",
    bio: profile?.bio ?? "",
  })

  const [avatarPath, setAvatarPath] = useState<string | null>(profile?.avatar_path ?? null)

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await updateMyProfileAction({
        display_name: form.displayName,
        phone: form.phone,
        avatar_path: avatarPath,
      })
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      // Bio is not in the base profile schema; patch it through the
      // business-profile action which owns the extended free-text field.
      const { updateBusinessProfileAction } = await import("@/app/account/actions")
      await updateBusinessProfileAction({ bio: form.bio ?? null })
      setMessage({ kind: "ok", text: "Profil actualizat." })
      router.refresh()
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ kind: "err", text: "Imaginea trebuie sa aiba sub 2 MB." })
      return
    }
    setUploading(true)
    setMessage(null)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
      const prep = await uploadAvatarAction({ mimeType: file.type, extension: ext })
      if (!prep.success) {
        setMessage({ kind: "err", text: prep.error })
        return
      }
      const supabase = createClient()
      const { error } = await supabase.storage
        .from(prep.bucket)
        .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type })
      if (error) {
        setMessage({ kind: "err", text: error.message })
        return
      }
      setAvatarPath(prep.path)
      await updateMyProfileAction({ avatar_path: prep.path })
      setMessage({ kind: "ok", text: "Avatar actualizat." })
      router.refresh()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const avatarSrc = avatarUrl(avatarPath)
  const initials = (form.displayName || userEmail)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="space-y-5">
      {/* Avatar + core profile fields live together for a tight first impression. */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-bold text-foreground">Informatii personale</h2>

        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                initials || <User className="h-8 w-8" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Schimba avatarul"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm hover:bg-muted"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{form.displayName || "Utilizator"}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              JPG, PNG sau WebP &middot; max 2 MB
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <User className="h-3 w-3" /> Nume afisat
              </Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="Nume complet sau denumire"
                maxLength={80}
              />
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Phone className="h-3 w-3" /> Telefon
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="07xx xxx xxx"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input value={userEmail} disabled className="h-11 rounded-xl bg-muted/50" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Email-ul se schimba din sectiunea Securitate.
            </p>
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Descriere publica
            </Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              maxLength={500}
              placeholder="Cateva cuvinte despre firma sau activitatea voastra"
              className="rounded-xl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{form.bio.length}/500</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleSave}
              disabled={pending}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salveaza
            </Button>
            {message && (
              <span className={`text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
