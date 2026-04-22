"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductDetail, ProductUnit } from "@/types/domain";
import { AddressAutocomplete } from "@/components/shared/address-autocomplete";
import { RouteMap } from "@/components/shared/route-map";
import {
  computeRoute,
  geocodeOne,
  RoutingError,
  type GeocodeResult,
  type LatLng,
  type RouteResult,
} from "@/lib/api/routing";

// ============================================================
// SECTION 1: SCHEMA-ALIGNED TYPE DEFINITIONS
// ============================================================

export type UnitEnum = "TON" | "KG" | "M3" | "BUC" | "ML";
export type CurrencyEnum = "RON" | "EUR";

export interface ProfileRow {
  id: string;
  display_name: string;
  phone?: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface MarketplaceListingRow {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  unit: UnitEnum;
  currency: CurrencyEnum;
  available_qty: number;
  is_active: boolean;
  location: string;
}

// ============================================================
// SECTION 2: TEMPORARY IN-FILE RULE LAYER
// (Replace these with Supabase queries once tables are created)
// ============================================================

export interface SupplierTransportRule {
  id: string;
  supplier_id: string;
  transport_type: "CIFA" | "POMPA" | "VRAC" | "DEPOZIT" | "ALL";
  delivery_zone_label: string;
  max_radius_km: number;
  notes?: string;
}

export interface MaterialTransportCompatibilityRule {
  id: string;
  listing_id?: string;
  category_id?: string;
  allowed_calculator_types: CalculatorType[];
  allowed_units: UnitEnum[];
  notes?: string;
}

export interface MaterialMinimumOrderRule {
  id: string;
  listing_id?: string;
  category_id?: string;
  supplier_id?: string;
  min_order_qty: number;
  unit: UnitEnum;
  notes?: string;
}

export interface DeliveryCoverageRule {
  id: string;
  supplier_id: string;
  delivery_zone_label: string;
  covered_locations: string[];
  notes?: string;
}

export interface CifaRule {
  id: string;
  supplier_id: string;
  default_capacity_mc: number;
  min_capacity_mc: number;
  max_capacity_mc: number;
  transport_per_km_lei: number;
  min_transport_lei: number;
  underload_fee_per_mc: number;
  tube_fee_lei: number;
  default_included_unloading_minutes: number;
  default_waiting_fee_per_min_lei: number;
  notes?: string;
}

export interface PumpRule {
  id: string;
  supplier_id: string;
  min_service_fee_lei: number;
  min_service_mc: number;
  extra_per_mc_lei: number;
  transport_per_km_lei: number;
  min_transport_lei: number;
  included_hose_m: number;
  extra_hose_fee_per_10m_lei: number;
  calare_fee_per_unit_lei: number;
  notes?: string;
}

export interface VracRule {
  id: string;
  supplier_id: string;
  threshold_km: number;
  transport_coeff: number;
  min_course_fee_lei: number;
  underload_fee_per_ton_lei: number;
  notes?: string;
}

// ============================================================
// SECTION 2B: CENTRALIZED DEFAULTS
// These are fallback values used ONLY when no supplier rule exists
// ============================================================

const CIFA_DEFAULTS = {
  transport_per_km_lei: 12,
  min_transport_lei: 200,
  underload_fee_per_mc: 50,
  tube_fee_lei: 60,
  default_included_unloading_minutes: 10,
  default_waiting_fee_per_min_lei: 5,
  default_capacity_mc: 7,
  min_capacity_mc: 4,
  max_capacity_mc: 10,
} as const;

const POMPA_DEFAULTS = {
  min_service_fee_lei: 600,
  min_service_mc: 18,
  extra_per_mc_lei: 27,
  transport_per_km_lei: 14,
  min_transport_lei: 200,
  included_hose_m: 40,
  extra_hose_fee_per_10m_lei: 100,
  calare_fee_per_unit_lei: 100,
} as const;

const VRAC_DEFAULTS = {
  threshold_km: 45,
  transport_coeff: 0.45,
  min_course_fee_lei: 320,
  underload_fee_per_ton_lei: 20,
} as const;

// ============================================================
// SECTION 3-6: In-file catalog/rule rows (empty; Supabase later)
// Flow mode uses buildMarketplaceFlowValidationSource only.
// ============================================================

export const mockProfiles: ProfileRow[] = []
export const mockCategories: CategoryRow[] = []
export const mockListings: MarketplaceListingRow[] = []

export const mockCifaRules: CifaRule[] = []
export const mockPumpRules: PumpRule[] = []
export const mockVracRules: VracRule[] = []
export const mockSupplierTransportRules: SupplierTransportRule[] = []
export const mockMaterialCompatibility: MaterialTransportCompatibilityRule[] = []
export const mockMinimumOrders: MaterialMinimumOrderRule[] = []
export const mockDeliveryCoverage: DeliveryCoverageRule[] = []

// ============================================================
// SECTION 7: CALCULATOR TYPE & QUOTE TYPES
// ============================================================

export type CalculatorType = "CIFA" | "POMPA" | "VRAC" | "DEPOZIT";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface QuoteBreakdown {
  calculator_type: CalculatorType;
  is_valid: boolean;
  is_manual: boolean;
  manual_reason?: string;
  validation_issues: ValidationIssue[];
  warnings: string[];
  assumptions: string[];
  trips?: number;
  material_subtotal?: number;
  transport_subtotal?: number;
  surcharges_subtotal?: number;
  surcharge_details?: { label: string; amount: number }[];
  total_net?: number;
  vat_amount?: number;
  vat_rate?: number;
  total_gross?: number;
  transport_description?: string;
}

// ============================================================
// SECTION 8: ADAPTER FUNCTIONS & RULE LOOKUPS
// ============================================================

export function mapProfileToSupplierOption(p: ProfileRow) {
  return { value: p.id, label: p.display_name, phone: p.phone };
}

export function mapListingToMaterialOption(l: MarketplaceListingRow) {
  return {
    value: l.id,
    label: l.title,
    price: l.price,
    unit: l.unit,
    currency: l.currency,
    available_qty: l.available_qty,
    seller_id: l.seller_id,
    category_id: l.category_id,
    location: l.location,
  };
}

export function getApplicableTransportRules(
  supplierId: string,
  calcType: CalculatorType,
  pool: SupplierTransportRule[] = mockSupplierTransportRules,
): SupplierTransportRule[] {
  return pool.filter(
    (r) =>
      r.supplier_id === supplierId &&
      (r.transport_type === calcType || r.transport_type === "ALL"),
  );
}

export function getCompatibilityRule(
  listingId: string,
  categoryId: string,
  pool: MaterialTransportCompatibilityRule[] = mockMaterialCompatibility,
): MaterialTransportCompatibilityRule | undefined {
  const byListing = pool.find((r) => r.listing_id === listingId);
  if (byListing) return byListing;
  return pool.find((r) => r.category_id === categoryId);
}

export function getMinimumOrder(
  listingId: string,
  categoryId: string,
  supplierId?: string,
  pool: MaterialMinimumOrderRule[] = mockMinimumOrders,
): MaterialMinimumOrderRule | undefined {
  // First check listing-specific
  const byListing = pool.find((r) => r.listing_id === listingId);
  if (byListing) return byListing;
  // Then supplier+category
  if (supplierId) {
    const bySupplierCat = pool.find(
      (r) => r.supplier_id === supplierId && r.category_id === categoryId,
    );
    if (bySupplierCat) return bySupplierCat;
  }
  // Fall back to category
  return pool.find(
    (r) => r.category_id === categoryId && !r.supplier_id && !r.listing_id,
  );
}

export function getCifaRule(supplierId: string): CifaRule | undefined {
  return mockCifaRules.find((r) => r.supplier_id === supplierId);
}

export function getPumpRule(supplierId: string): PumpRule | undefined {
  return mockPumpRules.find((r) => r.supplier_id === supplierId);
}

export function getVracRule(supplierId: string): VracRule | undefined {
  return mockVracRules.find((r) => r.supplier_id === supplierId);
}

export function getDeliveryCoverage(
  supplierId: string,
  pool: DeliveryCoverageRule[] = mockDeliveryCoverage,
): DeliveryCoverageRule | undefined {
  return pool.find((r) => r.supplier_id === supplierId);
}

/** Merged datasets for validateQuoteRequest + UI filters (marketplace configurare flow) */
export interface CalculatorValidationDataSource {
  listings: MarketplaceListingRow[];
  profiles: ProfileRow[];
  categories: CategoryRow[];
  materialCompatibility: MaterialTransportCompatibilityRule[];
  materialMinimumOrders: MaterialMinimumOrderRule[];
  supplierTransportRules: SupplierTransportRule[];
  deliveryCoverage: DeliveryCoverageRule[];
}

/** Maps listing unit to calculator modes allowed by existing validation rules in this file */
export function allowedCalculatorTypesForProductUnit(
  unit: ProductUnit,
): CalculatorType[] {
  if (unit === "M3") return ["CIFA", "POMPA"];
  if (unit === "TON") return ["VRAC"];
  return ["DEPOZIT"];
}

export function defaultCalculatorTypeForUnit(unit: ProductUnit): CalculatorType {
  const a = allowedCalculatorTypesForProductUnit(unit);
  return a[0] ?? "DEPOZIT";
}

/**
 * Builds listing-driven rows and synthetic rules so Supabase-backed listings validate
 * without changing quote formulas (estimates remain orientative until real supplier rules exist).
 */
export function buildMarketplaceFlowValidationSource(
  product: ProductDetail,
): CalculatorValidationDataSource {
  const catKey =
    product.categoryId != null ? String(product.categoryId) : "cat-unknown";
  const listingRow: MarketplaceListingRow = {
    id: product.id,
    seller_id: product.sellerId,
    category_id: catKey,
    title: product.name,
    description: product.description,
    price: product.price,
    unit: product.unit as UnitEnum,
    currency: product.currency as CurrencyEnum,
    available_qty: product.availableQty,
    is_active: true,
    location: product.location ?? "—",
  };
  const profileRow: ProfileRow = {
    id: product.sellerId,
    display_name: product.sellerDisplayName?.trim() || "Furnizor",
    phone: product.sellerPhone ?? undefined,
  };
  const categoryRow: CategoryRow = {
    id: catKey,
    name: product.category || "Categorie",
    slug: "listing-category",
    parent_id: null,
  };
  const allowedTypes = allowedCalculatorTypesForProductUnit(product.unit);
  const compat: MaterialTransportCompatibilityRule = {
    id: `flow-compat-${product.id}`,
    listing_id: product.id,
    category_id: catKey,
    allowed_calculator_types: allowedTypes,
    allowed_units: [product.unit as UnitEnum],
    notes: "Integrare magazin — reguli estimative până la configurarea furnizorului.",
  };
  const syntheticTransport: SupplierTransportRule[] = allowedTypes.map(
    (ct) => ({
      id: `flow-tr-${product.sellerId}-${ct}`,
      supplier_id: product.sellerId,
      transport_type: ct === "DEPOZIT" ? ("ALL" as const) : ct,
      delivery_zone_label: "Estimare magazin",
      max_radius_km: 500,
      notes: "Rază largă pentru simulare; tarifele reale depind de furnizor.",
    }),
  );
  const syntheticCoverage: DeliveryCoverageRule = {
    id: `flow-cov-${product.sellerId}`,
    supplier_id: product.sellerId,
    delivery_zone_label: "România",
    covered_locations: ["România"],
    notes: "Acoperire generică pentru fluxul din magazin.",
  };
  return {
    listings: [listingRow],
    profiles: [profileRow],
    categories: [categoryRow],
    materialCompatibility: [compat],
    materialMinimumOrders: [],
    supplierTransportRules: [...syntheticTransport],
    deliveryCoverage: [syntheticCoverage],
  };
}

// Unit display helper: M3 → "mc" for UI
function displayUnit(unit: UnitEnum): string {
  if (unit === "M3") return "mc";
  return unit.toLowerCase();
}

// ============================================================
// SECTION 9: QUOTE-LEVEL VALIDATION FUNCTION
// ============================================================

export interface ValidatedQuoteRequest {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: string[];
  listing?: MarketplaceListingRow;
  supplier?: ProfileRow;
  category?: CategoryRow;
  compatibilityRule?: MaterialTransportCompatibilityRule;
  minimumOrderRule?: MaterialMinimumOrderRule;
  transportRules: SupplierTransportRule[];
  deliveryCoverage?: DeliveryCoverageRule;
  cifaRule?: CifaRule;
  pumpRule?: PumpRule;
  vracRule?: VracRule;
}

export function validateQuoteRequest(
  supplierId: string,
  listingId: string,
  calcType: CalculatorType,
  quantity: number,
  distanceKm: number,
  dataSource?: CalculatorValidationDataSource,
): ValidatedQuoteRequest {
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];

