import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), userId: null, role: null };
  return { error: null, userId: (session.user as any).id, role: (session.user as any).role as Role };
}

export function requireRole(role: Role | Role[], userId: string, userRole: Role): NextResponse | null {
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export function canWrite(role: Role): boolean {
  return role === 'ADMIN' || role === 'ANALYST';
}

export function canAdmin(role: Role): boolean {
  return role === 'ADMIN';
}

/** Check that the authenticated user owns the given scan, or is an ADMIN. Returns error response or null. */
export async function requireScanOwnership(scanId: string, userId: string, role: Role): Promise<NextResponse | null> {
  if (canAdmin(role)) return null;
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { userId: true } });
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  if (scan.userId && scan.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}