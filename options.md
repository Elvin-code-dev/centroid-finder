# Java Video Library Options

## 1. JCodec

JCodec is a pure Java implementation of several video codecs, including H.264. It can read MP4 files and extract frames without needing any native libraries installed.

**Pros:**
- Pure Java — no native dependencies, so it works on any machine that can run Java without any extra setup
- Lightweight compared to alternatives, easy to add as a single Maven dependency
- Has a simple utility class (`FrameGrab`) specifically for pulling individual frames out of MP4 files, which is exactly what we need

**Cons:**
- Only supports a limited set of codecs (mainly H.264). If a video uses a different codec it will fail
- Not actively maintained — the last release was in 2020, so it might have unresolved bugs
- No built-in support for audio or advanced video metadata; you have to dig a bit to get things like frame rate

---

## 2. JavaCV (with FFmpeg)

JavaCV is a Java wrapper around several native libraries including FFmpeg and OpenCV. When combined with the `ffmpeg-platform`, it bundles the native FFmpeg binaries so you don't need FFmpeg installed separately.

**Pros:**
- Supports virtually every video format and codec because it runs on top of FFmpeg, the industry standard
- Very well documented and widely used, so there are lots of examples and Stack Overflow answers
- Can give you precise frame-level access and rich metadata stuff like duration, frame rate, resolution, codec info

**Cons:**
- The Maven dependency is enormous — `javacv-platform` can pull in hundreds of megabytes of native binaries for every platform
- The API is a lower-level C-style API wrapped in Java, so it takes more code to do simple things and is harder to read
- Overkill for a project that just needs basic frame extraction from standard MP4s

---

## 3. VLCJ

VLCJ is a Java binding for the VLC media player's native library (libvlc). It lets you control VLC programmatically from Java.

**Pros:**
- VLC supports an enormous range of formats and codecs, so virtually any video file will work
- Good for playing and streaming video in a Java application, with solid event-based APIs
- Has been around for a long time and is relatively stable

**Cons:**
- Requires VLC to be installed on the machine running the program — it does not bundle its own native libraries, making it harder to distribute
- Primarily designed for playback and media control, not for frame-by-frame image extraction; extracting frames as BufferedImages requires extra workarounds
- Much more complex to set up than the other options for our specific use case


## Final Choice: JCodec

We chose JCodec because it is pure Java with no native libraries needed,
easy to add as a Maven dependency, and it successfully read metadata and
extracted frames from our sample MP4 with minimal setup.