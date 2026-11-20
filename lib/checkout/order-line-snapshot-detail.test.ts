import { describe, expect, it } from "vitest"
import { orderLineSnapshotSubline } from "./order-line-snapshot-detail"

describe("orderLineSnapshotSubline", () => {
  it("formats materials logistics from snapshot", () => {
    const s = orderLineSnapshotSubline({
      materials_vehicle_code: "DUBA",
      materials_payload_t: 3.5,
      materials_trips: 2,
      materials_macara_addon: true,
      materials_category_code: "AGREGATE_CARIERA",
      materials_material_code: "criblura_0_4",
    })
    expect(s).toContain("Livrare:")
    expect(s).toContain("Duba")
    expect(s).toContain("3.5t")
    expect(s).toContain("2 curse")
    expect(s).toContain("+macara")
    expect(s).toContain("Agregate de cariera")
    expect(s).toContain("Criblura")
  })

  it("uses singular cursă for one trip", () => {
    const s = orderLineSnapshotSubline({
      materials_vehicle_code: "TIR",
      materials_payload_t: 24,
      materials_trips: 1,
      materials_macara_addon: false,
    })
    expect(s).toContain("1 cursă")
    expect(s).not.toContain("1 curse")
  })

  it("falls back to concrete class lines when no materials vehicle", () => {
    expect(
      orderLineSnapshotSubline({
        concrete_class_code: "C25/30",
        concrete_consistency: "S3",
      }),
    ).toBe("C25/30 · S3")
  })

  it("returns null for empty snapshot", () => {
    expect(orderLineSnapshotSubline({})).toBeNull()
    expect(orderLineSnapshotSubline(null)).toBeNull()
  })

  it("notes transport that was not charged", () => {
    expect(orderLineSnapshotSubline({ transport_status: "manual_quote" })).toBe(
      "Transport în cisternă — ofertă manuală, neinclus",
    )
    expect(
      orderLineSnapshotSubline({ concrete_class_code: "C25/30", transport_status: "platform_quote" }),
    ).toBe("C25/30 · Transport organizat de platformă — cost confirmat separat")
    expect(orderLineSnapshotSubline({ concrete_class_code: "C25/30", transport_status: "seller_fee" })).toBe("C25/30")
  })
})
