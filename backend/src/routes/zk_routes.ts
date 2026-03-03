import { Router, Request, Response } from 'express';
import { testDeviceConnection } from '../services/zkServices';

const router = Router();

/**
 * GET /api/zk/status
 * Lightweight endpoint to check if the ZKTeco device is reachable.
 * Polled by the frontend topbar every 30 seconds.
 */
router.get('/status', async (req: Request, res: Response) => {
    const result = await testDeviceConnection();
    res.json({
        online: result.success,
        message: result.message || result.error || null,
    });
});

export default router;
