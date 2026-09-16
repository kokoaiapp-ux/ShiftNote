import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEnterprisePath } from "@/lib/enterprise/routes";
import { refreshEnterpriseSession } from '@/lib/enterprise/session-proxy';

const protectedPrefixes = ["/account", "/billing", "/copilot", "/dashboard", "/favorites", "/history", "/modes", "/onboarding", "/settings", "/templates"];

export async function proxy(request: NextRequest) {
  // SMART technical routes use their own server session, not Professional or Enterprise Admin Auth.
  if (request.nextUrl.pathname === '/fhir' || request.nextUrl.pathname.startsWith('/fhir/') || request.nextUrl.pathname === '/enterprise/clinician') {
    const response = NextResponse.next({request});
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  if (isEnterprisePath(request.nextUrl.pathname) || request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')) return refreshEnterpriseSession(request);
  if (request.nextUrl.pathname.startsWith('/api/enterprise/') || request.nextUrl.pathname.startsWith('/api/admin/')) return NextResponse.next({request});
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const protectedRoute = protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  if (protectedRoute && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
