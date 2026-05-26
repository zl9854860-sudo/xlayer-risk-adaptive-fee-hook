# Task Checklist

## Demo video

- [x] Generate a 1-3 minute demo video from the deployed Hook and swap proof.
- [x] Verify the MP4 duration and file metadata.
- [x] Update submission docs to mark the video as recorded.
- [x] Run project checks after the documentation change.

## Review

- Generated `docs/submission/risk-adaptive-fee-hook-demo.mp4`.
- Verified MP4 metadata with `ffprobe`: 1920x1080 H.264 video, AAC audio, 122.5 seconds.
- Extracted representative frames and fixed text wrapping for long transaction hashes.
- Ran `npm test` and `npm run compile` successfully after the video/docs updates.
