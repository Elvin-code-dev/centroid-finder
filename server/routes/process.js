import { Router } from 'express';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const jobs = {};

function rgbToHex(rgbString) {
  const [r, g, b] = rgbString.split(',').map(Number);
  return [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// POST /process/:filename - start a processing job
router.post('/:filename', (req, res) => {
  const { targetColor, threshold } = req.query;

  if (!targetColor || !threshold) {
    return res.status(400).json({ error: 'Missing targetColor or threshold query parameter.' });
  }

  const jobId = uuidv4();
  const videoPath = resolve(__dirname, '../', process.env.VIDEOS_DIR, req.params.filename);
  const resultsDir = resolve(__dirname, '../../', 'results');
  const outputCsv = resolve(resultsDir, `${jobId}.csv`);
  const jarPath = resolve(__dirname, '../', process.env.JAR_PATH);
  const hexColor = rgbToHex(targetColor);

  mkdirSync(resultsDir, { recursive: true });
  jobs[jobId] = { status: 'processing' };

  const child = spawn('java', ['-jar', jarPath, videoPath, outputCsv, hexColor, threshold], {
    detached: true,
    stdio: 'ignore'
  });

  child.on('close', (code) => {
    if (code === 0) {
      jobs[jobId] = { status: 'done', result: `/results/${jobId}.csv` };
    } else {
      jobs[jobId] = { status: 'error', error: 'Error processing video' };
    }
  });

  child.unref();

  res.status(202).json({ jobId });
});

// GET /process/:jobId/status - check job status
router.get('/:jobId/status', (req, res) => {
  const job = jobs[req.params.jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job ID not found' });
  }

  res.json(job);
});

export default router;