import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Product } from '@prisma/client';
import { CATEGORIES } from '../categories/categories.constants';

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  baseWhere?: Record<string, unknown>;
}

export interface SearchResult {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MAX_SEARCH_LENGTH = 200;
const MAX_LIMIT = 100;

/**
 * Relevance ranking for product search.
 *
 * Deterministic priority via an ordered CASE expression:
 *  0. exact name match
 *  1. name starts with the query
 *  2. name contains the query
 *  3. category/type equals the query
 *  4. description contains the query
 *  5. fallback
 */
function rankClause(query: string, prefix: string, like: string): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN name = ${query} THEN 0
      WHEN name LIKE ${prefix} THEN 1
      WHEN name LIKE ${like} THEN 2
      WHEN ptype = ${query} THEN 3
      WHEN description LIKE ${like} THEN 4
      ELSE 5
    END
  `;
}

/** Result columns aliased onto the Prisma `Product` model field names. */
const PRODUCT_COLUMNS = `id, name, price, description, image, mrp, quantity, ptype,
  image1, image2, image3, image4,
  size_s AS sizeS, size_m AS sizeM, size_l AS sizeL, size_xl AS sizeXl, size_xxl AS sizeXxl,
  seller_id AS sellerId, deleted_at AS deletedAt, created_at AS createdAt, updated_at AS updatedAt`;

/**
 * ORDER BY clause. The relevance rank is always the tiebreaker so that a
 * price/newest sort never destroys match quality within a tier.
 */
function orderBySql(sort: string | undefined, query: string, prefix: string, like: string): Prisma.Sql {
  const rank = rankClause(query, prefix, like);
  switch (sort) {
    case 'price_asc':
      return Prisma.sql`price ASC, ${rank}, id DESC`;
    case 'price_desc':
      return Prisma.sql`price DESC, ${rank}, id DESC`;
    case 'newest':
      return Prisma.sql`created_at DESC, ${rank}, id DESC`;
    default:
      return Prisma.sql`${rank}, id DESC`;
  }
}

/** Maps Prisma size/quantity fields onto the physical MySQL column names. */
const STOCK_COLUMNS: Record<string, string> = {
  sizeS: 'size_s',
  sizeM: 'size_m',
  sizeL: 'size_l',
  sizeXl: 'size_xl',
  sizeXxl: 'size_xxl',
  quantity: 'quantity',
};

/** `size_x > 0 OR ... OR quantity > 0` — any sellable stock remaining. */
function stockSql(): Prisma.Sql {
  const gt: Prisma.Sql[] = [];
  for (const column of Object.values(STOCK_COLUMNS)) {
    // Column names come from a closed-set constant map (never parameterized);
    // only the bound value is interpolated as a parameter.
    gt.push(Prisma.sql`${Prisma.raw(column)} > 0`);
  }
  return Prisma.sql`(${Prisma.join(gt, ' OR ')})`;
}

/**
 * Search abstraction.
 *
 * Backed by MySQL via Prisma. Core matching keeps the standard
 * `name/description/ptype LIKE ?` behaviour (compatible with the legacy
 * search), but results are relevance-ranked with the ordered CASE above and
 * every query is logged to `search_query_logs` for product-discovery analytics
 * (popular searches, zero-result terms). The interface stays provider-agnostic
 * so a dedicated search engine (e.g. Meilisearch) could replace the backing
 * store without touching the calling controllers.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const query = (params.query || '').trim().substring(0, MAX_SEARCH_LENGTH);

    if (!query) {
      return {
        products: [],
        pagination: { page: 1, limit: params.limit || 20, total: 0, totalPages: 0 },
      };
    }

    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || 20));
    const page = Math.max(1, params.page || 1);
    const offset = (page - 1) * limit;

    const base = params.baseWhere || {};
    const like = `%${query}%`;
    const prefix = `${query}%`;

    const baseWhereClauses = this.baseWhereClauses(base);
    const searchClause = Prisma.sql`(name LIKE ${like} OR description LIKE ${like} OR ptype LIKE ${like})`;
    const whereSql =
      baseWhereClauses.length > 0
        ? Prisma.join([...baseWhereClauses, searchClause], ' AND ')
        : searchClause;

    const products = await this.prisma.$queryRaw<Product[]>(Prisma.sql`
      SELECT ${Prisma.raw(PRODUCT_COLUMNS)}
      FROM products
      WHERE ${whereSql}
      ORDER BY ${orderBySql(params.sort, query, prefix, like)}
      LIMIT ${limit} OFFSET ${offset}
    `).catch((err) => {
      this.logger.error(`Ranked search query failed: ${err.message}`);
      return [] as Product[];
    });

    const total = await this.prisma.product.count({
      where: {
        ...this.basePrismaWhere(base),
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { ptype: { contains: query } },
        ],
      },
    });

    // Non-blocking analytics: best-effort, never fail the request.
    this.recordSearch(query, total);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Type-ahead suggestions: a small, ranked set of in-stock products plus the
   * matching categories (only categories that actually have in-stock products).
   */
  async suggestions(query: string, limit = 5): Promise<{ products: Product[]; categories: string[] }> {
    const q = (query || '').trim().substring(0, MAX_SEARCH_LENGTH);
    if (!q) {
      return { products: [], categories: [] };
    }

    const safeLimit = Math.min(10, Math.max(1, limit));
    const like = `%${q}%`;
    const prefix = `${q}%`;

    const products = await this.prisma.$queryRaw<Product[]>(Prisma.sql`
      SELECT ${Prisma.raw(PRODUCT_COLUMNS)}
      FROM products
      WHERE deleted_at IS NULL AND ${stockSql()}
        AND (name LIKE ${like} OR description LIKE ${like} OR ptype LIKE ${like})
      ORDER BY ${rankClause(q, prefix, like)}, id DESC
      LIMIT ${safeLimit}
    `).catch((err) => {
      this.logger.error(`Suggestion query failed: ${err.message}`);
      return [] as Product[];
    });

    const categories = await this.matchingCategories(q);

    return { products, categories };
  }

  /** Most-searched terms over the configured window (from search analytics). */
  async getPopularSearches(limit = 10, days = 30): Promise<string[]> {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.searchQueryLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { query: 'desc' } },
      take: safeLimit,
    });

    return rows.map((r) => r.query);
  }

  /**
   * Categories that match the given term and still have in-stock products.
   * Used for autocomplete and for zero-result recovery ("Did you mean these
   * categories?"). Only categories with real inventory are returned.
   */
  async matchingCategories(query: string, limit = 4): Promise<string[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return [];
    }

    const matching = CATEGORIES
      .filter((c) => c.name.toLowerCase().includes(q) || c.label.toLowerCase().includes(q))
      .slice(0, limit)
      .map((c) => c.slug);

    if (matching.length === 0) {
      return [];
    }

    const rows = await this.prisma.product.groupBy({
      by: ['ptype'],
      where: {
        deletedAt: null,
        ptype: { in: matching },
        OR: [
          { sizeS: { gt: 0 } },
          { sizeM: { gt: 0 } },
          { sizeL: { gt: 0 } },
          { sizeXl: { gt: 0 } },
          { sizeXxl: { gt: 0 } },
          { quantity: { gt: 0 } },
        ],
      },
      _count: true,
    });

    const withStock = new Set(rows.map((r) => r.ptype));
    return matching.filter((slug) => withStock.has(slug));
  }

  /**
   * Search analytics for the discovery dashboard: total queries, zero-result
   * queries, and the popular terms for the period.
   */
  async getAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, zeroResults, popular] = await Promise.all([
      this.prisma.searchQueryLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.searchQueryLog.count({
        where: { createdAt: { gte: since }, resultCount: 0 },
      }),
      this.prisma.searchQueryLog.groupBy({
        by: ['query'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { query: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      rangeDays: days,
      totalSearches: total,
      zeroResultSearches: zeroResults,
      zeroResultRate: total > 0 ? Math.round((zeroResults / total) * 1000) / 10 : 0,
      popularSearches: popular.map((r) => ({
        term: r.query,
        count: r._count._all,
      })),
    };
  }

  private recordSearch(query: string, resultCount: number): void {
    this.prisma.searchQueryLog
      .create({
        data: { query: query.toLowerCase(), resultCount },
      })
      .catch((err) => {
        this.logger.warn(`Failed to record search query '${query}': ${err.message}`);
      });
  }

  /** Prisma `where` equivalent of the base (in-stock) filter used by `count`. */
  private basePrismaWhere(base?: Record<string, unknown>): Record<string, unknown> {
    const { OR: _baseOr, ...rest } = base || {};
    const where: Record<string, unknown> = { ...rest };
    if (Array.isArray(base?.OR) && (base as any).OR.length > 0) {
      where.AND = [{ OR: (base as any).OR }];
    }
    return where;
  }

  /** Translates the Prisma `baseWhere` (the in-stock WHERE shape) to SQL. */
  private baseWhereClauses(base?: Record<string, unknown>): Prisma.Sql[] {
    const clauses: Prisma.Sql[] = [];

    if (base?.deletedAt === null) {
      clauses.push(Prisma.sql`deleted_at IS NULL`);
    }

    if (Array.isArray(base?.OR)) {
      const stock: Prisma.Sql[] = [];
      for (const clause of base.OR as Record<string, any>[]) {
        for (const [field, column] of Object.entries(STOCK_COLUMNS)) {
          const gt = clause?.[field]?.gt;
          if (typeof gt === 'number') {
            stock.push(Prisma.sql`${Prisma.raw(column)} > ${gt}`);
          }
        }
      }
      if (stock.length > 0) {
        clauses.push(Prisma.sql`(${Prisma.join(stock, ' OR ')})`);
      }
    }

    return clauses;
  }
}