import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { MediaStorageService } from './media-storage.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 1000;
const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 400;
const WEBP_QUALITY = 80;
const MAX_DIMENSION = 5000;
const MIN_DIMENSION = 16;

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'products');
  private readonly storage = new MediaStorageService();

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFiles(files: Express.Multer.File[]): void {
    if (!files?.length) return;

    if (files.length > MAX_IMAGES) {
      throw new BadRequestException(`Maximum ${MAX_IMAGES} images allowed`);
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        );
      }
    }
  }

  async processImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files?.length) return [];

    this.validateFiles(files);

    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const baseName = `${Date.now()}-${i}`;
      const filename = `${baseName}.webp`;
      const thumbFilename = `${baseName}-thumb.webp`;

      try {
        const metadata = await sharp(files[i].buffer).metadata();
        const actualFormat = metadata.format;
        if (!actualFormat || !ALLOWED_MIME_TYPES.includes(`image/${actualFormat}`)) {
          throw new BadRequestException(
            `Invalid image content for file ${i + 1}. Allowed: JPEG, PNG, WebP, GIF`,
          );
        }

        const width = metadata.width || 0;
        const height = metadata.height || 0;
        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
          throw new BadRequestException(
            `Image ${i + 1} is too small (${width}x${height}). Minimum: ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
          );
        }
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          throw new BadRequestException(
            `Image ${i + 1} is too large (${width}x${height}). Maximum: ${MAX_DIMENSION}x${MAX_DIMENSION}px`,
          );
        }

        this.logger.debug(`Image ${i}: ${width}x${height} ${actualFormat}`);

        const [fullBuffer, thumbBuffer] = await Promise.all([
          sharp(files[i].buffer)
            .resize(DEFAULT_WIDTH, DEFAULT_HEIGHT, { fit: 'cover' })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer(),
          sharp(files[i].buffer)
            .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover' })
            .webp({ quality: 75 })
            .toBuffer(),
        ]);

        const mainKey = `products/${filename}`;
        const thumbKey = `products/${thumbFilename}`;

        const uploaded = await this.storage.uploadObject(mainKey, fullBuffer, 'image/webp');
        await this.storage.uploadObject(thumbKey, thumbBuffer, 'image/webp');

        paths.push(uploaded.url);
      } catch (err: any) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.error(`Failed to process image ${i}`, err);
        throw new BadRequestException(`Failed to process image ${i + 1}`);
      }
    }

    return paths;
  }

  deleteImage(imagePath: string): void {
    if (!imagePath) return;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
      return;
    }

    // Path traversal protection: reject traversal sequences and absolute paths
    // so a stored path can never escape the uploads directory.
    if (
      imagePath.includes('..') ||
      imagePath.startsWith('/') ||
      /^[a-zA-Z]:[\\/]/.test(imagePath) ||
      /\\\\/.test(imagePath)
    ) {
      this.logger.warn(`Refusing to delete unsafe image path: ${imagePath}`);
      return;
    }

    if (this.storage.isS3Enabled()) {
      void this.storage.deleteObject(imagePath);
      if (imagePath.endsWith('.webp')) {
        void this.storage.deleteObject(imagePath.replace(/\.webp$/, '-thumb.webp'));
      }
      return;
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const normalized = imagePath.startsWith('uploads/')
      ? imagePath
      : `uploads/${imagePath.replace(/^\/+/, '')}`;
    const fullPath = path.resolve(process.cwd(), normalized);
    if (!fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
      this.logger.warn(`Refusing to delete path outside uploads root: ${imagePath}`);
      return;
    }
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        this.logger.error(`Failed to delete image: ${imagePath}`, err);
      }
    }
    if (fullPath.endsWith('.webp')) {
      const thumbPath = fullPath.replace(/\.webp$/, '-thumb.webp');
      if (fs.existsSync(thumbPath)) {
        try {
          fs.unlinkSync(thumbPath);
        } catch {
          // Thumbnail cleanup is best-effort
        }
      }
    }
  }

  deleteImages(imagePaths: (string | null)[]): void {
    for (const p of imagePaths) {
      if (p) this.deleteImage(p);
    }
  }
}
