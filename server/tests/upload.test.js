import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

import videosRouter from '../routes/videos.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// real temp folder so multer has somewhere to write during tests
const tmpDir = resolve(__dirname, 'tmp-videos')

const app = express()
app.use('/api/videos', videosRouter)

beforeAll(() => {
  process.env.VIDEOS_DIR = '../tests/tmp-videos'
  mkdirSync(tmpDir, { recursive: true })
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('POST /api/videos', () => {
  it('uploads an mp4 and returns its filename', async () => {
    const res = await request(app)
      .post('/api/videos')
      .attach('video', Buffer.from('fake video bytes'), 'clip.mp4')

    expect(res.status).toBe(201)
    expect(res.body.filename).toBe('clip.mp4')
    expect(existsSync(resolve(tmpDir, 'clip.mp4'))).toBe(true)
  })

  it('does not overwrite an existing video with the same name', async () => {
    const res = await request(app)
      .post('/api/videos')
      .attach('video', Buffer.from('other bytes'), 'clip.mp4')

    expect(res.status).toBe(201)
    expect(res.body.filename).toBe('clip-1.mp4')
  })

  it('sanitizes risky characters in filenames', async () => {
    const res = await request(app)
      .post('/api/videos')
      .attach('video', Buffer.from('fake'), 'my cool video!.mp4')

    expect(res.status).toBe(201)
    expect(res.body.filename).toBe('my_cool_video_.mp4')
  })

  it('rejects non-video file types', async () => {
    const res = await request(app)
      .post('/api/videos')
      .attach('video', Buffer.from('not a video'), 'notes.txt')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('rejects requests with no file attached', async () => {
    const res = await request(app).post('/api/videos')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('uploaded videos show up in GET /api/videos', async () => {
    const res = await request(app).get('/api/videos')

    expect(res.status).toBe(200)
    expect(res.body).toContain('clip.mp4')
    expect(res.body).toContain('clip-1.mp4')
  })
})
