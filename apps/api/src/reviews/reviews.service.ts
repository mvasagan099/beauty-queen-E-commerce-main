import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private prisma: PrismaService) {}

  async getByProduct(productId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return { reviews, avgRating: Math.round(avgRating * 10) / 10, totalReviews: reviews.length };
  }

  async getByProductAdmin(productId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return { reviews, avgRating: Math.round(avgRating * 10) / 10, totalReviews: reviews.length };
  }

  async getMyReviews(userId: number) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, image: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: number, productId: number, rating: number, comment?: string, title?: string) {
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

    this.logger.log(`Review created by user ${userId} for product ${productId} (verified: ${verifiedPurchase})`);
    return { success: true, message: 'Review created', review, verifiedPurchase };
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
