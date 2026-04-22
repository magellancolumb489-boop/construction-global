"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { getAdminUsers } from "@/lib/api/admin"
import { changeUserRoleAction } from "@/app/admin/actions"
import { useToast } from "@/hooks/use-toast"
import type { User, UserRole } from "@/types/domain"
import { Search } from "lucide-react"

const ROLE_LABELS: Record<UserRole, string> = {
  user: "Utilizator",
  admin: "Administrator",
}

const ROLE_COLORS: Record<UserRole, string> = {
  user: "bg-blue-100 text-blue-800",
  admin: "bg-purple-100 text-purple-800",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    getAdminUsers().then((u) => { setUsers(u); setLoading(false) })
  }, [])

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleRoleChange(userId: string, role: UserRole) {
    // Optimistic UI update with rollback on failure
    const prevUsers = users
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
    const result = await changeUserRoleAction(userId, role)
    if (!result.success) {
      setUsers(prevUsers)
      toast({ title: "Rol neschimbat", description: result.error, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gestionare Utilizatori</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cauta utilizatori..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Schimba Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.displayName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilizator</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Niciun utilizator gasit.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
