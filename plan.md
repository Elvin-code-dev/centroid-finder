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

### Choosing a color and threshold

The salamander in our test video had a dark brownish-orange body against a lighter substrate/tank background. To pick the target color we:

1. Opened a mid-video frame in an image editor and used the eyedropper tool on the salamander's body (not its belly, which was lighter). We sampled several pixels and averaged them, landing on roughly `#5C3A1E` (a warm dark brown).
2. We started with a threshold of **50** (Euclidean RGB distance). That was too tight — pixels on the edges of the body and the slightly reflective patches fell out. We raised it to **80**, which captured the full body silhouette without bleeding too much into the similarly-toned wood chips in the background.
3. At threshold **100** the largest group started picking up background debris, so we settled on **80** as our final value.

### Running the processor

```
java -jar target/videoprocessor.jar salamander.mp4 output.csv 5C3A1E 80
```

This produced a CSV with one row per frame (roughly 900 rows for a ~30 s clip at 30 fps).

### Validating the tracking

We validated in two ways:

**1. Spot-check against the raw video.**  
We opened the video in VLC and stepped through it frame by frame at several timestamps (t ≈ 0 s, 5 s, 10 s, 20 s, 28 s). For each timestamp we looked up the corresponding CSV row and checked that the `x,y` coordinate landed visually inside the salamander's body. In every spot-checked frame it did.

**2. Checking smoothness of movement.**  
We plotted x and y versus time (just by eyeballing consecutive rows). A real animal moves continuously, so large sudden jumps in the centroid would signal the tracker was latching onto background noise rather than the salamander. The trace was smooth for most of the clip. There were two short intervals (~t = 8 s and t = 22 s) where the salamander passed behind a rock and the centroid jumped — those frames output `-1,-1`, which is correct because no large enough matching group was found. When it reappeared the centroid picked back up in the right place.

**3. Color/threshold sanity check.**  
We also ran the processor with a deliberately wrong color (`#FFFFFF`, white, threshold 30) and confirmed the CSV was almost entirely `-1,-1` rows, proving the pipeline isn't just outputting a fixed coordinate.

### Conclusion

Threshold **80** with color `#5C3A1E` gave reliable tracking throughout the clip except during occlusion, which is the expected failure mode. The key lessons: sample the color from the animal's body (not highlights or shadows), and tune the threshold by widening it until the full body is captured without the largest group jumping to background clutter.
