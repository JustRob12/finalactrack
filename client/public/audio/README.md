# Audio Files for QR Scanner

This folder contains audio files for the QR scanner notifications.

## Required Files

### QR Detection Sound
- **File name**: `qr-detected.mp3` (preferred) or `qr-detected.wav`
- **Purpose**: Plays when a QR code is successfully detected
- **Format**: MP3 or WAV format
- **Duration**: Short notification sound (1-3 seconds recommended)

## How to Add Your Sound File

1. **Prepare your audio file**:
   - Convert to MP3 or WAV format
   - Keep it short (1-3 seconds)
   - Ensure good quality but small file size

2. **Add to this folder**:
   - Place your audio file in this directory
   - Name it `qr-detected.mp3` (or `qr-detected.wav`)
   - The scanner will automatically use this file

3. **Test the sound**:
   - Start the QR scanner
   - Scan a QR code
   - You should hear the notification sound

## File Structure
```
client/public/audio/
├── README.md
└── qr-detected.mp3 (your file here)
```

## Supported Formats
- MP3 (recommended)
- WAV
- OGG (if browser supports it)

## Troubleshooting
- If no sound plays, check browser permissions for audio
- Ensure the file is named correctly
- Check that the file is not corrupted
- Some browsers require user interaction before playing audio
