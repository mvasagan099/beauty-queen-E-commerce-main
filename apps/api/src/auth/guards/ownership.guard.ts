import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const OWNERSHIP_KEY = 'ownership';
export const CheckOwnership = (entity: string, paramId = 'id') => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(OWNERSHIP_KEY, { entity, paramId }, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(OWNERSHIP_KEY, { entity, paramId }, target);
    return target;
  };
};

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownershipMeta = this.reflector.getAllAndOverride<{ entity: string; paramId: string }>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownershipMeta) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    if (user.role !== 'SELLER') {
      return true;
    }

    const resourceId = parseInt(request.params[ownershipMeta.paramId], 10);
    if (isNaN(resourceId)) {
      throw new ForbiddenException('Invalid resource ID');
    }

    const entity = ownershipMeta.entity as 'product' | 'order';
    const resource = await (this.prisma[entity] as any).findUnique({
      where: { id: resourceId },
      select: { sellerId: true },
    });

    if (!resource) {
      throw new ForbiddenException('Resource not found');
    }

    if (resource.sellerId !== user.sub) {
      throw new ForbiddenException('You do not own this resource');
    }

    return true;
  }
}
