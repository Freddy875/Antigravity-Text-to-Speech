# 🏛️ Arquitectura Técnica de VozVerde TTS (Formato MP3)

Este documento detalla la arquitectura de software, patrones de diseño, componentes técnicos y el pipeline de procesamiento de audio para la aplicación **VozVerde TTS**.

---

## 1. Visión General de la Arquitectura

VozVerde TTS utiliza una arquitectura orientada a servicios desacoplados:
1. **Frontend Reactivo Nativo**:
   - Construido con HTML5 semántico, CSS3 moderno y JavaScript Vanilla modular.
   - Sin sobrecarga de frameworks pesados (React/Angular/Vue), lo que garantiza tiempos de carga instantáneos y renderizado a 60 FPS en el visualizador Canvas.
   - Manipulación de audio mediante la **Web Audio API** y el elemento HTML5 `<audio>`.
   - Diseño responsivo a prueba de fallos: la línea de tiempo y los controles están contenidos estrictamente para evitar cualquier desbordamiento horizontal en pantallas pequeñas.
2. **Backend en Python (Flask)**:
   - Provee una API REST JSON minimalista y rápida.
   - Orquesta la comunicación con el motor neural **Edge-TTS** mediante WebSockets seguros (WSS).
   - Administra el almacenamiento temporal con un recolector de basura (*garbage collector*) por tiempo de vida (TTL).
   - Ofrece endpoints optimizados para streaming de audio (`audio/mpeg`) con soporte de buffering y descarga directa como archivo adjunto (`Content-Disposition: attachment`).
3. **Pipeline de Síntesis Neural (Edge-TTS)**:
   - Conversión de texto en audio directamente en formato MP3 con codificación a 48kHz y alta tasa de muestreo.

---

## 2. Diagrama de Bloques del Sistema (Mermaid)

```mermaid
flowchart TD
    subgraph Cliente["💻 Cliente Web (Frontend)"]
        UI["🖥️ Vista HTML5 / CSS3\n(Pizarra Oscura / Manuscrito / Neón Verde)"]
        Clip["📋 Módulo Portapapeles\n(Lectura / Escritura segura)"]
        VoiceCtrl["👥 Selector de Voz\n(Femenina 👩 / Masculina 👨)"]
        AudioEng["🔊 Motor de Audio HTML5\n- Controles: Play/Pause/Rewind/Forward\n- Scrubber elástico sin desbordar pantalla"]
        CanvasOsc["📊 Canvas 2D\n(Oscilograma Verde #00ff66)"]
        WebAudio["🎛️ Web Audio API\n(AnalyserNode & FFT 256)"]
        StorageState["💾 LocalStorage\n(Historial de audios MP3)"]
    end

    subgraph Servidor["⚙️ Backend Flask (Python)"]
        Endpoints["🚦 API Endpoints\n- POST /api/synthesize\n- GET /api/voices\n- GET /stream/<id>/mp3\n- GET /download/<id>/mp3"]
        VoiceCache["🎙️ Gestor de Voces (Caché en Memoria)"]
        PurgeCron["🧹 Limpiador Automático (TTL 2h)"]
    end

    subgraph Motores["⚡ Motores de Procesamiento"]
        TTS["🧠 Microsoft Edge-TTS Neural\n(Protocolo WebSocket WSS)"]
        FFmpegEng["🎞️ FFmpeg (Opcional)\n(Render de video MP4 con oscilograma)"]
    end

    subgraph FS["📁 Sistema de Archivos Local"]
        DiskStore[("📂 generated_audio/\n- {id}.mp3 (Principal)\n- {id}.mp4 (Opcional)")]
    end

    Clip --> UI
    VoiceCtrl --> UI
    UI -->|"Petición JSON POST"| Endpoints
    Endpoints --> VoiceCache
    Endpoints --> TTS
    TTS -->|"Guarda audio MP3 nativo"| DiskStore
    Endpoints -->|"URLs de streaming y descarga"| UI
    UI --> AudioEng
    AudioEng --> WebAudio
    WebAudio --> CanvasOsc
    UI --> StorageState
    PurgeCron -.->|"Elimina archivos obsoletos"| DiskStore
    Endpoints -.-> FFmpegEng
    FFmpegEng -.-> DiskStore
```

---

