import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface MediaUploadResult {
  key: string;
  url: string;
  driver: 'local' | 's3';
}

export interface MediaStorageConfig {
  driver: 'local' | 's3';
  cdnBaseUrl?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly uploadRoot = path.join(process.cwd(), 'uploads');
  private readonly config: MediaStorageConfig;

  constructor(overrideConfig?: Partial<MediaStorageConfig>) {
    const driverEnv = (overrideConfig?.driver || process.env.MEDIA_STORAGE_DRIVER || 'local').toLowerCase();
    this.config = {
      driver: driverEnv === 's3' ? 's3' : 'local',
      cdnBaseUrl: overrideConfig?.cdnBaseUrl ?? process.env.MEDIA_CDN_BASE_URL,
      s3Bucket: overrideConfig?.s3Bucket ?? process.env.S3_BUCKET,
      s3Region: overrideConfig?.s3Region ?? process.env.S3_REGION ?? 'ap-south-1',
      s3Endpoint: overrideConfig?.s3Endpoint ?? process.env.S3_ENDPOINT,
      s3AccessKeyId: overrideConfig?.s3AccessKeyId ?? process.env.S3_ACCESS_KEY_ID,
      s3SecretAccessKey: overrideConfig?.s3SecretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY,
    };
  }

  isS3Enabled(): boolean {
    return (
      this.config.driver === 's3' &&
      Boolean(this.config.s3Bucket && this.config.s3AccessKeyId && this.config.s3SecretAccessKey)
    );
  }

  getPublicUrl(key: string): string {
    const normalized = key.replace(/^\/+/, '');
    if (this.config.cdnBaseUrl) {
      return `${this.config.cdnBaseUrl.replace(/\/+$/, '')}/${normalized}`;
    }
    if (this.isS3Enabled() && this.config.s3Endpoint) {
      return `${this.config.s3Endpoint.replace(/\/+$/, '')}/${this.config.s3Bucket}/${normalized}`;
    }
    return normalized;
  }

  async uploadObject(key: string, body: Buffer, contentType: string): Promise<MediaUploadResult> {
    const normalizedKey = key.replace(/^\/+/, '');

    if (this.isS3Enabled()) {
      await this.s3SignedRequest('PUT', normalizedKey, body, contentType);
      return {
        key: normalizedKey,
        url: this.getPublicUrl(normalizedKey),
        driver: 's3',
      };
    }

    const fullPath = path.join(this.uploadRoot, normalizedKey);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, body);
    return {
      key: normalizedKey,
      url: this.getPublicUrl(normalizedKey),
      driver: 'local',
    };
  }

  async deleteObject(key: string): Promise<void> {
    if (!key || key.startsWith('http://') || key.startsWith('https://') || key.startsWith('data:')) {
      return;
    }
    if (key.includes('..') || key.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(key)) {
      this.logger.warn(`Refusing unsafe media delete key: ${key}`);
      return;
    }

    const normalizedKey = key.replace(/^uploads\//, '').replace(/^\/+/, '');

    if (this.isS3Enabled()) {
      try {
        await this.s3SignedRequest('DELETE', normalizedKey, Buffer.alloc(0));
      } catch (err) {
        this.logger.error(`S3 delete failed for ${normalizedKey}`, err);
      }
      return;
    }

    const fullPath = path.join(this.uploadRoot, normalizedKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  private async s3SignedRequest(
    method: 'PUT' | 'DELETE',
    key: string,
    body: Buffer,
    contentType?: string,
  ): Promise<void> {
    const region = this.config.s3Region || 'ap-south-1';
    const bucket = this.config.s3Bucket!;
    const endpoint = this.config.s3Endpoint
      ? new URL(this.config.s3Endpoint)
      : new URL(`https://${bucket}.s3.${region}.amazonaws.com`);

    const usePathStyle = Boolean(this.config.s3Endpoint);
    const canonicalUri = usePathStyle ? `/${bucket}/${key}` : `/${key}`;
    const url = `${endpoint.origin}${canonicalUri}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);

    const headers: Record<string, string> = {
      host: endpoint.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    if (contentType) {
      headers['content-type'] = contentType;
    }

    const signedKeys = Object.keys(headers).sort();
    const canonicalHeaders = signedKeys.map((k) => `${k}:${headers[k]}\n`).join('');
    const signedHeaders = signedKeys.join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const kDate = hmacSha256(`AWS4${this.config.s3SecretAccessKey!}`, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, 's3');
    const kSigning = hmacSha256(kService, 'aws4_request');
    const signature = crypto
      .createHmac('sha256', kSigning)
      .update(stringToSign, 'utf8')
      .digest('hex');

    headers['Authorization'] =
      `AWS4-HMAC-SHA256 Credential=${this.config.s3AccessKeyId!}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const fetchHeaders: Record<string, string> = { ...headers };
    delete fetchHeaders.host;

    const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: method === 'PUT' ? new Uint8Array(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`S3 ${method} ${key} failed with HTTP ${res.status}`);
    }
  }
}
