import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { readdir } from 'fs/promises'

vi.mock('fs/promises', () => ({
  readdir: vi.fn()
}))

import videosRouter from '../routes/videos.js'

const app = express()
app.use('/api/videos', videosRouter)

beforeAll(() => {
  process.env.VIDEOS_DIR = '../videos'
})

describe('GET /api/videos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with a list of video filenames', async () => {
    vi.mocked(readdir).mockResolvedValue(['video1.mp4', 'video2.mp4'])
    const res = await request(app).get('/api/videos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(['video1.mp4', 'video2.mp4'])
  })

  it('returns an empty array when no videos exist', async () => {
    vi.mocked(readdir).mockResolvedValue([])
    const res = await request(app).get('/api/videos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 500 when the video directory cannot be read', async () => {
    vi.mocked(readdir).mockRejectedValue(new Error('ENOENT: no such file or directory'))
    const res = await request(app).get('/api/videos')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})