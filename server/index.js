import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import express from 'express';

import videosRouter from './routes/videos.js';
import thumbnailRouter from './routes/thumbnail.js';
import processRouter from './routes/process.js';

dotenv.config({ path: '../.env' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use('/videos', express.static(resolve(__dirname, process.env.VIDEOS_DIR)));

app.use('/api/videos', videosRouter);
app.use('/thumbnail', thumbnailRouter);
app.use('/process', processRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
