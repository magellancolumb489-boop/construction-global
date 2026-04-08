import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Gavel,
  Package,
  Smartphone,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuctionCard } from "@/components/shared/auction-card";
import { ProductCard } from "@/components/shared/product-card";
import { getAuctions } from "@/lib/api/auctions";
import { getProductListItems } from "@/lib/api/listings";

/** Category shortcuts — marketplace entry points */
const constructionTopics = [
  { label: "otel beton", href: "/marketplace" },
  { label: "ciment", href: "/marketplace" },
  { label: "agregate", href: "/marketplace" },
  { label: "prefabricate", href: "/marketplace" },
  { label: "utilaje", href: "/marketplace" },
  { label: "containere", href: "/marketplace" },
  { label: "cofraje", href: "/marketplace" },
  { label: "panouri", href: "/marketplace" },
];

/** Trust row: short label + one supporting line (Swiss: structure + scan) */
const trustItems = [
  {
    icon: Smartphone,
    label: "Mobil",
    hint: "CTA-uri mari, ierarhie clara pe ecran mic.",
  },
  {
    icon: Gavel,
    label: "Licitatii live",
    hint: "Termen, oferta curenta, licitatori — la vedere.",
  },
  {
    icon: Package,
    label: "Materiale",
    hint: "Pret / unitate, stoc, livrare unde e cazul.",
  },
  {
    icon: Building2,
    label: "Constructii",
    hint: "Focus pe santier, nu pe marketing generic.",
  },
] as const;

/** Hero sidebar: compressed facts, mono index — Swiss editorial rail */
const heroKeyPoints = [
  "Licitatii cu termen si pas minim vizibile.",
  "Magazin: configurare unde e nevoie, altfel pret direct.",
  "Publicare rapida: imagini, cantitate, locatie.",
] as const;

