/**
 * VozVerde - Visualizador Canvas de Ondas de Audio
 * Efecto osciloscopio en verde neón sobre fondo negro (#00ff66)
 */

class AudioWaveformVisualizer {
    constructor(canvasId, audioElement) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audio = audioElement;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;
        this.isPlaying = false;
        this.phase = 0;

        this.initResize();
        this.bindEvents();
        this.drawIdleState();
    }

    initResize() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio || 600;
            this.canvas.height = (rect.height || 140) * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        window.addEventListener('resize', resize);
        setTimeout(resize, 50);
    }

    bindEvents() {
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.setupAudioContext();
            this.animate();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
        });

        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
        });
    }

    setupAudioContext() {
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            return;
        }

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioCtx();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        } catch (e) {
            console.warn("Web Audio API no pudo conectarse directamente; usando modo de simulación reactiva:", e);
        }
    }

    animate() {
        if (!this.isPlaying) {
            this.drawIdleState();
            return;
        }

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const ctx = this.ctx;

        // Limpieza con rastro tenue (fondo negro)
        ctx.fillStyle = '#020502';
        ctx.fillRect(0, 0, width, height);

        // Cuadrícula de fondo verde tenue
        this.drawSubtleGrid(ctx, width, height);

        if (this.analyser && this.dataArray) {
            this.analyser.getByteTimeDomainData(this.dataArray);

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#00ff66';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00ff66';

            ctx.beginPath();
            const sliceWidth = width / this.dataArray.length;
            let x = 0;

            for (let i = 0; i < this.dataArray.length; i++) {
                const v = this.dataArray[i] / 128.0;
                const y = (v * height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }

            ctx.lineTo(width, height / 2);
            ctx.stroke();

            // Dibujar barras ecualizadoras de apoyo
            this.drawFrequencyBars(ctx, width, height);
        } else {
            // Animación sintética fluida
            this.drawSyntheticWave(ctx, width, height);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawFrequencyBars(ctx, width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);

        const barCount = 32;
        const barWidth = (width / barCount) - 3;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00ff66';

        for (let i = 0; i < barCount; i++) {
            const val = freqData[i * 2] || 0;
            const barHeight = (val / 255) * (height * 0.45);
            const x = i * (barWidth + 3);
            const y = height - barHeight;

            const grad = ctx.createLinearGradient(x, y, x, height);
            grad.addColorStop(0, '#00ff66');
            grad.addColorStop(1, 'rgba(0, 255, 102, 0.05)');

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }

    drawSyntheticWave(ctx, width, height) {
        this.phase += 0.08;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00ff66';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#00ff66';

        ctx.beginPath();
        const midY = height / 2;
        for (let x = 0; x < width; x += 3) {
            const wave1 = Math.sin((x * 0.03) + this.phase) * 22;
            const wave2 = Math.cos((x * 0.05) - this.phase * 0.7) * 12;
            const y = midY + wave1 + wave2;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    drawIdleState() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const ctx = this.ctx;

        ctx.fillStyle = '#020502';
        ctx.fillRect(0, 0, width, height);

        this.drawSubtleGrid(ctx, width, height);

        // Línea central en reposo
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00ff66';

        ctx.beginPath();
        const midY = height / 2;
        for (let x = 0; x < width; x += 4) {
            const wave = Math.sin(x * 0.02) * 4;
            const y = midY + wave;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    drawSubtleGrid(ctx, width, height) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.05)';
        ctx.lineWidth = 1;
        const step = 20;

        for (let x = 0; x < width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y < height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

window.AudioWaveformVisualizer = AudioWaveformVisualizer;
