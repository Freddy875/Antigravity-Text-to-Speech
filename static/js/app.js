/**
 * VozVerde TTS - Lógica de Aplicación Frontend
 * Sintetizador de Texto a Voz Neural con Descarga Directa en Formato MP3.
 * Incluye:
 *  - Copiado y pegado de texto fácil.
 *  - Selector claro de voz Femenina 👩 y Masculina 👨.
 *  - Reproductor con visualizador en tiempo real, adelantar (+5s) y atrasar (-5s).
 *  - Línea de tiempo simple y responsiva (sin desbordamiento de pantalla).
 *  - Historial de sesión local.
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // Referencias del DOM
    // =========================================================
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const pasteTextBtn = document.getElementById('pasteTextBtn');
    const copyTextBtn = document.getElementById('copyTextBtn');
    const clearTextBtn = document.getElementById('clearTextBtn');
    const sampleTags = document.querySelectorAll('.sample-tag');

    // Selector de Género y Voces
    const genderCardFemale = document.getElementById('genderCardFemale');
    const genderCardMale = document.getElementById('genderCardMale');
    const activeFemaleLabel = document.getElementById('activeFemaleLabel');
    const activeMaleLabel = document.getElementById('activeMaleLabel');
    const countrySelect = document.getElementById('countrySelect');
    const voicesGrid = document.getElementById('voicesGrid');
    const rateSlider = document.getElementById('rateSlider');
    const rateValue = document.getElementById('rateValue');
    const pitchSlider = document.getElementById('pitchSlider');
    const pitchValue = document.getElementById('pitchValue');
    const synthesizeBtn = document.getElementById('synthesizeBtn');

    // Reproductor y Visualizador
    const emptyState = document.getElementById('emptyState');
    const playerContainer = document.getElementById('playerContainer');
    const audioElement = document.getElementById('audioElement');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const restartBtn = document.getElementById('restartBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');
    const progressBarBg = document.getElementById('progressBarBg');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressHandle = document.getElementById('progressHandle');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    const speedPills = document.querySelectorAll('.speed-pill');
    
    // Ficha del reproductor
    const playerStatusText = document.getElementById('playerStatusText');
    const nowPlayingVoiceBadge = document.getElementById('nowPlayingVoiceBadge');
    const nowPlayingSnippet = document.getElementById('nowPlayingSnippet');
    const visualizerVoiceTag = document.getElementById('visualizerVoiceTag');

    // Botones de Descarga
    const downloadMp3Btn = document.getElementById('downloadMp3Btn');
    const mp3SizeLabel = document.getElementById('mp3SizeLabel');
    const downloadMp4Btn = document.getElementById('downloadMp4Btn');
    const downloadVideoBtn = document.getElementById('downloadVideoBtn');

    // Historial y Modales
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const loadingModal = document.getElementById('loadingModal');
    const loadingStatusText = document.getElementById('loadingStatusText');

    // =========================================================
    // Estado de la Aplicación
    // =========================================================
    let allVoices = [];
    let curatedVoices = [];
    let currentGender = 'Female'; // 'Female' o 'Male'
    let currentCountry = 'MX';
    let selectedFemaleVoiceId = 'es-MX-DaliaNeural';
    let selectedMaleVoiceId = 'es-MX-JorgeNeural';
    let selectedVoiceId = 'es-MX-DaliaNeural'; // Activa por defecto: Dalia (Mujer - MX)
    let currentAudioId = null;
    let visualizer = null;
    let history = JSON.parse(localStorage.getItem('vozverde_mp3_history') || '[]');

    // Inicializar visualizador Canvas Osciloscopio
    if (window.AudioWaveformVisualizer) {
        visualizer = new AudioWaveformVisualizer('waveformCanvas', audioElement);
    }

    // =========================================================
    // 1. Manejo de Texto: Pegar, Copiar, Limpiar y Contadores
    // =========================================================
    function updateTextStats() {
        const text = textInput.value;
        charCount.textContent = text.length.toLocaleString();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words.toLocaleString();
    }

    textInput.addEventListener('input', updateTextStats);

    // Botón Pegar desde el portapapeles
    if (pasteTextBtn) {
        pasteTextBtn.addEventListener('click', async () => {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const clipText = await navigator.clipboard.readText();
                    if (clipText) {
                        textInput.value = clipText;
                        updateTextStats();
                        textInput.focus();
                        showToast('📋 Texto pegado desde el portapapeles');
                    } else {
                        showToast('El portapapeles está vacío');
                    }
                } else {
                    // Fallback para navegadores con permisos restringidos
                    textInput.focus();
                    showToast('Usa Ctrl+V para pegar en el cuadro de texto');
                }
            } catch (err) {
                console.warn('Acceso al portapapeles restringido:', err);
                textInput.focus();
                showToast('Usa Ctrl+V para pegar tu texto');
            }
        });
    }

    // Botón Copiar texto actual
    if (copyTextBtn) {
        copyTextBtn.addEventListener('click', async () => {
            const text = textInput.value.trim();
            if (!text) {
                showToast('⚠️ No hay texto para copiar');
                return;
            }
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    showToast('✅ Texto copiado al portapapeles');
                } else {
                    textInput.select();
                    document.execCommand('copy');
                    showToast('✅ Texto copiado');
                }
            } catch (e) {
                showToast('Selecciona y copia con Ctrl+C');
            }
        });
    }

    // Botón Borrar texto
    clearTextBtn.addEventListener('click', () => {
        textInput.value = '';
        updateTextStats();
        textInput.focus();
    });

    // Ejemplos Rápidos con Emojis
    sampleTags.forEach(tag => {
        tag.addEventListener('click', () => {
            textInput.value = tag.getAttribute('data-text');
            updateTextStats();
            textInput.focus();
        });
    });

    // Pequeño Toast de notificación
    function showToast(msg) {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = '#020402';
            toast.style.border = '2px solid #00ff66';
            toast.style.color = '#00ff66';
            toast.style.padding = '8px 18px';
            toast.style.borderRadius = '20px';
            toast.style.fontFamily = "'Patrick Hand', cursive";
            toast.style.fontSize = '1.1rem';
            toast.style.boxShadow = '0 0 15px rgba(0, 255, 102, 0.4)';
            toast.style.zIndex = '9999';
            toast.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 2200);
    }

    // =========================================================
    // 2. Control de Tono y Velocidad (Sliders)
    // =========================================================
    rateSlider.addEventListener('input', () => {
        const val = parseInt(rateSlider.value, 10);
        if (val === 0) rateValue.textContent = 'Normal (0%)';
        else rateValue.textContent = `${val > 0 ? '+' : ''}${val}%`;
    });

    pitchSlider.addEventListener('input', () => {
        const val = parseInt(pitchSlider.value, 10);
        if (val === 0) pitchValue.textContent = 'Natural (0Hz)';
        else pitchValue.textContent = `${val > 0 ? '+' : ''}${val}Hz`;
    });

    // =========================================================
    // 3. Selección de Voces: Femenina 👩 y Masculina 👨
    // =========================================================
    function setGender(gender) {
        currentGender = gender;
        if (gender === 'Female') {
            genderCardFemale.classList.add('active');
            genderCardMale.classList.remove('active');
            genderCardFemale.querySelector('.gender-badge').textContent = '⭐ Activa';
            genderCardMale.querySelector('.gender-badge').textContent = '⭐ Seleccionar';
            selectedVoiceId = selectedFemaleVoiceId;
        } else {
            genderCardMale.classList.add('active');
            genderCardFemale.classList.remove('active');
            genderCardMale.querySelector('.gender-badge').textContent = '⭐ Activa';
            genderCardFemale.querySelector('.gender-badge').textContent = '⭐ Seleccionar';
            selectedVoiceId = selectedMaleVoiceId;
        }
        renderVoicesGrid();
    }

    genderCardFemale.addEventListener('click', () => setGender('Female'));
    genderCardMale.addEventListener('click', () => setGender('Male'));

    countrySelect.addEventListener('change', () => {
        currentCountry = countrySelect.value;
        
        // Si el usuario cambia el país, actualizamos las voces favoritas de ese país
        const sourceList = curatedVoices.length ? curatedVoices : allVoices;
        if (currentCountry !== 'ALL') {
            const fem = sourceList.find(v => v.gender === 'Female' && v.country_code === currentCountry);
            if (fem) {
                selectedFemaleVoiceId = fem.id;
                activeFemaleLabel.textContent = `${fem.name} (${fem.country} ${fem.flag || ''})`;
            }
            const mas = sourceList.find(v => v.gender === 'Male' && v.country_code === currentCountry);
            if (mas) {
                selectedMaleVoiceId = mas.id;
                activeMaleLabel.textContent = `${mas.name} (${mas.country} ${mas.flag || ''})`;
            }
        }
        selectedVoiceId = (currentGender === 'Female') ? selectedFemaleVoiceId : selectedMaleVoiceId;
        renderVoicesGrid();
    });

    // Cargar Catálogo de Voces desde el Backend
    async function loadVoices() {
        try {
            const res = await fetch('/api/voices');
            const data = await res.json();
            if (data.success) {
                curatedVoices = data.curated || [];
                allVoices = data.all || [];
                
                // Inicializar etiquetas
                const initFem = curatedVoices.find(v => v.id === selectedFemaleVoiceId);
                if (initFem) {
                    activeFemaleLabel.textContent = `${initFem.name} (${initFem.country} ${initFem.flag || ''})`;
                }
                const initMas = curatedVoices.find(v => v.id === selectedMaleVoiceId);
                if (initMas) {
                    activeMaleLabel.textContent = `${initMas.name} (${initMas.country} ${initMas.flag || ''})`;
                }

                renderVoicesGrid();
            } else {
                voicesGrid.innerHTML = '<div class="loading-voices">No se pudieron cargar las voces.</div>';
            }
        } catch (e) {
            console.error('Error cargando voces:', e);
            voicesGrid.innerHTML = '<div class="loading-voices">Error de conexión al cargar voces.</div>';
        }
    }

    function renderVoicesGrid() {
        voicesGrid.innerHTML = '';
        const sourceList = curatedVoices.length ? curatedVoices : allVoices;

        // Filtrar por género activo y país seleccionado
        let filtered = sourceList.filter(v => {
            const matchesGender = (v.gender === currentGender);
            const matchesCountry = (currentCountry === 'ALL') || (v.country_code === currentCountry);
            return matchesGender && matchesCountry;
        });

        // Fallback: Si no hay voz para ese país en este género, mostrar todas las del género
        if (filtered.length === 0) {
            filtered = sourceList.filter(v => v.gender === currentGender);
        }

        if (filtered.length === 0) {
            voicesGrid.innerHTML = '<div class="loading-voices">No se encontraron voces disponibles.</div>';
            return;
        }

        // Si la voz actual no está en la lista visible, autoseleccionar la primera recomendada
        const exists = filtered.some(v => v.id === selectedVoiceId);
        if (!exists && filtered.length > 0) {
            const rec = filtered.find(v => v.recommended) || filtered[0];
            selectedVoiceId = rec.id;
            if (currentGender === 'Female') {
                selectedFemaleVoiceId = rec.id;
                activeFemaleLabel.textContent = `${rec.name} (${rec.country || ''} ${rec.flag || ''})`;
            } else {
                selectedMaleVoiceId = rec.id;
                activeMaleLabel.textContent = `${rec.name} (${rec.country || ''} ${rec.flag || ''})`;
            }
        }

        filtered.forEach(voice => {
            const card = document.createElement('div');
            card.className = `voice-card ${voice.id === selectedVoiceId ? 'selected' : ''}`;
            card.dataset.id = voice.id;

            if (voice.recommended) {
                const badge = document.createElement('span');
                badge.className = 'voice-badge-recommended';
                badge.textContent = '⭐ Recomendada';
                card.appendChild(badge);
            }

            card.innerHTML += `
                <div class="voice-card-header">
                    <span class="voice-name">${voice.gender === 'Female' ? '👩' : '👨'} ${voice.name}</span>
                    <span class="voice-tag-flag">${voice.flag || '🌐'}</span>
                </div>
                <span class="voice-card-desc">${voice.country || voice.locale}</span>
                <span class="voice-meta-badge">${voice.sample_tag || (voice.gender === 'Female' ? 'Voz Femenina' : 'Voz Masculina')}</span>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedVoiceId = voice.id;

                if (voice.gender === 'Female') {
                    selectedFemaleVoiceId = voice.id;
                    activeFemaleLabel.textContent = `${voice.name} (${voice.country || ''} ${voice.flag || ''})`;
                } else {
                    selectedMaleVoiceId = voice.id;
                    activeMaleLabel.textContent = `${voice.name} (${voice.country || ''} ${voice.flag || ''})`;
                }
            });

            voicesGrid.appendChild(card);
        });
    }

    // =========================================================
    // 4. Síntesis de Texto a Audio MP3 (Backend API)
    // =========================================================
    synthesizeBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('⚠️ Por favor escribe o pega un texto para convertir en voz MP3.');
            textInput.focus();
            return;
        }

        // Modulación de parámetros
        const rateVal = parseInt(rateSlider.value, 10);
        const pitchVal = parseInt(pitchSlider.value, 10);
        const rateStr = `${rateVal >= 0 ? '+' : ''}${rateVal}%`;
        const pitchStr = `${pitchVal >= 0 ? '+' : ''}${pitchVal}Hz`;

        // Mostrar pantalla de carga
        loadingStatusText.textContent = 'Generando ondas neurales y codificando audio en formato MP3...';
        loadingModal.classList.remove('hidden');

        try {
            const response = await fetch('/api/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: selectedVoiceId,
                    rate: rateStr,
                    pitch: pitchStr,
                    create_video: false
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error desconocido al generar audio.');
            }

            // Actualizar vista del reproductor con el audio generado
            currentAudioId = data.id;
            loadGeneratedAudio(data, text);

        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            loadingModal.classList.add('hidden');
        }
    });

    // =========================================================
    // 5. Cargar y Reproducir Audio MP3 Generado
    // =========================================================
    function loadGeneratedAudio(data, originalText) {
        emptyState.classList.add('hidden');
        playerContainer.classList.remove('hidden');

        // Garantizar desplazamiento suave al reproductor sin desbordamiento
        try {
            playerContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}

        // Configurar streaming en audio MP3
        audioElement.src = data.audio_url;
        audioElement.load();

        // Configurar BOTÓN PRINCIPAL: Descarga en formato MP3
        downloadMp3Btn.href = data.download_mp3_url;
        downloadMp3Btn.setAttribute('download', data.filename_mp3 || `vozverde_${data.id}.mp3`);
        mp3SizeLabel.textContent = `Tamaño: ${data.file_size_mp3 || data.file_size} • Audio MP3 Neural de Alta Fidelidad 🎵`;

        // Configurar opciones complementarias (MP4)
        if (data.has_mp4 && data.download_mp4_url) {
            downloadMp4Btn.href = data.download_mp4_url;
            downloadMp4Btn.setAttribute('download', data.filename_mp4 || `vozverde_${data.id}.mp4`);
            downloadMp4Btn.style.display = 'flex';
        } else {
            downloadMp4Btn.style.display = 'none';
        }

        // Ficha del audio que se está reproduciendo
        const voiceObj = curatedVoices.find(v => v.id === data.voice) || {
            name: data.voice_name || 'Voz',
            gender_label: data.voice_gender || 'Neural',
            flag: data.voice_flag || '🎙️'
        };
        const genderEmoji = voiceObj.gender === 'Female' ? '👩' : '👨';
        nowPlayingVoiceBadge.textContent = `${genderEmoji} Voz: ${voiceObj.name} (${voiceObj.gender_label || 'Neural'} ${voiceObj.flag || ''})`;
        nowPlayingSnippet.textContent = `"${data.text_preview}"`;
        visualizerVoiceTag.textContent = `Voz: ${voiceObj.name} (${voiceObj.gender_label})`;
        playerStatusText.textContent = '🟢 REPRODUCIENDO AUDIO MP3';

        // Manejo bajo demanda de Video MP4 con oscilograma
        downloadVideoBtn.onclick = async () => {
            loadingStatusText.textContent = 'Creando video MP4 con oscilograma verde neón en 720p...';
            loadingModal.classList.remove('hidden');
            try {
                const vidRes = await fetch(`/api/generate-video/${data.id}`, { method: 'POST' });
                const vidData = await vidRes.json();
                if (vidData.success) {
                    const tempA = document.createElement('a');
                    tempA.href = vidData.download_video_url;
                    tempA.download = vidData.filename;
                    document.body.appendChild(tempA);
                    tempA.click();
                    tempA.remove();
                } else {
                    alert('Error generando video: ' + vidData.error);
                }
            } catch (ve) {
                alert('Error al procesar el video: ' + ve);
            } finally {
                loadingModal.classList.add('hidden');
            }
        };

        // Guardar en el historial local
        addToHistory({
            id: data.id,
            text: originalText,
            voiceName: voiceObj.name,
            voiceGender: voiceObj.gender_label || 'Voz',
            voiceFlag: voiceObj.flag || '🎙️',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            audioUrl: data.audio_url,
            downloadMp3Url: data.download_mp3_url,
            filenameMp3: data.filename_mp3 || `vozverde_${data.id}.mp3`,
            fileSize: data.file_size_mp3 || data.file_size
        });

        // Reproducir automáticamente el audio recién generado
        audioElement.play().then(() => {
            playIcon.textContent = '⏸';
            playerStatusText.textContent = '🟢 REPRODUCIENDO AUDIO MP3';
        }).catch(() => {
            playIcon.textContent = '▶';
            playerStatusText.textContent = '⏸️ LISTO PARA REPRODUCIR';
        });
    }

    // =========================================================
    // 6. Controles del Reproductor: Adelantar, Atrasar, Play, Scrubber
    // =========================================================
    playPauseBtn.addEventListener('click', () => {
        if (audioElement.paused) {
            audioElement.play();
            playIcon.textContent = '⏸';
            playerStatusText.textContent = '🟢 REPRODUCIENDO AUDIO MP3';
        } else {
            audioElement.pause();
            playIcon.textContent = '▶';
            playerStatusText.textContent = '⏸️ AUDIO EN PAUSA';
        }
    });

    audioElement.addEventListener('play', () => {
        playIcon.textContent = '⏸';
        playerStatusText.textContent = '🟢 REPRODUCIENDO AUDIO MP3';
    });

    audioElement.addEventListener('pause', () => {
        playIcon.textContent = '▶';
        playerStatusText.textContent = '⏸️ AUDIO EN PAUSA';
    });

    audioElement.addEventListener('ended', () => {
        playIcon.textContent = '▶';
        playerStatusText.textContent = '✅ REPRODUCCIÓN COMPLETADA';
        progressBarFill.style.width = '0%';
        progressHandle.style.left = '0%';
    });

    // ATRASAR AUDIO 5 SEGUNDOS
    rewindBtn.addEventListener('click', () => {
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
        showToast('⏪ -5s');
    });

    // ADELANTAR AUDIO 5 SEGUNDOS
    forwardBtn.addEventListener('click', () => {
        audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5);
        showToast('⏩ +5s');
    });

    // REINICIAR AUDIO AL INICIO (0s)
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            audioElement.currentTime = 0;
            audioElement.play();
            showToast('🔄 Reiniciado');
        });
    }

    // Formatear segundos en MM:SS
    function formatTime(secs) {
        if (isNaN(secs) || secs < 0) return '00:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // Actualización de la línea de tiempo (Simple y sin desbordamiento)
    audioElement.addEventListener('timeupdate', () => {
        if (audioElement.duration && !isNaN(audioElement.duration)) {
            const percent = Math.min(100, Math.max(0, (audioElement.currentTime / audioElement.duration) * 100));
            progressBarFill.style.width = `${percent}%`;
            progressHandle.style.left = `${percent}%`;
            currentTimeEl.textContent = formatTime(audioElement.currentTime);
            durationTimeEl.textContent = formatTime(audioElement.duration);
        }
    });

    audioElement.addEventListener('loadedmetadata', () => {
        durationTimeEl.textContent = formatTime(audioElement.duration);
    });

    // Salto interactivo al hacer clic en la barra de progreso
    progressBarBg.addEventListener('click', (e) => {
        const rect = progressBarBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (width > 0 && audioElement.duration) {
            const ratio = Math.max(0, Math.min(1, clickX / width));
            audioElement.currentTime = ratio * audioElement.duration;
        }
    });

    // Control de volumen e icono dinámico
    volumeSlider.addEventListener('input', () => {
        const vol = parseFloat(volumeSlider.value);
        audioElement.volume = vol;
        if (vol === 0) volumeIcon.textContent = '🔇';
        else if (vol < 0.4) volumeIcon.textContent = '🔈';
        else if (vol < 0.8) volumeIcon.textContent = '🔉';
        else volumeIcon.textContent = '🔊';
    });

    // Velocidades de reproducción
    speedPills.forEach(pill => {
        pill.addEventListener('click', () => {
            speedPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const speed = parseFloat(pill.getAttribute('data-speed'));
            audioElement.playbackRate = speed;
        });
    });

    // =========================================================
    // 7. Historial de Sesión Local
    // =========================================================
    function addToHistory(item) {
        history.unshift(item);
        if (history.length > 15) history.pop();
        localStorage.setItem('vozverde_mp3_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<p class="history-empty">No hay audios en esta sesión aún.</p>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="history-info">
                    <p class="history-snippet">"${item.text}"</p>
                    <span class="history-meta">${item.voiceName} (${item.voiceGender}) • ${item.time} • ${item.fileSize || 'MP3'}</span>
                </div>
                <div class="history-actions">
                    <button class="btn-history-action play-hist-btn" type="button" title="Reproducir MP3">▶ Escuchar</button>
                    <a href="${item.downloadMp3Url}" download="${item.filenameMp3}" class="btn-history-action" title="Descargar MP3">📥 MP3</a>
                </div>
            `;

            el.querySelector('.play-hist-btn').addEventListener('click', () => {
                audioElement.src = item.audioUrl;
                downloadMp3Btn.href = item.downloadMp3Url;
                downloadMp3Btn.setAttribute('download', item.filenameMp3);
                mp3SizeLabel.textContent = `Tamaño: ${item.fileSize || 'MP3'} • Audio MP3 Neural`;
                nowPlayingVoiceBadge.textContent = `🎙️ Voz: ${item.voiceName} (${item.voiceGender})`;
                nowPlayingSnippet.textContent = `"${item.text}"`;
                visualizerVoiceTag.textContent = `Voz: ${item.voiceName} (${item.voiceGender})`;
                
                emptyState.classList.add('hidden');
                playerContainer.classList.remove('hidden');
                audioElement.play();
                playIcon.textContent = '⏸';
                playerStatusText.textContent = '🟢 REPRODUCIENDO AUDIO MP3';
            });

            historyList.appendChild(el);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.removeItem('vozverde_mp3_history');
        renderHistory();
    });

    // =========================================================
    // Inicialización al cargar la página
    // =========================================================
    loadVoices();
    renderHistory();
    updateTextStats();
});
