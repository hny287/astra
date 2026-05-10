import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, canAdmin } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 signups per minute per IP
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, retryAfter } = rateLimit(`auth:signup:${ip}`, { windowMs: 60_000, maxRequests: 5 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const { email, password, name, role: requestedRole } = await request.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password, and name are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const { error, role: userRole } = await requireAuth();

  type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';
  let role: Role;
  if (error) {
    role = 'VIEWER';
  } else if (canAdmin(userRole!)) {
    const validRoles: Role[] = ['ADMIN', 'ANALYST', 'VIEWER'];
    role = validRoles.includes(requestedRole) ? requestedRole : 'VIEWER';
  } else {
    role = 'VIEWER';
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role },
  });
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role }, { status: 201 });
}