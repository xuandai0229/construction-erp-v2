import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function apiSuccess<T>(data: T, status = 200, meta?: ApiSuccessResponse<T>['meta']) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status });
}

export function apiList<T>(
  items: T[],
  page = 1,
  pageSize = 20,
  total = items.length,
  extraMeta?: Record<string, any>
) {
  const totalPages = Math.ceil(total / (pageSize || 1));
  return NextResponse.json(
    {
      success: true,
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        ...extraMeta,
      },
    },
    { status: 200 }
  );
}

export function apiError(code: string, message: string, status = 400, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function parsePaginationParams(url: string, defaultPageSize = 20, maxPageSize = 100) {
  const { searchParams } = new URL(url);
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const rawPageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || String(defaultPageSize), 10);

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  let pageSize = isNaN(rawPageSize) || rawPageSize < 1 ? defaultPageSize : rawPageSize;
  if (pageSize > maxPageSize) pageSize = maxPageSize;

  const skip = (page - 1) * pageSize;
  const search = searchParams.get('search') || searchParams.get('q') || undefined;

  return { page, pageSize, skip, limit: pageSize, search };
}
