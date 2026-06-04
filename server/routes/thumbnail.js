import { Router } from 'express';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

router.get('/:filename', (req, res) => {
  const videoPath = resolve(__dirname, '../', process.env.VIDEOS_DIR, req.params.filename);

  const ffmpeg = spawn('ffmpeg', [
    '-i', videoPath,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    'pipe:1'
  ]);

  ffmpeg.stdout.on('data', (chunk) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    res.write(chunk);
  });

  // Using close instead of pipe so we control when res.end() is called.
  // pipe() would call res.end() on stdout close, making it impossible to
  // send a 500 when ffmpeg fails without first writing data.
  ffmpeg.on('close', (code) => {
    if (code !== 0) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error generating thumbnail' });
      }
    } else {
      res.end();
    }
  });
});

export default router;
