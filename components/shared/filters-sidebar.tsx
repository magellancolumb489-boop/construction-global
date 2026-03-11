"use client"

import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface FilterSection {
  id: string
  label: string
  options: { value: string; label: string }[]
}

export function FiltersSidebar({
  sections,
  selected,
  onToggle,
  onReset,
}: {
  sections: FilterSection[]
  selected: Record<string, string[]>
  onToggle: (sectionId: string, value: string) => void
  onReset: () => void
}) {
  const hasFilters = Object.values(selected).some((v) => v.length > 0)

  return (
    <aside className="w-full rounded-2xl border border-border/50 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Filtre</h2>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-muted-foreground" onClick={onReset}>
            Reseteaza
          </Button>
        )}
      </div>
      <div className="space-y-1">
        {sections.map((section) => (
          <Collapsible key={section.id} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
              {section.label}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-1 px-2 pb-2">
                {section.options.map((opt) => {
                  const checked = (selected[section.id] ?? []).includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors ${
                        checked ? "bg-primary/5 text-foreground font-medium" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onToggle(section.id, opt.value)}
                        className="rounded"
                      />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </aside>
  )
}
