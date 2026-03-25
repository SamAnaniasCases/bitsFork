import { prisma } from './prisma';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface AuditLogPayload {
    action: string;
    entityType: string;
    entityId?: number;
    performedBy?: number;
    source?: string;
    level?: LogLevel;
    details?: string;
    metadata?: Record<string, any>;
}

/**
 * Centralized Audit Logger Utility
 * Records system events, user actions, and errors to the database.
 * This function is fire-and-forget to prevent blocking main execution paths.
 */
export const audit = async (payload: AuditLogPayload): Promise<void> => {
    try {
        await prisma.auditLog.create({
            data: {
                level: payload.level || 'INFO',
                action: payload.action,
                entityType: payload.entityType,
                entityId: payload.entityId,
                performedBy: payload.performedBy,
                source: payload.source || 'system',
                details: payload.details,
                metadata: payload.metadata ? JSON.parse(JSON.stringify(payload.metadata)) : null,
            }
        });
    } catch (error) {
        // We log to console rather than throwing to avoid breaking the application
        // if the audit log system encounters a transient DB issue
        console.error('[AuditLogger] Failed to write audit log:', error, payload);
    }
};
