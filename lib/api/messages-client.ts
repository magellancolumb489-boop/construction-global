import {
  openThreadAction,
  sendMessageAction,
  markThreadReadAction,
} from "@/app/account/messages/actions"
import type {
  ThreadOpenInput,
  MessageSendInput,
} from "@/lib/validation"

type OpenResult =
  | { success: true; thread_id: number }
  | { success: false; error: string }

type Result = { success: true } | { success: false; error: string }

export async function openThread(input: ThreadOpenInput): Promise<OpenResult> {
  return openThreadAction(input)
}

export async function sendMessage(input: MessageSendInput): Promise<Result> {
  return sendMessageAction(input)
}

export async function markThreadRead(threadId: number): Promise<Result> {
  return markThreadReadAction(threadId)
}