  const listings = dataSource?.listings ?? [];
  const profiles = dataSource?.profiles ?? [];
  const categories = dataSource?.categories ?? [];
  const materialCompatibility = dataSource?.materialCompatibility ?? [];
  const materialMinimumOrders = dataSource?.materialMinimumOrders ?? [];
  const supplierTransportRulesPool =
    dataSource?.supplierTransportRules ?? [];
  const deliveryCoveragePool = dataSource?.deliveryCoverage ?? [];

  // Basic selection validation
  if (!supplierId) {
    issues.push({
      field: "supplier",
      message: "Selectați un furnizor",
      severity: "error",
    });
  }
  if (!listingId) {
    issues.push({
      field: "listing",
      message: "Selectați un material",
      severity: "error",
    });
  }

  const supplier = profiles.find((p) => p.id === supplierId);
  const listing = listings.find((l) => l.id === listingId);
  const category = listing
    ? categories.find((c) => c.id === listing.category_id)
    : undefined;

  // Listing exists and is active
  if (listing && !listing.is_active) {
    issues.push({
      field: "listing",
      message: "Materialul selectat nu este activ",
      severity: "error",
    });
  }

  // Listing belongs to supplier
  if (listing && supplier && listing.seller_id !== supplier.id) {
    issues.push({
      field: "listing",
      message: "Materialul nu aparține furnizorului selectat",
      severity: "error",
    });
  }

  // Compatibility rule check
  const compatibilityRule = listing
    ? getCompatibilityRule(listing.id, listing.category_id, materialCompatibility)
    : undefined;

  if (listing && compatibilityRule) {
    // Calculator type compatible
    if (!compatibilityRule.allowed_calculator_types.includes(calcType)) {
      issues.push({
        field: "calcType",
        message: `Materialul "${listing.title}" nu este compatibil cu tipul de calcul "${calcType}". Tipuri permise: ${compatibilityRule.allowed_calculator_types.join(", ")}`,
        severity: "error",
      });
    }
    // Unit compatible
    if (!compatibilityRule.allowed_units.includes(listing.unit)) {
      issues.push({
        field: "unit",
        message: `Unitatea materialului (${displayUnit(listing.unit)}) nu este compatibilă cu tipul de transport ales.`,
        severity: "error",
      });
    }
  }

  // Unit validation per calculator type
  if (listing) {
    if (
      (calcType === "CIFA" || calcType === "POMPA") &&
      listing.unit !== "M3"
    ) {
      issues.push({
        field: "unit",
        message: `Calculul ${calcType} necesită materiale în mc. Materialul selectat este în ${displayUnit(listing.unit)}.`,
        severity: "error",
      });
    }
    if (calcType === "VRAC" && listing.unit !== "TON") {
      issues.push({
        field: "unit",
        message: `Calculul VRAC necesită materiale în tone. Materialul selectat este în ${displayUnit(listing.unit)}.`,
        severity: "error",
      });
    }
  }

  // Minimum order check
  const minimumOrderRule = listing
    ? getMinimumOrder(
        listing.id,
        listing.category_id,
        supplierId,
        materialMinimumOrders,
      )
    : undefined;
  if (
    minimumOrderRule &&
    quantity > 0 &&
    quantity < minimumOrderRule.min_order_qty
  ) {
    issues.push({
      field: "quantity",
      message: `Comandă minimă: ${minimumOrderRule.min_order_qty} ${displayUnit(minimumOrderRule.unit)}. Cantitatea introdusă (${quantity}) este insuficientă.`,
      severity: "error",
    });
  }

  // Transport rules for calculator type
  const transportRules = supplierId
    ? getApplicableTransportRules(
        supplierId,
        calcType,
        supplierTransportRulesPool,
      )
    : [];
  if (supplierId && transportRules.length === 0) {
    issues.push({
      field: "transport",
      message: `Furnizorul nu are reguli de transport configurate pentru tipul "${calcType}". Calculul automat nu este disponibil.`,
      severity: "error",
    });
  }

  // Delivery coverage check
  const deliveryCoverage = supplierId
    ? getDeliveryCoverage(supplierId, deliveryCoveragePool)
    : undefined;
  if (supplierId && !deliveryCoverage) {
    warnings.push(
      "Furnizorul nu are zone de livrare definite. Validarea acoperirii se bazează doar pe raza maximă din regula de transport.",
    );
  }

  // Radius check
  if (transportRules.length > 0 && distanceKm > 0) {
    const maxRadius = Math.max(...transportRules.map((r) => r.max_radius_km));
    if (distanceKm > maxRadius) {
      issues.push({
        field: "distance",
        message: `Distanța introdusă (${distanceKm} km) depășește raza maximă de livrare a furnizorului (${maxRadius} km).`,
        severity: "error",
      });
    }
  }

  // Specific rule lookups
  const cifaRule = supplierId ? getCifaRule(supplierId) : undefined;
  const pumpRule = supplierId ? getPumpRule(supplierId) : undefined;
  const vracRule = supplierId ? getVracRule(supplierId) : undefined;

  // Warn if calc type requires specific rule that doesn't exist
  if (
    calcType === "CIFA" &&
    supplierId &&
    !cifaRule &&
    transportRules.length > 0
  ) {
    warnings.push(
      "Furnizorul are transport CIFA configurat, dar nu are regulă de tarifare CIFA. Se vor folosi valorile implicite.",
    );
  }
  if (
    calcType === "POMPA" &&
    supplierId &&
    !pumpRule &&
    transportRules.length > 0
  ) {
    warnings.push(
      "Furnizorul are transport POMPA configurat, dar nu are regulă de tarifare pompă. Se vor folosi valorile implicite.",
    );
  }
  if (
    calcType === "VRAC" &&
    supplierId &&
    !vracRule &&
    transportRules.length > 0
  ) {
    warnings.push(
      "Furnizorul are transport VRAC configurat, dar nu are regulă de tarifare vrac. Se vor folosi valorile implicite.",
    );
  }

  const isValid = !issues.some((i) => i.severity === "error");

  return {
    isValid,
    issues,
    warnings,
    listing: listing,
    supplier,
    category,
    compatibilityRule,
    minimumOrderRule,
    transportRules,
    deliveryCoverage,
    cifaRule,
    pumpRule,
    vracRule,
  };
}

// ============================================================
// SECTION 10: PURE CALCULATOR FUNCTIONS
// ============================================================

export interface CifaInputs {
  distance_one_way_km: number;
  quantity_mc: number;
  material_unit_price_mc: number;
  cifa_capacity_mc: number;
  tube_required: boolean;
  unloading_minutes: number;
  vat_rate: number;
  // Rule-driven values (from supplier rule or defaults)
  supplier_id: string;
}

export interface PompaInputs {
  distance_one_way_km: number;
  pumped_quantity_mc: number;
  hose_length_m: number;
  calari_count: number;
  vat_rate: number;
  supplier_id: string;
  listing_id: string;
  category_id: string;
}

export interface BulkInputs {
  transport_distance_km: number;
  quantity_tons: number;
  material_unit_price_ton: number;
  vehicle_capacity_tons: number;
  vat_rate: number;
  supplier_id: string;
  listing_id: string;
  category_id: string;
}

export interface DepotInputs {
  quantity: number;
  unit_price: number;
  unit: UnitEnum;
  transport_mode: "AUTO" | "MANUAL";
  vat_rate: number;
  listing_id: string;
  category_id: string;
  supplier_id: string;
}

export function calculateCifaQuote(
  inputs: CifaInputs,
  validated: ValidatedQuoteRequest,
): QuoteBreakdown {
  const issues: ValidationIssue[] = [...validated.issues];
  const warnings: string[] = [...validated.warnings];
  const assumptions: string[] = [];

  // If base validation failed, return early
  if (!validated.isValid) {
    return {
      calculator_type: "CIFA",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
    };
  }

  // Get rule or use defaults
  const rule = validated.cifaRule;
  const transport_per_km =
    rule?.transport_per_km_lei ?? CIFA_DEFAULTS.transport_per_km_lei;
  const min_transport =
    rule?.min_transport_lei ?? CIFA_DEFAULTS.min_transport_lei;
  const underload_fee_per_mc =
    rule?.underload_fee_per_mc ?? CIFA_DEFAULTS.underload_fee_per_mc;
  const tube_fee = rule?.tube_fee_lei ?? CIFA_DEFAULTS.tube_fee_lei;
  const included_unloading_min =
    rule?.default_included_unloading_minutes ??
    CIFA_DEFAULTS.default_included_unloading_minutes;
  const waiting_fee_per_min =
    rule?.default_waiting_fee_per_min_lei ??
    CIFA_DEFAULTS.default_waiting_fee_per_min_lei;
  const min_capacity = rule?.min_capacity_mc ?? CIFA_DEFAULTS.min_capacity_mc;
  const max_capacity = rule?.max_capacity_mc ?? CIFA_DEFAULTS.max_capacity_mc;

  // Add rule source to assumptions
  if (rule) {
    assumptions.push(
      `Tarifare CIFA conform regulii furnizorului: ${rule.notes || rule.id}`,
    );
  } else {
    assumptions.push(
      "Tarifare CIFA: valori implicite (furnizorul nu are regulă specifică configurată).",
    );
  }

  // Validate capacity against rule
  if (
    inputs.cifa_capacity_mc < min_capacity ||
    inputs.cifa_capacity_mc > max_capacity
  ) {
    issues.push({
      field: "cifa_capacity_mc",
      message: `Capacitatea cifei (${inputs.cifa_capacity_mc} mc) trebuie să fie între ${min_capacity} și ${max_capacity} mc pentru acest furnizor.`,
      severity: "error",
    });
  }

  // Input validation
  if (inputs.quantity_mc <= 0) {
    issues.push({
      field: "quantity_mc",
      message: "Cantitatea trebuie să fie > 0 mc",
      severity: "error",
    });
  }
  if (inputs.cifa_capacity_mc <= 0) {
    issues.push({
      field: "cifa_capacity_mc",
      message: "Capacitatea cifei trebuie să fie > 0 mc",
      severity: "error",
    });
  }
  if (inputs.distance_one_way_km < 0) {
    issues.push({
      field: "distance_one_way_km",
      message: "Distanța nu poate fi negativă",
      severity: "error",
    });
  }
  if (inputs.material_unit_price_mc <= 0) {
    issues.push({
      field: "material_unit_price_mc",
      message: "Prețul materialului trebuie completat",
      severity: "error",
    });
  }

  if (issues.some((i) => i.severity === "error")) {
    return {
      calculator_type: "CIFA",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
    };
  }

  // Calculate
  const round_trip_km = inputs.distance_one_way_km * 2;
  const transport_per_trip = Math.max(
    min_transport,
    round_trip_km * transport_per_km,
  );
  const trips = Math.ceil(inputs.quantity_mc / inputs.cifa_capacity_mc);
  const total_booked_mc = trips * inputs.cifa_capacity_mc;
  const underload_mc = total_booked_mc - inputs.quantity_mc;
  const underload_fee_total = underload_mc * underload_fee_per_mc;
  const tube_fee_total = inputs.tube_required ? tube_fee : 0;

  let waiting_fee = 0;
  if (inputs.unloading_minutes > included_unloading_min) {
    const extra_min = inputs.unloading_minutes - included_unloading_min;
    waiting_fee = extra_min * waiting_fee_per_min;
  }

  const material_subtotal = inputs.quantity_mc * inputs.material_unit_price_mc;
  const transport_subtotal = trips * transport_per_trip;

  const surcharge_details: { label: string; amount: number }[] = [];
  if (underload_fee_total > 0) {
    surcharge_details.push({
      label: `Taxă diferență încărcare (${underload_mc.toFixed(2)} mc × ${underload_fee_per_mc} RON)`,
      amount: underload_fee_total,
    });
  }
  if (tube_fee_total > 0) {
    surcharge_details.push({
      label: `Taxă tub (${tube_fee} RON)`,
      amount: tube_fee_total,
    });
  }
  if (waiting_fee > 0) {
    surcharge_details.push({
      label: `Taxă staționare (${inputs.unloading_minutes - included_unloading_min} min × ${waiting_fee_per_min} RON)`,
      amount: waiting_fee,
    });
  }

  const surcharges_subtotal =
    underload_fee_total + tube_fee_total + waiting_fee;
  const total_net =
    material_subtotal + transport_subtotal + surcharges_subtotal;
  const vat_amount = total_net * inputs.vat_rate;
  const total_gross = total_net + vat_amount;

  // Assumptions
  if (validated.transportRules.length > 0) {
    const tr = validated.transportRules[0];
    assumptions.push(
      `Transport validat conform zonei: ${tr.delivery_zone_label} (max ${tr.max_radius_km} km).`,
    );
  }
  if (validated.minimumOrderRule) {
    assumptions.push(
      `Comandă minimă aplicată: ${validated.minimumOrderRule.min_order_qty} ${displayUnit(validated.minimumOrderRule.unit)}.`,
    );
  }
  assumptions.push(
    `Capacitate cifa validată: ${min_capacity}–${max_capacity} mc.`,
  );
  assumptions.push(
    `Distanță dus-întors: ${round_trip_km} km. Transport/cursă: ${transport_per_trip.toFixed(2)} RON (minim ${min_transport} RON).`,
  );
  assumptions.push(
    `Primele ${included_unloading_min} minute de descărcare sunt incluse. Taxă staționare: ${waiting_fee_per_min} RON/min.`,
  );
  if (underload_mc > 0) {
    assumptions.push(
      `Cifa de ${inputs.cifa_capacity_mc} mc × ${trips} curse = ${total_booked_mc} mc capacitate. Diferența de ${underload_mc.toFixed(2)} mc neîncărcată se taxează la ${underload_fee_per_mc} RON/mc.`,
    );
  }

  return {
    calculator_type: "CIFA",
    is_valid: true,
    is_manual: false,
    validation_issues: issues,
    warnings,
    assumptions,
    trips,
    material_subtotal,
    transport_subtotal,
    surcharges_subtotal,
    surcharge_details,
    total_net,
    vat_amount,
    vat_rate: inputs.vat_rate,
    total_gross,
    transport_description: `${trips} cursă(e) × ${transport_per_trip.toFixed(2)} RON`,
  };
}

