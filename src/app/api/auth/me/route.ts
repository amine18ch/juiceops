import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  return NextResponse.json({ user: user ?? null });
}
