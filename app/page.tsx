import Link from "next/link";
import {
  ArrowRight as ArrowRightIcon,
  BadgeEuro,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gavel,
  Hammer,
  Package,
  Shield,
  Sparkles,
  Store,
  Truck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuctionCard } from "@/components/shared/auction-card";
import { ProductCard } from "@/components/shared/product-card";
import { getAuctions } from "@/lib/api/auctions";
import { getProductListItems } from "@/lib/api/listings";

const constructionTopics = [
  "otel beton",
  "ciment",
  "agregate",
  "prefabricate",
  "utilaje",
  "containere",
  "cofraje",
  "panouri",
];

export default async function HomePage() {
  const [auctionsData, productsData] = await Promise.all([
    getAuctions({ status: "active", sort: "ending_soon" }),
    getProductListItems({ sort: "newest", limit: 4 }),
  ]);

  const endingSoonAuctions = auctionsData.items.slice(0, 4);
  const popularProducts = productsData.items;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0e13] text-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.18),transparent_28%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(245,158,11,0.12),transparent_24%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.05),transparent_22%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="pointer-events-none absolute left-[-120px] top-10 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute right-[-120px] top-32 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl motion-safe:animate-pulse" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-24 lg:pt-14">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">
                platforma noua
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
              <Clock3 className="h-3.5 w-3.5 text-white/70" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                mobile first
              </span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            {/* left */}
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <Hammer className="h-3.5 w-3.5 text-amber-300" />
                licitatii + marketplace pentru constructii
              </div>

              <h1 className="mt-5 max-w-5xl text-balance text-[2.5rem] font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Cumperi, vinzi si
                <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                  licitezi mai clar
                </span>
                <span className="block text-white/90">in constructii</span>
              </h1>

              <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-slate-300 sm:text-base md:text-lg">
                O platforma construita pentru materiale, utilaje, stocuri si
                oportunitati reale. Mai putin aspect generic, mai mult accent pe
                informatie, incredere si actiuni rapide de pe mobil.
              </p>

              <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
                <Button
                  size="lg"
                  asChild
                  className="h-12 rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 text-sm font-bold text-[#1e1404] shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition hover:scale-[1.01] hover:from-amber-300 hover:to-orange-400 sm:text-base"
                >
                  <Link href="/auctions">
                    <Gavel className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Exploreaza licitatiile
                  </Link>
                </Button>

                <Button
                  size="lg"
                  asChild
                  className="h-12 rounded-2xl border border-white/15 bg-white/5 px-6 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:scale-[1.01] hover:bg-white/10 sm:text-base"
                >
                  <Link href="/marketplace">
                    <Store className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Vezi marketplace
                  </Link>
                </Button>

                <Button
                  size="lg"
                  asChild
                  className="h-12 rounded-2xl border border-amber-400/30 bg-transparent px-6 text-sm font-bold text-amber-300 transition hover:scale-[1.01] hover:bg-amber-400/10 sm:text-base"
                >
                  <Link href="/sell/auction/new">
                    Publica licitatie
                    <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
                  <p className="text-sm font-bold text-white">Design cinstit</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Fara statistici inventate. Proiect nou, construit corect,
                    pas cu pas.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
                  <p className="text-sm font-bold text-white">
                    Util pe santier
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Structura simpla, CTA-uri clare, informatie usor de scanat
                    pe telefon.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
                  <p className="text-sm font-bold text-white">
                    Focus industrial
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Materiale, utilaje, containere, stocuri si licitatii
                    relevante pentru domeniu.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {constructionTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* right */}
            <div className="relative">
              <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-amber-500/20 via-transparent to-transparent blur-2xl" />

              <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5">
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.06),transparent_35%,transparent)]" />
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl motion-safe:animate-pulse" />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                        Flux rapid
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        O structura cu personalitate, nu un landing generic
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
                      <Building2 className="h-5 w-5 text-amber-400" />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="group rounded-2xl border border-white/10 bg-[#10161d] p-4 transition hover:border-amber-400/20 hover:bg-[#111922]">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                          <Store className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">Publici rapid</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            Adaugi produs sau licitatie, incarci imagini si
                            completezi esentialul.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-white/10 bg-[#10161d] p-4 transition hover:border-amber-400/20 hover:bg-[#111922]">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                          <Gavel className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            Primesti oferte si interes
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            Utilizatorii pot urmari, licita si compara mai usor
                            ofertele.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-white/10 bg-[#10161d] p-4 transition hover:border-amber-400/20 hover:bg-[#111922]">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                          <BadgeEuro className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            Decizii mai clare
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            Mai putin zgomot vizual, mai mult focus pe produs,
                            pret si actiune.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                        ton vizual
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        Carbune, metal, amber
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Mai potrivit pentru constructii decat combinatii
                        colorate de tip startup.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                        micro motion
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        Subtil, nu agresiv
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Glow-uri, ping-uri si tranzitii discrete care dau viata
                        paginii.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* mobile quick links */}
          <div className="mt-8 grid gap-3 sm:hidden">
            <Link
              href="/auctions"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <span className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-amber-400" />
                Licitatii active
              </span>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </Link>

            <Link
              href="/marketplace"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4 text-amber-400" />
                Marketplace materiale
              </span>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="border-b border-white/10 bg-[#0d131a]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Mai multa claritate</p>
                  <p className="text-xs leading-5 text-slate-400">
                    Flux simplu pentru cumparare si publicare
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                  <Truck className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Potrivit pentru mobil</p>
                  <p className="text-xs leading-5 text-slate-400">
                    Utilizatori din teren, birou sau deplasare
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                  <Package className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Orientat pe industrie</p>
                  <p className="text-xs leading-5 text-slate-400">
                    Materiale, utilaje, stocuri si licitatii
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/12 p-2 ring-1 ring-amber-400/10">
                  <Wrench className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Aspect mai solid</p>
                  <p className="text-xs leading-5 text-slate-400">
                    Mai mult caracter, mai putin sablon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUCTIONS */}
      <section className="bg-[#0a0e13] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-500/10 px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  live
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
                Licitatii active
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Sectiunea prioritara pentru oportunitati care se misca rapid si
                merita urmarite.
              </p>
            </div>

            <Button
              variant="outline"
              className="h-11 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/5"
              asChild
            >
              <Link href="/auctions?sort=ending_soon">
                Vezi toate
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-4">
            {endingSoonAuctions.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {endingSoonAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className="rounded-[24px] bg-black/10 p-1 transition hover:-translate-y-0.5"
                  >
                    <AuctionCard auction={auction} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 py-16 text-center">
                <Gavel className="mx-auto mb-4 h-10 w-10 text-amber-400/60" />
                <p className="text-sm font-semibold text-white/80">
                  Nu exista licitatii active momentan
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Publica prima licitatie si incepe sa aduni interes real.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section className="border-y border-white/10 bg-[#10161d] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <Store className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  marketplace
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
                Materiale si produse recent listate
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                O zona mai curata si mai premium vizual, fara culori care rup
                identitatea industriala.
              </p>
            </div>

            <Button
              variant="outline"
              className="h-11 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/5"
              asChild
            >
              <Link href="/marketplace">
                Vezi marketplace
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-black/10 p-3 sm:p-4">
            {popularProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {popularProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[24px] bg-white/[0.02] p-1 transition hover:-translate-y-0.5"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
                <Store className="mx-auto mb-4 h-10 w-10 text-amber-400/60" />
                <p className="text-sm font-semibold text-white/80">
                  Nu exista produse disponibile momentan
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Adauga produse noi pentru a da greutate paginii.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SEO / CONTENT */}
      <section className="bg-[#0a0e13] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              ghiduri utile
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
              Continut care umple pagina cu sens, nu doar cu decor
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
              Aici poti construi in timp o zona puternica pentru SEO si
              incredere: explicatii simple, bune practici, ghiduri scurte si
              raspunsuri la intrebarile pe care le are publicul tau.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-lg font-bold text-white">
                Cum publici un anunt mai bun
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Titlu clar: produsul, cantitatea si starea.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Poze reale, curate, fara imagini luate de pe internet.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Specificatii tehnice si unitate de masura explicate simplu.
                </li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-lg font-bold text-white">
                Cum licitezi mai bine
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Verifica timpul ramas si pasul minim de licitare.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Citeste atent descrierea si imaginile inainte sa oferi.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Stabileste un plafon intern ca sa nu licitezi emotional.
                </li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-lg font-bold text-white">
                De ce conteaza designul aici
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Utilizatorul trebuie sa ajunga repede la informatia esentiala.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  O identitate mai industriala inspira mai multa coerenta.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  Mobilul cere ierarhie buna, nu decor inutil.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-[#101720] p-6">
              <p className="text-lg font-bold text-white">
                Idei bune de continut pentru viitor
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Ghiduri despre materiale de constructii, articole despre
                preturi, explicatii despre alegerea utilajelor, checklist-uri
                pentru publicarea anunturilor si FAQ-uri despre licitare.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Aceste zone fac pagina sa para vie chiar si la inceput, iar in
                timp aduc si valoare SEO reala.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#101720] p-6">
              <p className="text-lg font-bold text-white">
                Ce expresii merita acoperite natural
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "licitatii constructii",
                  "materiale constructii",
                  "utilaje second hand",
                  "vanzare containere",
                  "otel beton pret",
                  "agregate si prefabricate",
                  "anunturi materiale",
                  "licitare online",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-white/10 bg-[#10161d] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              faq
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
              Intrebari frecvente
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              {
                q: "Pot publica atat produse, cat si licitatii?",
                a: "Da. Platforma este gandita pentru ambele fluxuri: marketplace si licitatii.",
              },
              {
                q: "Este potrivita pentru firme de constructii?",
                a: "Da. Accentul este pe materiale, stocuri, utilaje si anunturi relevante pentru domeniu.",
              },
              {
                q: "Se foloseste bine de pe telefon?",
                a: "Da. Pagina este gandita mobile-first, cu actiuni clare si structurare usor de parcurs.",
              },
              {
                q: "Cum cresc sansele sa vand mai repede?",
                a: "Cu poze reale, titlu clar, descriere buna si un pret sau pas de licitare coerent.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <p className="font-bold text-white">{item.q}</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
    </div>
  );
}
