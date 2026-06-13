import { storage } from "../storage";
import { decryptConfig } from "./crypto";

export class MissingCredentialError extends Error {
  constructor(public credentialKind: string) {
    super(`Missing credential: ${credentialKind}`);
    this.name = "MissingCredentialError";
  }
}

const envCache = new Map<string, string | null>();

export function getEnvCredential(name: string): string | null {
  if (!envCache.has(name)) {
    const value = process.env[name];
    envCache.set(name, value && value.trim().length > 0 ? value : null);
  }
  return envCache.get(name) ?? null;
}

export function clearEnvCredentialCache(): void {
  envCache.clear();
}

export async function getCredential(
  kind: string,
  startupId?: string,
): Promise<{ source: "startup" | "env"; config: any } | null> {
  if (startupId) {
    const cred = await storage.getIntegrationCredential(startupId, kind);
    if (cred && cred.status === "active" && cred.encryptedConfig) {
      const config = decryptConfig(cred.encryptedConfig);
      if (config) return { source: "startup", config };
    }
  }
  // Global DB credential row (startupId IS NULL) — falls back to env if not present.
  const globalCred = await storage.getIntegrationCredential(null, kind);
  if (globalCred && globalCred.status === "active" && globalCred.encryptedConfig) {
    const config = decryptConfig(globalCred.encryptedConfig);
    if (config) return { source: "startup", config };
  }
  const envName = kind.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const value = getEnvCredential(envName);
  if (value) return { source: "env", config: { token: value } };
  return null;
}

export function requireCredential(name: string): string {
  const value = getEnvCredential(name);
  if (!value) {
    throw new MissingCredentialError(name);
  }
  return value;
}
