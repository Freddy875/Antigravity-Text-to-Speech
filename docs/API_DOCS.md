# 📡 Documentación de la API REST | VozVerde TTS

Esta documentación especifica los endpoints REST del backend desarrollado en Flask para la síntesis, transmisión y descarga de archivos de audio **MP3**.

---

## 1. Endpoints Disponibles

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/` | Retorna la página HTML de la aplicación cliente. |
| `GET` | `/api/voices` | Obtiene el catálogo de voces disponibles divididas por género (Femenina / Masculina) y país. |
| `POST` | `/api/synthesize` | Convierte texto en audio y genera el archivo **MP3** principal. |
| `POST` | `/api/generate-video/<id>` | Genera bajo demanda un video MP4 con oscilograma reactivo en verde neón. |
| `GET` | `/stream/<id>/<format>` | Transmite en streaming el audio MP3 o MP4 para reproducción directa. |
| `GET` | `/download/<id>/<format>` | Descarga directa del archivo adjunto en formato MP3 o MP4. |

---

## 2. Especificación Detallada de Endpoints

### 2.1 Obtener Catálogo de Voces
`GET /api/voices`

#### Respuesta (200 OK)
```json
{
  "success": true,
  "curated": [
    {
      "id": "es-MX-DaliaNeural",
      "name": "Dalia",
      "gender": "Female",
      "gender_label": "Mujer",
      "country": "México",
      "country_code": "MX",
      "flag": "🇲🇽",
      "recommended": true,
      "sample_tag": "Cálida, natural y expresiva"
    },
    {
      "id": "es-MX-JorgeNeural",
      "name": "Jorge",
      "gender": "Male",
      "gender_label": "Hombre",
      "country": "México",
      "country_code": "MX",
      "flag": "🇲🇽",
      "recommended": true,
      "sample_tag": "Voz grave, clara y amigable"
    }
  ],
  "all": []
}
```

---

### 2.2 Síntesis de Texto a Audio MP3
`POST /api/synthesize`

Sintetiza el texto enviado y almacena de inmediato el archivo de audio MP3 en el servidor.

#### Cabeceras
`Content-Type: application/json`

#### Cuerpo de la Petición (JSON)
```json
{
  "text": "Bienvenidos al sistema VozVerde TTS. Este audio ha sido generado en formato MP3.",
  "voice": "es-MX-DaliaNeural",
  "rate": "+0%",
  "pitch": "+0Hz",
  "create_video": false
}
```

#### Parámetros
- `text` *(string, obligatorio)*: Texto a sintetizar. Longitud máxima: 10,000 caracteres.
- `voice` *(string, opcional)*: Identificador de la voz. Por defecto: `es-MX-DaliaNeural`.
- `rate` *(string, opcional)*: Ajuste de velocidad (ej. `+15%`, `-10%`, `+0%`).
- `pitch` *(string, opcional)*: Ajuste de tono (ej. `+5Hz`, `-5Hz`, `+0Hz`).
- `create_video` *(boolean, opcional)*: `true` si se desea pre-generar video MP4 con ondas. Por defecto: `false`.

#### Respuesta Exitosa (200 OK)
```json
{
  "success": true,
  "id": "e4f8b2a1c0d3",
  "format": "mp3",
  "filename_mp3": "vozverde_e4f8b2a1c0d3.mp3",
  "audio_url": "/stream/e4f8b2a1c0d3/mp3",
  "download_mp3_url": "/download/e4f8b2a1c0d3/mp3",
  "file_size": "156.4 KB",
  "file_size_mp3": "156.4 KB",
  "has_mp4": true,
  "download_mp4_url": "/download/e4f8b2a1c0d3/mp4",
  "filename_mp4": "vozverde_e4f8b2a1c0d3.mp4",
  "voice": "es-MX-DaliaNeural",
  "voice_name": "Dalia",
  "voice_gender": "Mujer",
  "voice_flag": "🇲🇽",
  "text_preview": "Bienvenidos al sistema VozVerde TTS..."
}
```

#### Respuestas de Error
- **400 Bad Request**:
  ```json
  { "success": false, "error": "El texto a sintetizar no puede estar vacío." }
  ```
- **500 Internal Server Error**:
  ```json
  { "success": false, "error": "Error al generar el audio MP3: detalle del fallo" }
  ```

---

### 2.3 Streaming de Audio
`GET /stream/<file_id>/<file_format>`

Permite la transmisión por fragmentos de audio para reproducción en reproductores HTML5 sin esperar a la descarga total.

#### Parámetros de Ruta
- `file_id`: Identificador único retornado en la síntesis (UUID corto de 12 caracteres).
- `file_format`: Formato a transmitir: `mp3`, `mp4` o `video`.

#### Cabeceras de Respuesta
- `Content-Type`: `audio/mpeg` para MP3, `audio/mp4` para MP4 audio, `video/mp4` para video.
- `Accept-Ranges`: `bytes` (soporte para scrubber y saltos de reproducción).

---

### 2.4 Descarga Directa de Archivo MP3
`GET /download/<file_id>/<file_format>`

Fuerza la descarga del archivo en el navegador del usuario como adjunto binario.

#### Parámetros de Ruta
- `file_id`: Identificador único del audio.
- `file_format`: Formato a descargar: `mp3`, `mp4` o `video`.

#### Cabeceras de Respuesta
- `Content-Disposition`: `attachment; filename="vozverde_<file_id>.mp3"`
- `Content-Type`: `audio/mpeg`
