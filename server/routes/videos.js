import { Router } from 'express';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

/**
 * GET /api/videos
 *
 * Returns a list of filenames found in the configured videos directory.
 *
 * @route   GET /api/videos
 * @returns {string[]} 200 - Array of filenames in the videos directory.
 * @returns {{ error: string }} 500 - Unable to read the videos directory.
 *
 * @example
 * // Response (200)
 * ["clip1.mp4", "intro.mov"]
 *
 * // Response (500)
 * { "error": "Error reading video directory" }
 */

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