import {
  createAddressAction,
  updateAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/app/account/addresses/actions"
import type { AddressUpsertInput } from "@/lib/validation"

type Result = { success: true } | { success: false; error: string }

// Thin client wrappers so TSX components never import server actions directly.
export async function createAddress(input: AddressUpsertInput): Promise<Result> {
  return createAddressAction(input)
}

export async function updateAddress(id: number, input: AddressUpsertInput): Promise<Result> {
  return updateAddressAction(id, input)
}

export async function deleteAddress(id: number): Promise<Result> {
  return deleteAddressAction(id)
}

export async function setDefaultAddress(
  id: number,
  kind: "billing" | "shipping",
): Promise<Result> {
  return setDefaultAddressAction(id, kind)
}
