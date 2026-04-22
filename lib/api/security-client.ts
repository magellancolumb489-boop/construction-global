import {
  changePasswordAction,
  revokeOtherSessionsAction,
} from "@/app/account/security/actions"
import {
  requestDataExportAction,
  requestAccountDeletionAction,
  cancelAccountDeletionAction,
} from "@/app/account/privacy/actions"

type Result = { success: true } | { success: false; error: string }

export async function changePassword(newPassword: string): Promise<Result> {
  return changePasswordAction(newPassword)
}

export async function revokeOtherSessions(): Promise<Result> {
  return revokeOtherSessionsAction()
}

export async function requestDataExport(): Promise<Result> {
  return requestDataExportAction()
}

export async function requestAccountDeletion(reason?: string): Promise<Result> {
  return requestAccountDeletionAction(reason)
}

export async function cancelAccountDeletion(): Promise<Result> {
  return cancelAccountDeletionAction()
}
