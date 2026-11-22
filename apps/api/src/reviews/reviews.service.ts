import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../common/image.service';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private imageService?: ImageService,
  ) {}

  private sanitizePhotos(photos?: string[]): string[] {
    if (!Array.isArray(photos)) return [];
    return photos
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim().slice(0, 300))
      .filter((p) => p.startsWith('/uploads/') || p.startsWith('https://') || p.startsWith('http://'))
      .slice(0, 3);
  }

  private async attachPhotos<T extends { id: number }>(reviews: T[]): Promise<(T & { photos: string[] })[]> {
    if (!reviews.length) return [];
    const keys = reviews.map((r) => `review:photos:${r.id}`);
    const configs = await this.prisma.siteConfig
      .findMany({ where: { key: { in: keys } } })
      .catch(() => []);
    const map = new Map<string, string[]>();
    for (const cfg of configs) {
      if (Array.isArray(cfg.value)) {
        map.set(cfg.key, cfg.value as string[]);
      }
    }
    return reviews.map((r) => ({
      ...r,
      photos: map.get(`review:photos:${r.id}`) || [],
    }));
  }

  async uploadReviewPhoto(file: Express.Multer.File): Promise<{ success: boolean; url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Image file is required');
    }
    if (!this.imageService) {
      throw new BadRequestException('Image upload service unavailable');
    }
    const [savedUrl] = await this.imageService.processImages([file]);
    return {
      success: true,
      url: savedUrl,
    };
  }

  async getByProduct(productId: number) {
    const rawReviews = await this.prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const reviews = await this.attachPhotos(rawReviews);

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return { reviews, avgRating: Math.round(avgRating * 10) / 10, totalReviews: reviews.length };
  }

  async getByProductAdmin(productId: number) {
    const rawReviews = await this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const reviews = await this.attachPhotos(rawReviews);

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return { reviews, avgRating: Math.round(avgRating * 10) / 10, totalReviews: reviews.length };
  }

  async getMyReviews(userId: number) {
    const rawReviews = await this.prisma.review.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, image: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachPhotos(rawReviews);
  }

  async create(
    userId: number,
    productId: number,
    rating: number,
    comment?: string,
    title?: string,
    photos?: string[],
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new BadRequestException('You have already reviewed this product');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    const verifiedPurchase = await this.checkVerifiedPurchase(userId, productId);

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
        title,
        status: ReviewStatus.APPROVED,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const cleanPhotos = this.sanitizePhotos(photos);
    if (cleanPhotos.length > 0) {
      await this.prisma.siteConfig
        .upsert({
          where: { key: `review:photos:${review.id}` },
          update: { value: cleanPhotos as any },
          create: { key: `review:photos:${review.id}`, value: cleanPhotos as any },
        })
        .catch(() => undefined);
    }

    this.logger.log(`Review created by user ${userId} for product ${productId} (verified: ${verifiedPurchase}, photos: ${cleanPhotos.length})`);
    return {
      success: true,
      message: 'Review created',
      review: { ...review, photos: cleanPhotos },
      verifiedPurchase,
    };
  }

  async update(userId: number, reviewId: number, data: { rating?: number; comment?: string; title?: string }) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    if (data.rating !== undefined) {
      if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
        throw new BadRequestException('Rating must be an integer between 1 and 5');
      }
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: data.rating,
        comment: data.comment,
        title: data.title,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return { success: true, message: 'Review updated', review: updated };
  }

  async delete(userId: number, reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });
    return { success: true, message: 'Review deleted' };
  }

  async moderate(reviewId: number, status: ReviewStatus) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return { success: true, message: `Review ${status.toLowerCase()}`, review: updated };
  }

  async canReview(userId: number, productId: number) {
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      return { canReview: false, reason: 'Already reviewed' };
    }

    const verifiedPurchase = await this.checkVerifiedPurchase(userId, productId);
    return { canReview: true, verifiedPurchase };
  }

  private async checkVerifiedPurchase(userId: number, productId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return false;

    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        email: user.email,
        productId,
        status: 'Delivered',
      },
    });

    return !!deliveredOrder;
  }
}
