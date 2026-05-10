import { NextRequest } from 'next/server';

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function parsePagination(request: NextRequest, defaultLimit = 20, maxLimit = 200): PaginationParams {
  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? String(defaultLimit), 10), 1),
    maxLimit,
  );
  const offset = Math.max(parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10), 0);
  return { limit, offset };
}