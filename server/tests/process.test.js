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
    expect(args[4]).toBe('FF0000')            // targetColor converted to hex
    expect(args[5]).toBe('50')               // threshold
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

describe('POST /process/:filename - invalid targetColor format', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when targetColor is not numeric', async () => {
    const res = await request(app)
      .post('/process/video.mp4')
      .query({ targetColor: 'red', threshold: '50' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when targetColor is missing a component', async () => {
    const res = await request(app)
      .post('/process/video.mp4')
      .query({ targetColor: '255,0', threshold: '50' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when a targetColor component exceeds 255', async () => {
    const res = await request(app)
      .post('/process/video.mp4')
      .query({ targetColor: '256,0,0', threshold: '50' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when a targetColor component is negative', async () => {
    const res = await request(app)
      .post('/process/video.mp4')
      .query({ targetColor: '-1,0,0', threshold: '50' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 202 for a valid boundary color (0,0,0)', async () => {
    makeMockProc()
    const res = await request(app)
      .post('/process/video.mp4')
      .query({ targetColor: '0,0,0', threshold: '50' })
    expect(res.status).toBe(202)
  })

  it('returns 202 for a valid boundary color (255,255,255)', async () => {
    makeMockProc()
    const res = await request(app)
      .post('/process/video.mp4')
      .query({ targetColor: '255,255,255', threshold: '50' })
    expect(res.status).toBe(202)
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