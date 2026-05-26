import { Router } from 'express';

const router = Router();

// GET /thumbnail/:filename - return first frame as JPEG
router.get('/:filename', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
