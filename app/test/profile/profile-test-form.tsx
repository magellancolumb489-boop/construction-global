"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile, type Profile } from "@/lib/api/profile-client"
import { Loader2 } from "lucide-react"

interface Props {
  profile: Profile
}

export default function ProfileTestForm({ profile }: Props) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setResult(null)
    const res = await updateProfile({ display_name: displayName, phone })
    setResult(res)
    setSaving(false)
    if (res.success) router.refresh()
  }

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Update Profile (RLS test)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save to Supabase
        </Button>
        {result && (
          <span className={`text-sm ${result.success ? "text-emerald-600" : "text-destructive"}`}>
            {result.success ? "Saved!" : result.error}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Role: <code>{profile.role}</code> | Created:{" "}
        <code>{profile.created_at}</code> | Updated:{" "}
        <code>{profile.updated_at}</code>
      </p>
    </div>
  )
}
