import { MediaStorageService } from './media-storage.service';

describe('MediaStorageService', () => {
  it('defaults to local driver and prefixes CDN URLs when MEDIA_CDN_BASE_URL is configured', () => {
    const svc = new MediaStorageService({
      driver: 'local',
      cdnBaseUrl: 'https://cdn.beautyqueen.in/',
    });
    expect(svc.isS3Enabled()).toBe(false);
    expect(svc.getPublicUrl('products/saree-1.webp')).toBe(
      'https://cdn.beautyqueen.in/products/saree-1.webp',
    );
  });

  it('enables S3/R2 driver when bucket and credentials are provided', () => {
    const svc = new MediaStorageService({
      driver: 's3',
      s3Bucket: 'bq-media',
      s3Endpoint: 'https://r2.example.com',
      s3Region: 'auto',
      s3AccessKeyId: 'test-key',
      s3SecretAccessKey: 'test-secret',
    });
    expect(svc.isS3Enabled()).toBe(true);
    expect(svc.getPublicUrl('products/kurthi.webp')).toBe(
      'https://r2.example.com/bq-media/products/kurthi.webp',
    );
  });

  it('signs and executes S3 PUT requests with AWS4-HMAC-SHA256', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    const svc = new MediaStorageService({
      driver: 's3',
      s3Bucket: 'bq-media',
      s3Endpoint: 'https://r2.example.com',
      s3Region: 'ap-south-1',
      s3AccessKeyId: 'AKIA_TEST',
      s3SecretAccessKey: 'SECRET_TEST',
      cdnBaseUrl: 'https://cdn.beautyqueen.in',
    });

    const result = await svc.uploadObject('products/test.webp', Buffer.from('abc'), 'image/webp');
    expect(result).toEqual({
      key: 'products/test.webp',
      url: 'https://cdn.beautyqueen.in/products/test.webp',
      driver: 's3',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://r2.example.com/bq-media/products/test.webp',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^AWS4-HMAC-SHA256 Credential=AKIA_TEST\//),
          'content-type': 'image/webp',
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
