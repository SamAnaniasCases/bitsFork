import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // BACKEND_URL is a server-side-only env var — never exposed to the browser
        const backendUrl = process.env.BACKEND_URL || 'http://backend:3001'

        const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        const data = await res.json()

        return NextResponse.json(data, { status: res.status })
    } catch (error) {
        return NextResponse.json(
            { message: 'Network error. Could not reach the server.' },
            { status: 503 }
        )
    }
}
