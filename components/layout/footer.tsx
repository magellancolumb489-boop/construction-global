import Link from "next/link"
import { HardHat, ArrowUpRight } from "lucide-react"

const footerSections = [
  {
    title: "Despre noi",
    links: [
      { label: "Echipa", href: "#" },
      { label: "Cariere", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Licitatii",
    links: [
      { label: "Toate licitatiile", href: "/auctions" },
      { label: "Publica o licitatie", href: "/sell/auction/new" },
      { label: "Cum functioneaza", href: "#" },
    ],
  },
  {
    title: "Magazin",
    links: [
      { label: "Materiale", href: "/marketplace" },
      { label: "Categorii", href: "/marketplace" },
      { label: "Oferte speciale", href: "#" },
    ],
  },
  {
    title: "Suport",
    links: [
      { label: "Centru de ajutor", href: "#" },
      { label: "Termeni si conditii", href: "#" },
      { label: "Confidentialitate", href: "#" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:gap-12 md:grid-cols-5">
          {/* Logo column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <HardHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold">
                Construction<span className="text-primary">Hub</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/60">
              Platforma de licitatii si materiale de constructii din Romania.
            </p>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-secondary-foreground/50">
                {section.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-secondary-foreground/60 transition-colors hover:text-primary"
                    >
                      {link.label}
                      {link.href !== "#" && (
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-secondary-foreground/10 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-secondary-foreground/40">
            &copy; {new Date().getFullYear()} ConstructionHub Romania. Toate drepturile rezervate.
          </p>
          <div className="flex items-center gap-4 text-xs text-secondary-foreground/40">
            <Link href="#" className="hover:text-primary transition-colors">Termeni</Link>
            <Link href="#" className="hover:text-primary transition-colors">Confidentialitate</Link>
            <Link href="#" className="hover:text-primary transition-colors">Cookie-uri</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
