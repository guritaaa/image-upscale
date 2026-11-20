# Image Upscaler & Color Enhancer

Web application to upscale low-resolution/blurry photos to HD and enhance colors using Node.js, Express, and FFmpeg.

## Prerequisites
- Node.js installed
- FFmpeg installed (`ffmpeg` command must be accessible in your PATH)

## Installation
1. Open terminal in this folder (`/home/gurita/upscale`).
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App
1. Start the server:
   ```bash
   npm start
   ```
2. Open your browser and go to `http://localhost:3000`.

## How it works
- It uses `multer` to handle image uploads.
- It uses `child_process` to call `ffmpeg` with a custom filter graph to:
  - Upscale the image (2x or 4x) using the `lanczos` algorithm for sharpness.
  - Enhance brightness, contrast, and saturation.
  - Apply an `unsharp` mask for better clarity.
- It saves the result as a PNG file and triggers an automatic download.
