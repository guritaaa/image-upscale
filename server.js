const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
        }
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(outputDir));

// Upscale endpoint
app.post('/api/upscale', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah.' });
    }

    const inputPath = req.file.path;
    const outputFilename = `hd_${Date.now()}.png`;
    const outputPath = path.join(outputDir, outputFilename);

    // FFmpeg command for upscaling & enhancing color/sharpness
    // -vf "scale=iw*2:ih*2:flags=lanczos,eq=brightness=0.03:contrast=1.1:saturation=1.15,unsharp=3:3:0.8:3:3:0.0"
    // Explanation:
    // 1. scale=iw*2:ih*2:flags=lanczos -> 2x resolution increase with high-quality lanczos resampling (HD crispness)
    // 2. eq=brightness=0.03:contrast=1.1:saturation=1.15 -> Brighten image, boost contrast & vibrant colors (fix buram/dull colors)
    // 3. unsharp=3:3:0.8:3:3:0.0 -> Sharpen details to reduce pixelation/blur
    const scaleMode = req.body.scale || '2'; // 2 or 4
    let scaleFilter = 'scale=iw*2:ih*2:flags=lanczos+accurate_rnd';
    if (scaleMode === '4') {
        scaleFilter = 'scale=iw*4:ih*4:flags=lanczos+accurate_rnd';
    }

    const colorMode = req.body.saturation || '1.8'; // 1.2, 1.8, 2.4, or 2.8
    let saturationVal = '1.8';
    if (colorMode === '1.2') saturationVal = '1.2';
    else if (colorMode === '1.8') saturationVal = '1.8';
    else if (colorMode === '2.4') saturationVal = '2.4';
    else if (colorMode === '2.8') saturationVal = '2.8';

    // Professional HD Pipeline: gentle denoise -> Lanczos HD upscale -> High contrast & clarity -> Precision unsharp
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "hqdn3d=1.5:1.5:3:3,${scaleFilter},eq=brightness=0.01:contrast=1.3:saturation=${saturationVal},unsharp=5:5:1.2:5:5:0.4" -compression_level 6 "${outputPath}"`;

    console.log(`Executing: ${ffmpegCmd}`);

    exec(ffmpegCmd, (error, stdout, stderr) => {
        // Clean up uploaded input file
        fs.unlink(inputPath, (err) => {
            if (err) console.error('Gagal menghapus file input:', err);
        });

        if (error) {
            console.error(`FFmpeg error: ${error.message}`);
            return res.status(500).json({ error: 'Gagal memproses gambar dengan FFmpeg.' });
        }

        // Return download URL & filename
        res.json({
            success: true,
            message: 'Gambar berhasil di-upscale dan ditingkatkan warnanya!',
            downloadUrl: `/output/${outputFilename}`,
            filename: outputFilename
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
