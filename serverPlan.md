# Server Plan

## What the Salamander API Does

There are 4 endpoints we need to implement:

- `GET /api/videos` — returns a list of video filenames from the videos folder on the server
- `GET /thumbnail/:filename` — returns the first frame of a video as a JPEG image
- `POST /process/:filename?targetColor=&threshold=` — starts a background processing job and immediately returns a jobId
- `GET /process/:jobId/status` — checks if a job is still running, done, or errored

The big thing to understand is that the POST endpoint can't just wait for the JAR to finish before responding, because videos take a long time to process. So it fires off the job in the background and returns a jobId right away. The client then polls the status endpoint to find out when it's done.

## Questions We Have

- Does ffmpeg need to be installed separately on whatever machine runs the server? We think yes.
- What happens if someone sends a jobId that doesn't exist — do we return 404? (Looking at the API spec, yes.)
- Do we need to handle the case where the video file doesn't exist when someone POSTs to /process?

## Architecture

```
Client
  |
  v
Express Server (server/index.js)
  |
  |-- GET /api/videos
  |     └── fs.readdir on the videos folder, return filenames as JSON
  |
  |-- GET /thumbnail/:filename
  |     └── spawn ffmpeg, pipe first frame back as JPEG
  |
  |-- POST /process/:filename
  |     ├── validate targetColor + threshold are present
  |     ├── generate a UUID as jobId
  |     ├── store { status: "processing" } in memory under that jobId
  |     ├── spawn the JAR as a detached child process (detached, stdio ignored, unref'd)
  |     |     └── listen for close event — on exit update in-memory status to done or error
  |     └── return 202 { jobId }
  |
  └-- GET /process/:jobId/status
        └── look up jobId in memory, return status (404 if not found)
```

## State Storage

We decided to track job state in-memory (a plain JavaScript object/Map). It's simpler than writing files to disk. The tradeoff is that if the server restarts all job state is lost, but for this project that's fine.

This is subject to change if we run into issues.

## .env Variables

We'll store anything that might change depending on the machine in .env:

```
VIDEOS_DIR=../videos
JAR_PATH=../target/videoprocessor.jar
PORT=3000
```

Using dotenv in Node so the server can read these at runtime.

## How the JAR Gets Called

The server will use Node's child_process.spawn to run the JAR like this:

```
java -jar videoprocessor.jar inputPath outputCsv targetColor threshold
```

It runs detached with stdio ignored and gets unref'd so the server doesn't wait on it. We attach a close event listener before unreffing so we can update the job status when it finishes.

All the actual video/image processing logic stays in the JAR. No graph search logic in Express.

## Thumbnail

We'll use ffmpeg from Node (also via child_process) to extract the first frame of the video and pipe it back as a JPEG. We confirmed the videoprocessor JAR already uses JCodec internally, but we're keeping thumbnail generation on the Node side with ffmpeg to keep things simpler.

## Notes

- This plan will almost certainly change as we implement
- The routes might get split into separate files depending on how complex things get
- We might need to add input validation beyond just checking for missing query params
