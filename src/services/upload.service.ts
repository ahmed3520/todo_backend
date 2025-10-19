import fs from 'node:fs';
import path from 'node:path';

const uploadsDirectory = path.resolve(process.cwd(), 'uploads');

export function ensureUploadsDirectory(): void {
  if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory, { recursive: true });
  }
}

export function getUploadsDirectory(): string {
  ensureUploadsDirectory();
  return uploadsDirectory;
}

export interface UploadedImageInfo {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export function buildPublicUrl(fileName: string): string {
  return `/uploads/${fileName}`;
}

export function mapToUploadedImageInfo(file: Express.Multer.File): UploadedImageInfo {
  return {
    url: buildPublicUrl(file.filename),
    fileName: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
}
