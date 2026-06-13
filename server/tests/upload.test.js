import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

import videosRouter from '../routes/videos.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// real temp folder so multer has somewhere to write during tests
const tmpDir = resolve(__dirname, 'tmp-videos')

const app = express()
app.use(express.json())
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

describe('PATCH /api/videos/:filename (rename)', () => {
  beforeAll(() => {
    writeFileSync(resolve(tmpDir, 'old.mp4'), 'data')
    writeFileSync(resolve(tmpDir, 'taken.mp4'), 'data')
  })

  it('renames a video and keeps its extension', async () => {
    const res = await request(app)
      .patch('/api/videos/old.mp4')
      .send({ newName: 'renamed' })

    expect(res.status).toBe(200)
    expect(res.body.filename).toBe('renamed.mp4')
    expect(existsSync(resolve(tmpDir, 'renamed.mp4'))).toBe(true)
    expect(existsSync(resolve(tmpDir, 'old.mp4'))).toBe(false)
  })

  it('returns 404 when the video does not exist', async () => {
    const res = await request(app)
      .patch('/api/videos/missing.mp4')
      .send({ newName: 'whatever' })

    expect(res.status).toBe(404)
  })

  it('returns 409 when the new name is already taken', async () => {
    writeFileSync(resolve(tmpDir, 'source.mp4'), 'data')
    const res = await request(app)
      .patch('/api/videos/source.mp4')
      .send({ newName: 'taken' })

    expect(res.status).toBe(409)
  })

  it('returns 400 when newName is missing', async () => {
    const res = await request(app).patch('/api/videos/taken.mp4').send({})
    expect(res.status).toBe(400)
  })

  it('rejects unsafe filenames', async () => {
    const res = await request(app)
      .patch('/api/videos/..%2Fsecret.mp4')
      .send({ newName: 'x' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/videos/:filename', () => {
  beforeAll(() => {
    writeFileSync(resolve(tmpDir, 'todelete.mp4'), 'data')
  })

  it('deletes an existing video', async () => {
    const res = await request(app).delete('/api/videos/todelete.mp4')

    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe('todelete.mp4')
    expect(existsSync(resolve(tmpDir, 'todelete.mp4'))).toBe(false)
  })

  it('returns 404 when the video does not exist', async () => {
    const res = await request(app).delete('/api/videos/missing.mp4')
    expect(res.status).toBe(404)
  })
})
