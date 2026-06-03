# Priority Improvements

Top two improvements per category, drawn from humanImprovements.md and robotImprovements.md.

---

## Refactoring Code (required)

1. **Remove redundant sort in `BinarizingImageGroupFinder`.**
   `DfsBinaryGroupFinder.findConnectedGroups` already returns a sorted list, so the
   `groups.sort(Comparator.reverseOrder())` call inside `BinarizingImageGroupFinder` is
   doing unnecessary work and could produce incorrect order if the two comparators ever diverge.

2. **Extract helper methods from `ImageSummaryApp.main`.**
   The main method handles argument parsing, image loading, binarization, group finding, and
   file writing all in one block. Splitting these into private static methods would make the
   flow easier to read and easier to test individually.

---

## Adding Tests (required)

1. **Test malformed `targetColor` values in `process.js`.**
   The `rgbToHex` function silently produces `NaN` if `targetColor` is missing a component,
   non-numeric, or formatted incorrectly (e.g. `"red"`, `"255,0"`, `"256,0,0"`). There are
   currently no tests for these cases.

2. **Test the threshold boundary condition in `DistanceImageBinarizer`.**
   Binarization uses strict less-than (`distance < threshold`), so a pixel whose distance
   equals the threshold should become black. This edge case is untested and easy to get wrong.

---

## Improving Error Handling (required)

1. **Fix `ImageSummaryApp` exit codes and exception types.**
   The app currently catches `Exception` broadly and returns normally on failure, so the server
   always sees exit code 0 and marks every job as succeeded even when it errored. Failures should
   call `System.exit(1)`, and `catch (Exception e)` should be narrowed to `catch (IOException e)`
   where appropriate.

2. **Validate filename parameters in `thumbnail.js` and `process.js`.**
   Both routes pass `req.params.filename` directly into file path resolution without checking for
   `..` or path separators. A malformed filename could be used to read files outside the videos
   directory. The filename should be rejected if it contains `/`, `\`, or `..`.

---

## Writing Documentation (required)

1. **Add JSDoc to the three Express route handlers.**
   `videos.js`, `thumbnail.js`, and `process.js` have no documentation on their route functions.
   Each handler should have a short JSDoc block describing the route, expected parameters/query
   params, and possible response shapes.

2. **Update `README.md` with setup and API information.**
   The README does not document how to run the server, what environment variables are required
   (`PORT`, `VIDEOS_DIR`, `JAR_PATH`), or what the API endpoints are and how to call them.

---

## Improving Performance (optional)

- Extract the `directions` array in `DfsBinaryGroupFinder.collect` as a `private static final`
  constant so it is not re-allocated on every call to `collect`.

---

## Hardening Security (optional)

- Add startup checks in `index.js` that assert `VIDEOS_DIR` and `JAR_PATH` are defined before
  the server starts accepting requests, so a missing `.env` file fails loudly rather than
  producing silent path resolution errors.

---

## Bug Fixes (optional)

- **`ImageSummaryApp` ignores the output CSV path argument.**
  `process.js` calls Java with `[videoPath, outputCsv, hexColor, threshold]` but `ImageSummaryApp`
  only reads three arguments and hardcodes output to `"groups.csv"` in the current working
  directory. The server looks for the result at `/results/<jobId>.csv`, which is never written,
  so no job ever completes successfully. Fix by reading `args[1]` as the output path and shifting
  `hexColor` and `threshold` to `args[2]` and `args[3]`.

---

## Other (optional)

- Filter the video listing in `videos.js` to only return files with known video extensions
  (`.mp4`, `.mov`, `.avi`, etc.) rather than every file in the directory, which could include
  `.env` files or other sensitive items.