export function calculatePompaQuote(
  inputs: PompaInputs,
  validated: ValidatedQuoteRequest,
): QuoteBreakdown {
  const issues: ValidationIssue[] = [...validated.issues];
  const warnings: string[] = [...validated.warnings];
  const assumptions: string[] = [];

  // If base validation failed, return early
  if (!validated.isValid) {
    return {
      calculator_type: "POMPA",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
    };
  }

  // Check if supplier has pump rule or transport rule
  const rule = validated.pumpRule;
  const hasTransportRule = validated.transportRules.length > 0;

  if (!hasTransportRule) {
    return {
      calculator_type: "POMPA",
      is_valid: false,
      is_manual: true,
      manual_reason:
        "Furnizorul nu are serviciu de pompare configurat. Contactați furnizorul pentru ofertă.",
      validation_issues: issues,
      warnings,
      assumptions: [
        "Calculul automat pentru pompă nu este disponibil — lipsește regula de transport.",
      ],
    };
  }

  // Get rule or defaults
  const min_service_fee =
    rule?.min_service_fee_lei ?? POMPA_DEFAULTS.min_service_fee_lei;
  const min_service_mc = rule?.min_service_mc ?? POMPA_DEFAULTS.min_service_mc;
  const extra_per_mc =
    rule?.extra_per_mc_lei ?? POMPA_DEFAULTS.extra_per_mc_lei;
  const transport_per_km =
    rule?.transport_per_km_lei ?? POMPA_DEFAULTS.transport_per_km_lei;
  const min_transport =
    rule?.min_transport_lei ?? POMPA_DEFAULTS.min_transport_lei;
  const included_hose_m =
    rule?.included_hose_m ?? POMPA_DEFAULTS.included_hose_m;
  const extra_hose_fee_per_10m =
    rule?.extra_hose_fee_per_10m_lei ??
    POMPA_DEFAULTS.extra_hose_fee_per_10m_lei;
  const calare_fee_per_unit =
    rule?.calare_fee_per_unit_lei ?? POMPA_DEFAULTS.calare_fee_per_unit_lei;

  if (rule) {
    assumptions.push(
      `Tarifare pompă conform regulii furnizorului: ${rule.notes || rule.id}`,
    );
  } else {
    assumptions.push(
      "Tarifare pompă: valori implicite (furnizorul nu are regulă specifică configurată).",
    );
  }

  // Validate listing is actually pumpable
  if (validated.listing) {
    const title = validated.listing.title.toLowerCase();
    const desc = validated.listing.description.toLowerCase();
    const isPumpExplicit =
      title.includes("pompabil") ||
      desc.includes("pompabil") ||
      desc.includes("pompare");
    if (
      !isPumpExplicit &&
      validated.compatibilityRule?.allowed_calculator_types.includes("POMPA")
    ) {
      warnings.push(
        `Materialul "${validated.listing.title}" este marcat ca pompabil în reguli, dar denumirea/descrierea nu menționează explicit pompabilitatea. Verificați cu furnizorul.`,
      );
    }
  }

  // Input validation
  if (inputs.pumped_quantity_mc <= 0) {
    issues.push({
      field: "pumped_quantity_mc",
      message: "Cantitatea pompată trebuie să fie > 0 mc",
      severity: "error",
    });
  }
  if (inputs.distance_one_way_km < 0) {
    issues.push({
      field: "distance_one_way_km",
      message: "Distanța nu poate fi negativă",
      severity: "error",
    });
  }
  if (inputs.hose_length_m < 0) {
    issues.push({
      field: "hose_length_m",
      message: "Lungimea furtunului nu poate fi negativă",
      severity: "error",
    });
  }
  if (inputs.calari_count < 0) {
    issues.push({
      field: "calari_count",
      message: "Numărul de calări nu poate fi negativ",
      severity: "error",
    });
  }

  if (issues.some((i) => i.severity === "error")) {
    return {
      calculator_type: "POMPA",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
    };
  }

  // Calculate
  const round_trip_km = inputs.distance_one_way_km * 2;
  const pump_transport = Math.max(
    min_transport,
    round_trip_km * transport_per_km,
  );
  const pump_service_fee =
    inputs.pumped_quantity_mc <= min_service_mc
      ? min_service_fee
      : min_service_fee +
        (inputs.pumped_quantity_mc - min_service_mc) * extra_per_mc;

  const extra_hose_units = Math.ceil(
    Math.max(0, inputs.hose_length_m - included_hose_m) / 10,
  );
  const extra_hose_fee = extra_hose_units * extra_hose_fee_per_10m;
  const calare_fee = inputs.calari_count * calare_fee_per_unit;

  const surcharge_details: { label: string; amount: number }[] = [];
  if (extra_hose_fee > 0) {
    surcharge_details.push({
      label: `Furtun suplimentar (${extra_hose_units} × 10m × ${extra_hose_fee_per_10m} RON)`,
      amount: extra_hose_fee,
    });
  }
  if (calare_fee > 0) {
    surcharge_details.push({
      label: `Taxă calare (${inputs.calari_count} × ${calare_fee_per_unit} RON)`,
      amount: calare_fee,
    });
  }

  const surcharges_subtotal = extra_hose_fee + calare_fee;
  const transport_subtotal = pump_transport + pump_service_fee;
  const total_net = transport_subtotal + surcharges_subtotal;
  const vat_amount = total_net * inputs.vat_rate;
  const total_gross = total_net + vat_amount;

  // Assumptions
  if (validated.transportRules.length > 0) {
    const tr = validated.transportRules[0];
    assumptions.push(
      `Transport pompă validat conform zonei: ${tr.delivery_zone_label} (max ${tr.max_radius_km} km).`,
    );
  }
  assumptions.push(
    `Tarif minim pompă: ${min_service_fee} RON pentru primele ${min_service_mc} mc.`,
  );
  if (inputs.pumped_quantity_mc > min_service_mc) {
    assumptions.push(
      `Supliment pompare: ${(inputs.pumped_quantity_mc - min_service_mc).toFixed(2)} mc × ${extra_per_mc} RON.`,
    );
  }
  assumptions.push(
    `Primii ${included_hose_m} m de furtun sunt incluși. Fiecare 10 m suplimentar: ${extra_hose_fee_per_10m} RON.`,
  );
  assumptions.push(
    `Transport pompă (dus-întors ${round_trip_km} km): ${pump_transport.toFixed(2)} RON (minim ${min_transport} RON).`,
  );

  return {
    calculator_type: "POMPA",
    is_valid: true,
    is_manual: false,
    validation_issues: issues,
    warnings,
    assumptions,
    trips: 1,
    material_subtotal: 0,
    transport_subtotal,
    surcharges_subtotal,
    surcharge_details,
    total_net,
    vat_amount,
    vat_rate: inputs.vat_rate,
    total_gross,
    transport_description: `Transport pompă ${pump_transport.toFixed(2)} RON + Serviciu pompare ${pump_service_fee.toFixed(2)} RON`,
  };
}

