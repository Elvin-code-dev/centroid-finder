import { Router } from 'express';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
// test
const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const jobs = {};

function rgbToHex(rgbString) {
  const [r, g, b] = rgbString.split(',').map(Number);
  return [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * POST /api/process/:filename
 *
 * Starts an asynchronous video-processing job that runs a JAR-based colour-
 * detection analysis on the specified video. The job runs detached in the
 * background; poll the status endpoint with the returned jobId to check
 * progress.
 *
 * @route   POST /api/process/:filename
 * @param   {string} filename        - The video filename (path param). Must exist
 *                                     inside the directory specified by VIDEOS_DIR.
 * @queryparam {string} targetColor  - Target RGB colour expressed as "R,G,B"
 *                                     (e.g. "255,0,128"). Required.
 * @queryparam {string} threshold    - Detection sensitivity threshold. Required.
 * @returns {{ jobId: string }}                202 - Job accepted; use jobId to poll status.
 * @returns {{ error: string }}                400 - Missing required query parameters.
 *
 * @example
 * // Request
 * POST /api/process/clip1.mp4?targetColor=255,0,128&threshold=10
 *
 * // Response (202)
 * { "jobId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301" }
 *
 * // Response (400)
 * { "error": "Missing targetColor or threshold query parameter." }
 */

router.post('/:filename', (req, res) => {
  const { targetColor, threshold } = req.query;

  if (!targetColor || !threshold) {
    return res.status(400).json({ error: 'Missing targetColor or threshold query parameter.' });
  }

  function rgbToHex(rgbString) {
    const [r, g, b] = rgbString.split(',').map(Number);
    return [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /**
   * POST /api/process/:filename
   *
   * Starts an asynchronous video-processing job that runs a JAR-based colour-
   * detection analysis on the specified video. The job runs detached in the
   * background; poll the status endpoint with the returned jobId to check
   * progress.
   *
   * @route   POST /api/process/:filename
   * @param   {string} filename        - The video filename (path param). Must exist
   *                                     inside the directory specified by VIDEOS_DIR.
   *                                     Must not contain `/`, `\`, or `..`.
   * @queryparam {string} targetColor  - Target RGB colour expressed as "R,G,B"
   *                                     (e.g. "255,0,128"). Required.
   * @queryparam {string} threshold    - Detection sensitivity threshold. Required.
   * @returns {{ jobId: string }}                202 - Job accepted; use jobId to poll status.
   * @returns {{ error: string }}                400 - Invalid filename or missing/invalid query parameters.
   *
   * @example
   * // Request
   * POST /process/clip1.mp4?targetColor=255,0,128&threshold=10
   *
   * // Response (202)
   * { "jobId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301" }
   *
   * // Response (400 – invalid filename)
   * { "error": "Invalid filename." }
   *
   * // Response (400 – missing params)
   * { "error": "Missing targetColor or threshold query parameter." }
   */

  router.post('/:filename', (req, res) => {
    const { filename } = req.params;
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }

    const { targetColor, threshold } = req.query;

    if (!targetColor || !threshold) {
      return res.status(400).json({ error: 'Missing targetColor or threshold query parameter.' });
    }

    if (!isValidRgb(targetColor)) {
      return res.status(400).json({ error: 'targetColor must be three comma-separated integers between 0 and 255 (e.g. 255,0,128).' });
    }

    const jobId = uuidv4();
    const videoPath = resolve(__dirname, '../', process.env.VIDEOS_DIR, filename);
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

  /**
   * GET /api/process/:jobId/status
   *
   * Returns the current status of a previously submitted processing job.
   *
   * @route   GET /api/process/:jobId/status
   * @param   {string} jobId - The UUID returned when the job was created (path param).
   * @returns {{ status: 'processing' }}                          200 - Job is still running.
   * @returns {{ status: 'done', result: string }}                200 - Job finished; `result`
   *           is the path to the output CSV (e.g. `/results/<jobId>.csv`).
   * @returns {{ status: 'error', error: string }}                200 - Job failed.
   * @returns {{ error: string }}                                 404 - Unknown jobId.
   *
   * @example
   * // Request
   * GET /api/process/3f2504e0-4f89-11d3-9a0c-0305e82c3301/status
   *
   * // Response – still running
   * { "status": "processing" }
   *
   * // Response – finished
   * { "status": "done", "result": "/results/3f2504e0-4f89-11d3-9a0c-0305e82c3301.csv" }
   *
   * // Response – failed
   * { "status": "error", "error": "Error processing video" }
   *
   * // Response (404)
   * { "error": "Job ID not found" }
   */

  router.get('/:jobId/status', (req, res) => {
    const job = jobs[req.params.jobId];

    if (!job) {
      return res.status(404).json({ error: 'Job ID not found' });
    }

    res.json(job);
  });

  export default router;