export default async function HomePage() {
  const [auctionsData, productsData] = await Promise.all([
    getAuctions({ status: "active", sort: "ending_soon" }),
    getProductListItems({ sort: "newest", limit: 4 }),
  ]);

  const endingSoonAuctions = auctionsData.items.slice(0, 4);
  const popularProducts = productsData.items;
  const auctionCount = endingSoonAuctions.length;
  const productCount = popularProducts.length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900">
      {/* 01 — Hero: modular grid, generous rhythm, editorial rail */}
      <section
        id="intro"
        className="relative scroll-mt-20 border-b border-zinc-200 bg-white"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[48px_48px] opacity-[0.35] motion-reduce:opacity-[0.12]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:gap-16 xl:gap-20">
            <div className="home-hero-stagger min-w-0">
              <div className="home-hero-item flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                  01 / Intro
                </p>
                <span className="hidden text-zinc-300 sm:inline">—</span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  ConstructionHub
                </p>
              </div>

              <h1 className="home-hero-item mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.045em] text-zinc-900 sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
                Licitatii si materiale,
                <span className="mt-1 block text-zinc-600">
                  intr-un singur loc.
                </span>
              </h1>

              <p className="home-hero-item mt-8 max-w-xl text-pretty text-[15px] leading-[1.65] text-zinc-600 sm:text-base">
                Platforma pentru firme si echipe de santier: gasesti oferta,
                termenul si starea produsului fara sa citesti pagini intregi.
                Totul e gandit pentru scan rapid — pe teren sau din birou.
              </p>

              <div className="home-hero-item mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  size="lg"
                  asChild
                  className="h-11 rounded-md px-7 text-sm font-semibold shadow-sm transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
                >
                  <Link href="/auctions">
                    <Gavel className="mr-2 h-4 w-4" />
                    Licitatii
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-11 rounded-md border-zinc-300 bg-white px-7 text-sm font-semibold text-zinc-900 shadow-sm transition-transform duration-200 hover:bg-zinc-50 motion-safe:hover:-translate-y-0.5"
                >
                  <Link href="/marketplace">
                    <Store className="mr-2 h-4 w-4" />
                    Marketplace
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  asChild
                  className="h-11 rounded-md px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Link href="/sell/auction/new">
                    Publica licitatie
                    <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
                  </Link>
                </Button>
              </div>

              <div className="home-hero-item mt-12 space-y-3">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                  Domenii
                </p>
                <div className="flex flex-wrap gap-2">
                  {constructionTopics.map(({ label, href }) => (
                    <Link
                      key={label}
                      href={href}
                      className="rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors duration-200 hover:border-zinc-400 hover:text-zinc-900 motion-safe:active:scale-[0.98]"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Editorial rail: vertical rule, mono, asymmetric balance */}
            <aside className="flex flex-col border-t border-zinc-200 pt-10 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-2 xl:pl-14">
              <div className="home-hero-aside relative flex flex-1 flex-col justify-between gap-10">
                <div>
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                    Rezumat operativ
                  </p>
                  <ul className="mt-6 space-y-5 border-l-2 border-zinc-200 pl-5">
                    {heroKeyPoints.map((line) => (
                      <li
                        key={line}
                        className="text-sm leading-relaxed text-zinc-600"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-zinc-100 pt-8">
                  <p className="max-w-48 font-mono text-[10px] leading-relaxed text-zinc-400">
                    Versiune platforma in evolutie. Raportezi o problema? Ne
                    ajuta sa o indreptam repede.
                  </p>
                  <span
                    className="select-none font-mono text-5xl font-light tabular-nums leading-none text-zinc-200 sm:text-6xl"
                    aria-hidden
                  >
                    RO
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Cuprins: Swiss index strip */}
      <nav
        className="border-b border-zinc-200 bg-zinc-50"
        aria-label="Cuprins pagina"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
            Cuprins
          </span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
            <a
              href="#intro"
              className="transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              01 Intro
            </a>
            <a
              href="#puncte"
              className="transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              02 Puncte
            </a>
            <a
              href="#live"
              className="transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              03 Licitatii
            </a>
            <a
              href="#magazin"
              className="transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              04 Magazin
            </a>
          </div>
        </div>
      </nav>

      {/* 02 — Trust: headline + cards + footnote */}
      <section
        id="puncte"
        className="scroll-mt-20 border-b border-zinc-200 bg-white py-14 sm:py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                02 / De ce aici
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-900 sm:text-3xl">
                Mai putin zgomot, mai multa structura.
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-[1.65]">
                Nu vindem povesti despre &quot;ecosisteme&quot;. Listarile sunt
                gandite ca intr-un catalog tehnic: ce e de vanzare, in ce
                cantitate, la ce pret sau licitatie, cu termene clare.
              </p>
            </div>
            <p className="max-w-xs font-mono text-[10px] leading-relaxed text-zinc-400 lg:text-right">
              Patru axe. Fara coloane de text ascunse in spatele unui buton.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {trustItems.map(({ icon: Icon, label, hint }) => (
              <li
                key={label}
                className="flex flex-col border border-zinc-200 bg-zinc-50/40 p-5 transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-zinc-300 motion-safe:hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-zinc-200 bg-white text-zinc-800">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-900">
                      {label}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                      {hint}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Separator className="my-10 bg-zinc-200" />
          <p className="max-w-3xl text-xs leading-relaxed text-zinc-500">
            In spate: conturi, cos, finalizare comanda — fluxurile sunt separate
            de pagina asta. Aici e doar intrarea: vezi ce e disponibil acum si
            intri in detaliu cand ai nevoie.
          </p>
        </div>
      </section>

      {/* Manifesto band: high-contrast Swiss slab */}
      <section
        className="border-b border-zinc-900 bg-zinc-900 py-14 text-zinc-50 sm:py-16 lg:py-20"
        aria-labelledby="home-manifesto-heading"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
          <div className="lg:col-span-7">
            <p
              id="home-manifesto-heading"
              className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500"
            >
              Principiu
            </p>
            <p className="mt-5 text-balance text-2xl font-medium leading-snug tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
              In constructii, timpul si claritatea costa. Aici vezi pretul,
              termenul si starea — fara sa sapi prin paragrafe.
            </p>
          </div>
          <div className="flex flex-col justify-end border-t border-zinc-800 pt-8 font-mono text-[11px] leading-relaxed text-zinc-500 lg:col-span-5 lg:border-t-0 lg:border-l lg:border-zinc-800 lg:pl-10 lg:pt-0">
            <p>
              Tranzactii intre profesionisti: licitatii pentru oportunitati,
              magazin pentru stocuri si livrari repetabile. Aceeasi identitate
              vizuala pe tot fluxul, ca sa nu pierzi contextul.
            </p>
          </div>
        </div>
      </section>

      {/* 03 — Auctions */}
      <section
        id="live"
        className="scroll-mt-20 border-b border-zinc-200 bg-zinc-50 py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                  03 / Live
                </p>
              </div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-900 sm:text-3xl">
                Licitatii active
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-[1.65]">
                Selectie scurta: se termina curand. Pentru lista completa si
                filtre, foloseste pagina de licitatii.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <p className="font-mono text-[10px] tabular-nums text-zinc-400">
                Afisate {auctionCount} / max 4
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-9 rounded-md border-zinc-300 bg-white text-zinc-900"
              >
                <Link href="/auctions?sort=ending_soon">
                  Toate licitatiile
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            {endingSoonAuctions.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {endingSoonAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className="transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
                  >
                    <AuctionCard auction={auction} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-300 bg-zinc-50/80 py-16 text-center">
                <Gavel className="mx-auto mb-4 h-10 w-10 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-800">
                  Nici o licitatie activa in acest moment.
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Primul anunt atrage primul licitator.
                </p>
                <Button asChild className="mt-6 rounded-md" size="sm">
                  <Link href="/sell/auction/new">Publica licitatie</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 04 — Marketplace */}
      <section
        id="magazin"
        className="scroll-mt-20 border-b border-zinc-200 bg-white py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                04 / Magazin
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-900 sm:text-3xl">
                Listari recente
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-[1.65]">
                Produse noi sau actualizate. Pentru cautare si categorii, intra
                in marketplace.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <p className="font-mono text-[10px] tabular-nums text-zinc-400">
                Afisate {productCount} / max 4
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-9 rounded-md border-zinc-300 bg-white text-zinc-900"
              >
                <Link href="/marketplace">
                  Deschide magazinul
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="border border-zinc-200 bg-zinc-50/50 p-4 sm:p-6">
            {popularProducts.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {popularProducts.map((product) => (
                  <div
                    key={product.id}
                    className="transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-300 bg-white py-16 text-center">
                <Store className="mx-auto mb-4 h-10 w-10 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-800">
                  Inca nu exista produse listate.
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Un anunt bine facut aduce cereri mai repede.
                </p>
                <Button asChild className="mt-6 rounded-md" size="sm">
                  <Link href="/sell/listing/new">Adauga anunt</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Closing CTA: two-column Swiss closure */}
      <section className="bg-zinc-100 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 border border-zinc-200 bg-white p-8 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12 lg:p-12">
            <div className="space-y-4">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                Urmatorul pas
              </p>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-900 sm:text-2xl">
                Vinzi surplus sau cumperi pentru santier?
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-zinc-600">
                Contul e acelasi pentru magazin si licitatii. Alege fluxul care
                ti se potriveste acum; poti folosi ambele mai tarziu fara alt
                onboarding.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button size="lg" asChild className="h-11 rounded-md px-8 font-semibold">
                <Link href="/sell/listing/new">Anunt in magazin</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-11 rounded-md border-zinc-300 bg-white px-8 font-semibold"
              >
                <Link href="/register">Creeaza cont</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
