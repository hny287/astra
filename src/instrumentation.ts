export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/structured-logger-node');
    const { cleanupStuckScans } = await import('@/scan/cleanup');
    cleanupStuckScans().then((count) => {
      if (count > 0) {
        logger.info({ count }, 'Cleaned up stuck scans/jobs on startup');
      }
    }).catch(() => {});

    setInterval(async () => {
      try {
        const { processNextJob } = await import('@/scan/worker');
        await processNextJob();
      } catch {}
    }, 3000);
  }
}