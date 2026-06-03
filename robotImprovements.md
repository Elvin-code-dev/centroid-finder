# Robot Improvements

AI-generated suggestions based on a review of the server routes/tests, Java source/tests, package.json, and pom.xml.

---

## Refactoring Code

- `BinarizingImageGroupFinder.findConnectedGroups` calls `groups.sort(Comparator.reverseOrder())` after
  delegating to `DfsBinaryGroupFinder`, which already sorts its result before returning. The second sort
  is redundant and can be removed.

- `ImageSummaryApp.main` is doing too many things: argument parsing, image loading, binarization,
  group finding, and file writing all in one method. Each of these could be extracted into its own
  helper method to make the flow easier to follow and test.

- The `directions` array in `DfsBinaryGroupFinder.collect` is re-allocated on every call to `collect`.
  It could be extracted as a private static final constant to avoid repeated allocation.

---

## Adding Tests

- `ImageSummaryApp` has no tests at all. At minimum there should be tests for the argument validation
  (fewer than 3 args, non-integer threshold, invalid hex color).

- `DistanceImageBinarizerTest` does not test the case where a pixel's distance is exactly equal to
  the threshold. The binarization uses strict less-than (`distance < threshold`), so a pixel at
  exactly the threshold becomes black. This boundary condition is untested.

- `EuclideanColorDistanceTest` does not test colors where only one channel differs, or where
  colorA and colorB are swapped (distance should be symmetric).

- On the server side, there are no tests for what happens when `targetColor` is malformed (e.g.
  `"red"`, `"255,0"`, or `"256,0,0"`). The `rgbToHex` function in `process.js` will silently
  produce `NaN` values in those cases.

- `videos.test.js` does not test that the response only contains video files. Currently the route
  returns every file in the directory.

---

## Improving Error Handling

- `ImageSummaryApp` uses `catch (Exception e)` in two places. These should be narrowed:
  `ImageIO.read` and `ImageIO.write` throw `IOException`; `PrintWriter` construction can throw
  `FileNotFoundException`. Using the specific types makes the intent clearer and prevents accidentally
  swallowing unexpected runtime errors.

- When `ImageSummaryApp` fails (bad image, bad hex color, etc.) it prints an error and returns, but
  exits with code 0. The server checks the child process exit code to decide whether the job succeeded
  or failed. Failures should call `System.exit(1)` so the server correctly marks the job as errored.

- `thumbnail.js` passes `req.params.filename` directly to `ffmpeg` without any validation. A filename
  containing `../` could be used to make ffmpeg open files outside the videos directory. The filename
  should be checked to ensure it contains no path separators or `..` sequences.

- `process.js` passes `req.params.filename` to `resolve()` without validation, carrying the same
  path traversal risk as thumbnail.js.

- `videos.js` catches all errors from `readdir` and returns a generic 500 message. It would be more
  useful to log the actual error server-side so that misconfigurations (wrong `VIDEOS_DIR`, missing
  directory) are easier to diagnose.

---

## Writing Documentation

- `ImageGroupFinder` interface has a `@param image` tag with no description.

- `DfsBinaryGroupFinder` has no class-level Javadoc explaining what algorithm it uses or its
  overall contract.

- None of the three Express route files (`videos.js`, `thumbnail.js`, `process.js`) have JSDoc
  comments on their route handlers describing the expected request parameters, query parameters,
  or response shapes.

- `README.md` does not document how to run the server, what environment variables are required
  (`PORT`, `VIDEOS_DIR`, `JAR_PATH`), or what the API endpoints are.

---

## Hardening Security

- `req.params.filename` is used unsanitized in both `thumbnail.js` and `process.js` when building
  file paths. Path traversal is the main risk. Validate that the filename contains no `/`, `\`,
  or `..` before using it.

- `process.env.VIDEOS_DIR` and `process.env.JAR_PATH` are used without checking that they are
  defined. If the `.env` file is missing or incomplete the server will silently resolve paths
  relative to `undefined`, producing unexpected behaviour. Add startup checks that assert these
  variables are set.

---

## Bug Fixes

- `ImageSummaryApp` receives four arguments from the server (`videoPath`, `outputCsv`, `hexColor`,
  `threshold`) but only reads three (`args[0]` = image path, `args[1]` = hex color, `args[2]` =
  threshold). The `outputCsv` argument is ignored, and output is hardcoded to `"groups.csv"` in
  the current working directory. The server then looks for the result at `/results/<jobId>.csv`,
  which never gets written. This means no job ever actually completes successfully.
