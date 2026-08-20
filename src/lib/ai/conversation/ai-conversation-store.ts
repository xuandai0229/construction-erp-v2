import "server-only";
import { randomUUID } from "node:crypto";
import { AISource } from "../types";

const CONVERSATION_TTL_MS = 30 * 60 * 1000;
const MAX_CONVERSATIONS = 1000;
const SAFE_CONVERSATION_ID = /^conv_[a-zA-Z0-9-]{8,80}$/;

export interface AIConversationEntityRef {
  type: "PROJECT";
  id: string;
  code?: string;
  name?: string;
}

export interface AIConversationTaskState {
  conversationId: string;
  userId: string;
  currentIntent?: string;
  activeEntities: AIConversationEntityRef[];
  previousToolReferences: string[];
  lastAnswerReferences: AISource[];
  createdAt: string;
  expiresAt: string;
}

const conversationStore = new Map<string, AIConversationTaskState>();

function purgeExpired(now = Date.now()): void {
  for (const [id, state] of conversationStore) {
    if (new Date(state.expiresAt).getTime() <= now) conversationStore.delete(id);
  }
  while (conversationStore.size > MAX_CONVERSATIONS) {
    const oldest = conversationStore.keys().next().value as string | undefined;
    if (!oldest) break;
    conversationStore.delete(oldest);
  }
}

export function getOrCreateAIConversation(
  userId: string,
  requestedConversationId?: string,
): AIConversationTaskState {
  purgeExpired();
  const conversationId = requestedConversationId && SAFE_CONVERSATION_ID.test(requestedConversationId)
    ? requestedConversationId
    : `conv_${randomUUID()}`;
  const existing = conversationStore.get(conversationId);
  if (existing && existing.userId === userId) {
    const refreshed = {
      ...existing,
      expiresAt: new Date(Date.now() + CONVERSATION_TTL_MS).toISOString(),
    };
    conversationStore.set(conversationId, refreshed);
    return refreshed;
  }

  const now = new Date();
  const created: AIConversationTaskState = {
    conversationId,
    userId,
    activeEntities: [],
    previousToolReferences: [],
    lastAnswerReferences: [],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONVERSATION_TTL_MS).toISOString(),
  };
  conversationStore.set(conversationId, created);
  return created;
}

export function updateAIConversation(
  conversationId: string,
  userId: string,
  patch: Partial<Pick<
    AIConversationTaskState,
    "currentIntent" | "activeEntities" | "previousToolReferences" | "lastAnswerReferences"
  >>,
): AIConversationTaskState | null {
  const current = conversationStore.get(conversationId);
  if (!current || current.userId !== userId) return null;
  const next: AIConversationTaskState = {
    ...current,
    ...patch,
    activeEntities: (patch.activeEntities ?? current.activeEntities).slice(0, 5),
    previousToolReferences: (patch.previousToolReferences ?? current.previousToolReferences).slice(-10),
    lastAnswerReferences: (patch.lastAnswerReferences ?? current.lastAnswerReferences).slice(0, 20),
    expiresAt: new Date(Date.now() + CONVERSATION_TTL_MS).toISOString(),
  };
  conversationStore.set(conversationId, next);
  return next;
}

export function clearAIConversationStore(): void {
  conversationStore.clear();
}
