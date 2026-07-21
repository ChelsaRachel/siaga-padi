import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useEffect, useState, type ReactNode } from 'react';

interface PaginationControlProps {
  pageCount: number;
  initialPage?: number;
  forcePage?: number;
  pageRangeDisplayed?: number;
  marginPagesDisplayed?: number;
  disableInitialCallback?: boolean;
  showFirstLast?: boolean;
  previousLabel?: ReactNode;
  nextLabel?: ReactNode;
  firstLabel?: ReactNode;
  lastLabel?: ReactNode;
  onPageChange?: (selected: number) => void;
}

function buildPageRange(
  current: number,
  pageCount: number,
  pageRange: number,
  marginPages: number,
): (number | 'ellipsis')[] {
  if (pageCount <= pageRange + marginPages * 2) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const pages = new Set<number>();

  for (let i = 0; i < marginPages; i++) pages.add(i);
  for (let i = pageCount - marginPages; i < pageCount; i++) pages.add(i);

  const half = Math.floor(pageRange / 2);
  const rangeStart = Math.max(marginPages, current - half);
  const rangeEnd = Math.min(pageCount - 1 - marginPages, rangeStart + pageRange - 1);
  for (let i = rangeStart; i <= rangeEnd; i++) pages.add(i);

  const sorted = Array.from(pages).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) {
      result.push('ellipsis');
    }
  }

  return result;
}

export function PaginationControl({
  pageCount,
  initialPage = 0,
  forcePage,
  pageRangeDisplayed = 5,
  marginPagesDisplayed = 1,
  disableInitialCallback = false,
  showFirstLast = false,
  previousLabel,
  nextLabel,
  firstLabel = (<i className='ph ph-caret-double-left' />),
  lastLabel = (<i className='ph ph-caret-double-right' />),
  onPageChange,
}: PaginationControlProps) {
  const [current, setCurrent] = useState(forcePage ?? initialPage);

  useEffect(() => {
    if (forcePage !== undefined) setCurrent(forcePage);
  }, [forcePage]);

  useEffect(() => {
    if (!disableInitialCallback) onPageChange?.(current);
  }, []);

  function goTo(page: number) {
    if (page < 0 || page >= pageCount || page === current) return;
    setCurrent(page);
    onPageChange?.(page);
  }

  const pages = buildPageRange(current, pageCount, pageRangeDisplayed, marginPagesDisplayed);

  const isFirst = current === 0;
  const isLast = current === pageCount - 1;

  return (
    <Pagination>
      <PaginationContent>
        {showFirstLast && (
          <PaginationItem>
            <PaginationLink
              onClick={() => goTo(0)}
              aria-disabled={isFirst}
              className={isFirst ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            >
              {firstLabel}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationPrevious
            onClick={() => goTo(current - 1)}
            aria-disabled={isFirst}
            className={isFirst ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            {...(previousLabel ? { children: previousLabel } : {})}
          />
        </PaginationItem>

        {pages.map((page, i) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === current}
                onClick={() => goTo(page)}
                className="cursor-pointer"
              >
                {page + 1}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => goTo(current + 1)}
            aria-disabled={isLast}
            className={isLast ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            {...(nextLabel ? { children: nextLabel } : {})}
          />
        </PaginationItem>

        {showFirstLast && (
          <PaginationItem>
            <PaginationLink
              onClick={() => goTo(pageCount - 1)}
              aria-disabled={isLast}
              className={isLast ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            >
              {lastLabel}
            </PaginationLink>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
