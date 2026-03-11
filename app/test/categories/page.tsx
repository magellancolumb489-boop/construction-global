import { getCategories } from "@/lib/api/categories"

// Server component -- verifies categories RLS + server client
export default async function CategoriesTestPage() {
  const categories = await getCategories()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Categories Test</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Showing {categories.length} active categories from <code>public.categories</code>.
        This page works for both anonymous and authenticated users.
      </p>

      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No active categories found. Seed the <code>categories</code> table in Supabase.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Parent ID</th>
                <th className="px-4 py-3 text-left font-medium">Active</th>
                <th className="px-4 py-3 text-left font-medium">Sort</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono">{c.id}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3 font-mono">{c.parent_id ?? "—"}</td>
                  <td className="px-4 py-3">{c.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{c.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
