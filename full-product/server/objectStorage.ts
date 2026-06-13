import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const STORAGE_SIDECAR_ENDPOINT =
  process.env.STORAGE_SIDECAR_ENDPOINT || "http://127.0.0.1:1106";
const STORAGE_AUDIENCE = process.env.STORAGE_AUDIENCE || "storage";

export const objectStorageClient = new Storage({
  credentials: {
    audience: STORAGE_AUDIENCE,
    subject_token_type: "access_token",
    token_url: `${STORAGE_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${STORAGE_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Parse a single-range HTTP "Range: bytes=start-end" header into clamped
// byte offsets. Returns null for absent/unsupported/invalid ranges so the
// caller falls back to a full 200 response.
function parseRange(
  header: string,
  totalSize: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  let start: number;
  let end: number;
  if (startStr === "") {
    // suffix range: last N bytes
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    end = endStr === "" ? totalSize - 1 : parseInt(endStr, 10);
  }
  if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
    return null;
  }
  return { start, end: Math.min(end, totalSize - 1) };
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(
    file: File,
    res: Response,
    cacheTtlSec: number = 3600,
    rangeHeader?: string,
  ) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      const contentType = metadata.contentType || "application/octet-stream";
      const totalSize = Number(metadata.size) || 0;
      const cacheControl = `${
        isPublic ? "public" : "private"
      }, max-age=${cacheTtlSec}`;

      // The deployment proxy rejects (HTTP 500) single streamed responses that
      // exceed a size ceiling, so a large file can never be sent in one piece.
      // We cap every streamed response to MAX_STREAM_CHUNK and rely on Range
      // requests (or a signed-URL redirect) to deliver the whole file.
      const MAX_STREAM_CHUNK = 8 * 1024 * 1024; // 8 MB — safely under the limit

      // Honour HTTP Range requests so that <video>/<audio> elements can stream
      // and seek (browsers require a 206 Partial Content response to play
      // media reliably — without this Safari/iOS refuse to play at all).
      const range = rangeHeader && totalSize ? parseRange(rangeHeader, totalSize) : null;

      if (range) {
        let { start, end } = range;
        // Cap the served chunk. Browsers open media with an open-ended
        // `bytes=0-` request (the whole remaining file); serving all of it in
        // one response trips the deployment size limit and 500s, which looks
        // like "the video won't play". Returning a bounded 206 makes the
        // client fetch the rest via subsequent Range requests.
        if (end - start + 1 > MAX_STREAM_CHUNK) {
          end = start + MAX_STREAM_CHUNK - 1;
        }
        res.status(206);
        res.set({
          "Content-Type": contentType,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": cacheControl,
        });
        const stream = file.createReadStream({ start, end });
        stream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
        });
        stream.pipe(res);
        return;
      }

      // No Range header (e.g. a direct download). Streaming a large file
      // inline would exceed the deployment size limit and 500, so redirect to
      // a short-lived signed object-storage URL the client fetches directly
      // (object storage serves it natively, with full range support).
      if (totalSize > MAX_STREAM_CHUNK) {
        const signedUrl = await signObjectURL({
          bucketName: file.bucket.name,
          objectName: file.name,
          method: "GET",
          ttlSec: Math.min(cacheTtlSec, 3600),
        });
        res.redirect(302, signedUrl);
        return;
      }

      res.set({
        "Content-Type": contentType,
        "Content-Length": String(totalSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Presigned PUT directly to a PUBLIC object path so the browser can upload
  // large files (e.g. videos) straight to object storage, bypassing the app
  // server / proxy request-size limit entirely. The returned servePath is the
  // public URL the file will be reachable at once uploaded.
  async getShowcaseUploadURL(
    ext: string,
  ): Promise<{ uploadURL: string; servePath: string }> {
    const publicPaths = this.getPublicObjectSearchPaths();
    const publicDir = publicPaths[0];
    const safeExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : "";
    const filename = `showcase-${randomUUID()}-${Date.now()}${safeExt}`;
    const fullPath = `${publicDir}/${filename}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
    return { uploadURL, servePath: `/${filename}` };
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    let rawObjectPath = url.pathname;
    
    // Remove leading slash for comparison
    if (rawObjectPath.startsWith("/")) {
      rawObjectPath = rawObjectPath.slice(1);
    }

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.startsWith("/")) {
      objectEntityDir = `/${objectEntityDir}`;
    }
    if (objectEntityDir.endsWith("/")) {
      objectEntityDir = objectEntityDir.slice(0, -1);
    }
    
    // Remove leading slash from objectEntityDir for comparison
    const objectEntityDirWithoutSlash = objectEntityDir.startsWith("/") 
      ? objectEntityDir.slice(1) 
      : objectEntityDir;

    // If the path doesn't belong to the private directory, return it unchanged
    if (!rawObjectPath.startsWith(objectEntityDirWithoutSlash)) {
      return rawPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDirWithoutSlash.length);
    // Remove leading slash from entityId if present
    const cleanEntityId = entityId.startsWith("/") ? entityId.slice(1) : entityId;
    return `/objects/${cleanEntityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async uploadEmailImage(filename: string, buffer: Buffer, contentType: string): Promise<string> {
    const publicPaths = this.getPublicObjectSearchPaths();
    const publicDir = publicPaths[0];
    const fullPath = `${publicDir}/email-images/${filename}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(buffer, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    await setObjectAclPolicy(file, { visibility: 'public' } as ObjectAclPolicy);
    
    const signedUrl = await signObjectURL({
      bucketName,
      objectName,
      method: 'GET',
      ttlSec: 604800,
    });
    
    return signedUrl;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

export function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${STORAGE_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure object storage is configured`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
