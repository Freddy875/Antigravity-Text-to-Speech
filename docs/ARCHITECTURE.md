# 🏛️ Technical Architecture of VozVerde TTS (MP3 Format)

This document describes the software architecture, design patterns, components, and audio processing pipeline for **VozVerde TTS**.

---

## 1. System Overview

VozVerde TTS is built with a decoupled client-server architecture:
1. **Lightweight Responsive Frontend**: Native HTML5, CSS3, and modern Vanilla JavaScript with Google Fonts (`Caveat`, `Patrick Hand`, `Kalam`). Features an oscilloscope-style Canvas visualizer in fluorescent green (`#00ff66`), forward/rewind controls (±5s), and a clean progress timeline designed to never overflow screen width.
2. **Flask Backend**: Exposes a minimal REST API for text-to-speech synthesis, streaming (`audio/mpeg`), and attachment downloads.
3. **Edge-TTS Neural Engine**: Generates high-fidelity MP3 audio directly via secure WebSockets with Microsoft Edge speech services.

---

## 2. Architecture Diagram (Mermaid)

```mermaid
flowchart TD
    subgraph Client["🌐 Web Client (Frontend)"]
        UI["🖥️ Dark Chalkboard Interface\n(Handwritten Typography & Neon Green)"]
        Clipboard["📋 Clipboard Utilities\n(Paste & Copy Text)"]
        VoiceSelector["👥 Dual Voice Selector\n(Female 👩 / Male 👨)"]
        PlayerEngine["🔊 HTML5 Audio Player\n- Scrubber (No Screen Overflow)\n- Rewind -5s | Play/Pause | Forward +5s"]
        CanvasOsc["📊 Reactive Canvas Visualizer\n(Green Neon Oscilloscope #00ff66)"]
        History["📜 Local Session History"]
    end

    subgraph Server["⚙️ Flask Backend (Python)"]
        Routes["🚦 API Endpoints\n- /api/synthesize\n- /api/voices\n- /stream/<id>/mp3\n- /download/<id>/mp3"]
        VoiceService["🎙️ Voice Catalog Cache"]
        Cleaner["🧹 Automated File Purge (TTL 2h)"]
    end

    subgraph Engines["⚡ Processing Engines"]
        EdgeTTS["🧠 Edge-TTS Neural Engine\n(Direct MP3 Audio Output)"]
        FFmpegOpt["🎞️ Optional FFmpeg\n(MP4 Video with Green Waveform)"]
    end

    subgraph Disk["📁 Local Storage"]
        Store[("📂 /generated_audio\n- {id}.mp3 (Primary)\n- {id}.mp4 (Optional)")]
    end

    Clipboard --> UI
    VoiceSelector --> UI
    UI -->|"HTTP POST /api/synthesize"| Routes
    Routes --> VoiceService
    Routes --> EdgeTTS
    EdgeTTS -->|"Saves native MP3 file"| Store
    Routes -->|"Returns streaming and download URLs"| UI
    UI --> PlayerEngine
    PlayerEngine --> CanvasOsc
    UI --> History
    Cleaner -.->|"Deletes files > 2h"| Store
    Routes -.-> FFmpegOpt
    FFmpegOpt -.-> Store
```

---

## 3. Key Design Decisions

1. **Direct MP3 Synthesis**: Edge-TTS natively creates `.mp3` files, eliminating the overhead of transcode pipelines and guaranteeing 100% universal compatibility across all modern and legacy devices.
2. **Anti-Overflow Scrubber**: Progress container uses `min-width: 0`, `flex: 1 1 auto`, and strict `overflow: hidden` bounding boxes so the timeline never spills out of viewport bounds on mobile devices.
3. **Gender Voice Pairing**: Immediate switching between female and male neural voices (such as Dalia and Jorge for Mexico, Elvira and Álvaro for Spain, etc.).
