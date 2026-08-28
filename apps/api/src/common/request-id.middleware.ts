import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request / correlation ID middleware.
 *
 * Generates (or honours) a `x-request-id` header for every request so logs,
 * errors and downstream service calls can be correlated. The ID is also
 * echoed back on the response for easier client-side debugging.
 *
 * Registers the ID on `req.requestId` (typed as `any` because Express's
 * Request interface does not declare it natively).
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers['x-request-id'];
  const requestId =
    typeof existing === 'string' && existing.length > 0
      ? existing
      : uuidv4();

  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