export function calculateBulkQuote(
  inputs: BulkInputs,
  validated: ValidatedQuoteRequest,
): QuoteBreakdown {
  const issues: ValidationIssue[] = [...validated.issues];
  const warnings: string[] = [...validated.warnings];
  const assumptions: string[] = [];

  // If base validation failed, return early
  if (!validated.isValid) {
    return {
      calculator_type: "VRAC",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
    };
  }

  // Check if supplier has VRAC transport rule
  if (validated.transportRules.length === 0) {
    return {
      calculator_type: "VRAC",
      is_valid: false,
      is_manual: true,
      manual_reason:
        "Furnizorul nu are transport VRAC configurat. Contactați furnizorul pentru ofertă.",
      validation_issues: issues,
      warnings,
      assumptions: [
        "Calculul automat pentru vrac nu este disponibil — lipsește regula de transport.",
      ],
    };
  }

  // Get rule or defaults
  const rule = validated.vracRule;
  const threshold_km = rule?.threshold_km ?? VRAC_DEFAULTS.threshold_km;
  const transport_coeff =
    rule?.transport_coeff ?? VRAC_DEFAULTS.transport_coeff;
  const min_course_fee =
    rule?.min_course_fee_lei ?? VRAC_DEFAULTS.min_course_fee_lei;
  const underload_fee_per_ton =
    rule?.underload_fee_per_ton_lei ?? VRAC_DEFAULTS.underload_fee_per_ton_lei;

  if (rule) {
    assumptions.push(
      `Tarifare VRAC conform regulii furnizorului: ${rule.notes || rule.id}`,
    );
  } else {
    assumptions.push(
      "Tarifare VRAC: valori implicite (furnizorul nu are regulă specifică configurată).",
    );
  }

  // Input validation
  if (inputs.quantity_tons <= 0) {
    issues.push({
      field: "quantity_tons",
      message: "Cantitatea trebuie să fie > 0 tone",
      severity: "error",
    });
  }
  if (inputs.vehicle_capacity_tons <= 0) {
    issues.push({
      field: "vehicle_capacity_tons",
      message: "Capacitatea vehiculului trebuie să fie > 0 tone",
      severity: "error",
    });
  }
  if (inputs.transport_distance_km < 0) {
    issues.push({
      field: "transport_distance_km",
      message: "Distanța de transport nu poate fi negativă",
      severity: "error",
    });
  }
  if (inputs.material_unit_price_ton <= 0) {
    issues.push({
      field: "material_unit_price_ton",
      message: "Prețul materialului trebuie completat",
      severity: "error",
    });
  }

  // Warn if quantity is much smaller than vehicle capacity
  if (
    inputs.quantity_tons > 0 &&
    inputs.vehicle_capacity_tons > 0 &&
    inputs.quantity_tons < inputs.vehicle_capacity_tons * 0.5
  ) {
    warnings.push(
      `Cantitatea comandată (${inputs.quantity_tons} t) este sub 50% din capacitatea vehiculului (${inputs.vehicle_capacity_tons} t). Oferta poate fi neavantajoasă economic.`,
    );
  }

  if (issues.some((i) => i.severity === "error")) {
    return {
      calculator_type: "VRAC",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
    };
  }

  // Calculate
  const trips = Math.ceil(inputs.quantity_tons / inputs.vehicle_capacity_tons);
  let transport_subtotal = 0;
  const surcharge_details: { label: string; amount: number }[] = [];

  for (let i = 0; i < trips; i++) {
    const remaining = inputs.quantity_tons - i * inputs.vehicle_capacity_tons;
    const loaded_tons = Math.min(inputs.vehicle_capacity_tons, remaining);
    const unused_tons = inputs.vehicle_capacity_tons - loaded_tons;

    let trip_transport: number;
    if (inputs.transport_distance_km > threshold_km) {
      trip_transport =
        inputs.transport_distance_km * transport_coeff * loaded_tons;
    } else {
      trip_transport = min_course_fee + unused_tons * underload_fee_per_ton;
    }
    transport_subtotal += trip_transport;

    if (unused_tons > 0) {
      surcharge_details.push({
        label: `Cursă ${i + 1}: diferență ${unused_tons.toFixed(2)} t × ${underload_fee_per_ton} RON (distanță ≤ ${threshold_km} km)`,
        amount: unused_tons * underload_fee_per_ton,
      });
    }
  }

  const material_subtotal =
    inputs.quantity_tons * inputs.material_unit_price_ton;
  const total_net = material_subtotal + transport_subtotal;
  const vat_amount = total_net * inputs.vat_rate;
  const total_gross = total_net + vat_amount;

  // Assumptions
  if (validated.transportRules.length > 0) {
    const tr = validated.transportRules[0];
    assumptions.push(
      `Transport validat conform zonei: ${tr.delivery_zone_label} (max ${tr.max_radius_km} km).`,
    );
  }
  if (validated.minimumOrderRule) {
    assumptions.push(
      `Comandă minimă aplicată: ${validated.minimumOrderRule.min_order_qty} ${displayUnit(validated.minimumOrderRule.unit)}.`,
    );
  }
  if (inputs.transport_distance_km > threshold_km) {
    assumptions.push(
      `Distanță > ${threshold_km} km: transport = distanță × ${transport_coeff} × tone/cursă.`,
    );
  } else {
    assumptions.push(
      `Distanță ≤ ${threshold_km} km: cursă minimă ${min_course_fee} RON + taxă diferență ${underload_fee_per_ton} RON/tonă lipsă.`,
    );
  }
  assumptions.push(
    `Distanța de transport introdusă (${inputs.transport_distance_km} km) este distanța comercială totală, nu doar dus.`,
  );
  assumptions.push(
    "Verificarea acoperirii se bazează pe regulile de transport și raza maximă a furnizorului, nu pe geocodare.",
  );

  return {
    calculator_type: "VRAC",
    is_valid: true,
    is_manual: false,
    validation_issues: issues,
    warnings,
    assumptions,
    trips,
    material_subtotal,
    transport_subtotal,
    surcharges_subtotal: surcharge_details.reduce((s, d) => s + d.amount, 0),
    surcharge_details,
    total_net,
    vat_amount,
    vat_rate: inputs.vat_rate,
    total_gross,
    transport_description: `${trips} cursă(e), ${inputs.transport_distance_km} km comercial`,
  };
}

export function calculateDepotQuote(
  inputs: DepotInputs,
  validated: ValidatedQuoteRequest,
): QuoteBreakdown {
  const issues: ValidationIssue[] = [...validated.issues];
  const warnings: string[] = [...validated.warnings];
  const assumptions: string[] = [];

  // Check compatibility
  if (validated.listing && validated.compatibilityRule) {
    if (!validated.compatibilityRule.allowed_units.includes(inputs.unit)) {
      issues.push({
        field: "unit",
        message: `Unitatea "${displayUnit(inputs.unit)}" nu este compatibilă cu materialul de depozit. Unități permise: ${validated.compatibilityRule.allowed_units.map(displayUnit).join(", ")}`,
        severity: "error",
      });
    }
  }

  // Input validation
  if (inputs.quantity <= 0) {
    issues.push({
      field: "quantity",
      message: "Cantitatea trebuie să fie > 0",
      severity: "error",
    });
  }
  if (inputs.unit_price <= 0) {
    issues.push({
      field: "unit_price",
      message: "Prețul unitar trebuie completat",
      severity: "error",
    });
  }

  // Minimum order check
  if (
    validated.minimumOrderRule &&
    inputs.quantity > 0 &&
    inputs.quantity < validated.minimumOrderRule.min_order_qty
  ) {
    issues.push({
      field: "quantity",
      message: `Comandă minimă pentru acest produs: ${validated.minimumOrderRule.min_order_qty} ${displayUnit(validated.minimumOrderRule.unit)}. Cantitate insuficientă.`,
      severity: "error",
    });
  }

  if (issues.some((i) => i.severity === "error")) {
    // Still show material subtotal even if invalid
    const material_subtotal =
      inputs.quantity > 0 && inputs.unit_price > 0
        ? inputs.quantity * inputs.unit_price
        : undefined;
    return {
      calculator_type: "DEPOZIT",
      is_valid: false,
      is_manual: false,
      validation_issues: issues,
      warnings,
      assumptions,
      material_subtotal,
    };
  }

  const material_subtotal = inputs.quantity * inputs.unit_price;
  const hasTransportRule = validated.transportRules.length > 0;
  const hasAutoPricing = false; // Depozit transport is always manual — no auto pricing rules in mock data

  // If AUTO mode requested but no automatic pricing exists
  if (
    inputs.transport_mode === "AUTO" &&
    (!hasTransportRule || !hasAutoPricing)
  ) {
    if (!hasTransportRule) {
      assumptions.push(
        "Transport: ofertă manuală — furnizorul nu are reguli de transport DEPOZIT configurate.",
      );
    } else {
      assumptions.push(
        "Reguli de transport detectate, dar tariful nu este calculabil automat din datele disponibile.",
      );
    }
    assumptions.push(
      "TVA aplicat doar pe subtotalul materialelor (transportul este manual/indisponibil).",
    );

    return {
      calculator_type: "DEPOZIT",
      is_valid: true,
      is_manual: true,
      manual_reason:
        "Preț transport indisponibil automat. Contactați furnizorul pentru ofertă transport.",
      validation_issues: issues,
      warnings,
      assumptions,
      trips: undefined,
      material_subtotal,
      transport_subtotal: undefined,
      surcharges_subtotal: 0,
      total_net: material_subtotal,
      vat_amount: material_subtotal * inputs.vat_rate,
      vat_rate: inputs.vat_rate,
      total_gross: material_subtotal * (1 + inputs.vat_rate),
      transport_description: "Ofertă manuală",
    };
  }

  // MANUAL mode — just materials
  assumptions.push(
    "Transport: ofertă manuală — furnizorul stabilește tariful de transport separat.",
  );
  assumptions.push(
    "TVA aplicat doar pe subtotalul materialelor (transportul este manual).",
  );
  if (validated.deliveryCoverage) {
    assumptions.push(
      `Zonă de livrare furnizor: ${validated.deliveryCoverage.delivery_zone_label}`,
    );
  }

  return {
    calculator_type: "DEPOZIT",
    is_valid: true,
    is_manual: true,
    manual_reason: "Transport prin ofertă manuală",
    validation_issues: issues,
    warnings,
    assumptions,
    material_subtotal,
    transport_subtotal: undefined,
    surcharges_subtotal: 0,
    total_net: material_subtotal,
    vat_amount: material_subtotal * inputs.vat_rate,
    vat_rate: inputs.vat_rate,
    total_gross: material_subtotal * (1 + inputs.vat_rate),
    transport_description: "Ofertă manuală",
  };
}

// ============================================================
// SECTION 11: UI HELPERS & ICONS
// ============================================================

function fmt(n: number | undefined, decimals = 2): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n: number | undefined): string {
  if (n === undefined) return "—";
  return `${fmt(n)} RON`;
}

// SVG Icons
function IconTruck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconPump({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="6" height="12" rx="1" />
      <path d="M9 14h8l2-6h2" />
      <path d="M6 8V4" />
      <circle cx="6" cy="3" r="1" />
    </svg>
  );
}

function IconBulk({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 20L6 12L10 20H2Z" />
      <path d="M14 20L18 12L22 20H14Z" />
      <path d="M8 8L12 2L16 8H8Z" />
    </svg>
  );
}

function IconWarehouse({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M10 9h4" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconRoute({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

// Input Components
interface InputFieldProps {
  label: string;
  id: string;
  type?: "number" | "text";
  value: string | number;
  onChange: (v: string) => void;
  min?: number;
  step?: number;
  helper?: string;
  disabled?: boolean;
  suffix?: string;
}

function InputField({
  label,
  id,
  type = "number",
  value,
  onChange,
  min,
  step,
  helper,
  disabled,
  suffix,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          step={step ?? (type === "number" ? 0.01 : undefined)}
          disabled={disabled}
          className={cn(
            "w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 font-mono tabular-nums",
            "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400",
            "disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed",
            "placeholder:text-zinc-400",
            suffix && "pr-12",
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helper && (
        <p className="text-[10px] text-zinc-400 leading-snug">{helper}</p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  helper?: string;
  disabled?: boolean;
}

function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  placeholder = "Selectează...",
  helper,
  disabled = false,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-10 rounded-md border border-zinc-200 bg-white px-3 pr-10 text-sm text-zinc-900",
            "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400",
            "appearance-none cursor-pointer",
            disabled && "opacity-60 cursor-not-allowed bg-zinc-50",
            !value && "text-zinc-400",
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-zinc-400"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
          </svg>
        </div>
      </div>
      {helper && (
        <p className="text-[10px] text-zinc-400 leading-snug">{helper}</p>
      )}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  helper?: string;
}

function CheckboxField({
  label,
  id,
  checked,
  onChange,
  helper,
}: CheckboxFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            checked
              ? "bg-zinc-900 border-zinc-900"
              : "bg-white border-zinc-300 group-hover:border-zinc-400",
          )}
        >
          {checked && <IconCheck className="w-3 h-3 text-white" />}
        </div>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span className="text-sm text-zinc-700">{label}</span>
      </label>
      {helper && <p className="text-[10px] text-zinc-400 ml-6">{helper}</p>}
    </div>
  );
}

// Step section component
function StepSection({
  step,
  title,
  children,
  isActive = true,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white transition-opacity",
        isActive ? "border-zinc-200" : "border-zinc-100 opacity-60",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
            isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400",
          )}
        >
          {step}
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            isActive ? "text-zinc-900" : "text-zinc-400",
          )}
        >
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Badge component
function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
}) {
  const variants = {
    default: "bg-zinc-100 text-zinc-600",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
        variants[variant],
      )}
    >
      {children}
    </span>
  );
}

