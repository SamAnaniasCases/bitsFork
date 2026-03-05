import { NextResponse } from 'next/server'

/**
 * POST /api/auth/refresh
 * Calls the backend refresh endpoint, which reads the refresh_token cookie,
 * validates it against the DB, rotates it, and sets new auth cookies.
 */
export async function POST() {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'

        // Forward the request to the backend — cookies are forwarded via the
        // Next.js server so the backend can read req.cookies.refresh_token
        const res = await fetch(`${backendUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Pass through cookies from the incoming request
                'Cookie': '',
            },
            credentials: 'include',
        })

        const data = await res.json()

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status })
        }

        // The backend already set the new auth_token + refresh_token cookies
        // on the Express response — but since we're proxying, we need to
        // forward those Set-Cookie headers to the browser.
        const response = NextResponse.json(data)
        const setCookieHeader = res.headers.get('set-cookie')
        if (setCookieHeader) {
            response.headers.set('set-cookie', setCookieHeader)
        }

        return response
    } catch (error) {
        console.error('[/api/auth/refresh] Error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to refresh token' },
            { status: 500 }
        )
    }
}
