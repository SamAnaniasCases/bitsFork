import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * - Calls backend /api/auth/logout to delete the refresh token from the DB
 * - Clears both auth_token and refresh_token HttpOnly cookies
 */
export async function POST(req: NextRequest) {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'

        // Forward the refresh_token cookie to the backend so it can delete the DB record
        const cookieHeader = req.headers.get('cookie') || ''
        await fetch(`${backendUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Cookie': cookieHeader },
        })
    } catch {
        // Even if backend call fails, clear the cookies on the client side
        console.error('[/api/auth/logout] Backend logout call failed — clearing cookies anyway')
    }

    // Clear both cookies
    const response = NextResponse.json({ success: true, message: 'Logged out' })

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 0,
    }

    response.cookies.set('auth_token', '', cookieOptions)
    response.cookies.set('refresh_token', '', cookieOptions)

    return response
}
