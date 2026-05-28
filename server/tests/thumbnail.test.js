import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { spawn } from 'child_process'

vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

import thumbnailRouter from '../routes/thumbnail.js'

const app = express()
app.use('/thumbnail', thumbnailRouter)

beforeAll(() => {
  process.env.VIDEOS_DIR = '../videos'
})

// Schedules success events on the next tick so the route handler's
// event listeners are registered before the events fire.
function mockFfmpegSuccess() {
  vi.mocked(spawn).mockImplementation(() => {
    const proc = new EventEmitter()
    proc.stdout = new PassThrough()
    process.nextTick(() => {
      proc.stdout.emit('data', Buffer.from([0xFF, 0xD8, 0xFF]))
      proc.emit('close', 0)
    })
    return proc
  })
}

function mockFfmpegFailure() {
  vi.mocked(spawn).mockImplementation(() => {
    const proc = new EventEmitter()
    proc.stdout = new PassThrough()
    process.nextTick(() => {
      proc.emit('close', 1)
    })
    return proc
  })
}

describe('GET /thumbnail/:filename', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls ffmpeg with the correct video file path', async () => {
    mockFfmpegSuccess()
    await request(app).get('/thumbnail/video.mp4')

    const [cmd, args] = vi.mocked(spawn).mock.calls[0]
    expect(cmd).toBe('ffmpeg')
    expect(args[0]).toBe('-i')
    expect(args[1]).toMatch(/video\.mp4$/)
  })

  it('sets Content-Type to image/jpeg when ffmpeg succeeds', async () => {
    mockFfmpegSuccess()
    const res = await request(app).get('/thumbnail/video.mp4')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('image/jpeg')
  })

  it('returns 500 when ffmpeg exits with a non-zero code', async () => {
    mockFfmpegFailure()
    const res = await request(app).get('/thumbnail/video.mp4')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})
