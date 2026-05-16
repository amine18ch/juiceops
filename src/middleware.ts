import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'juiceops-secret-key-change-in-production-2024!'
);
const COOKIE_NAME = 'juiceops-token';

const PROTECTED = [
  '/dashboard', '/r-ception-des-produits', '/contr-le-des-emballages',
  '/hygi-ne-check-list', '/temp-ratures-de-stockage', '/gestion-des-anomalies',
  '/chantillonnage', '/facturation-ventes', '/gestion-clients',
  '/gestion-fournisseurs', '/gestion-produits', '/gestion-depots',
  '/gestion-chambres-froides', '/gestion-utilisateurs',
];

async function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const user = await getUser(request);
  const { pathname } = request.nextUrl;

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!user && PROTECTED.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
