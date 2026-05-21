# Video Processor Plan

## Overall Goal

Process an MP4 video through the existing centroid-finder pipeline and produce a CSV that tracks the largest color-matched centroid over time. Each row: `seconds,x,y`. If no centroid is found at a given frame, use `-1,-1` for coordinates.

Command line usage:
```
java -jar videoprocessor.jar inputPath outputCsv targetColor threshold
```

---

## Architecture

### Reused (unchanged)

- `EuclideanColorDistance` — computes RGB Euclidean distance
- `DistanceImageBinarizer` — converts `BufferedImage` to binary array and back
- `DfsBinaryGroupFinder` — finds connected groups in a binary array, returns them largest-first
- `BinarizingImageGroupFinder` — wires the binarizer and group finder together into an `ImageGroupFinder`

### New Components

#### `TimestampedFrame` (record)
- Fields: `double seconds`, `BufferedImage image`
- A simple data holder representing one video frame and when it occurred

#### `VideoFrameExtractor` (interface)
- Method: `List<TimestampedFrame> extract(File video) throws IOException`
- Separates the video-reading logic from the rest of the pipeline so it can be swapped out or faked in tests

#### `JCodecVideoFrameExtractor` (implements VideoFrameExtractor)
- Uses JCodec (`FrameGrab`, `MP4Demuxer`) to iterate every frame of an MP4
- Computes the timestamp for each frame based on frame index and frame rate
- Returns the full list of `TimestampedFrame`s

#### `VideoProcessorApp` (main class)
- Parses the 4 CLI args: `inputPath`, `outputCsv`, `targetColor` (hex string), `threshold` (int)
- Builds a `BinarizingImageGroupFinder` using `EuclideanColorDistance`, `DistanceImageBinarizer`, and `DfsBinaryGroupFinder` — same setup as `ImageSummaryApp`
- Calls `JCodecVideoFrameExtractor.extract()` to get all frames
- For each frame:
  - Calls `groupFinder.findConnectedGroups(frame.image())`
  - Takes `groups.get(0)` if the list is non-empty (already sorted largest-first), otherwise uses coordinate `(-1, -1)`
  - Writes `seconds,x,y` to the output CSV
- No header row in the CSV

---

## Architecture Diagram

```
CLI args
    |
    v
VideoProcessorApp
    |
    |---> JCodecVideoFrameExtractor
    |         |
    |         v
    |     List<TimestampedFrame>
    |
    |---> BinarizingImageGroupFinder  (reused)
              |
              |---> DistanceImageBinarizer  (reused)
              |         |
              |         v
              |     EuclideanColorDistance  (reused)
              |
              |---> DfsBinaryGroupFinder  (reused)
                        |
                        v
                   List<Group> (sorted largest-first)
                        |
                        v
                  take groups.get(0) or (-1,-1)
                        |
                        v
                  write row to output CSV
```

---

## Testing Strategy

- `JCodecVideoFrameExtractor` is hard to unit test without a real video file, so it will get a basic integration test using a small sample MP4.
- Everything else can be tested by constructing a `List<TimestampedFrame>` manually with known `BufferedImage`s and verifying the CSV output — no video file needed.
- Existing tests for `DfsBinaryGroupFinder`, `EuclideanColorDistance`, `DistanceImageBinarizer`, and `BinarizingImageGroupFinder` remain unchanged.

---

## Wave 4: Validation

*(To be filled in after testing with a real salamander video.)*