const CALC_TYPES: {
  value: CalculatorType;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  badge: string;
}[] = [
  {
    value: "CIFA",
    label: "Cifa beton",
    description: "Autobetonieră — livrare beton",
    icon: IconTruck,
    badge: "automat",
  },
  {
    value: "POMPA",
    label: "Pompă beton",
    description: "Pompare beton la destinație",
    icon: IconPump,
    badge: "automat",
  },
  {
    value: "VRAC",
    label: "Material vrac",
    description: "Nisip, piatră, balast — basculantă",
    icon: IconBulk,
    badge: "automat",
  },
  {
    value: "DEPOZIT",
    label: "Material depozit",
    description: "Ciment, cărămidă — din stoc",
    icon: IconWarehouse,
    badge: "manual",
  },
];

// ============================================================
// SECTION 12: MAIN CALCULATOR COMPONENT
// ============================================================

export type PriceCalculatorMode = "standalone" | "flow";

/** Latest quote + inputs for parent (coș configurare) without lifting all calculator state */
export interface FlowQuoteSnapshot {
  result: QuoteBreakdown;
  validated: ValidatedQuoteRequest;
  calcType: CalculatorType;
  currentQuantity: number;
  deliveryAddress: string;
  vatRatePercent: string;
}

export interface PriceCalculatorProps {
  mode?: PriceCalculatorMode;
  initialProduct?: ProductDetail | null;
  initialQty?: number;
  onFlowQuoteUpdate?: (snapshot: FlowQuoteSnapshot) => void;
  /** Livrare / fiscal / revizuire — rendered after Verificare comercială, before quote (flow mode only) */
  flowFooter?: React.ReactNode;
}

