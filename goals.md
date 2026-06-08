**Easy** - Video Cropping
Before processing, the user picks a region on the video thumbnail to focus on. The crop coordinates get sent to the server and passed to the Java backend, so only that part of the frame gets analyzed(adding more features for more flexibility for the user).

**Goal** - Downloadable Summary + Event Graph / Heatmap
After a job finishes, the frontend reads the CSV and shows a chart of where the centroid moved over time plus a heatmap of where it spent the most time. The user can also download the raw CSV data.

**Stretch** - AI Video Summary
The centroid CSV gets sent to an AI API which returns a description of what happened in the video — things like where the object started, how it moved, and where it ended up. A new backend endpoint handles the API call and returns the summary to the frontend.

**Impossible** - Multi-Video Comparison
Upload two or more videos and run them through the same processing pipeline. The UI shows their event graphs and heatmaps side by side, and an AI generates a written comparison of how the movement patterns differ between the videos.
