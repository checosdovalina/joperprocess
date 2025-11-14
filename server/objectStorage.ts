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

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
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

export class ObjectStorageService {
  private normalizedPrivateDir: string | null = null;

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

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
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

  private getNormalizedPrivateDir(): string {
    if (!this.normalizedPrivateDir) {
      const privateObjectDir = this.getPrivateObjectDir();
      // Ensure leading slash
      let normalized = privateObjectDir.startsWith('/') ? privateObjectDir : `/${privateObjectDir}`;
      // Remove trailing slash
      normalized = normalized.replace(/\/+$/, '');
      // Collapse multiple slashes
      normalized = normalized.replace(/\/+/g, '/');
      this.normalizedPrivateDir = normalized;
    }
    return this.normalizedPrivateDir;
  }

  async downloadObjectByPath(
    objectPath: string,
    res: Response,
    options?: {
      isPublic?: boolean;
      contentType?: string;
      disposition?: "inline" | "attachment";
      filename?: string;
      cacheTtlSec?: number;
    }
  ) {
    try {
      let fullPath: string;
      
      // Paths starting with "/" are absolute, use as-is
      // Otherwise treat as relative and prepend normalized PRIVATE_OBJECT_DIR
      if (objectPath.startsWith('/')) {
        fullPath = objectPath;
      } else {
        const normalizedPrivateDir = this.getNormalizedPrivateDir();
        fullPath = `${normalizedPrivateDir}/${objectPath}`;
      }

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (!exists) {
        console.error(`Object not found: ${fullPath}`);
        throw new ObjectNotFoundError();
      }

      const [metadata] = await file.getMetadata();
      const contentType = options?.contentType || metadata.contentType || "application/octet-stream";
      const cacheTtlSec = options?.cacheTtlSec || 3600;

      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": `${options?.isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      };

      if (metadata.size) {
        headers["Content-Length"] = String(metadata.size);
      }

      if (options?.disposition) {
        const filename = options?.filename || objectName.split('/').pop();
        headers["Content-Disposition"] = `${options.disposition}; filename="${filename}"`;
      }

      res.set(headers);

      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error(`Error downloading object by path: ${objectPath}`, error);
      throw error;
    }
  }

  async downloadObjectAsBuffer(objectPath: string): Promise<Buffer> {
    try {
      // If objectPath is relative (doesn't start with /), prepend PRIVATE_OBJECT_DIR
      let fullPath = objectPath;
      if (!objectPath.startsWith('/')) {
        const privateObjectDir = this.getPrivateObjectDir();
        fullPath = `${privateObjectDir}/${objectPath}`;
      }

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (!exists) {
        console.error(`Object not found: ${fullPath}`);
        throw new ObjectNotFoundError();
      }

      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      console.error(`Error downloading object as buffer: ${objectPath}`, error);
      throw error;
    }
  }

  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; entityId: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const entityId = `uploads/${objectId}`;
    const fullPath = `${privateObjectDir}/${entityId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return { uploadURL, entityId };
  }

  async getObjectEntityFile(entityId: string): Promise<File> {
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

  normalizeObjectEntityPath(rawPath: string): string | null {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return null;
    }

    const url = new URL(rawPath);
    let rawObjectPath = url.pathname;
    
    // Ensure pathname starts with /
    if (!rawObjectPath.startsWith("/")) {
      rawObjectPath = `/${rawObjectPath}`;
    }

    let objectEntityDir = this.getPrivateObjectDir();
    // Ensure dir starts with /
    if (!objectEntityDir.startsWith("/")) {
      objectEntityDir = `/${objectEntityDir}`;
    }
    // Ensure dir ends with /
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return null;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return entityId;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const entityId = this.normalizeObjectEntityPath(rawPath);
    if (!entityId) {
      throw new Error("Invalid object path: must be under PRIVATE_OBJECT_DIR");
    }

    const objectFile = await this.getObjectEntityFile(entityId);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return entityId;
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

  async uploadPdfStreamToStorage(
    pdfStream: NodeJS.ReadableStream,
    filename: string,
    ownerId: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const privateObjectDir = this.getPrivateObjectDir();
      const fullPath = `${privateObjectDir}/minutes/${filename}.pdf`;
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const writeStream = file.createWriteStream({
        metadata: {
          contentType: "application/pdf",
          metadata: {
            [ACL_POLICY_METADATA_KEY]: JSON.stringify({
              owner: ownerId,
              visibility: "private",
            } as ObjectAclPolicy),
          },
        },
      });

      pdfStream
        .pipe(writeStream)
        .on("error", (error) => reject(error))
        .on("finish", () => resolve(`minutes/${filename}.pdf`));
    });
  }
}

function parseObjectPath(path: string): {
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
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
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
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
