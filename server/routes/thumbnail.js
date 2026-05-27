import { Router } from 'express';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// GET /thumbnail/:filename - return first frame as JPEG
router.get('/:filename', (req, res) => {
  const videoPath = resolve(__dirname, '../', process.env.VIDEOS_DIR, req.params.filename);

  const ffmpeg = spawn('ffmpeg', [
    '-i', videoPath,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    'pipe:1'
  ]);

  res.setHeader('Content-Type', 'image/jpeg');
  ffmpeg.stdout.pipe(res);

  ffmpeg.on('close', (code) => {
    if (code !== 0) {
      res.status(500).json({ error: 'Error generating thumbnail' });
    }
  });
});

export default router;