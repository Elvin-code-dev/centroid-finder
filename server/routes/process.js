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

  function isValidRgb(rgbString) {
    const parts = rgbString.split(',');
    if (parts.length !== 3) return false;
    return parts.every(part => {
      const n = Number(part.trim());
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }

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

    if (!isValidRgb(targetColor)) {
      return res.status(400).json({ error: 'targetColor must be three comma-separated integers between 0 and 255
  (e.g. 255,0,128).' });
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

  ---
  File 2: server/tests/process.test.js — complete replacement (adds 3 new tests inside the existing POST describe
  block):

  import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'
  import request from 'supertest'
  import express from 'express'
  import { EventEmitter } from 'events'
  import { spawn } from 'child_process'
  import { mkdirSync } from 'fs'

  vi.mock('child_process', () => ({
    spawn: vi.fn()
  }))

  vi.mock('fs', () => ({
    mkdirSync: vi.fn()
  }))

  import processRouter from '../routes/process.js'

  const app = express()
  app.use(express.json())
  app.use('/process', processRouter)

  beforeAll(() => {
    process.env.VIDEOS_DIR = '../videos'
    process.env.JAR_PATH = '../processor/target/videoprocessor.jar'
  })

  function makeMockProc() {
    const proc = new EventEmitter()
    proc.unref = vi.fn()
    vi.mocked(spawn).mockReturnValue(proc)
    return proc
  }

  describe('POST /process/:filename', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 if targetColor is missing', async () => {
      const res = await request(app)
        .post('/process/video.mp4')
        .query({ threshold: '50' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('returns 400 if threshold is missing', async () => {
      const res = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('returns 400 if targetColor has fewer than three components', async () => {
      const res = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0', threshold: '50' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('returns 400 if targetColor contains non-numeric values', async () => {
      const res = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: 'red,0,0', threshold: '50' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('returns 400 if targetColor values are out of 0-255 range', async () => {
      const res = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '256,0,0', threshold: '50' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('returns 202 with a jobId when request is valid', async () => {
      makeMockProc()
      const res = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0', threshold: '50' })
      expect(res.status).toBe(202)
      expect(res.body).toHaveProperty('jobId')
      expect(typeof res.body.jobId).toBe('string')
      expect(res.body.jobId).not.toBe('')
    })

    it('spawns java with the JAR and correct arguments', async () => {
      makeMockProc()
      await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0', threshold: '50' })

      expect(vi.mocked(spawn)).toHaveBeenCalledOnce()
      const [cmd, args, opts] = vi.mocked(spawn).mock.calls[0]
      expect(cmd).toBe('java')
      expect(args[0]).toBe('-jar')
      expect(args[2]).toMatch(/video\.mp4$/)  // videoPath
      expect(args[4]).toBe('FF0000')           // targetColor converted to hex
      expect(args[5]).toBe('50')              // threshold
      expect(opts.detached).toBe(true)
      expect(opts.stdio).toBe('ignore')
    })

    it('calls unref() on the child process', async () => {
      const mockProc = makeMockProc()
      await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0', threshold: '50' })
      expect(mockProc.unref).toHaveBeenCalledOnce()
    })
  })

  describe('GET /process/:jobId/status', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 404 for an unknown jobId', async () => {
      const res = await request(app).get('/process/nonexistent-id/status')
      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
    })

    it('returns processing status immediately after a POST', async () => {
      makeMockProc()
      const postRes = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0', threshold: '50' })
      const { jobId } = postRes.body

      const statusRes = await request(app).get(`/process/${jobId}/status`)
      expect(statusRes.status).toBe(200)
      expect(statusRes.body.status).toBe('processing')
    })

    it('returns done status after the JAR exits successfully', async () => {
      const mockProc = makeMockProc()
      const postRes = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0', threshold: '50' })
      const { jobId } = postRes.body

      mockProc.emit('close', 0)

      const statusRes = await request(app).get(`/process/${jobId}/status`)
      expect(statusRes.status).toBe(200)
      expect(statusRes.body.status).toBe('done')
      expect(statusRes.body).toHaveProperty('result')
    })

    it('returns error status after the JAR exits with a non-zero code', async () => {
      const mockProc = makeMockProc()
      const postRes = await request(app)
        .post('/process/video.mp4')
        .query({ targetColor: '255,0,0', threshold: '50' })
      const { jobId } = postRes.body

      mockProc.emit('close', 1)

      const statusRes = await request(app).get(`/process/${jobId}/status`)
      expect(statusRes.status).toBe(200)
      expect(statusRes.body.status).toBe('error')
    })
  })
