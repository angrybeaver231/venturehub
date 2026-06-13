import { storage } from "../storage";
import { SignalIngestor } from "./base";

const ingestors = new Map<string, SignalIngestor>();

export function registerIngestor(ingestor: SignalIngestor): void {
  ingestors.set(ingestor.sourceKey, ingestor);
}

export function getIngestor(sourceKey: string): SignalIngestor | undefined {
  return ingestors.get(sourceKey);
}

export function getAllIngestors(): SignalIngestor[] {
  return Array.from(ingestors.values());
}

export async function syncIngestorsToDatabase(): Promise<void> {
  for (const ingestor of Array.from(ingestors.values())) {
    await storage.upsertSignalSource({
      sourceKey: ingestor.sourceKey,
      displayName: ingestor.displayName,
      category: ingestor.category,
      scoreCategory: ingestor.scoreCategory ?? null,
      description: ingestor.description ?? null,
      requiresCredentials: ingestor.requiresCredentials,
      credentialKind: ingestor.credentialKind ?? null,
    });
  }
}
