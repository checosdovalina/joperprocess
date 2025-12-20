import * as fs from "fs";
import * as path from "path";
import { Response } from "express";
import { Readable } from "stream";

const STORAGE_BASE_DIR = process.env.LOCAL_STORAGE_DIR || "./storage";

export class LocalStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(STORAGE_BASE_DIR);
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      this.baseDir,
      path.join(this.baseDir, "minutes"),
      path.join(this.baseDir, "quotations"),
      path.join(this.baseDir, "photos"),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async uploadPdfStreamToStorage(
    pdfStream: NodeJS.ReadableStream,
    filename: string,
    _ownerId: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const relativePath = `minutes/${filename}.pdf`;
      const fullPath = path.join(this.baseDir, relativePath);

      const writeStream = fs.createWriteStream(fullPath);

      pdfStream
        .pipe(writeStream)
        .on("error", (error) => reject(error))
        .on("finish", () => resolve(relativePath));
    });
  }

  async uploadQuotationPdfToStorage(
    pdfStream: NodeJS.ReadableStream,
    folio: string,
    _ownerId: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const relativePath = `quotations/${folio}-${timestamp}.pdf`;
      const fullPath = path.join(this.baseDir, relativePath);

      const writeStream = fs.createWriteStream(fullPath);

      pdfStream
        .pipe(writeStream)
        .on("error", (error) => reject(error))
        .on("finish", () => resolve(relativePath));
    });
  }

  async uploadPhotoToStorage(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    const relativePath = `photos/${filename}`;
    const fullPath = path.join(this.baseDir, relativePath);

    await fs.promises.writeFile(fullPath, buffer);
    return relativePath;
  }

  async getFile(relativePath: string): Promise<Buffer | null> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      return await fs.promises.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async streamFile(relativePath: string, res: Response): Promise<boolean> {
    const fullPath = path.join(this.baseDir, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return false;
    }

    const stat = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    res.set({
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "private, max-age=3600",
    });

    const readStream = fs.createReadStream(fullPath);
    readStream.pipe(res);
    return true;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  getFullPath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  isLocalStorageEnabled(): boolean {
    return process.env.USE_LOCAL_STORAGE === "true" || 
           process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR;
  }
}

export const localStorageService = new LocalStorageService();
