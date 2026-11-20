import { ClipboardList, Truck } from "lucide-react"
import { formatMoney } from "@/components/shared/money-display"
import {
  CONCRETE_CLASS_CATALOG,
  CONSISTENCY_LABELS,
  type ConcreteClassCode,
  type ConcreteConsistency,
} from "@/lib/listing-wizard-types"
import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_LABELS,
  VEHICLE_LABELS,
  type MaterialCategoryCode,
  type VehicleCode,
} from "@/lib/materials-logistics/catalog"
import { EQUIPMENT_CONDITION_LABELS } from "@/lib/listings/rules"
import type { ProductDetail } from "@/types/domain"

const UNIT_LABEL: Record<string, string> = {
  TON: "tonă", KG: "kg", M3: "m³", BUC: "bucată", ML: "metru liniar", CUP: "cupă", CAMION: "camion",
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  )
}

/** Technical details per listing type, from the data the seller was required to enter. */
export function ListingSpecs({ product }: { product: ProductDetail }) {
  const unit = UNIT_LABEL[product.unit] ?? product.unit
  const ml = product.materialLogistics
  const qty = (n: number | null | undefined) => (n == null ? null : `${n.toLocaleString("ro-RO")} ${unit}`)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" /> Detalii tehnice
        </h2>
        <dl>
          <Row label="Unitate de vânzare" value={unit} />
          <Row label="Disponibil" value={product.listingKind === "services" ? null : qty(product.availableQty)} />
          <Row label="Comandă minimă" value={qty(product.minOrderQty)} />
          <Row label="Locație" value={product.location} />
          {ml && (
            <>
              <Row label="Categorie" value={MATERIAL_CATEGORY_LABELS[ml.categoryCode as MaterialCategoryCode] ?? ml.categoryCode} />
              <Row label="Material" value={MATERIAL_LABELS[ml.materialCode] ?? ml.materialCode} />
              <Row label="Greutate per unitate" value={ml.palletSacKg ? `${ml.palletSacKg} kg` : null} />
              <Row
                label="Palet"
                value={ml.palletPieces || ml.palletTotalKg ? [ml.palletPieces ? `${ml.palletPieces} buc` : null, ml.palletTotalKg ? `${ml.palletTotalKg} kg` : null].filter(Boolean).join(" · ") : null}
              />
              <Row label="Lungime maximă piesă" value={ml.maxPieceLengthM ? `${ml.maxPieceLengthM} m` : null} />
              <Row label="Descărcare cu macara" value={ml.macaraAddon ? `Da (${formatMoney(ml.macaraFee ?? 0, product.currency)})` : null} />
            </>
          )}
          {product.listingKind === "equipment" && (
            <>
              <Row label="Marcă / model" value={product.equipmentModel} />
              <Row label="An fabricație" value={product.equipmentYear} />
              <Row
                label="Stare"
                value={product.equipmentCondition ? (EQUIPMENT_CONDITION_LABELS as Record<string, string>)[product.equipmentCondition] ?? product.equipmentCondition : null}
              />
            </>
          )}
          {product.listingKind === "services" && <Row label="Zonă deservită" value={product.serviceArea} />}
        </dl>
      </section>

      {product.listingKind === "concrete" && product.concreteClasses.length > 0 && (
        <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-bold text-foreground">Clase de beton și prețuri</h2>
          <p className="mb-3 text-xs text-muted-foreground">Prețuri / {unit}, fără TVA și fără transport. Transportul se calculează la configurare.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Clasă</th>
                  {(Object.keys(CONSISTENCY_LABELS) as ConcreteConsistency[]).map((c) => (
                    <th key={c} className="py-2 text-right">{CONSISTENCY_LABELS[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {product.concreteClasses.map((cl) => {
                  const cat = CONCRETE_CLASS_CATALOG[cl.classCode as ConcreteClassCode]
                  return (
                    <tr key={cl.classCode} className="border-t border-border/40">
                      <td className="py-2 font-semibold">
                        {cat?.label ?? cl.classCode}
                        {cat?.bMark && <span className="ml-1 text-xs font-normal text-muted-foreground">({cat.bMark})</span>}
                      </td>
                      {(Object.keys(CONSISTENCY_LABELS) as ConcreteConsistency[]).map((c) => {
                        const v = cl.consistencyPrices[c]
                        return (
                          <td key={c} className="py-2 text-right tabular-nums">
                            {v ? formatMoney(Number(v), product.currency) : <span className="text-muted-foreground">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
          <Truck className="h-5 w-5 text-primary" /> Livrare
        </h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          {product.sellerAssumesTransport ? (
            <p>
              <strong className="text-foreground">Livrare asigurată de vânzător.</strong>{" "}
              {product.transportFee
                ? `Cost transport: ${formatMoney(product.transportFee, product.currency)}${ml ? " pe cursă" : ""}.`
                : "Costul transportului este inclus în condițiile vânzătorului."}
            </p>
          ) : (
            <p>
              <strong className="text-foreground">Transport organizat de platformă.</strong> După comandă primești o
              ofertă de transport pe care o accepți sau o refuzi.
            </p>
          )}
          {product.listingKind === "concrete" && (product.transportModes?.length ?? 0) > 0 && (
            <p>Moduri: {product.transportModes!.map((m) => (m === "CIFA" ? "Autobetonieră (CIFA)" : m === "POMPA" ? "Pompă" : m)).join(", ")}</p>
          )}
          {ml && ml.transportOffers.length > 0 && (
            <p>
              Vehicule disponibile:{" "}
              {ml.transportOffers.map((o) => `${VEHICLE_LABELS[o.vehicleCode as VehicleCode] ?? o.vehicleCode} ${o.payloadT}t`).join(", ")}
            </p>
          )}
          <p className="text-xs">Distanța și numărul de curse se stabilesc la configurare, înainte de plată.</p>
        </div>
      </section>
    </div>
  )
}
