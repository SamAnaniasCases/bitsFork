-- AlterTable: Add lastReconciledAt to Device
-- This nullable column records the UTC timestamp of the most recent
-- automatic reconciliation triggered on device reconnect. It is used
-- to enforce a minimum cooldown between successive auto-reconcile runs,
-- preventing a rapidly flapping device from triggering concurrent reconciles
-- that would conflict with the per-device TCP connection lock.
-- NULL = device has never been auto-reconciled (safe initial state).
ALTER TABLE "Device" ADD COLUMN "lastReconciledAt" TIMESTAMP(3);
