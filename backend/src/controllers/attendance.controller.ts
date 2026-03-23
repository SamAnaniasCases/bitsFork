import { Request, Response } from 'express';
import { syncZkData, addUserToDevice } from '../services/zkServices';
import {
    getAttendanceRecords,
    getTodayAttendance,
    getEmployeeAttendanceHistory
} from '../services/attendance.service';
import { prisma } from '../lib/prisma';
import attendanceEmitter from '../lib/attendanceEmitter';


export const syncAttendance = async (req: Request, res: Response) => {
    try {
        console.log('Starting manual sync...');
        const result = await syncZkData();
        res.status(200).json(result);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Attendance record already exists for this employee today.'
            });
            return;
        }
        console.error('Sync failed:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

export const addUser = async (req: Request, res: Response) => {
    try {
        const { userId, name } = req.body;

        if (!userId || !name) {
            res.status(400).json({ success: false, message: 'userId and name are required' });
            return;
        }

        console.log(`Request to add employee: ${userId} - ${name}`);
        const result = await addUserToDevice(parseInt(userId), name);
        res.status(200).json(result);

    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Attendance record already exists for this employee today.'
            });
            return;
        }
        console.error('Add Employee failed:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

/**
 * Get attendance records with optional filters
 * Query params: startDate, endDate, employeeId, status
 */
export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, employeeId, status, page = 1, limit = 10, branchName, departmentId, departmentName } = req.query;

        const filters: any = {};

        // Parse dates using PHT timezone (UTC+8) to match how records are stored.
        // Records are stored with date = midnight PHT (setHours(0,0,0,0) on the server).
        // Using +08:00 offset ensures the filter covers the correct PHT calendar day.
        if (startDate) {
            filters.startDate = new Date(`${String(startDate)}T00:00:00+08:00`);
        }

        if (endDate) {
            filters.endDate = new Date(`${String(endDate)}T23:59:59+08:00`);
        }
        if (employeeId) filters.employeeId = parseInt(String(employeeId));
        if (status) filters.status = String(status);
        if (branchName) filters.branch = String(branchName);
        if (departmentId) filters.departmentId = parseInt(String(departmentId));
        if (departmentName) filters.departmentName = String(departmentName);

        const pageNum = parseInt(String(page));
        const limitNum = parseInt(String(limit));

        const { data, total } = await getAttendanceRecords(filters, pageNum, limitNum);

        res.json({
            success: true,
            data,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Attendance record already exists for this employee today.'
            });
            return;
        }
        console.error('Get Attendance Failed:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

/**
 * Get today's attendance
 */
export const getToday = async (req: Request, res: Response) => {
    try {
        const records = await getTodayAttendance();

        res.json({
            success: true,
            count: records.length,
            data: records
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Attendance record already exists for this employee today.'
            });
            return;
        }
        console.error('Get Today Failed:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

/**
 * Get attendance history for a specific employee
 */
export const getEmployeeHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const employeeId = parseInt(Array.isArray(id) ? id[0] : id);

        if (isNaN(employeeId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid employee ID'
            });
        }

        const records = await getEmployeeAttendanceHistory(
            employeeId,
            startDate ? new Date(String(startDate)) : undefined,
            endDate ? new Date(String(endDate)) : undefined
        );

        res.json({
            success: true,
            count: records.length,
            data: records
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Attendance record already exists for this employee today.'
            });
            return;
        }
        console.error('Get Employee History Failed:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

/**
 * Manually update an attendance record (HR correction)
 * Body: { checkInTime?, checkOutTime?, status?, reason? }
 */
export const updateAttendance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const recordId = parseInt(String(id));

        if (isNaN(recordId)) {
            res.status(400).json({ success: false, message: 'Invalid attendance record ID' });
            return;
        }

        const { checkInTime, checkOutTime, status, reason } = req.body;

        const existing = await prisma.attendance.findUnique({ where: { id: recordId } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Attendance record not found' });
            return;
        }

        const updateData: any = {};
        if (checkInTime) updateData.checkInTime = new Date(checkInTime);
        if (checkOutTime !== undefined) updateData.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
        if (status) updateData.status = status.toLowerCase();

        const updated = await prisma.attendance.update({
            where: { id: recordId },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Attendance record updated successfully',
            data: updated,
            reason: reason || null
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Attendance record already exists for this employee today.'
            });
            return;
        }
        console.error('Update Attendance Failed:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

/**
 * GET /api/attendance/stream
 *
 * Server-Sent Events endpoint. Keeps the HTTP connection open and pushes
 * new attendance records to the client as they are processed by syncZkData().
 *
 * WHY SSE instead of WebSockets: SSE is unidirectional (server → client),
 * which is exactly what attendance monitoring needs. It works over plain HTTP,
 * requires no additional library on either end.
 *
 * Authentication: The authenticate middleware is applied at the router level
 * for all /api/attendance routes, so this endpoint requires a valid JWT
 * cookie just like every other attendance route.
 */
export const streamAttendance = async (req: Request, res: Response): Promise<void> => {
    // ── Set SSE headers ───────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Disable Nginx buffering if a reverse proxy is ever added in front
    res.setHeader('X-Accel-Buffering', 'no');

    // Flush headers immediately so the browser knows the stream has started.
    res.flushHeaders();

    // ── Send an initial "connected" event ─────────────────────────────────
    res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

    // ── Heartbeat ─────────────────────────────────────────────────────────
    // SSE comments (lines starting with ':') keep the TCP connection alive
    // through proxies that close idle connections after ~60s.
    const heartbeatInterval = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 25_000);

    // ── Event listener ────────────────────────────────────────────────────
    // Listen for 'new-record' events from processAttendanceLogs() and push
    // them to this client.
    // The `any` on payload is unavoidable — the emitter carries untyped data
    // across module boundaries and typing it would require a shared interface
    // that adds coupling without safety (runtime JSON.parse is untyped anyway).
    const onNewRecord = (payload: { type: string; record: any }) => {
        res.write(`event: attendance\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    attendanceEmitter.on('new-record', onNewRecord);

    // ── Cleanup on client disconnect ──────────────────────────────────────
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        attendanceEmitter.off('new-record', onNewRecord);
        console.log(`[SSE] Client disconnected from attendance stream`);
    });

    console.log(`[SSE] Client connected to attendance stream`);
};
