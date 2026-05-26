import { Router } from 'express';

const router = Router();

// GET /api/videos - list available videos
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