## 3. Pipeline de Generación y Streaming de Audio MP3

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Usuario
    participant FE as 🖥️ Frontend (app.js)
    participant BE as ⚙️ Flask (app.py)
    participant E_TTS as 🧠 Edge-TTS Engine
    participant FS as 📁 Sistema de Archivos

    U->>FE: Pega texto ("📋 Pegar texto") y selecciona voz (Femenina o Masculina)
    U->>FE: Presiona botón "⚡ Generar Audio MP3 🎵"
    FE->>FE: Activa modal con spinner animado verde
    FE->>BE: POST /api/synthesize {text, voice, rate, pitch}
    BE->>BE: Valida longitud (<= 10,000 chars) y genera ID único (UUID4)
    BE->>E_TTS: communicate(text, voice, rate, pitch).save(generated_audio/{id}.mp3)
    E_TTS-->>FS: Escribe archivo de audio en formato MP3 estándar
    BE-->>FE: Retorna JSON con {success: true, id, audio_url, download_mp3_url, file_size_mp3}
    FE->>FE: Cierra modal de carga y despliega Reproductor Activo
    FE->>BE: GET /stream/{id}/mp3
    BE-->>FE: Transmite flujo con mimetype "audio/mpeg"
    FE->>FE: Dispara reproducción automática e inicializa Web Audio AnalyserNode
    FE->>FE: Dibuja oscilograma reactivo en Canvas #00ff66
    U->>FE: Pulsa "⏪ -5s Atrasar" o "⏩ Adelantar +5s"
    FE->>FE: Ajusta audioElement.currentTime instantáneamente
    U->>FE: Pulsa "📥 Descargar Audio MP3"
    FE->>BE: GET /download/{id}/mp3
    BE-->>U: Envía archivo con cabecera Content-Disposition: attachment
```

---

## 4. Decisiones de Diseño Técnico

### 4.1 Prioridad Absoluta del Formato MP3
- **Por qué MP3**: Es el formato estándar de audio comprimido con mayor interoperabilidad en la historia de la informática. Es compatible al 100% con todos los sistemas operativos (Windows, macOS, Linux, Android, iOS), navegadores, reproductores de coche, dispositivos portátiles y plataformas web sin requerir transcodificación adicional.
- **Eficiencia**: Edge-TTS produce de forma nativa flujos de audio MP3 de alta fidelidad, evitando la sobrecarga de CPU y consumo de memoria que implicaría recodificar cada audio con librerías externas.

### 4.2 Control Estricto Anti-Desbordamiento de la Línea de Tiempo
Uno de los problemas más comunes en reproductores web es el desbordamiento de la barra de progreso en resoluciones pequeñas o pantallas móviles. En VozVerde TTS se implementaron reglas CSS estrictas:
```css
.timeline-wrapper {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
}

.progress-container {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    min-width: 0; /* Previene la propagación de ancho fijo en Flexbox */
}

.progress-bar-bg {
    flex: 1 1 auto;
    min-width: 0;
    height: 9px;
    /* ... */
}
```

### 4.3 Selector Dual de Voces (Femenina y Masculina)
- La interfaz implementa un selector dual en forma de tarjetas hero (`.gender-card` para Mujer y Hombre).
- Al pulsar una de las tarjetas, se actualiza la voz activa de forma inmediata y se filtra la cuadrícula de locutores disponibles.
- Voces Femeninas principales: **Dalia** (México 🇲🇽), **Elvira** (España 🇪🇸), **Salomé** (Colombia 🇨🇴).
- Voces Masculinas principales: **Jorge** (México 🇲🇽), **Álvaro** (España 🇪🇸), **Gonzalo** (Colombia 🇨🇴).

### 4.4 Visualizador Osciloscópico Canvas
- La clase `AudioWaveformVisualizer` en `visualizer.js` utiliza la **Web Audio API** (`AudioContext`, `AnalyserNode` con `fftSize = 256`).
- Si las restricciones de seguridad del navegador impiden el análisis directo de la fuente de audio, el sistema entra en modo de simulación reactiva fluida (*Synthetic Wave*) para asegurar que el usuario siempre disfrute de la animación en verde neón.

---

## 5. Gestión del Ciclo de Vida de los Archivos

Para evitar que el disco duro se llene con audios generados por múltiples usuarios, `app.py` ejecuta una rutina de limpieza automática en cada invocación:
- **Directorio monitoreado**: `generated_audio/`
- **Tiempo de vida máximo (TTL)**: 7,200 segundos (2 horas).
- Los archivos con antigüedad mayor a 2 horas son purgados silenciosamente mediante `pathlib.Path.unlink()`.
