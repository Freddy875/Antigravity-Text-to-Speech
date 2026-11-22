#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VozVerde TTS - Sistema Web de Texto a Voz (Text-to-Speech)
Formato de salida principal: Audio MP3 de alta fidelidad.
Estética: Pizarra Oscura / Libreta Digital con Acentos Verde Neón y Tipografía Manuscrita.
Desarrollado con Flask, Edge-TTS y soporte multimedia opcional con FFmpeg.
"""

import os
import sys
import uuid
import time
import asyncio
import logging
import subprocess
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_from_directory, abort

# Configuración de Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VozVerde")

# Rutas del Proyecto
BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "generated_audio"
AUDIO_DIR.mkdir(exist_ok=True)

# Detección de FFmpeg mediante imageio_ffmpeg o PATH del sistema
FFMPEG_BIN = None
try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
    logger.info(f"FFmpeg detectado vía imageio_ffmpeg en: {FFMPEG_BIN}")
except Exception as e:
    logger.warning(f"imageio_ffmpeg no disponible ({e}). Intentando usar 'ffmpeg' global.")
    FFMPEG_BIN = "ffmpeg"

try:
    import edge_tts
except ImportError:
    logger.error("edge-tts no está instalado. Ejecuta: pip install edge-tts")
    sys.exit(1)

app = Flask(__name__)

# Catálogo curado de voces Neurales: Femeninas y Masculinas
CURATED_VOICES = [
    # --- Voces Femeninas (Mujer) ---
    {
        "id": "es-MX-DaliaNeural",
        "name": "Dalia",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "México",
        "country_code": "MX",
        "flag": "🇲🇽",
        "recommended": True,
        "sample_tag": "Cálida, natural y expresiva"
    },
    {
        "id": "es-ES-ElviraNeural",
        "name": "Elvira",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "España",
        "country_code": "ES",
        "flag": "🇪🇸",
        "recommended": True,
        "sample_tag": "Elegante y formal"
    },
    {
        "id": "es-CO-SalomeNeural",
        "name": "Salomé",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "Colombia",
        "country_code": "CO",
        "flag": "🇨🇴",
        "recommended": True,
        "sample_tag": "Suave, clara y melodiosa"
    },
    {
        "id": "es-AR-ElenaNeural",
        "name": "Elena",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "Argentina",
        "country_code": "AR",
        "flag": "🇦🇷",
        "recommended": False,
        "sample_tag": "Acento porteño natural"
    },
    {
        "id": "es-CL-CatalinaNeural",
        "name": "Catalina",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "Chile",
        "country_code": "CL",
        "flag": "🇨🇱",
        "recommended": False,
        "sample_tag": "Clara, dinámica y jovial"
    },
    {
        "id": "es-US-PalomaNeural",
        "name": "Paloma",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "EE. UU. (Español)",
        "country_code": "US",
        "flag": "🇺🇸",
        "recommended": False,
        "sample_tag": "Neutro, versátil y moderno"
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny",
        "gender": "Female",
        "gender_label": "Mujer",
        "country": "Estados Unidos (Inglés)",
        "country_code": "US",
        "flag": "🇺🇸",
        "recommended": False,
        "sample_tag": "Inglés nativo cristalino"
    },

    # --- Voces Masculinas (Hombre) ---
    {
        "id": "es-MX-JorgeNeural",
        "name": "Jorge",
        "gender": "Male",
        "gender_label": "Hombre",
        "country": "México",
        "country_code": "MX",
        "flag": "🇲🇽",
        "recommended": True,
        "sample_tag": "Voz grave, clara y amigable"
    },
    {
        "id": "es-ES-AlvaroNeural",
        "name": "Álvaro",
        "gender": "Male",
        "gender_label": "Hombre",
        "country": "España",
        "country_code": "ES",
        "flag": "🇪🇸",
        "recommended": True,
        "sample_tag": "Locución clara y profesional"
    },
    {
        "id": "es-CO-GonzaloNeural",
        "name": "Gonzalo",
        "gender": "Male",
        "gender_label": "Hombre",
        "country": "Colombia",
        "country_code": "CO",
        "flag": "🇨🇴",
        "recommended": False,
        "sample_tag": "Tono narrativo cálido"
    },
    {
        "id": "es-AR-TomasNeural",
        "name": "Tomás",
        "gender": "Male",
        "gender_label": "Hombre",
        "country": "Argentina",
        "country_code": "AR",
        "flag": "🇦🇷",
        "recommended": False,
        "sample_tag": "Auténtico acento rioplatense"
    },
    {
        "id": "es-CL-LorenzoNeural",
        "name": "Lorenzo",
        "gender": "Male",
        "gender_label": "Hombre",
        "country": "Chile",
        "country_code": "CL",
        "flag": "🇨🇱",
        "recommended": False,
        "sample_tag": "Locución sobria y nítida"
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy",
        "gender": "Male",
        "gender_label": "Hombre",
        "country": "Estados Unidos (Inglés)",
        "country_code": "US",
        "flag": "🇺🇸",
        "recommended": False,
        "sample_tag": "Inglés americano casual"
    }
]

# Caché global de todas las voces disponibles en Edge-TTS
_ALL_VOICES_CACHE = None

async def fetch_all_voices():
    global _ALL_VOICES_CACHE
    if _ALL_VOICES_CACHE is None:
        try:
            voices = await edge_tts.list_voices()
            _ALL_VOICES_CACHE = voices
        except Exception as e:
            logger.error(f"Error listando voces de edge-tts: {e}")
            _ALL_VOICES_CACHE = []
    return _ALL_VOICES_CACHE


def clean_old_files(max_age_seconds=7200):
    """Elimina archivos generados hace más de 2 horas para optimizar el almacenamiento."""
    try:
        now = time.time()
        for f in AUDIO_DIR.glob("*.*"):
            if f.is_file() and (now - f.stat().st_mtime > max_age_seconds):
                f.unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"Error en limpieza automática de archivos: {e}")


def convert_to_mp4_audio(input_mp3: Path, output_mp4: Path):
    """Convierte el archivo MP3 a un contenedor MP4 de audio estándar (AAC 192k) si FFmpeg está disponible."""
    if not FFMPEG_BIN:
        return False
    try:
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", str(input_mp3),
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_mp4)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception as e:
        logger.warning(f"No se pudo convertir a MP4 audio: {e}")
        return False


def convert_to_mp4_video(input_mp3: Path, output_mp4_video: Path):
    """
    Convierte el archivo de audio a un video MP4 (H.264 + AAC) con fondo negro
    y oscilograma reactivo en verde neón (#00ff66).
    """
    if not FFMPEG_BIN:
        return False
    try:
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", str(input_mp3),
            "-filter_complex",
            "[0:a]showwaves=s=1280x720:mode=line:colors=0x00ff66:scale=cbrt:rate=25[v]",
            "-map", "[v]",
            "-map", "0:a",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-shortest",
            str(output_mp4_video)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception as e:
        logger.warning(f"No se pudo crear video MP4: {e}")
        return False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/voices", methods=["GET"])
def get_voices():
    """Retorna la lista de voces curadas divididas por género (Femenina y Masculina) y catálogo general."""
    try:
        all_voices = asyncio.run(fetch_all_voices())
        
        full_list = []
        for v in all_voices:
            locale = v.get("Locale", "")
            if locale.startswith("es-") or locale.startswith("en-"):
                gender = v.get("Gender", "Unknown")
                full_list.append({
                    "id": v.get("ShortName"),
                    "name": v.get("ShortName").split("-")[-1].replace("Neural", ""),
                    "gender": gender,
                    "gender_label": "Mujer" if gender == "Female" else "Hombre",
                    "locale": locale,
                    "friendly_name": v.get("FriendlyName", "")
                })

        return jsonify({
            "success": True,
            "curated": CURATED_VOICES,
            "all": full_list
        })
    except Exception as e:
        logger.error(f"Error al obtener catálogo de voces: {e}")
        return jsonify({"success": False, "error": str(e), "curated": CURATED_VOICES}), 500


@app.route("/api/synthesize", methods=["POST"])
def synthesize():
    """
    Sintetiza texto a voz generando archivo de audio MP3 principal.
    Parámetros (JSON):
      - text: Texto a convertir (str)
      - voice: ID de la voz seleccionada (str, ej. 'es-MX-DaliaNeural' o 'es-MX-JorgeNeural')
      - rate: Velocidad (str, ej. '+0%', '+15%', '-10%')
      - pitch: Tono (str, ej. '+0Hz', '+5Hz', '-5Hz')
      - create_video: Booleano para generar también video MP4 con oscilograma (opcional)
    """
    clean_old_files()
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"success": False, "error": "El texto a sintetizar no puede estar vacío."}), 400

    if len(text) > 10000:
        return jsonify({"success": False, "error": "El texto no debe superar los 10,000 caracteres."}), 400

    voice = data.get("voice", "es-MX-DaliaNeural")
    rate = data.get("rate", "+0%")
    pitch = data.get("pitch", "+0Hz")
    create_video = bool(data.get("create_video", False))

    file_id = str(uuid.uuid4())[:12]
    mp3_path = AUDIO_DIR / f"{file_id}.mp3"
    mp4_audio_path = AUDIO_DIR / f"{file_id}.mp4"
    mp4_video_path = AUDIO_DIR / f"{file_id}_video.mp4"

    try:
        # 1. Generación directa del Audio MP3 mediante Edge-TTS
        async def _run_tts():
            communicator = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
            await communicator.save(str(mp3_path))

        asyncio.run(_run_tts())

        if not mp3_path.exists() or mp3_path.stat().st_size == 0:
            raise RuntimeError("No se pudo generar el archivo MP3.")

        # Tamaño del archivo MP3 generado
        size_mp3 = mp3_path.stat().st_size
        size_str_mp3 = f"{size_mp3 / 1024:.1f} KB" if size_mp3 < 1024 * 1024 else f"{size_mp3 / (1024*1024):.2f} MB"

        # 2. Conversión opcional a Audio MP4 (AAC) si FFmpeg está disponible
        has_mp4 = convert_to_mp4_audio(mp3_path, mp4_audio_path)
        size_str_mp4 = None
        if has_mp4 and mp4_audio_path.exists():
            s = mp4_audio_path.stat().st_size
            size_str_mp4 = f"{s / 1024:.1f} KB" if s < 1024 * 1024 else f"{s / (1024*1024):.2f} MB"

        # 3. Conversión opcional a Video MP4 con oscilograma reactivo
        has_video = False
        if create_video:
            has_video = convert_to_mp4_video(mp3_path, mp4_video_path)

        # Buscar metadatos de la voz para la respuesta
        voice_info = next((v for v in CURATED_VOICES if v["id"] == voice), {
            "name": voice.split("-")[-1].replace("Neural", ""),
            "gender": "Unknown",
            "gender_label": "Voz",
            "country": "General",
            "flag": "🎙️"
        })

        return jsonify({
            "success": True,
            "id": file_id,
            # Formato Principal: MP3
            "format": "mp3",
            "filename_mp3": f"vozverde_{file_id}.mp3",
            "audio_url": f"/stream/{file_id}/mp3",
            "download_mp3_url": f"/download/{file_id}/mp3",
            "file_size": size_str_mp3,
            "file_size_mp3": size_str_mp3,
            # Formatos complementarios
            "has_mp4": has_mp4,
            "filename_mp4": f"vozverde_{file_id}.mp4" if has_mp4 else None,
            "download_mp4_url": f"/download/{file_id}/mp4" if has_mp4 else None,
            "file_size_mp4": size_str_mp4,
            "has_video": has_video,
            "video_url": f"/stream/{file_id}/video" if has_video else None,
            "download_video_url": f"/download/{file_id}/video" if has_video else None,
            # Metadatos
            "voice": voice,
            "voice_name": voice_info.get("name", "Voz"),
            "voice_gender": voice_info.get("gender_label", "Voz"),
            "voice_flag": voice_info.get("flag", "🎙️"),
            "text_preview": text[:90] + ("..." if len(text) > 90 else "")
        })

    except Exception as e:
        logger.error(f"Error durante la síntesis a MP3: {e}")
        return jsonify({"success": False, "error": f"Error al generar el audio MP3: {str(e)}"}), 500


@app.route("/api/generate-video/<file_id>", methods=["POST"])
def generate_video_on_demand(file_id):
    """Genera la versión en video MP4 con oscilograma verde bajo demanda."""
    mp3_path = AUDIO_DIR / f"{file_id}.mp3"
    mp4_video_path = AUDIO_DIR / f"{file_id}_video.mp4"

    if not mp3_path.exists():
        return jsonify({"success": False, "error": "El archivo de audio original no existe o ha expirado."}), 404

    try:
        if not mp4_video_path.exists():
            success = convert_to_mp4_video(mp3_path, mp4_video_path)
            if not success:
                return jsonify({"success": False, "error": "No se pudo generar el video. Verifique FFmpeg."}), 500

        return jsonify({
            "success": True,
            "video_url": f"/stream/{file_id}/video",
            "download_video_url": f"/download/{file_id}/video",
            "filename": f"video_vozverde_{file_id}.mp4"
        })
    except Exception as e:
        logger.error(f"Error generando video MP4: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/stream/<file_id>/<file_format>")
def stream_audio(file_id, file_format):
    """Transmite el archivo de audio o video para reproducción inmediata en el navegador."""
    if file_format == "mp3":
        filename = f"{file_id}.mp3"
        mimetype = "audio/mpeg"
    elif file_format == "mp4":
        filename = f"{file_id}.mp4"
        mimetype = "audio/mp4"
    elif file_format == "video":
        filename = f"{file_id}_video.mp4"
        mimetype = "video/mp4"
    else:
        abort(400)

    target_file = AUDIO_DIR / filename
    if not target_file.exists():
        abort(404)

    return send_from_directory(AUDIO_DIR, filename, mimetype=mimetype)


@app.route("/download/<file_id>/<file_format>")
def download_audio(file_id, file_format):
    """Descarga directa del archivo de audio en formato MP3 o complementarios."""
    if file_format == "mp3":
        filename = f"{file_id}.mp3"
        download_name = f"vozverde_{file_id}.mp3"
        mimetype = "audio/mpeg"
    elif file_format == "mp4":
        filename = f"{file_id}.mp4"
        download_name = f"vozverde_{file_id}.mp4"
        mimetype = "audio/mp4"
    elif file_format == "video":
        filename = f"{file_id}_video.mp4"
        download_name = f"vozverde_video_{file_id}.mp4"
        mimetype = "video/mp4"
    else:
        abort(400)

    target_file = AUDIO_DIR / filename
    if not target_file.exists():
        abort(404)

    return send_from_directory(
        AUDIO_DIR,
        filename,
        as_attachment=True,
        download_name=download_name,
        mimetype=mimetype
    )


if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass

    port = int(os.environ.get("PORT", 5000))
    print("\n" + "=" * 60)
    print(" 🎙️ [VozVerde TTS] Servidor de Texto a Voz MP3 Iniciado")
    print(f" 🌐 URL Local: http://127.0.0.1:{port}")
    print(" ⚡ Formato de Descarga Principal: MP3")
    print(" 🎨 Tema: Pizarra Oscura • Neón Verde • Tipografía Manuscrita")
    print("=" * 60 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
