import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

function getRequestCookies(request: Request): { name: string; value: string }[] {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return []
  return cookieHeader.split(';').map((part) => {
    const [name, ...rest] = part.trim().split('=')
    return { name: name?.trim() ?? '', value: rest.join('=').trim() }
  })
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const redirectUrl = `${origin}${next.startsWith('/') ? next : `/${next}`}`
  const isProduction = origin.startsWith('https://')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const requestCookies = getRequestCookies(request)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requestCookies
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options, path: '/' }
            if (isProduction) {
              opts.secure = true
              if (opts.sameSite === undefined) opts.sameSite = 'lax'
            }
            response.cookies.set(name, value, opts)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const displayNameUrl = `${origin}/display-name${next ? `?next=${encodeURIComponent(next)}` : ''}`
    const newResponse = NextResponse.redirect(displayNameUrl)
    response.headers.getSetCookie?.()?.forEach((cookie) => {
      newResponse.headers.append('Set-Cookie', cookie)
    })
    return newResponse
  }

  return response
}
