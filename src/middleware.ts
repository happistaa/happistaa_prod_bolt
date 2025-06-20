import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value,
                set: (name, value, options) => {
                  response.cookies.set({ name, value, ...options });
                },
                remove: (name, options) => {
                  response.cookies.set({ name, value: '', ...options });
                }
              }
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  
  // Define protected routes
  const protectedRoutes = ['/test-profile'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Define authentication routes (redirect to dashboard if already authenticated)
  const authRoutes = ['/onboarding', '/auth/signup', '/auth/login'];
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // If user is already signed in and tries to access auth routes, redirect to dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is not signed in and the route requires authentication, redirect to login
  if (!session && isProtectedRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is signed in but hasn't completed profile setup
  if (session && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('completed_setup')
      .eq('id', session.user.id)
      .single();

    // For peer-support routes, redirect to profile setup with redirect parameter
    if ((!profile || profile.completed_setup === false) && request.nextUrl.pathname.startsWith('/peer-support')) {
      const setupUrl = new URL('/onboarding/profile-setup', request.url);
      setupUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(setupUrl);
    }
    
    // For other protected routes, redirect to profile setup
    if (!profile || profile.completed_setup === false) {
      return NextResponse.redirect(new URL('/onboarding/profile-setup', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
