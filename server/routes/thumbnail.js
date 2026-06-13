import { Router } from 'express';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

/**
 * GET /api/thumbnail/:filename
 *
 * Extracts and streams the first frame of the specified video as a JPEG image.
 * Uses ffmpeg under the hood; the response streams raw JPEG bytes to the client.
 *
 * @route   GET /api/thumbnail/:filename
 * @param   {string} filename - The video filename (path param). Must exist inside
 *                              the directory specified by the VIDEOS_DIR env var.
 *                              Must not contain `/`, `\`, or `..`.
 * @returns {Buffer}               200 - JPEG image data (Content-Type: image/jpeg).
 * @returns {{ error: string }}    400 - Filename contains illegal path characters.
 * @returns {{ error: string }}    500 - ffmpeg failed before any data was written.
 *
 * @example
 * // Request
 * GET /thumbnail/clip1.mp4
 *
 * // Success: binary JPEG bytes are streamed directly
 *
 * // Response (400)
 * { "error": "Invalid filename." }
 *
 * // Response (500 – sent only when no data has been written yet)
 * { "error": "Error generating thumbnail" }
 */
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  const videoPath = resolve(__dirname, '../', process.env.VIDEOS_DIR, filename);
  const ffmpeg = spawn('ffmpeg', [
    '-i', videoPath,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    'pipe:1'
  ]);

  // If ffmpeg can't even start don't crash the server.
  ffmpeg.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not generate thumbnail (is ffmpeg installed?)' });
    }
  });

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
