import { Router } from 'express';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// GET /api/videos - list available videos
router.get('/', async (req, res) => {
  try {
    const videosDir = resolve(__dirname, '../', process.env.VIDEOS_DIR);
    const files = await readdir(videosDir);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Error reading video directory' });
  }
});

export default router;