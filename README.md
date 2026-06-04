# Centroid Finder

A Node.js/Express server for analysing videos of a lizard moving on a flat surface. It binarizes each frame based on a target colour and threshold, then finds the centroid of the largest contiguous mass ( i.e. the lizard ) using a Java-based processor.

---

## Requirements

- Node.js 18+
- ffmpeg available on `PATH`
- Java available on `PATH`

---

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Elvin-code-dev/centroid-finder.git
   cd centroid-finder
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the **project root** (one level above `server/`). The server loads it from `../.env` relative to `server/index.js`.

   | Variable     | Required | Description                                                                          |
   |--------------|----------|--------------------------------------------------------------------------------------|
   | `PORT`       | No       | Port the server listens on. Defaults to `3000`.                                      |
   | `VIDEOS_DIR` | Yes      | Path to the videos directory, relative to `server/`. E.g. `../videos`               |
   | `JAR_PATH`   | Yes      | Path to the processor JAR, relative to `server/`. E.g. `../target/videoprocessor.jar` |

   Example `.env`:

   ```env
   PORT=3000
   VIDEOS_DIR=../videos
   JAR_PATH=../target/videoprocessor.jar
   ```

4. **Start the server**

   ```bash
   node server/index.js
   ```

   The server will be available at `http://localhost:3000` (or your configured `PORT`).

5. **Run tests**

   ```bash
   npm test
   ```

---

## Project Structure

```
centroid-finder/
├── lib/                  # Java JAR and dependencies
├── processor/            # Java source files
├── results/              # Output CSVs written by processing jobs
├── server/
│   ├── routes/
│   │   ├── videos.js     # GET /api/videos
│   │   ├── thumbnail.js  # GET /thumbnail/:filename
│   │   └── process.js    # POST /process/:filename, GET /process/:jobId/status
│   └── index.js          # Entry point
├── .env                  # Environment variables (project root, not committed)
└── package.json
```

---

## API Reference

### Static file serving

| Path               | Source                        |
|--------------------|-------------------------------|
| `/videos/<file>`   | Files in `VIDEOS_DIR`         |
| `/results/<file>`  | Files in `results/` directory |

---

### List Videos

Returns the filenames of all files in the configured `VIDEOS_DIR`.

```
GET /api/videos
```

**Response `200`**

```json
["clip1.mp4", "intro.mov"]
```

**Response `500`**

```json
{ "error": "Error reading video directory" }
```

---

### Get Thumbnail

Extracts the first frame of a video and streams it as a JPEG image.

```
GET /thumbnail/:filename
```

| Parameter  | In   | Type   | Description              |
|------------|------|--------|--------------------------|
| `filename` | path | string | Video file to thumbnail  |

**Response `200`** — `Content-Type: image/jpeg` binary stream

**Response `500`** — only sent if ffmpeg fails before writing any data

```json
{ "error": "Error generating thumbnail" }
```

**Example**

```
GET /thumbnail/clip1.mp4
```

---

### Start Processing Job

Starts an asynchronous colour-detection job on a video. The job runs in the background via the Java processor JAR; poll the status endpoint to check progress.

```
POST /process/:filename?targetColor=R,G,B&threshold=N
```

| Parameter     | In    | Type   | Description                                            |
|---------------|-------|--------|--------------------------------------------------------|
| `filename`    | path  | string | Video file to process                                  |
| `targetColor` | query | string | Target colour as `R,G,B` (e.g. `255,0,128`). Required.|
| `threshold`   | query | string | Detection sensitivity threshold. Required.             |

**Response `202`**

```json
{ "jobId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301" }
```

**Response `400`**

```json
{ "error": "Missing targetColor or threshold query parameter." }
```

**Example**

```
POST /process/clip1.mp4?targetColor=255,0,128&threshold=10
```

---

### Get Job Status

Returns the current state of a processing job.

```
GET /process/:jobId/status
```

| Parameter | In   | Type   | Description                            |
|-----------|------|--------|----------------------------------------|
| `jobId`   | path | string | UUID returned when the job was created |

**Response `200`** — one of three shapes depending on state:

```json
{ "status": "processing" }
```

```json
{ "status": "done", "result": "/results/3f2504e0-4f89-11d3-9a0c-0305e82c3301.csv" }
```

```json
{ "status": "error", "error": "Error processing video" }
```

**Response `404`**

```json
{ "error": "Job ID not found" }
```

Once a job is `done`, the output CSV is also accessible directly via the static file route:

```
GET /results/3f2504e0-4f89-11d3-9a0c-0305e82c3301.csv
```