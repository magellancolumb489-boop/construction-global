import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function AuctionCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-video w-full rounded-t-lg" />
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-3 h-4 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="mt-2 h-4 w-full" />
      </CardContent>
    </Card>
  )
}

export function ProductCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-square w-full rounded-t-lg" />
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-3 h-6 w-1/3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="mb-4 aspect-video w-full rounded-lg" />
          <Skeleton className="mb-2 h-8 w-3/4" />
          <Skeleton className="mb-1 h-4 w-full" />
          <Skeleton className="mb-1 h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div>
          <Skeleton className="mb-4 h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
