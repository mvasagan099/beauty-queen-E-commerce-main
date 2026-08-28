import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

function setupHost(json: ReturnType<typeof jest.fn>, requestId: string) {
  const status = jest.fn().mockReturnValue({ json });
  return {
    status,
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/test', requestId }),
      }),
    } as any,
  };
}

describe('AllExceptionsFilter (security behaviour)', () => {
  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('does not leak internal error details in production', () => {
    process.env.NODE_ENV = 'production';
    const json = jest.fn();
    const { host } = setupHost(json, 'req-1');
    const filter = new AllExceptionsFilter();

    filter.catch(new Error('connect ECONNREFUSED 10.0.0.5:3306 password=secret'), host);

    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Unable to process request');
    expect(body.success).toBe(false);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.requestId).toBe('req-1');
    expect(body.password).toBeUndefined();
  });

  it('returns the request id in the error envelope', () => {
    process.env.NODE_ENV = 'development';
    const json = jest.fn();
    const { host } = setupHost(json, 'req-456');
    new AllExceptionsFilter().catch(new Error('boom'), host);

    const body = json.mock.calls[0][0];
    expect(body.requestId).toBe('req-456');
  });

  it('preserves HttpException message and HTTP status', () => {
    process.env.NODE_ENV = 'development';
    const json = jest.fn();
    const { status, host } = setupHost(json, 'req-7');
    new AllExceptionsFilter().catch(
      new HttpException({ message: 'Too many requests', code: 'RATE_LIMITED' }, HttpStatus.TOO_MANY_REQUESTS),
      host,
    );
    const body = json.mock.calls[0][0];
    expect(status).toHaveBeenCalledWith(429);
    expect(body.message).toBe('Too many requests');
    expect(body.success).toBe(false);
  });
});
