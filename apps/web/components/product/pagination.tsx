"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  params?: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseUrl, params = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const searchParams = new URLSearchParams(params);
    searchParams.set("page", String(page));
    return `${baseUrl}?${searchParams.toString()}`;
  };

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {currentPage > 1 && (
        <Link href={buildUrl(currentPage - 1)} aria-label="Previous page">
          <Button variant="outline" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>
        </Link>
      )}

      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Link key={page} href={buildUrl(page)} aria-label={`Page ${page}`} aria-current={page === currentPage ? "page" : undefined}>
            <Button
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className={page === currentPage ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}
            >
              {page}
            </Button>
          </Link>
        ),
      )}

      {currentPage < totalPages && (
        <Link href={buildUrl(currentPage + 1)} aria-label="Next page">
          <Button variant="outline" size="sm" className="gap-1">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </nav>
  );
}