export default function PriceCalculator({
  mode = "standalone",
  initialProduct = null,
  initialQty = 1,
  onFlowQuoteUpdate,
  flowFooter,
}: PriceCalculatorProps = {}) {
  const lockSelection = mode === "flow" && initialProduct != null;

  // Merged validation + listing pools when configurare is driven by a real listing
  const validationDataSource = useMemo(() => {
    if (mode !== "flow" || !initialProduct) return undefined;
    return buildMarketplaceFlowValidationSource(initialProduct);
  }, [mode, initialProduct]);

  const compatibilityPool = useMemo(
    () => validationDataSource?.materialCompatibility ?? [],
    [validationDataSource],
  );

  const profilesPool = useMemo(
    () => validationDataSource?.profiles ?? [],
    [validationDataSource],
  );

  const categoriesPool = useMemo(
    () => validationDataSource?.categories ?? [],
    [validationDataSource],
  );

  const transportRulesPool = useMemo(
    () => validationDataSource?.supplierTransportRules ?? [],
    [validationDataSource],
  );

  const deliveryCoveragePool = useMemo(
    () => validationDataSource?.deliveryCoverage ?? [],
    [validationDataSource],
  );

  // Calculator type
  const [calcType, setCalcType] = useState<CalculatorType>("CIFA");

  // Supplier / Material selection
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedListingId, setSelectedListingId] = useState<string>("");

  // Common
  const [vatRate, setVatRate] = useState<string>("19");

  // Delivery address text + geocoded coords. `deliveryCoords` is only set
  // once the user selects an autocomplete suggestion; free-text edits clear it.
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryCoords, setDeliveryCoords] = useState<LatLng | null>(null);

  // Origin (supplier pickup) coords. Prefer `initialProduct.pickupLat/Lng`
  // in flow mode; otherwise fall back to geocoding the listing's free-text
  // location once, cached per listing id.
  const [originCoords, setOriginCoords] = useState<LatLng | null>(null);
  const originCacheRef = useRef<Map<string, LatLng | null>>(new Map());

  // Computed route between origin and delivery. Loading / error mirror the
  // async fetch; routeResult holds distanceKm + durationMin + geometry.
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Per-calc-type flag: once the user manually edits the distance field,
  // the auto-fill stops overwriting until they hit "Restabileste".
  const distanceTouchedRef = useRef<Record<CalculatorType, boolean>>({
    CIFA: false,
    POMPA: false,
    VRAC: false,
    DEPOZIT: false,
  });


  // Cifa fields
  const [cifaQtyMc, setCifaQtyMc] = useState<string>("14");
  const [cifaDistKm, setCifaDistKm] = useState<string>("15");
  const [cifaCapacity, setCifaCapacity] = useState<string>("7");
  const [cifaTube, setCifaTube] = useState<boolean>(false);
  const [cifaUnloadMin, setCifaUnloadMin] = useState<string>("20");

  // Pompa fields
  const [pompaQtyMc, setPompaQtyMc] = useState<string>("30");
  const [pompaDistKm, setPompaDistKm] = useState<string>("10");
  const [pompaHoseM, setPompaHoseM] = useState<string>("40");
  const [pompaCalari, setPompaCalari] = useState<string>("1");

  // Vrac fields
  const [vracQtyTons, setVracQtyTons] = useState<string>("20");
  const [vracDistKm, setVracDistKm] = useState<string>("30");
  const [vracVehicleCap, setVracVehicleCap] = useState<string>("20");

  // Depozit fields
  const [depotQty, setDepotQty] = useState<string>("100");
  const [depotTransportMode, setDepotTransportMode] = useState<
    "AUTO" | "MANUAL"
  >("MANUAL");

  // Prefill from magazin listing (flow mode)
  useEffect(() => {
    if (mode !== "flow" || !initialProduct) return;
    const ct = defaultCalculatorTypeForUnit(initialProduct.unit);
    setCalcType(ct);
    setSelectedSupplierId(initialProduct.sellerId);
    setSelectedListingId(initialProduct.id);
    const q = Math.max(
      1,
      Math.min(initialProduct.availableQty, initialQty),
    );
    const qs = String(q);
    if (initialProduct.unit === "M3") {
      setCifaQtyMc(qs);
      setPompaQtyMc(qs);
    } else if (initialProduct.unit === "TON") {
      setVracQtyTons(qs);
    } else {
      setDepotQty(qs);
    }
  }, [mode, initialProduct, initialQty]);

  // Manual-distance handlers: record "user touched" so the route auto-fill
  // will not clobber their edits until Restabileste is pressed. The raw
  // setters remain available for the effect below to push auto values.
  const handleCifaDistChange = useCallback((v: string) => {
    distanceTouchedRef.current.CIFA = true;
    setCifaDistKm(v);
  }, []);
  const handlePompaDistChange = useCallback((v: string) => {
    distanceTouchedRef.current.POMPA = true;
    setPompaDistKm(v);
  }, []);
  const handleVracDistChange = useCallback((v: string) => {
    distanceTouchedRef.current.VRAC = true;
    setVracDistKm(v);
  }, []);

  // Derived: active listings
  const activeListings = useMemo(() => {
    const list = validationDataSource?.listings ?? [];
    return list.filter((l) => l.is_active);
  }, [validationDataSource]);

  // Derived: selected listing row
  const selectedListing = useMemo(
    () => activeListings.find((l) => l.id === selectedListingId),
    [activeListings, selectedListingId],
  );

  const selectedSupplier = useMemo(
    () => profilesPool.find((p) => p.id === selectedSupplierId),
    [profilesPool, selectedSupplierId],
  );

  /** Flow + locked listing: show real account name (draft product + profile pool) */
  const resolvedFlowSellerName = useMemo(() => {
    const fromProduct = initialProduct?.sellerDisplayName?.trim();
    const fromProfile = selectedSupplier?.display_name?.trim();
    return fromProduct || fromProfile || "Furnizor";
  }, [initialProduct, selectedSupplier]);

  // Origin resolution: as soon as a listing is selected, try the seller's
  // precise pickup coords; if absent, fall back to a single-shot Nominatim
  // call on the free-text location. Results are cached per listing id so
  // re-selecting the same material doesn't re-hit the proxy.
  useEffect(() => {
    let cancelled = false;
    setOriginCoords(null);
    if (!selectedListing) return;

    const listingId = selectedListing.id;
    const cached = originCacheRef.current.get(listingId);
    if (cached !== undefined) {
      setOriginCoords(cached);
      return;
    }

    const fromProduct =
      mode === "flow" && initialProduct && initialProduct.id === listingId
        ? initialProduct
        : null;

    if (
      fromProduct &&
      typeof fromProduct.pickupLat === "number" &&
      typeof fromProduct.pickupLng === "number"
    ) {
      const coords: LatLng = {
        lat: fromProduct.pickupLat,
        lng: fromProduct.pickupLng,
      };
      originCacheRef.current.set(listingId, coords);
      setOriginCoords(coords);
      return;
    }

    const location = selectedListing.location?.trim();
    if (!location || location === "—") {
      originCacheRef.current.set(listingId, null);
      return;
    }

    (async () => {
      try {
        const result = await geocodeOne(location);
        if (cancelled) return;
        const coords: LatLng | null = result
          ? { lat: result.lat, lng: result.lng }
          : null;
        originCacheRef.current.set(listingId, coords);
        setOriginCoords(coords);
      } catch {
        if (cancelled) return;
        // Silent fallback: manual distance input still works.
        originCacheRef.current.set(listingId, null);
        setOriginCoords(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedListing, mode, initialProduct]);

  // Reset computed route & distanceTouched whenever the selected listing
  // changes. Keeps auto-fill fresh per material.
  useEffect(() => {
    setRouteResult(null);
    setRouteError(null);
    distanceTouchedRef.current = {
      CIFA: false,
      POMPA: false,
      VRAC: false,
      DEPOZIT: false,
    };
  }, [selectedListingId]);

  // Route computation: triggers when both endpoints are known. On success
  // we push the one-way distance into whichever calc-type field has not
  // been manually touched since the last compute. VRAC uses the figure
  // as a commercial distance (single-leg), so same behavior works.
  useEffect(() => {
    if (!originCoords || !deliveryCoords) {
      setRouteResult(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setRouteLoading(true);
    setRouteError(null);

    (async () => {
      try {
        const result = await computeRoute(
          originCoords,
          deliveryCoords,
          controller.signal,
        );
        if (cancelled) return;
        setRouteResult(result);
        const km = result.distanceKm.toFixed(1);
        if (!distanceTouchedRef.current.CIFA) setCifaDistKm(km);
        if (!distanceTouchedRef.current.POMPA) setPompaDistKm(km);
        if (!distanceTouchedRef.current.VRAC) setVracDistKm(km);
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string }).name === "AbortError") return;
        const msg =
          err instanceof RoutingError
            ? err.message
            : "Nu am putut calcula ruta.";
        setRouteError(msg);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [originCoords, deliveryCoords]);

  // "Restabileste": re-apply the last computed value into the active
  // calc-type field and clear its touched flag so future routes auto-fill
  // it again.
  const handleRestoreAutoDistance = useCallback(() => {
    if (!routeResult) return;
    const km = routeResult.distanceKm.toFixed(1);
    if (calcType === "CIFA") {
      distanceTouchedRef.current.CIFA = false;
      setCifaDistKm(km);
    } else if (calcType === "POMPA") {
      distanceTouchedRef.current.POMPA = false;
      setPompaDistKm(km);
    } else if (calcType === "VRAC") {
      distanceTouchedRef.current.VRAC = false;
      setVracDistKm(km);
    }
  }, [routeResult, calcType]);

  // Address-select handler: store the chosen suggestion's coords (or clear
  // on free-text edits). When cleared we also drop the current route so
  // stale data doesn't display.
  const handleDeliveryAddressChange = useCallback(
    (value: string, coords: GeocodeResult | null) => {
      setDeliveryAddress(value);
      if (coords) {
        setDeliveryCoords({ lat: coords.lat, lng: coords.lng });
      } else {
        setDeliveryCoords(null);
        setRouteResult(null);
        setRouteError(null);
      }
    },
    [],
  );

  const selectedCategory = useMemo(
    () =>
      selectedListing
        ? categoriesPool.find((c) => c.id === selectedListing.category_id)
        : undefined,
    [categoriesPool, selectedListing],
  );

  // Supplier options
  const supplierOptions = useMemo(() => {
    // only show suppliers that have active listings for this calc type
    const compatibleListings = activeListings.filter((l) => {
      const compat = getCompatibilityRule(
        l.id,
        l.category_id,
        compatibilityPool,
      );
      return compat?.allowed_calculator_types.includes(calcType) ?? false;
    });
    const supplierIds = [
      ...new Set(compatibleListings.map((l) => l.seller_id)),
    ];
    return profilesPool
      .filter((p) => supplierIds.includes(p.id))
      .map(mapProfileToSupplierOption);
  }, [activeListings, calcType, compatibilityPool, profilesPool]);

  // Material options filtered by selected supplier AND calc type
  const materialOptions = useMemo(() => {
    if (!selectedSupplierId) return [];
    return activeListings
      .filter((l) => {
        if (l.seller_id !== selectedSupplierId) return false;
        const compat = getCompatibilityRule(
          l.id,
          l.category_id,
          compatibilityPool,
        );
        return compat?.allowed_calculator_types.includes(calcType) ?? false;
      })
      .map(mapListingToMaterialOption);
  }, [
    activeListings,
    selectedSupplierId,
    calcType,
    compatibilityPool,
  ]);

  // When calc type changes, reset supplier + listing (unless locked to one anunț)
  function handleCalcTypeChange(ct: CalculatorType) {
    setCalcType(ct);
    if (lockSelection && initialProduct) {
      setSelectedSupplierId(initialProduct.sellerId);
      setSelectedListingId(initialProduct.id);
      return;
    }
    setSelectedSupplierId("");
    setSelectedListingId("");
  }

  // When supplier changes, reset listing
  function handleSupplierChange(id: string) {
    setSelectedSupplierId(id);
    setSelectedListingId("");
  }

  // When listing changes, auto-fill capacity/price from rules
  function handleListingChange(id: string) {
    setSelectedListingId(id);
    const listing = activeListings.find((l) => l.id === id);
    if (!listing) return;
    if (calcType === "CIFA" || calcType === "POMPA") {
      const rule = getCifaRule(listing.seller_id);
      setCifaCapacity(
        String(rule?.default_capacity_mc ?? CIFA_DEFAULTS.default_capacity_mc),
      );
    }
  }

  const parsedVat = parseFloat(vatRate) / 100 || 0;

  // Get current quantity and distance for validation
  const currentQuantity = useMemo(() => {
    if (calcType === "CIFA") return parseFloat(cifaQtyMc) || 0;
    if (calcType === "POMPA") return parseFloat(pompaQtyMc) || 0;
    if (calcType === "VRAC") return parseFloat(vracQtyTons) || 0;
    if (calcType === "DEPOZIT") return parseFloat(depotQty) || 0;
    return 0;
  }, [calcType, cifaQtyMc, pompaQtyMc, vracQtyTons, depotQty]);

  const currentDistance = useMemo(() => {
    if (calcType === "CIFA") return parseFloat(cifaDistKm) || 0;
    if (calcType === "POMPA") return parseFloat(pompaDistKm) || 0;
    if (calcType === "VRAC") return parseFloat(vracDistKm) || 0;
    return 0;
  }, [calcType, cifaDistKm, pompaDistKm, vracDistKm]);

  // Run quote-level validation
  const validated = useMemo(() => {
    return validateQuoteRequest(
      selectedSupplierId,
      selectedListingId,
      calcType,
      currentQuantity,
      currentDistance,
      validationDataSource,
    );
  }, [
    selectedSupplierId,
    selectedListingId,
    calcType,
    currentQuantity,
    currentDistance,
    validationDataSource,
  ]);

  // In flow mode, only offer calculator modes compatible with the listing unit
  const visibleCalcTypes = useMemo(() => {
    if (mode === "flow" && initialProduct) {
      const allowed = allowedCalculatorTypesForProductUnit(
        initialProduct.unit,
      );
      return CALC_TYPES.filter((c) => allowed.includes(c.value));
    }
    return CALC_TYPES;
  }, [mode, initialProduct]);

  // Run calculator
  const result: QuoteBreakdown = useMemo(() => {
    const vat = parsedVat;

    if (calcType === "CIFA") {
      return calculateCifaQuote(
        {
          distance_one_way_km: parseFloat(cifaDistKm) || 0,
          quantity_mc: parseFloat(cifaQtyMc) || 0,
          material_unit_price_mc: selectedListing?.price ?? 0,
          cifa_capacity_mc: parseFloat(cifaCapacity) || 0,
          tube_required: cifaTube,
          unloading_minutes: parseFloat(cifaUnloadMin) || 0,
          vat_rate: vat,
          supplier_id: selectedSupplierId,
        },
        validated,
      );
    }

    if (calcType === "POMPA") {
      return calculatePompaQuote(
        {
          distance_one_way_km: parseFloat(pompaDistKm) || 0,
          pumped_quantity_mc: parseFloat(pompaQtyMc) || 0,
          hose_length_m: parseFloat(pompaHoseM) || 0,
          calari_count: parseInt(pompaCalari) || 0,
          vat_rate: vat,
          supplier_id: selectedSupplierId,
          listing_id: selectedListingId,
          category_id: selectedListing?.category_id ?? "",
        },
        validated,
      );
    }

    if (calcType === "VRAC") {
      return calculateBulkQuote(
        {
          transport_distance_km: parseFloat(vracDistKm) || 0,
          quantity_tons: parseFloat(vracQtyTons) || 0,
          material_unit_price_ton: selectedListing?.price ?? 0,
          vehicle_capacity_tons: parseFloat(vracVehicleCap) || 0,
          vat_rate: vat,
          supplier_id: selectedSupplierId,
          listing_id: selectedListingId,
          category_id: selectedListing?.category_id ?? "",
        },
        validated,
      );
    }

    // DEPOZIT
    return calculateDepotQuote(
      {
        quantity: parseFloat(depotQty) || 0,
        unit_price: selectedListing?.price ?? 0,
        unit: (selectedListing?.unit ?? "BUC") as UnitEnum,
        transport_mode: depotTransportMode,
        vat_rate: vat,
        listing_id: selectedListingId,
        category_id: selectedListing?.category_id ?? "",
        supplier_id: selectedSupplierId,
      },
      validated,
    );
  }, [
    calcType,
    validated,
    selectedListing,
    selectedListingId,
    selectedSupplierId,
    parsedVat,
    cifaDistKm,
    cifaQtyMc,
    cifaCapacity,
    cifaTube,
    cifaUnloadMin,
    pompaDistKm,
    pompaQtyMc,
    pompaHoseM,
    pompaCalari,
    vracDistKm,
    vracQtyTons,
    vracVehicleCap,
    depotQty,
    depotTransportMode,
  ]);

  // Push quote snapshot to parent in magazin configurare flow
  useEffect(() => {
    if (mode !== "flow" || !onFlowQuoteUpdate) return;
    onFlowQuoteUpdate({
      result,
      validated,
      calcType,
      currentQuantity,
      deliveryAddress,
      vatRatePercent: vatRate,
    });
  }, [
    mode,
    onFlowQuoteUpdate,
    result,
    validated,
    calcType,
    currentQuantity,
    deliveryAddress,
    vatRate,
  ]);

  // Cifa rule for hints
  const cifaRule = useMemo(
    () => (selectedSupplierId ? getCifaRule(selectedSupplierId) : undefined),
    [selectedSupplierId],
  );

  const pompaRule = useMemo(
    () => (selectedSupplierId ? getPumpRule(selectedSupplierId) : undefined),
    [selectedSupplierId],
  );

  const transportRules = useMemo(
    () =>
      selectedSupplierId
        ? getApplicableTransportRules(
            selectedSupplierId,
            calcType,
            transportRulesPool,
          )
        : [],
    [selectedSupplierId, calcType, transportRulesPool],
  );

  const deliveryCoverage = useMemo(
    () =>
      selectedSupplierId
        ? getDeliveryCoverage(selectedSupplierId, deliveryCoveragePool)
        : undefined,
    [selectedSupplierId, deliveryCoveragePool],
  );

  const hasValidSelection = selectedSupplierId && selectedListingId;

  const isFlow = mode === "flow";

  // Standalone: no product context — full flow starts from magazin → configurare
  if (mode === "standalone" && !initialProduct) {
    return (
      <div className="font-sans rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">
          Calculatorul de ofertă se folosește din magazin
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Alegeți un produs din magazin, apoi „Continuă la configurare” pentru
          cantitate, TVA, transport și detalii fiscale.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Deschide magazinul
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-sans",
        isFlow ? "bg-transparent" : "min-h-screen bg-zinc-50",
      )}
    >
      {/* Header — full chrome in standalone; compact title in magazin flow */}
      <header
        className={cn(
          "z-20",
          isFlow
            ? "mb-4 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
            : "bg-white border-b border-zinc-200 sticky top-0",
        )}
      >
        <div
          className={cn(
            !isFlow && "max-w-7xl mx-auto px-4 sm:px-6 py-4",
            isFlow && "space-y-1",
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1
                className={cn(
                  "font-semibold text-foreground tracking-tight",
                  isFlow ? "text-lg" : "text-xl text-zinc-900",
                )}
              >
                {isFlow ? "Configurare comandă" : "Calculator ofertare"}
              </h1>
              <p
                className={cn(
                  "mt-0.5",
                  isFlow
                    ? "text-xs text-muted-foreground"
                    : "text-sm text-zinc-500",
                )}
              >
                {isFlow
                  ? "Completați parametrii de livrare și verificați oferta înainte de a adăuga în coș."
                  : "Estimare comercială orientativă — materiale de construcții"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  result.is_valid && !result.is_manual
                    ? "success"
                    : result.is_valid
                      ? "warning"
                      : "default"
                }
              >
                {CALC_TYPES.find((c) => c.value === calcType)?.label}
              </Badge>
              {selectedSupplier && (
                <Badge variant="info">{selectedSupplier.display_name}</Badge>
              )}
              {transportRules.length > 0 && (
                <Badge variant="default">
                  {transportRules[0].delivery_zone_label}
                </Badge>
              )}
              <Badge
                variant={
                  result.is_valid && !result.is_manual
                    ? "success"
                    : result.is_valid && result.is_manual
                      ? "warning"
                      : "error"
                }
              >
                {result.is_valid && !result.is_manual
                  ? "Calcul automat"
                  : result.is_valid && result.is_manual
                    ? "Transport manual"
                    : "Incomplet"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div
          className={cn(
            "flex items-start gap-6",
            isFlow ? "flex-col gap-8" : "flex-col lg:flex-row",
          )}
        >
          {/* LEFT COLUMN: steps 1–5 — wider cap in flow configurare */}
          <div
            className={cn(
              "flex w-full flex-col gap-4",
              isFlow ? "max-w-3xl" : "shrink-0 lg:w-[520px]",
            )}
          >
            {/* Step 1: Calculator Type */}
            <StepSection step={1} title="Tip calcul">
              <div className="grid grid-cols-2 gap-2">
                {visibleCalcTypes.map((ct) => {
                  const Icon = ct.icon;
                  const isSelected = calcType === ct.value;
                  return (
                    <button
                      key={ct.value}
                      onClick={() => handleCalcTypeChange(ct.value)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-3 text-left transition-all group relative",
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <Icon
                          className={cn(
                            "w-5 h-5 mt-0.5 shrink-0",
                            isSelected ? "text-white" : "text-zinc-400",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">
                            {ct.label}
                          </div>
                          <div
                            className={cn(
                              "text-[10px] mt-0.5 leading-snug",
                              isSelected ? "text-zinc-300" : "text-zinc-400",
                            )}
                          >
                            {ct.description}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-zinc-100 text-zinc-400",
                        )}
                      >
                        {ct.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepSection>

            {/* Step 2: Supplier & Material */}
            <StepSection step={2} title="Furnizor și material">
              <div className="flex flex-col gap-4">
                {lockSelection && initialProduct ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                      Vânzător
                    </span>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                          {resolvedFlowSellerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900">
                            {resolvedFlowSellerName}
                          </p>
                          {(selectedSupplier?.phone ||
                            initialProduct.sellerPhone) && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <IconPhone className="h-3 w-3 text-zinc-400" />
                              <span className="text-xs text-zinc-500">
                                {selectedSupplier?.phone ??
                                  initialProduct.sellerPhone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {transportRules.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 border-t border-zinc-200 pt-2">
                          <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600">
                            {transportRules[0].delivery_zone_label}
                          </span>
                          <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600">
                            Max {transportRules[0].max_radius_km} km
                          </span>
                          {validated.minimumOrderRule && (
                            <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600">
                              Min {validated.minimumOrderRule.min_order_qty}{" "}
                              {displayUnit(validated.minimumOrderRule.unit)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <SelectField
                      label="Furnizor"
                      id="supplier"
                      value={selectedSupplierId}
                      onChange={handleSupplierChange}
                      options={supplierOptions}
                      placeholder="Selectează furnizor..."
                      disabled={lockSelection}
                    />

                    {selectedSupplier && (
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                            {(selectedSupplier.display_name || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-900">
                              {selectedSupplier.display_name}
                            </p>
                            {selectedSupplier.phone && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <IconPhone className="h-3 w-3 text-zinc-400" />
                                <span className="text-xs text-zinc-500">
                                  {selectedSupplier.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {transportRules.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 border-t border-zinc-200 pt-2">
                            <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600">
                              {transportRules[0].delivery_zone_label}
                            </span>
                            <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600">
                              Max {transportRules[0].max_radius_km} km
                            </span>
                            {validated.minimumOrderRule && (
                              <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600">
                                Min {validated.minimumOrderRule.min_order_qty}{" "}
                                {displayUnit(validated.minimumOrderRule.unit)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <SelectField
                  label="Material"
                  id="listing"
                  value={selectedListingId}
                  onChange={handleListingChange}
                  options={materialOptions}
                  placeholder={
                    selectedSupplierId
                      ? "Selectează material..."
                      : "Selectați mai întâi furnizorul"
                  }
                  disabled={lockSelection}
                />

                {selectedListing && (
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {selectedListing.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {selectedCategory?.name ?? "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-semibold text-zinc-900 font-mono tabular-nums">
                          {selectedListing.price}{" "}
                          <span className="text-xs text-zinc-500">
                            RON/{displayUnit(selectedListing.unit)}
                          </span>
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Stoc: {selectedListing.available_qty}{" "}
                          {displayUnit(selectedListing.unit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </StepSection>

            {/* Step 3: Route & Delivery (Mock) */}
            <StepSection
              step={3}
              title="Rută și livrare"
              isActive={!!selectedSupplierId}
            >
              <div className="flex flex-col gap-4">
                {/* Origin */}
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">
                        A
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                      Adresă plecare
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <IconMapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="text-sm text-zinc-700">
                      {selectedListing
                        ? `${resolvedFlowSellerName}, ${selectedListing.location}`
                        : "Selectați un furnizor"}
                    </span>
                  </div>
                </div>

                {/* Destination: real geocoding autocomplete (Nominatim) */}
                <div className="rounded-lg border border-dashed border-zinc-300 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">
                        B
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                      Adresă livrare
                    </span>
                  </div>
                  <div className="pl-7">
                    <AddressAutocomplete
                      value={deliveryAddress}
                      onChange={handleDeliveryAddressChange}
                      placeholder="Oraș, stradă, număr..."
                    />
                    <p className="text-[10px] text-zinc-400 mt-1.5">
                      Geocodare OpenStreetMap. Selectați o sugestie pentru a
                      calcula ruta rutieră.
                    </p>
                  </div>
                </div>

                {/* Real route preview (Leaflet + OSRM) */}
                {hasValidSelection && (
                  <div className="space-y-2">
                    <RouteMap
                      from={originCoords}
                      to={deliveryCoords}
                      geometry={routeResult?.geometry}
                    />

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <IconRoute className="w-5 h-5 text-zinc-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-700">
                            Previzualizare rută
                          </p>
                          {routeLoading && (
                            <p className="text-[10px] text-zinc-400">
                              Se calculează ruta rutieră...
                            </p>
                          )}
                          {!routeLoading && routeError && (
                            <p className="text-[10px] text-rose-600">
                              {routeError}
                            </p>
                          )}
                          {!routeLoading &&
                            !routeError &&
                            !routeResult &&
                            !deliveryCoords && (
                              <p className="text-[10px] text-zinc-400">
                                Alegeți adresa de livrare pentru calcul.
                              </p>
                            )}
                          {!routeLoading &&
                            !routeError &&
                            !routeResult &&
                            deliveryCoords &&
                            !originCoords && (
                              <p className="text-[10px] text-amber-600">
                                Locația furnizorului nu poate fi determinată.
                              </p>
                            )}
                          {!routeLoading && routeResult && (
                            <p className="text-[10px] text-zinc-400">
                              Durată estimată: ~
                              {Math.max(1, Math.round(routeResult.durationMin))}{" "}
                              min · via OpenStreetMap / OSRM
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-semibold text-zinc-900 font-mono tabular-nums">
                          {routeResult
                            ? routeResult.distanceKm.toFixed(1)
                            : currentDistance}{" "}
                          km
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                          <p className="text-[10px] text-zinc-400">
                            {calcType === "VRAC" ? "comercial" : "dus"}
                          </p>
                          {routeResult &&
                            calcType !== "DEPOZIT" &&
                            !distanceTouchedRef.current[calcType] && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                                auto
                              </span>
                            )}
                          {routeResult &&
                            calcType !== "DEPOZIT" &&
                            distanceTouchedRef.current[calcType] && (
                              <button
                                type="button"
                                onClick={handleRestoreAutoDistance}
                                className="text-[10px] text-sky-600 hover:text-sky-700 underline underline-offset-2"
                              >
                                Restabilește
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Route summary */}
                {hasValidSelection && transportRules.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-md bg-zinc-100 p-2 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        Distanță
                      </p>
                      <p className="text-sm font-semibold text-zinc-900 font-mono">
                        {currentDistance} km
                      </p>
                    </div>
                    <div className="rounded-md bg-zinc-100 p-2 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        Dus-întors
                      </p>
                      <p className="text-sm font-semibold text-zinc-900 font-mono">
                        {calcType !== "VRAC"
                          ? currentDistance * 2
                          : currentDistance}{" "}
                        km
                      </p>
                    </div>
                    <div className="rounded-md bg-zinc-100 p-2 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        Zonă
                      </p>
                      <p className="text-sm font-semibold text-emerald-600">
                        {currentDistance <= transportRules[0].max_radius_km
                          ? "Validată"
                          : "Depășită"}
                      </p>
                    </div>
                    <div className="rounded-md bg-zinc-100 p-2 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        Transport
                      </p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {calcType}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </StepSection>

            {/* Step 4: Service Parameters */}
            <StepSection
              step={4}
              title="Parametri serviciu"
              isActive={!!hasValidSelection}
            >
              {calcType === "CIFA" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Cantitate"
                      id="cifa_qty"
                      value={cifaQtyMc}
                      onChange={setCifaQtyMc}
                      min={0}
                      step={0.5}
                      suffix="mc"
                      helper={
                        validated.minimumOrderRule
                          ? `Min: ${validated.minimumOrderRule.min_order_qty} mc`
                          : undefined
                      }
                    />
                    <InputField
                      label="Distanță dus"
                      id="cifa_dist"
                      value={cifaDistKm}
                      onChange={handleCifaDistChange}
                      min={0}
                      step={1}
                      suffix="km"
                      helper={
                        transportRules.length > 0
                          ? `Max: ${transportRules[0].max_radius_km} km`
                          : undefined
                      }
                    />
                    <InputField
                      label="Capacitate cifa"
                      id="cifa_cap"
                      value={cifaCapacity}
                      onChange={setCifaCapacity}
                      min={1}
                      step={0.5}
                      suffix="mc"
                      helper={
                        cifaRule
                          ? `${cifaRule.min_capacity_mc}–${cifaRule.max_capacity_mc} mc`
                          : `${CIFA_DEFAULTS.min_capacity_mc}–${CIFA_DEFAULTS.max_capacity_mc} mc`
                      }
                    />
                    <InputField
                      label="Minute descărcare"
                      id="cifa_unload_min"
                      value={cifaUnloadMin}
                      onChange={setCifaUnloadMin}
                      min={0}
                      step={1}
                      suffix="min"
                      helper={`Inclus: ${cifaRule?.default_included_unloading_minutes ?? CIFA_DEFAULTS.default_included_unloading_minutes} min`}
                    />
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-zinc-50 border border-zinc-100">
                    <InputField
                      label="Preț material"
                      id="cifa_price"
                      value={selectedListing?.price ?? ""}
                      onChange={() => {}}
                      disabled
                      suffix="RON/mc"
                    />
                    <CheckboxField
                      label="Tub necesar"
                      id="cifa_tube"
                      checked={cifaTube}
                      onChange={setCifaTube}
                      helper={`+${cifaRule?.tube_fee_lei ?? CIFA_DEFAULTS.tube_fee_lei} RON`}
                    />
                  </div>
                  <div className="rounded-md bg-sky-50 border border-sky-100 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <IconInfo className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-sky-700 leading-relaxed">
                        <strong>Regulă transport CIFA:</strong>{" "}
                        {cifaRule?.transport_per_km_lei ??
                          CIFA_DEFAULTS.transport_per_km_lei}{" "}
                        RON/km (minim{" "}
                        {cifaRule?.min_transport_lei ??
                          CIFA_DEFAULTS.min_transport_lei}{" "}
                        RON/cursă). Diferență încărcare:{" "}
                        {cifaRule?.underload_fee_per_mc ??
                          CIFA_DEFAULTS.underload_fee_per_mc}{" "}
                        RON/mc. Staționare:{" "}
                        {cifaRule?.default_waiting_fee_per_min_lei ??
                          CIFA_DEFAULTS.default_waiting_fee_per_min_lei}{" "}
                        RON/min după{" "}
                        {cifaRule?.default_included_unloading_minutes ??
                          CIFA_DEFAULTS.default_included_unloading_minutes}{" "}
                        min.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calcType === "POMPA" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Cantitate pompată"
                      id="pompa_qty"
                      value={pompaQtyMc}
                      onChange={setPompaQtyMc}
                      min={0}
                      step={0.5}
                      suffix="mc"
                    />
                    <InputField
                      label="Distanță dus"
                      id="pompa_dist"
                      value={pompaDistKm}
                      onChange={handlePompaDistChange}
                      min={0}
                      step={1}
                      suffix="km"
                      helper={
                        transportRules.length > 0
                          ? `Max: ${transportRules[0].max_radius_km} km`
                          : undefined
                      }
                    />
                    <InputField
                      label="Lungime furtun"
                      id="pompa_hose"
                      value={pompaHoseM}
                      onChange={setPompaHoseM}
                      min={0}
                      step={5}
                      suffix="m"
                      helper={`Inclus: ${pompaRule?.included_hose_m ?? POMPA_DEFAULTS.included_hose_m} m`}
                    />
                    <InputField
                      label="Număr calări"
                      id="pompa_calari"
                      value={pompaCalari}
                      onChange={setPompaCalari}
                      min={0}
                      step={1}
                      suffix="buc"
                      helper={`${pompaRule?.calare_fee_per_unit_lei ?? POMPA_DEFAULTS.calare_fee_per_unit_lei} RON/calare`}
                    />
                  </div>
                  <div className="rounded-md bg-sky-50 border border-sky-100 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <IconInfo className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-sky-700 leading-relaxed">
                        <strong>Serviciu pompare:</strong>{" "}
                        {pompaRule?.min_service_fee_lei ??
                          POMPA_DEFAULTS.min_service_fee_lei}{" "}
                        RON pentru primele{" "}
                        {pompaRule?.min_service_mc ??
                          POMPA_DEFAULTS.min_service_mc}{" "}
                        mc, +
                        {pompaRule?.extra_per_mc_lei ??
                          POMPA_DEFAULTS.extra_per_mc_lei}{" "}
                        RON/mc peste. Transport:{" "}
                        {pompaRule?.transport_per_km_lei ??
                          POMPA_DEFAULTS.transport_per_km_lei}{" "}
                        RON/km (minim{" "}
                        {pompaRule?.min_transport_lei ??
                          POMPA_DEFAULTS.min_transport_lei}{" "}
                        RON).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calcType === "VRAC" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Cantitate"
                      id="vrac_qty"
                      value={vracQtyTons}
                      onChange={setVracQtyTons}
                      min={0}
                      step={0.5}
                      suffix="tone"
                      helper={
                        validated.minimumOrderRule
                          ? `Min: ${validated.minimumOrderRule.min_order_qty} t`
                          : undefined
                      }
                    />
                    <InputField
                      label="Distanță comercială"
                      id="vrac_dist"
                      value={vracDistKm}
                      onChange={handleVracDistChange}
                      min={0}
                      step={1}
                      suffix="km"
                      helper={
                        transportRules.length > 0
                          ? `Max: ${transportRules[0].max_radius_km} km`
                          : "Total (nu doar dus)"
                      }
                    />
                    <InputField
                      label="Capacitate vehicul"
                      id="vrac_cap"
                      value={vracVehicleCap}
                      onChange={setVracVehicleCap}
                      min={1}
                      step={0.5}
                      suffix="tone"
                      helper="Basculantă"
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                        Preț material
                      </label>
                      <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 flex items-center text-sm text-zinc-500 font-mono tabular-nums">
                        {selectedListing?.price ?? "—"}{" "}
                        <span className="text-zinc-400 ml-1">RON/t</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Din listing selectat
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-sky-50 border border-sky-100 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <IconInfo className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-sky-700 leading-relaxed">
                        <strong>Regulă VRAC:</strong> distanță ≤{" "}
                        {validated.vracRule?.threshold_km ??
                          VRAC_DEFAULTS.threshold_km}{" "}
                        km → cursă minimă{" "}
                        {validated.vracRule?.min_course_fee_lei ??
                          VRAC_DEFAULTS.min_course_fee_lei}{" "}
                        RON +{" "}
                        {validated.vracRule?.underload_fee_per_ton_lei ??
                          VRAC_DEFAULTS.underload_fee_per_ton_lei}{" "}
                        RON/tonă diferență. Distanță {">"}{" "}
                        {validated.vracRule?.threshold_km ??
                          VRAC_DEFAULTS.threshold_km}{" "}
                        km → km ×{" "}
                        {validated.vracRule?.transport_coeff ??
                          VRAC_DEFAULTS.transport_coeff}{" "}
                        × tone.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calcType === "DEPOZIT" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label={`Cantitate (${selectedListing ? displayUnit(selectedListing.unit) : "buc"})`}
                      id="depot_qty"
                      value={depotQty}
                      onChange={setDepotQty}
                      min={0}
                      step={1}
                      helper={
                        validated.minimumOrderRule
                          ? `Min: ${validated.minimumOrderRule.min_order_qty} ${displayUnit(validated.minimumOrderRule.unit)}`
                          : undefined
                      }
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                        Preț unitar
                      </label>
                      <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 flex items-center text-sm text-zinc-500 font-mono tabular-nums">
                        {selectedListing?.price ?? "—"}{" "}
                        <span className="text-zinc-400 ml-1">
                          RON/
                          {selectedListing
                            ? displayUnit(selectedListing.unit)
                            : "buc"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Din listing selectat
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                      Mod transport
                    </span>
                    <div className="flex gap-2">
                      {(["AUTO", "MANUAL"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setDepotTransportMode(mode)}
                          className={cn(
                            "flex-1 py-2.5 px-4 rounded-md border text-sm font-medium transition-colors",
                            depotTransportMode === mode
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                          )}
                        >
                          {mode === "AUTO" ? "Automat" : "Ofertă manuală"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Ofertă manuală — furnizorul stabilește tariful de
                      transport separat.
                    </p>
                  </div>
                  <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <IconWarning className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-amber-700 leading-relaxed">
                        <strong>Transport depozit:</strong> Calculul automat
                        pentru transport nu este disponibil pentru materialele
                        din depozit. Totalul afișat include doar valoarea
                        materialelor.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </StepSection>

            {/* Step 5: Verification */}
            <StepSection
              step={5}
              title="Verificare comercială"
              isActive={!!hasValidSelection}
            >
              <div className="flex flex-col gap-3">
                <InputField
                  label="Cotă TVA"
                  id="vat"
                  value={vatRate}
                  onChange={setVatRate}
                  min={0}
                  step={1}
                  suffix="%"
                  helper="Cota TVA aplicabilă (ex: 19)"
                />
                <div className="text-[10px] text-zinc-400 border-t border-zinc-100 pt-3">
                  Estimare comercială orientativă. Taxele suplimentare se aplică
                  conform regulilor furnizorului. Prețurile finale pot varia în
                  funcție de condițiile specifice ale comenzii.
                </div>
              </div>
            </StepSection>
          </div>

          {isFlow && flowFooter}

          {/* RIGHT COLUMN: Results — full width below footer in flow; sticky side panel in standalone */}
          <div
            className={cn(
              "min-w-0",
              isFlow ? "w-full max-w-3xl" : "flex-1 lg:sticky lg:top-24",
            )}
          >
            <div className="flex flex-col gap-4">
              {/* Empty state */}
              {!hasValidSelection && (
                <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <IconRoute className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600">
                    Selectați un furnizor și un material
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    După selectare, sistemul afișează eligibilitatea, regulile
                    de transport și costul estimat.
                  </p>
                </div>
              )}

              {/* Status banner */}
              {hasValidSelection && (
                <div
                  className={cn(
                    "rounded-xl border-2 p-4",
                    result.is_valid && !result.is_manual
                      ? "border-emerald-200 bg-emerald-50"
                      : result.is_valid && result.is_manual
                        ? "border-amber-200 bg-amber-50"
                        : "border-red-200 bg-red-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        result.is_valid && !result.is_manual
                          ? "bg-emerald-500"
                          : result.is_valid && result.is_manual
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                    >
                      {result.is_valid && !result.is_manual && (
                        <IconCheck className="w-5 h-5 text-white" />
                      )}
                      {result.is_valid && result.is_manual && (
                        <IconWarning className="w-5 h-5 text-white" />
                      )}
                      {!result.is_valid && (
                        <IconX className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          result.is_valid && !result.is_manual
                            ? "text-emerald-800"
                            : result.is_valid && result.is_manual
                              ? "text-amber-800"
                              : "text-red-800",
                        )}
                      >
                        {result.is_valid && !result.is_manual
                          ? "Eligibil — calcul automat"
                          : result.is_valid && result.is_manual
                            ? "Calcul parțial — transport manual"
                            : "Calcul indisponibil"}
                      </p>
                      {result.manual_reason && (
                        <p
                          className={cn(
                            "text-xs mt-0.5",
                            result.is_valid ? "text-amber-700" : "text-red-700",
                          )}
                        >
                          {result.manual_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Total summary card */}
              {hasValidSelection &&
                (result.is_valid || result.material_subtotal !== undefined) && (
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="bg-zinc-900 text-white p-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Total cu TVA
                          </p>
                          <p className="text-3xl font-bold font-mono tabular-nums mt-1">
                            {result.total_gross !== undefined
                              ? fmt(result.total_gross, 2)
                              : "—"}
                            <span className="text-base font-normal text-zinc-400 ml-1">
                              RON
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-400">fără TVA</p>
                          <p className="text-lg font-semibold font-mono tabular-nums">
                            {fmtCurrency(result.total_net)}
                          </p>
                        </div>
                      </div>
                      {result.is_manual && (
                        <div className="mt-3 pt-3 border-t border-zinc-700">
                          <p className="text-[10px] text-amber-400 flex items-center gap-1.5">
                            <IconWarning className="w-3.5 h-3.5" />
                            Totalul NU include transportul — ofertă manuală
                            necesară
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-3">
                        <Badge
                          variant={result.is_manual ? "warning" : "success"}
                        >
                          {result.is_manual
                            ? "Transport manual"
                            : "Calcul complet"}
                        </Badge>
                        {result.transport_description && (
                          <span className="text-zinc-400">
                            • {result.transport_description}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col divide-y divide-zinc-100">
                        {result.trips !== undefined && (
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-zinc-500">
                              Număr curse
                            </span>
                            <span className="text-sm font-medium text-zinc-900 font-mono">
                              {result.trips}
                            </span>
                          </div>
                        )}
                        {calcType !== "POMPA" &&
                          result.material_subtotal !== undefined && (
                            <div className="flex justify-between py-2">
                              <span className="text-sm text-zinc-500">
                                Materiale
                              </span>
                              <span className="text-sm font-medium text-zinc-900 font-mono">
                                {fmtCurrency(result.material_subtotal)}
                              </span>
                            </div>
                          )}
                        {result.transport_subtotal !== undefined && (
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-zinc-500">
                              Transport
                            </span>
                            <span
                              className={cn(
                                "text-sm font-medium font-mono",
                                result.is_manual
                                  ? "text-amber-600"
                                  : "text-zinc-900",
                              )}
                            >
                              {result.is_manual
                                ? "Ofertă manuală"
                                : fmtCurrency(result.transport_subtotal)}
                            </span>
                          </div>
                        )}
                        {result.surcharge_details &&
                          result.surcharge_details.length > 0 && (
                            <>
                              <div className="py-2">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                                  Taxe suplimentare
                                </p>
                                {result.surcharge_details.map((sd, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between py-1"
                                  >
                                    <span className="text-xs text-zinc-400">
                                      {sd.label}
                                    </span>
                                    <span className="text-xs font-medium text-zinc-700 font-mono">
                                      {fmtCurrency(sd.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        <div className="flex justify-between py-2">
                          <span className="text-sm text-zinc-500">
                            TVA ({((result.vat_rate ?? 0) * 100).toFixed(0)}%)
                          </span>
                          <span className="text-sm font-medium text-zinc-900 font-mono">
                            {fmtCurrency(result.vat_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Validation issues */}
              {hasValidSelection && result.validation_issues.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <IconX className="w-4 h-4 text-red-500" />
                    <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                      Probleme de validare
                    </h4>
                  </div>
                  <div className="flex flex-col gap-2">
                    {result.validation_issues.map((iss, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-red-700"
                      >
                        <span className="text-red-400 mt-0.5">•</span>
                        <span>{iss.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {hasValidSelection &&
                result.warnings &&
                result.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <IconWarning className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                        Avertismente
                      </h4>
                    </div>
                    <div className="flex flex-col gap-2">
                      {result.warnings.map((w, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm text-amber-700"
                        >
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Selected material card */}
              {selectedListing && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Material selectat
                  </h4>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                      {calcType === "CIFA" && (
                        <IconTruck className="w-6 h-6 text-zinc-400" />
                      )}
                      {calcType === "POMPA" && (
                        <IconPump className="w-6 h-6 text-zinc-400" />
                      )}
                      {calcType === "VRAC" && (
                        <IconBulk className="w-6 h-6 text-zinc-400" />
                      )}
                      {calcType === "DEPOZIT" && (
                        <IconWarehouse className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {selectedListing.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {resolvedFlowSellerName} • {selectedListing.location}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-semibold text-zinc-900 font-mono">
                          {selectedListing.price} RON/
                          {displayUnit(selectedListing.unit)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          Stoc: {selectedListing.available_qty}{" "}
                          {displayUnit(selectedListing.unit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assumptions */}
              {hasValidSelection &&
                result.assumptions &&
                result.assumptions.length > 0 && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <IconInfo className="w-4 h-4 text-sky-500" />
                      <h4 className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
                        Ipoteze aplicate
                      </h4>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {result.assumptions.map((a, i) => (
                        <p
                          key={i}
                          className="text-xs text-sky-700 leading-relaxed"
                        >
                          {a}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
