import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"

export const metadata = {
  title: "Ghid de utilizare - ConstructionHub Romania",
  description: "Cum îți faci cont, cum cumperi, cum vinzi și cum verifici o comandă pe ConstructionHub Romania.",
}

const SECTIONS = [
  ["cont", "1. Contul tău"],
  ["cumparator", "2. Cum cumperi"],
  ["comenzi", "3. Cum verifici o comandă"],
  ["vanzator", "4. Cum devii vânzător"],
  ["anunt", "5. Cum publici un anunț"],
  ["livrare", "6. Transportul"],
  ["plati", "7. Plăți, comision și documente"],
  ["probleme", "8. Probleme și anulări"],
] as const

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
      <h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-primary/5 p-3 text-foreground">{children}</p>
}

export default function GhidPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Ghid" }]} />
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Ghid</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Cum folosești platforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pașii esențiali pentru cumpărători și vânzători. Durează 5 minute.
        </p>
      </div>

      <nav className="mb-6 grid gap-1 rounded-2xl border border-border/50 bg-card p-4 text-sm sm:grid-cols-2">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-foreground underline-offset-2 hover:underline">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        <Section id="cont" title="1. Contul tău">
          <ol className="space-y-2">
            <Step n={1}>
              Creează cont din <Link href="/register" className="underline">Înregistrare</Link> cu emailul și o parolă
              (minim 8 caractere, cu literă și cifră).
            </Step>
            <Step n={2}>
              În <Link href="/account?tab=profile" className="underline">Cont → Profil</Link> completează numele și
              telefonul (ex: 0722 123 456).
            </Step>
            <Step n={3}>
              În <Link href="/account?tab=addresses" className="underline">Cont → Adrese</Link> adaugă adresa de
              livrare (șantierul). O poți marca implicită.
            </Step>
          </ol>
          <Tip>Lista „Primii pași” din contul tău îți arată ce mai ai de completat.</Tip>
        </Section>

        <Section id="cumparator" title="2. Cum cumperi">
          <ol className="space-y-2">
            <Step n={1}>
              Intră în <Link href="/marketplace" className="underline">Magazin</Link> și filtrează după tip (beton,
              materiale, utilaje, servicii), material, localitate sau preț.
            </Step>
            <Step n={2}>
              Deschide anunțul. Pentru <strong>beton</strong> și <strong>materiale cu transport</strong> apeși
              „Configurează”: alegi clasa/consistența sau vehiculul și numărul de curse, apoi adresa de livrare.
            </Step>
            <Step n={3}>
              Adaugă în coș. Un coș conține produse de la <strong>un singur vânzător</strong>; pentru alt vânzător
              plasezi o comandă separată.
            </Step>
            <Step n={4}>
              Din <Link href="/cart" className="underline">Coș</Link> mergi la „Finalizează comanda”, verifică datele
              de facturare (persoană fizică sau firmă cu CUI) și confirmă.
            </Step>
          </ol>
          <Tip>
            Prețul final este calculat de server la plasarea comenzii. Dacă un produs nu mai e disponibil sau
            cantitatea depășește stocul, primești un mesaj clar și nu se creează comanda.
          </Tip>
        </Section>

        <Section id="comenzi" title="3. Cum verifici o comandă">
          <ol className="space-y-2">
            <Step n={1}>
              Mergi în <Link href="/account?tab=orders" className="underline">Cont → Comenzi</Link>. Ai două liste:
              <strong> Cumpărături</strong> și <strong>Vânzări</strong>. Comenzile care cer o acțiune de la tine sunt
              marcate cu portocaliu.
            </Step>
            <Step n={2}>
              Deschide comanda: vezi produsele, statusul plății, statusul transportului și istoricul fiecărui pas.
            </Step>
            <Step n={3}>
              Descarcă <strong>proforma</strong> (PDF) din pagina comenzii. Cumpărătorul vede exemplarul lui,
              vânzătorul pe al său.
            </Step>
            <Step n={4}>
              Când marfa ajunge pe șantier, apasă <strong>„Confirm livrarea”</strong>. Comanda devine „Finalizată”.
            </Step>
          </ol>
          <p>
            Statusuri: <strong>În așteptare</strong> (plasată), <strong>Confirmată</strong> (plătită),
            <strong> Finalizată</strong> (livrată), <strong>Anulată</strong>.
          </p>
        </Section>

        <Section id="vanzator" title="4. Cum devii vânzător">
          <ol className="space-y-2">
            <Step n={1}>
              În <Link href="/account?tab=business" className="underline">Cont → Date firmă</Link> alege forma
              juridică (PF, PFA, SRL…). Pentru firme completează denumirea și <strong>CUI-ul</strong> (verificat
              automat).
            </Step>
            <Step n={2}>
              Completează <strong>adresa fiscală</strong> și <strong>IBAN-ul</strong> în care primești banii.
            </Step>
            <Step n={3}>
              În <Link href="/account?tab=seller-dashboard" className="underline">Vânzător → Dashboard</Link> apasă
              „Activează contul de vânzător”. Butonul devine activ după ce toate datele sunt corecte.
            </Step>
          </ol>
          <Tip>CUI-ul, IBAN-ul și adresa fiscală apar doar pe proformele comenzilor tale, nu în profilul public.</Tip>
        </Section>

        <Section id="anunt" title="5. Cum publici un anunț">
          <ol className="space-y-2">
            <Step n={1}>
              Apasă <Link href="/sell/listing/new" className="underline">Anunț nou</Link> și alege tipul: beton,
              materiale, utilaje sau servicii.
            </Step>
            <Step n={2}>
              Scrie titlul, prețul <strong>fără TVA</strong>, unitatea (tone, m³, bucăți…) și cantitatea disponibilă.
              Pentru materiale alegi categoria și materialul exact; platforma îți arată doar unitățile potrivite
              (ex: agregatele se vând la tonă sau m³, nu la kg).
            </Step>
            <Step n={3}>
              Spune dacă <strong>asiguri transportul</strong>. Dacă da, adaugă vehiculele și costul pe cursă. Dacă
              nu, transportul îl organizează platforma.
            </Step>
            <Step n={4}>Adaugă fotografii și publică. Anunțul apare în Magazin.</Step>
          </ol>
          <Tip>
            Dacă publicarea are taxă, anunțul se salvează ca inactiv; îl publici din „Anunțurile mele” după plată.
            Cu abonament, publicarea poate fi gratuită (vezi „Abonament”).
          </Tip>
        </Section>

        <Section id="livrare" title="6. Transportul">
          <p>
            <strong>Transport asigurat de vânzător:</strong> costul apare din start în comandă. Vânzătorul
            programează livrarea, iar tu confirmi primirea.
          </p>
          <p>
            <strong>Transport organizat de platformă:</strong> după comandă, operatorul trimite o ofertă de transport
            (valabilă un timp limitat). O accepți sau o refuzi din pagina comenzii; după acceptare o plătești, apoi
            se alocă transportatorul.
          </p>
          <p>
            <strong>Materiale vrac în cisternă</strong> (ciment, filer, bitum): transportul se ofertează separat de
            operator.
          </p>
        </Section>

        <Section id="plati" title="7. Plăți, comision și documente">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Prețurile din magazin includ comisionul platformei. Vânzătorul primește prețul lui integral;
              comisionul este plătit de cumpărător.
            </li>
            <li>Plata se face pe pagina securizată a procesatorului. Nu stocăm datele cardului.</li>
            <li>
              Fiecare comandă are trei proforme: a vânzătorului (produsele), a platformei (comisionul) și un
              exemplar pentru cumpărător cu totalul de plată. Proforma nu este factură fiscală.
            </li>
            <li>Vânzătorii văd sumele de primit în „Vânzător → Decontări”.</li>
          </ul>
        </Section>

        <Section id="probleme" title="8. Probleme și anulări">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Poți anula din pagina comenzii cât timp marfa nu a plecat. Cantitatea revine în stoc, iar sumele
              plătite intră la rambursare.
            </li>
            <li>Dacă livrarea are o problemă, apasă „Raportează problemă” și descrie ce s-a întâmplat.</li>
            <li>
              Pentru întrebări scrie vânzătorului din <Link href="/account?tab=messages" className="underline">Mesaje</Link>.
            </li>
            <li>
              Datele tale: în <Link href="/account?tab=privacy" className="underline">Confidențialitate</Link> poți
              descărca tot ce avem despre tine sau cere ștergerea contului.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
