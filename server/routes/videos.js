import { Router } from 'express';
import { readdir, rename, unlink } from 'fs/promises';
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

// Rejects names with path separators or ".." so requests can't escape the videos folder
function isUnsafe(name) {
  return !name || name.includes('/') || name.includes('\\') || name.includes('..');
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

/**
 * PATCH /api/videos/:filename
 *
 * Renames a video. Expects JSON body { newName: string }.
 * The new name keeps the original file's extension.
 *
 * @returns {{ filename: string }} 200 - Renamed; the new full filename.
 * @returns {{ error: string }}    400 - Unsafe name or missing newName.
 * @returns {{ error: string }}    404 - Original video not found.
 * @returns {{ error: string }}    409 - A video with the new name already exists.
 */
router.patch('/:filename', async (req, res) => {
  const { filename } = req.params;
  const { newName } = req.body || {};

  if (isUnsafe(filename)) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }
  if (!newName) {
    return res.status(400).json({ error: 'Missing newName.' });
  }

  // keep the original extension, clean the rest of the name
  const ext = extname(filename);
  const cleanBase = basename(newName, extname(newName)).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!cleanBase) {
    return res.status(400).json({ error: 'New name is empty after cleaning.' });
  }
  const finalName = `${cleanBase}${ext}`;

  const from = join(videosDir(), filename);
  const to = join(videosDir(), finalName);

  if (!existsSync(from)) {
    return res.status(404).json({ error: 'Video not found.' });
  }
  if (finalName !== filename && existsSync(to)) {
    return res.status(409).json({ error: 'A video with that name already exists.' });
  }

  try {
    await rename(from, to);
    res.json({ filename: finalName });
  } catch (err) {
    console.error('Error renaming video:', err);
    res.status(500).json({ error: 'Error renaming video.' });
  }
});

/**
 * DELETE /api/videos/:filename
 *
 * Deletes a video from the server.
 *
 * @returns {{ deleted: string }} 200 - Deleted; the filename removed.
 * @returns {{ error: string }}   400 - Unsafe filename.
 * @returns {{ error: string }}   404 - Video not found.
 */
router.delete('/:filename', async (req, res) => {
  const { filename } = req.params;

  if (isUnsafe(filename)) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  const target = join(videosDir(), filename);
  if (!existsSync(target)) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  try {
    await unlink(target);
    res.json({ deleted: filename });
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'Error deleting video.' });
  }
});

// Turns upload errors (bad type, too large) into a 400 JSON response
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'Upload failed.' });
});

export default router;
