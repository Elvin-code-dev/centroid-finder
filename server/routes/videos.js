import { Router } from 'express';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

function videosDir() {
  return resolve(__dirname, '../', process.env.VIDEOS_DIR);
}

// Where and how uploaded files get saved
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir()),
  filename: (req, file, cb) => {
    // replace risky characters so the name is safe to use in paths/URLs
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = extname(safe);
    const base = basename(safe, ext);

    // don't overwrite an existing video — add -1, -2, ... instead
    let name = safe;
    let i = 1;
    while (existsSync(join(videosDir(), name))) {
      name = `${base}-${i}${ext}`;
      i++;
    }
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max just for now
  fileFilter: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (VIDEO_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (.mp4, .mov, .avi, .mkv)'));
    }
  },
});

/**
 * GET /api/videos
 *
 * Lists the video files available on the server.
 *
 * @returns {string[]}          200 - Array of video filenames.
 * @returns {{ error: string }} 500 - Video directory could not be read.
 */
router.get('/', async (req, res) => {
  try {
    const files = await readdir(videosDir());
    // only return actual video files, not .env or other stray files
    const videos = files.filter((f) =>
      VIDEO_EXTENSIONS.includes(extname(f).toLowerCase())
    );
    res.json(videos);
  } catch (err) {
    console.error('Error reading video directory:', err);
    res.status(500).json({ error: 'Error reading video directory' });
  }
});

/**
 * POST /api/videos
 *
 * Uploads a new video. Expects multipart/form-data with the file
 * in a field named "video".
 *
 * @returns {{ filename: string }} 201 - Upload succeeded; name it was saved as.
 * @returns {{ error: string }}    400 - No file, wrong file type, or too large.
 */
router.post('/', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  res.status(201).json({ filename: req.file.filename });
});

// Turns upload errors (bad type, too large) into a 400 JSON response
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'Upload failed.' });
});

export default router;
