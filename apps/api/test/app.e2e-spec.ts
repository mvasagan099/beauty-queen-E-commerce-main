import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('/api/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('checks');
          expect(res.body.checks).toHaveProperty('database');
          expect(res.body.checks).toHaveProperty('redis');
        });
    });
  });

  describe('/api/health/live (GET)', () => {
    it('should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('/api/health/ready (GET)', () => {
    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);
    });
  });
});

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 10000);

  describe('/api/auth/send-otp (POST)', () => {
    it('should send OTP to valid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ email: 'test-e2e@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.email).toBe('test-e2e@example.com');
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should reject missing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({})
        .expect(400);
    });
  });

  describe('/api/auth/me (GET)', () => {
    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });
});

describe('Products (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('/api/products (GET)', () => {
    it('should return product list', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
        });
    });
  });

  describe('/api/products/homepage (GET)', () => {
    it('should return homepage data', () => {
      return request(app.getHttpServer())
        .get('/api/products/homepage')
        .expect(200);
    });
  });

  describe('/api/products/search (GET)', () => {
    it('should search products', () => {
      return request(app.getHttpServer())
        .get('/api/products/search?q=saree')
        .expect(200);
    });
  });

  describe('/api/categories (GET)', () => {
    it('should return categories', () => {
      return request(app.getHttpServer())
        .get('/api/categories')
        .expect(200);
    });
  });
});

describe('Authorization (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const assertUnauthorized = (method: string, path: string) => {
    const agent = request(app.getHttpServer()) as unknown as Record<
      string,
      (url: string) => request.Test
    >;
    return agent[method](path).expect(401);
  };

  const protectedEndpoints = [
    { method: 'get', path: '/api/cart' },
    { method: 'get', path: '/api/orders' },
    { method: 'get', path: '/api/wishlist' },
    { method: 'get', path: '/api/notifications' },
    { method: 'get', path: '/api/users/me' },
  ];

  protectedEndpoints.forEach(({ method, path }) => {
    it(`should reject unauthenticated ${method.toUpperCase()} ${path}`, () => {
      return assertUnauthorized(method, path);
    });
  });

  const adminOnlyEndpoints = [
    { method: 'get', path: '/api/admin/dashboard' },
    { method: 'get', path: '/api/admin/users' },
    { method: 'get', path: '/api/admin/sellers' },
  ];

  adminOnlyEndpoints.forEach(({ method, path }) => {
    it(`should reject unauthenticated ${method.toUpperCase()} ${path}`, () => {
      return assertUnauthorized(method, path);
    });
  });
});
