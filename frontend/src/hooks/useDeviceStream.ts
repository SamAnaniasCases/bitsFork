'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface DeviceStatusPayload {
    id: number
    name: string
    ip: string
    isActive: boolean
}

export interface DeviceConnectedPayload {
    devices: {
        id: number
        name: string
        ip: string
        isActive: boolean
        syncEnabled: boolean
    }[]
}

interface UseDeviceStreamOptions {
    /**
     * Called each time a device changes status (online ↔ offline).
     * Receives only the changed device — not the full list.
     * Must be stable (useCallback) to avoid reconnecting on every render.
     */
    onStatusChange: (payload: DeviceStatusPayload) => void
    /**
     * Called when the SSE connection is established.
     * Receives the full current device list with status so the UI can
     * initialize accurately without a separate GET /api/devices call.
     */
    onConnected?: (payload: DeviceConnectedPayload) => void
    /**
     * Set to false to disable the stream. Defaults to true.
     */
    enabled?: boolean
}

/**
 * Subscribes to the /api/devices/stream SSE endpoint and calls
 * `onStatusChange` whenever a device transitions online or offline.
 *
 * Follows the exact same pattern as useAttendanceStream — EventSource,
 * named events, visibility-based pause, and cleanup in useEffect return.
 */
export function useDeviceStream({
    onStatusChange,
    onConnected,
    enabled = true,
}: UseDeviceStreamOptions): void {
    const esRef = useRef<EventSource | null>(null)

    const connect = useCallback(() => {
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
        }

        const es = new EventSource('/api/devices/stream')
        esRef.current = es

        es.addEventListener('connected', (event: MessageEvent) => {
            try {
                const payload: DeviceConnectedPayload = JSON.parse(event.data)
                console.log('[SSE] Device stream connected')
                onConnected?.(payload)
            } catch (err) {
                console.error('[SSE] Failed to parse device connected event:', err)
            }
        })

        es.addEventListener('device-status', (event: MessageEvent) => {
            try {
                const payload: DeviceStatusPayload = JSON.parse(event.data)
                onStatusChange(payload)
            } catch (err) {
                console.error('[SSE] Failed to parse device-status event:', err)
            }
        })

        es.onerror = () => {
            // Browser EventSource auto-retries — just log for visibility.
            console.warn('[SSE] Device stream error — browser will retry')
        }
    }, [onStatusChange, onConnected])

    useEffect(() => {
        if (!enabled) {
            esRef.current?.close()
            esRef.current = null
            return
        }

        connect()

        const handleVisibilityChange = () => {
            if (document.hidden) {
                esRef.current?.close()
                esRef.current = null
            } else {
                connect()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            esRef.current?.close()
            esRef.current = null
        }
    }, [enabled, connect])
}
