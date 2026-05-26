import { Router } from 'express';

const router = Router();

// POST /process/:filename - start a processing job
router.post('/:filename', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

// GET /process/:jobId/status - check job status
router.get('/:jobId/status', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
