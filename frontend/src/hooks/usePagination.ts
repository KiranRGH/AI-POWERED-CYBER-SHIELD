import { useState, useCallback } from 'react';

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  goNext: () => void;
  goPrev: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
}: PaginationOptions = {}): PaginationState {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotalState] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1); // Reset to first page when page size changes
  }, []);

  const setTotal = useCallback((t: number) => {
    setTotalState(t);
  }, []);

  const goNext = useCallback(() => setPage(page + 1), [page, setPage]);
  const goPrev = useCallback(() => setPage(page - 1), [page, setPage]);
  const goToFirst = useCallback(() => setPage(1), [setPage]);
  const goToLast = useCallback(() => setPage(totalPages), [totalPages, setPage]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    setTotal,
    goNext,
    goPrev,
    goToFirst,
    goToLast,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export default usePagination;
