// 像素钓鱼游戏 - 优化版 v4.1.0
// Pixel Fishing Game

// ==================== 音频系统 ====================
const AudioSystem = {
    ctx: null,
    bgmOscillators: [],
    isMuted: false,
    bgmEnabled: true,
    sfxEnabled: true,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
    },

    playTone(frequency, duration, type = 'square', volume = 0.1) {
        if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playArpeggio(notes, duration = 0.1) {
        if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, duration, 'square', 0.1), i * 50);
        });
    },

    sfx: {
        cast: () => AudioSystem.playTone(400, 0.3, 'sine', 0.15),
        bite: () => {
            AudioSystem.playTone(800, 0.1, 'square', 0.25);
            setTimeout(() => AudioSystem.playTone(1000, 0.1, 'square', 0.25), 100);
            setTimeout(() => AudioSystem.playTone(800, 0.1, 'square', 0.25), 200);
        },
        success: () => AudioSystem.playArpeggio([523.25, 659.25, 783.99, 1046.50], 0.15),
        fail: () => AudioSystem.playTone(200, 0.5, 'sawtooth', 0.1),
        step: () => AudioSystem.playTone(100, 0.05, 'triangle', 0.05),
        levelUp: () => {
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            notes.forEach((freq, i) => {
                setTimeout(() => AudioSystem.playTone(freq, 0.2, 'square', 0.15), i * 100);
            });
        },
        coin: () => AudioSystem.playArpeggio([880, 1100, 1320], 0.1),
        openMenu: () => AudioSystem.playTone(440, 0.1, 'sine', 0.1),
        closeMenu: () => AudioSystem.playTone(330, 0.1, 'sine', 0.1),
        buy: () => AudioSystem.playArpeggio([660, 880, 1100], 0.1),
        sell: () => AudioSystem.playArpeggio([1100, 880, 660], 0.1),
        horn: () => {
            AudioSystem.playTone(220, 0.5, 'sawtooth', 0.15);
            setTimeout(() => AudioSystem.playTone(220, 0.5, 'sawtooth', 0.15), 600);
        },
        splash: () => {
            AudioSystem.playTone(300, 0.15, 'sine', 0.1);
            setTimeout(() => AudioSystem.playTone(200, 0.1, 'sine', 0.08), 50);
        },
        wave: () => {
            // 海浪音效 - 使用白噪声模拟波浪
            if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
            const bufferSize = this.ctx.sampleRate * 0.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sin(i / bufferSize * Math.PI);
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 500;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            source.start();
        }
    },

    // 海浪音效系统
    waveSound: {
        active: false,
        interval: null,
        isNearSea: false,

        start() {
            if (this.active) return;
            this.active = true;
            this.playWaveLoop();
        },

        stop() {
            this.active = false;
            if (this.interval) {
                clearTimeout(this.interval);
                this.interval = null;
            }
        },

        playWaveLoop() {
            if (!this.active || !AudioSystem.bgmEnabled || AudioSystem.isMuted) return;

            if (this.isNearSea) {
                AudioSystem.sfx.wave();
            }

            // 波浪间隔 3-6秒
            const nextWave = 3000 + Math.random() * 3000;
            this.interval = setTimeout(() => this.playWaveLoop(), nextWave);
        },

        update(nearSea) {
            this.isNearSea = nearSea;
        }
    },

    startBGM() {
        if (!this.ctx || this.isMuted || !this.bgmEnabled) return;
        this.stopBGM();

        // 创建一个简单的钢琴曲风格BGM
        // 使用C大调柔和旋律
        const melody = [
            523.25, 587.33, 659.25, 523.25,  // C5 D5 E5 C5
            523.25, 493.88, 440.00, 392.00,  // C5 B4 A4 G4
            440.00, 493.88, 523.25, 493.88,  // A4 B4 C5 B4
            523.25, 659.25, 783.99, 659.25,  // C5 E5 G5 E5
        ];

        // 伴奏和弦 - C-G-Am-F 进行
        const chords = [
            [261.63, 329.63, 392.00],  // C
            [246.94, 293.63, 370.00],  // B dim -> 用G代替
            [220.00, 261.63, 329.63],  // Am
            [174.61, 220.00, 261.63],  // F
        ];

        let noteIndex = 0;
        let chordIndex = 0;
        let noteInChord = 0;

        // 创建基础伴奏
        const createChord = (freqs, volume, duration) => {
            freqs.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.1);
                gain.gain.linearRampToValueAtTime(volume * 0.7, this.ctx.currentTime + duration * 0.5);
                gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
                this.bgmOscillators.push(osc);
            });
        };

        const playNote = () => {
            if (!this.bgmEnabled || this.isMuted) return;

            const freq = melody[noteIndex];

            // 播放主旋律
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // 柔和的包络
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.03, this.ctx.currentTime + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 1.2);
            this.bgmOscillators.push(osc);

            // 每4个音符换一次和弦
            noteInChord++;
            if (noteInChord >= 4) {
                noteInChord = 0;
                chordIndex = (chordIndex + 1) % chords.length;
                createChord(chords[chordIndex], 0.012, 2.0);
            }

            noteIndex = (noteIndex + 1) % melody.length;

            // 根据时间段调整速度
            const scene = getCurrentScene();
            let tempo = 500;
            if (scene.hasStars) tempo = 700;  // 夜晚更慢更轻柔
            if (scene.hasSun) tempo = 450;   // 白天稍快

            setTimeout(() => { if (this.bgmEnabled && !this.isMuted) playNote(); }, tempo);
        };

        // 初始和弦
        createChord(chords[0], 0.015, 2.0);
        playNote();
    },

    stopBGM() {
        this.bgmOscillators.forEach(osc => { try { osc.stop(); } catch (e) {} });
        this.bgmOscillators = [];
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) this.stopBGM(); else if (this.bgmEnabled) this.startBGM();
        return this.isMuted;
    },
    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        if (!this.bgmEnabled) this.stopBGM(); else if (!this.isMuted) this.startBGM();
        return this.bgmEnabled;
    },
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }
};

// ==================== 粒子系统 ====================
class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
        this.life = 60; this.maxLife = 60;
        this.size = 3; this.color = '#FFD700';
        this.gravity = 0.1; this.active = false;
    }
}

class ParticleSystem {
    constructor(poolSize = 200) {
        this.pool = [];
        this.active = [];
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(new Particle());
        }
    }

    emit(x, y, config) {
        const count = config.count || 10;
        for (let i = 0; i < count; i++) {
            const p = this.pool.pop();
            if (!p) continue;
            p.x = x; p.y = y;
            p.vx = (Math.random() - 0.5) * (config.spread || 5);
            p.vy = (Math.random() - 0.5) * (config.spread || 5) - (config.upward || 2);
            p.life = config.life || 60;
            p.maxLife = p.life;
            p.size = config.size || 3;
            p.color = config.colors ? config.colors[Math.floor(Math.random() * config.colors.length)] : '#FFD700';
            p.gravity = config.gravity !== undefined ? config.gravity : 0.1;
            p.active = true;
            this.active.push(p);
        }
    }

    update() {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const p = this.active[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life--;
            if (p.life <= 0) {
                p.reset();
                p.active = false;
                this.pool.push(this.active.splice(i, 1)[0]);
            }
        }
    }

    draw(ctx, camera) {
        for (const p of this.active) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(
                Math.floor(p.x - camera.x - p.size * 0.5),
                Math.floor(p.y - camera.y - p.size * 0.5),
                Math.ceil(p.size * alpha),
                Math.ceil(p.size * alpha)
            );
        }
        ctx.globalAlpha = 1;
    }
}

const particles = new ParticleSystem(300);

// ==================== 游戏配置 ====================
const GAME_CONFIG = {
    width: 800,
    height: 600,
    tileSize: 32,
    playerSpeed: 3,
    mapWidth: 60,
    mapHeight: 40,
    fishTypes: [
        // 淡水鱼
        { id: 'carp', name: '鲤鱼', rarity: 'common', color: '#FFA500', value: 10, chance: 0.18, icon: '🐟', difficulty: 1, zones: ['pond', 'river'], times: ['dawn', 'day', 'dusk'], bait: 'any' },
        { id: 'bass', name: '鲈鱼', rarity: 'common', color: '#90EE90', value: 15, chance: 0.15, icon: '🐠', difficulty: 1, zones: ['pond', 'river'], times: ['day', 'dusk'], bait: 'any' },
        { id: 'crucian', name: '鲫鱼', rarity: 'common', color: '#CD853F', value: 12, chance: 0.14, icon: '🐟', difficulty: 1, zones: ['pond'], times: ['dawn', 'day'], bait: 'any' },
        { id: 'grass_carp', name: '草鱼', rarity: 'common', color: '#556B2F', value: 18, chance: 0.10, icon: '🐠', difficulty: 2, zones: ['pond', 'river'], times: ['day', 'dusk'], bait: 'any' },
        { id: 'trout', name: '鳟鱼', rarity: 'uncommon', color: '#FF6347', value: 35, chance: 0.07, icon: '🐡', difficulty: 2, zones: ['river'], times: ['dawn', 'night'], bait: 'any' },
        { id: 'salmon', name: '鲑鱼', rarity: 'uncommon', color: '#FA8072', value: 55, chance: 0.05, icon: '🦈', difficulty: 3, zones: ['river'], times: ['day'], bait: 'any' },
        { id: 'perch', name: '河鲈', rarity: 'uncommon', color: '#20B2AA', value: 45, chance: 0.05, icon: '🐟', difficulty: 3, zones: ['river'], times: ['dusk', 'night'], bait: 'any' },
        { id: 'golden', name: '金鱼', rarity: 'rare', color: '#FFD700', value: 120, chance: 0.02, icon: '🐡', difficulty: 4, zones: ['deep'], times: ['day', 'night'], bait: 'special' },
        { id: 'arowana', name: '龙鱼', rarity: 'rare', color: '#C0C0C0', value: 180, chance: 0.012, icon: '🐠', difficulty: 5, zones: ['deep'], times: ['dawn', 'midnight'], bait: 'special' },
        { id: 'koi', name: '锦鲤', rarity: 'rare', color: '#FF69B4', value: 150, chance: 0.015, icon: '🐟', difficulty: 4, zones: ['pond'], times: ['dawn', 'day', 'dusk', 'night', 'midnight'], bait: 'any' },
        { id: 'legendary', name: '传说鱼', rarity: 'legendary', color: '#FF00FF', value: 600, chance: 0.006, icon: '🐉', difficulty: 6, zones: ['deep'], times: ['midnight'], bait: 'legend' },
        { id: 'ghost', name: '幽灵鱼', rarity: 'legendary', color: '#87CEEB', value: 800, chance: 0.004, icon: '👻', difficulty: 6, zones: ['deep'], times: ['night', 'midnight'], bait: 'legend' },
        // 海鱼
        { id: 'tuna', name: '金枪鱼', rarity: 'common', color: '#4169E1', value: 30, chance: 0.15, icon: '🐟', difficulty: 2, zones: ['sea'], times: ['dawn', 'day', 'dusk'], bait: 'sea' },
        { id: 'shark', name: '鲨鱼', rarity: 'uncommon', color: '#708090', value: 80, chance: 0.08, icon: '🦈', difficulty: 4, zones: ['sea'], times: ['day', 'dusk', 'night'], bait: 'sea' },
        { id: 'whale', name: '鲸鱼', rarity: 'rare', color: '#4682B4', value: 200, chance: 0.02, icon: '🐋', difficulty: 5, zones: ['sea'], times: ['dawn', 'night'], bait: 'sea' },
        { id: 'sea_horse', name: '海马', rarity: 'rare', color: '#FFD700', value: 180, chance: 0.015, icon: '🐴', difficulty: 4, zones: ['sea'], times: ['day', 'night'], bait: 'sea' },
        { id: 'mermaid', name: '美人鱼', rarity: 'legendary', color: '#FF69B4', value: 1000, chance: 0.003, icon: '🧜', difficulty: 6, zones: ['sea'], times: ['midnight'], bait: 'legend' }
    ],
    timeSystem: {
        phases: ['dawn', 'day', 'dusk', 'night', 'midnight'],
        currentPhase: 'dawn',
        phaseDuration: 60000,
        updateInterval: 5000
    }
};

// 时间场景效果配置 - 完整的氛围变化
const TIME_SCENES = {
    dawn: {
        name: '黎明',
        // 天空
        skyGradient: ['#1a1a2e', '#4a3f6b', '#d4a373', '#ffb347'],
        // 草地颜色
        grassColor1: '#5a7a3a',
        grassColor2: '#4a6a2a',
        // 水面
        waterColor: '#3d5a7a',
        waterHighlight: '#ffb347',
        waterShimmer: 'rgba(255, 180, 100, 0.3)',
        // 沙滩
        sandColor: '#d4b896',
        // 环境光
        ambientLight: 'rgba(255, 180, 100, 0.2)',
        // 星星
        hasStars: true,
        starColor: '#FFFFFF',
        starAlpha: 0.3,
        // 太阳
        hasSun: true,
        sunColor: '#FFB347',
        sunAlpha: 0.4,
        // 月亮
        hasMoon: false,
        // 云朵
        hasClouds: true,
        cloudColor: 'rgba(200, 150, 180, 0.5)',
        // 雾效
        fogColor: 'rgba(255, 200, 150, 0.1)',
        fogDensity: 0.3
    },
    day: {
        name: '白天',
        skyGradient: ['#87CEEB', '#B0E0E6', '#E0F7FF'],
        grassColor1: '#5a9a3a',
        grassColor2: '#4a8a2a',
        waterColor: '#4169E1',
        waterHighlight: '#ADD8E6',
        waterShimmer: 'rgba(255, 255, 255, 0.4)',
        sandColor: '#f5deb3',
        ambientLight: 'rgba(255, 255, 200, 0.15)',
        hasStars: false,
        starColor: '#FFFFFF',
        starAlpha: 0,
        hasSun: true,
        sunColor: '#FFD700',
        sunAlpha: 0.6,
        hasMoon: false,
        hasClouds: true,
        cloudColor: 'rgba(255, 255, 255, 0.8)',
        fogColor: 'rgba(200, 230, 255, 0.1)',
        fogDensity: 0
    },
    dusk: {
        name: '黄昏',
        skyGradient: ['#1a1a3e', '#4a3f6b', '#ff6b6b', '#ffa07a'],
        grassColor1: '#4a6a2a',
        grassColor2: '#3a5a1a',
        waterColor: '#3d2a4a',
        waterHighlight: '#ff6b6b',
        waterShimmer: 'rgba(255, 150, 100, 0.3)',
        sandColor: '#c4a876',
        ambientLight: 'rgba(255, 120, 80, 0.25)',
        hasStars: true,
        starColor: '#FFFFFF',
        starAlpha: 0.5,
        hasSun: true,
        sunColor: '#FF6347',
        sunAlpha: 0.5,
        hasMoon: false,
        hasClouds: true,
        cloudColor: 'rgba(180, 100, 120, 0.6)',
        fogColor: 'rgba(255, 150, 100, 0.15)',
        fogDensity: 0.2
    },
    night: {
        name: '夜晚',
        skyGradient: ['#050510', '#0a0a1e', '#151530'],
        grassColor1: '#1a3a0a',
        grassColor2: '#0a2a05',
        waterColor: '#0a1535',
        waterHighlight: '#2a4a8b',
        waterShimmer: 'rgba(50, 80, 180, 0.25)',
        sandColor: '#6a5a48',
        ambientLight: 'rgba(30, 30, 80, 0.45)',
        hasStars: true,
        starColor: '#FFFFFF',
        starAlpha: 0.9,
        hasSun: false,
        sunColor: '#FFD700',
        sunAlpha: 0,
        hasMoon: true,
        moonColor: '#F0F0FF',
        moonAlpha: 0.8,
        hasClouds: true,
        cloudColor: 'rgba(30, 30, 60, 0.6)',
        fogColor: 'rgba(20, 20, 60, 0.35)',
        fogDensity: 0.5,
        // 路灯
        streetLamps: true,
        lampGlow: 'rgba(255, 200, 100, 0.6)'
    },
    midnight: {
        name: '午夜',
        skyGradient: ['#020208', '#050510', '#0a0a18'],
        grassColor1: '#0a1a05',
        grassColor2: '#051505',
        waterColor: '#050a15',
        waterHighlight: '#0a2040',
        waterShimmer: 'rgba(30, 50, 120, 0.3)',
        sandColor: '#4a3a28',
        ambientLight: 'rgba(20, 20, 60, 0.55)',
        hasStars: true,
        starColor: '#ADD8E6',
        starAlpha: 1,
        hasSun: false,
        sunColor: '#FFD700',
        sunAlpha: 0,
        hasMoon: true,
        moonColor: '#E0E0FF',
        moonAlpha: 0.6,
        hasClouds: false,
        cloudColor: 'rgba(10, 10, 40, 0.3)',
        fogColor: 'rgba(10, 10, 50, 0.45)',
        fogDensity: 0.7,
        // 路灯
        streetLamps: true,
        lampGlow: 'rgba(255, 180, 80, 0.5)'
    }
};

const DIFFICULTY_CONFIG = {
    1: { zoneBase: 85, speedBase: 2.5, speedVariance: 0.8 },
    2: { zoneBase: 75, speedBase: 3.5, speedVariance: 1.2 },
    3: { zoneBase: 65, speedBase: 4.5, speedVariance: 1.8 },
    4: { zoneBase: 55, speedBase: 5.5, speedVariance: 2.2 },
    5: { zoneBase: 48, speedBase: 6.5, speedVariance: 2.8 },
    6: { zoneBase: 40, speedBase: 8.0, speedVariance: 3.5 }
};

// ==================== 商店配置 ====================
const SHOP_ITEMS = {
    rods: [
        { id: 'rod_bamboo', name: '竹竿', price: 0, icon: '🎋', desc: '基础钓竿，新手必备', rarityBonus: 0, legendaryBonus: 0, zoneBonus: 0, progressBonus: 0, owned: true },
        { id: 'rod_iron', name: '铁竿', price: 100, icon: '🔧', desc: '坚固耐用，稀有鱼概率+10%', rarityBonus: 0.10, legendaryBonus: 0, zoneBonus: 8, progressBonus: 0.1, owned: false },
        { id: 'rod_gold', name: '金竿', price: 500, icon: '✨', desc: '闪耀金光，稀有+25%/传说+5%', rarityBonus: 0.25, legendaryBonus: 0.05, zoneBonus: 12, progressBonus: 0.15, owned: false },
        { id: 'rod_legend', name: '传说之竿', price: 2000, icon: '👑', desc: '传说神竿，稀有+50%/传说+15%', rarityBonus: 0.50, legendaryBonus: 0.15, zoneBonus: 20, progressBonus: 0.25, owned: false }
    ],
    baits: [
        { id: 'bait_worm', name: '蚯蚓', price: 5, icon: '🪱', desc: '基础鱼饵，通用', biteTimeBonus: 0, rarityBonus: 0, stackable: true, type: 'any' },
        { id: 'bait_bread', name: '面包虫', price: 15, icon: '🍞', desc: '普通鱼咬钩率+20%', biteTimeBonus: 0.2, rarityBonus: 0.05, stackable: true, type: 'any' },
        { id: 'bait_special', name: '特制鱼饵', price: 50, icon: '🪰', desc: '稀有鱼咬钩率+30%', biteTimeBonus: 0.3, rarityBonus: 0.15, stackable: true, type: 'special' },
        { id: 'bait_sea', name: '海藻鱼饵', price: 80, icon: '🌿', desc: '海鱼专用鱼饵', biteTimeBonus: 0.4, rarityBonus: 0.2, stackable: true, type: 'sea' },
        { id: 'bait_legend', name: '传说鱼饵', price: 200, icon: '💎', desc: '传说鱼咬钩率+50%', biteTimeBonus: 0.5, rarityBonus: 0.30, stackable: true, type: 'legend' }
    ],
    accessories: [
        { id: 'acc_none', name: '无饰品', price: 0, icon: '⭕', desc: '未装备饰品', luckBonus: 0, owned: true },
        { id: 'acc_lucky1', name: '幸运徽章', price: 150, icon: '🍀', desc: '增加5点幸运值', luckBonus: 5, owned: false },
        { id: 'acc_lucky2', name: '招财猫', price: 400, icon: '🐱', desc: '增加12点幸运值', luckBonus: 12, owned: false },
        { id: 'acc_lucky3', name: '黄金四叶草', price: 1200, icon: '🌟', desc: '增加25点幸运值', luckBonus: 25, owned: false },
        { id: 'acc_lucky4', name: '传说护符', price: 3000, icon: '🔮', desc: '增加50点幸运值', luckBonus: 50, owned: false }
    ]
};

// ==================== 钓鱼状态 ====================
const FISHING_STATE = {
    IDLE: 'idle',
    CASTING: 'casting',
    BITE_ALERT: 'biteAlert',
    MINIGAME: 'minigame'
};

// ==================== 存档系统 ====================
const SaveSystem = {
    saveKeyPrefix: 'fishing_game_save_',

    // 获取当前用户ID (简化版，实际可对接登录系统)
    getUserId() {
        let userId = localStorage.getItem('fishing_game_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
            localStorage.setItem('fishing_game_user_id', userId);
        }
        return userId;
    },

    // 获取存档槽位列表
    getSaveSlots() {
        const slots = [];
        for (let i = 0; i < 3; i++) {
            const key = this.saveKeyPrefix + this.getUserId() + '_slot' + i;
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    slots.push({ index: i, data: parsed });
                } catch (e) {
                    slots.push({ index: i, data: null });
                }
            } else {
                slots.push({ index: i, data: null });
            }
        }
        return slots;
    },

    // 保存游戏到指定槽位
    saveGame(slotIndex) {
        const saveData = {
            version: '1.0',
            timestamp: Date.now(),
            playTime: gameState.playTime || 0,
            player: {
                x: player.x,
                y: player.y,
                direction: player.direction,
                animationFrame: player.animationFrame
            },
            gameState: {
                money: gameState.money,
                level: gameState.level,
                exp: gameState.exp,
                inventory: gameState.inventory,
                equippedRod: gameState.equippedRod,
                equippedBait: gameState.equippedBait,
                baitCount: gameState.baitCount,
                equippedAccessory: gameState.equippedAccessory,
                isOnBoat: gameState.isOnBoat,
                lastCatchZone: gameState.lastCatchZone
            },
            boat: {
                x: gameState.boat.x,
                y: gameState.boat.y
            },
            fishCaught: gameState.fishCaught || {},
            achievements: gameState.achievements || {},
            quests: this.saveQuests()
        };

        const key = this.saveKeyPrefix + this.getUserId() + '_slot' + slotIndex;
        localStorage.setItem(key, JSON.stringify(saveData));
        showNotification(`💾 存档成功 (槽位${slotIndex + 1})`, 'success');
        return true;
    },

    // 加载游戏从指定槽位
    loadGame(slotIndex) {
        const key = this.saveKeyPrefix + this.getUserId() + '_slot' + slotIndex;
        const data = localStorage.getItem(key);
        if (!data) {
            showNotification('⚠️ 该槽位没有存档', 'warning');
            return false;
        }

        try {
            const saveData = JSON.parse(data);

            // 恢复玩家数据
            player.x = saveData.player.x;
            player.y = saveData.player.y;
            player.direction = saveData.player.direction;
            player.animationFrame = saveData.player.animationFrame;

            // 恢复游戏状态
            gameState.money = saveData.gameState.money;
            gameState.level = saveData.gameState.level;
            gameState.exp = saveData.gameState.exp;
            gameState.inventory = saveData.gameState.inventory;
            gameState.equippedRod = saveData.gameState.equippedRod;
            gameState.equippedBait = saveData.gameState.equippedBait;
            gameState.baitCount = saveData.gameState.baitCount;
            gameState.equippedAccessory = saveData.gameState.equippedAccessory;
            gameState.isOnBoat = saveData.gameState.isOnBoat;
            gameState.lastCatchZone = saveData.gameState.lastCatchZone;

            // 恢复船位置
            gameState.boat.x = saveData.boat.x;
            gameState.boat.y = saveData.boat.y;

            // 恢复钓鱼统计
            if (saveData.fishCaught) gameState.fishCaught = saveData.fishCaught;

            // 恢复成就
            if (saveData.achievements) gameState.achievements = saveData.achievements;

            // 恢复任务
            if (saveData.quests) this.loadQuests(saveData.quests);

            // 重置钓鱼状态
            gameState.fishingState = FISHING_STATE.IDLE;
            player.fishingRod.isCast = false;

            showNotification('📂 读档成功', 'success');
            updateHUD();
            return true;
        } catch (e) {
            showNotification('⚠️ 读档失败', 'error');
            return false;
        }
    },

    // 删除存档
    deleteSave(slotIndex) {
        const key = this.saveKeyPrefix + this.getUserId() + '_slot' + slotIndex;
        localStorage.removeItem(key);
        showNotification(`🗑️ 存档已删除 (槽位${slotIndex + 1})`, 'info');
    },

    // 保存任务进度
    saveQuests() {
        if (!QUEST_CONFIG || !QUEST_CONFIG.quests) return {};
        const questProgress = {};
        QUEST_CONFIG.quests.forEach(q => {
            questProgress[q.id] = { progress: q.progress, completed: q.completed, unlocked: q.unlocked };
        });
        return questProgress;
    },

    // 加载任务进度
    loadQuests(questProgress) {
        if (!QUEST_CONFIG || !QUEST_CONFIG.quests || !questProgress) return;
        QUEST_CONFIG.quests.forEach(q => {
            if (questProgress[q.id]) {
                q.progress = questProgress[q.id].progress;
                q.completed = questProgress[q.id].completed;
                q.unlocked = questProgress[q.id].unlocked;
            }
        });
    }
};

// ==================== 游戏状态 ====================
const gameState = {
    isPlaying: false,
    fishingState: FISHING_STATE.IDLE,
    inventory: [],
    money: 50,
    level: 1,
    exp: 0,
    keys: {},
    lastTime: 0,
    deltaTime: 0,
    notifications: [],
    equippedRod: 'rod_bamboo',
    equippedBait: null,
    baitCount: 0,
    equippedAccessory: 'acc_none',
    shopTab: 'buy',
    biteTimer: 0,
    biteAlertTimer: 0,
    biteAlertDuration: 2500,
    biteTimeout: null,
    biteAlertTimeout: null,
    castingWaitTime: 0,
    castingStartTime: 0,
    questPanelOpen: false,
    controlsHintOpen: false,
    equipmentPanelOpen: false,
    fishShadows: [],
    lastShadowSpawn: 0,
    waterMonsterShadow: null,
    cachedTime: 0,
    boat: { x: 0, y: 0 },
    isOnBoat: false,
    stars: [],
    clouds: [],
    lastCatchZone: null,
    fishCaught: {},
    achievements: {},
    playTime: 0
};

// ==================== 玩家对象 ====================
const player = {
    x: 400, y: 300,
    width: 24, height: 32,
    direction: 'down',
    isMoving: false,
    animationFrame: 0,
    fishingRod: { isCast: false, floatX: 0, floatY: 0, castAnimStart: 0 }
};

const camera = { x: 0, y: 0 };
const mapData = { width: 60, height: 40, tiles: [] };

// NPC列表 (城市街道上)
const npcs = [
    { x: 43 * 32 + 16, y: 10 * 32 + 16, name: '渔夫老张', dialog: '早安！今天天气不错，适合钓鱼。试试商店里的好装备吧！', avatar: '🧔', type: 'dialog', nightHide: true },
    { x: 43 * 32 + 16, y: 15 * 32 + 16, name: '小鱼贩', dialog: '欢迎光临！钓到好鱼可以卖给我，我也卖好装备！', avatar: '👨‍💼', type: 'shop', nightHide: true }
];

// 路灯位置 (城市街道)
const streetLamps = [
    // 纵向街道 (x=48) 上的路灯
    { x: 48 * 32 + 16, y: 5 * 32 + 16 },
    { x: 48 * 32 + 16, y: 10 * 32 + 16 },
    { x: 48 * 32 + 16, y: 15 * 32 + 16 },
    // 横向街道上的路灯
    { x: 42 * 32 + 16, y: 10 * 32 + 16 },
    { x: 45 * 32 + 16, y: 10 * 32 + 16 },
    { x: 42 * 32 + 16, y: 15 * 32 + 16 },
    { x: 45 * 32 + 16, y: 15 * 32 + 16 },
];

// 码头位置
const DOCK = { x: 22, y: 18, width: 2, height: 3 };

// ==================== 画布 ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ==================== 初始化地图 ====================
function initMap() {
    const W = GAME_CONFIG.mapWidth;
    const H = GAME_CONFIG.mapHeight;

    // 初始化所有为草地
    for (let y = 0; y < H; y++) {
        mapData.tiles[y] = [];
        for (let x = 0; x < W; x++) {
            mapData.tiles[y][x] = 0;
        }
    }

    // 城市区域 (右侧) - 40-60 x, 0-20 y
    for (let y = 0; y < 20; y++) {
        for (let x = 40; x < W; x++) {
            mapData.tiles[y][x] = 7;
        }
    }

    // 城市街道
    for (let x = 40; x < W; x++) {
        mapData.tiles[10][x] = 8;
        mapData.tiles[15][x] = 8;
    }
    for (let y = 0; y < 20; y++) {
        mapData.tiles[y][48] = 8;
    }

    // 多样化城市建筑
    const buildings = [
        { x: 41, y: 1, w: 6, h: 8, type: 'house' },
        { x: 49, y: 1, w: 4, h: 8, type: 'tower' },
        { x: 55, y: 1, w: 4, h: 6, type: 'shop' },
        { x: 41, y: 11, w: 6, h: 4, type: 'market' },
        { x: 49, y: 11, w: 8, h: 4, type: 'warehouse' },
        { x: 41, y: 16, w: 7, h: 4, type: 'house' },
        { x: 50, y: 16, w: 9, h: 4, type: 'barracks' }
    ];
    buildings.forEach(b => {
        for (let y = b.y; y < b.y + b.h; y++) {
            for (let x = b.x; x < b.x + b.w; x++) {
                if (y < H && x < W) mapData.tiles[y][x] = 9;
            }
        }
    });

    // 湖泊/池塘区域 (左侧) - 中心深水，边缘浅水
    const pondCenterX = 14;
    const pondCenterY = 22;
    const pondRadiusX = 14;
    const pondRadiusY = 12;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dx = (x - pondCenterX) / pondRadiusX;
            const dy = (y - pondCenterY) / pondRadiusY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1.0) {
                // 中心深水区 (dist < 0.4)，边缘浅水
                if (dist < 0.4) {
                    mapData.tiles[y][x] = 5; // 深水
                } else if (dist < 0.75) {
                    mapData.tiles[y][x] = 1; // 浅水
                } else if (dist < 1.0) {
                    mapData.tiles[y][x] = 3; // 沙滩
                }
            }
        }
    }

    // 海洋/大海 (右侧) - 扩大面积
    const seaCenterX = 50;
    const seaCenterY = 28;
    const seaRadiusX = 16;
    const seaRadiusY = 14;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dx = (x - seaCenterX) / seaRadiusX;
            const dy = (y - seaCenterY) / seaRadiusY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1.0) {
                if (dist < 0.85) {
                    mapData.tiles[y][x] = 10; // 海水
                } else {
                    mapData.tiles[y][x] = 3; // 沙滩/海滩
                }
            }
        }
    }

    // 码头 (湖泊右侧，连接陆地和水)
    DOCK.x = 22; DOCK.y = 18;
    for (let dy = 0; dy < DOCK.height; dy++) {
        for (let dx = 0; dx < DOCK.width; dx++) {
            const tx = DOCK.x + dx;
            const ty = DOCK.y + dy;
            if (tx < W && ty < H) mapData.tiles[ty][tx] = 6;
        }
    }

    // 树木装饰
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (mapData.tiles[y][x] === 0) {
                const nearCity = x > 38 && y < 22;
                const nearPond = x > 2 && x < 30 && y > 10 && y < 36;
                const nearSea = x > 36 && y > 12;
                if (!nearCity && !nearPond && !nearSea && Math.random() < 0.06) {
                    mapData.tiles[y][x] = 2;
                }
            }
        }
    }

    // 小船位置 - 码头旁边
    gameState.boat.x = (DOCK.x - 1) * GAME_CONFIG.tileSize;
    gameState.boat.y = (DOCK.y + 1) * GAME_CONFIG.tileSize;

    // 玩家出生位置 - 湖泊上方草地
    player.x = 10 * GAME_CONFIG.tileSize;
    player.y = 10 * GAME_CONFIG.tileSize;

    // 初始化星星
    initStars();
    // 初始化云朵
    initClouds();
}

function initStars() {
    gameState.stars = [];
    for (let i = 0; i < 80; i++) {
        gameState.stars.push({
            x: Math.random() * GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize,
            y: Math.random() * GAME_CONFIG.mapHeight * 0.5 * GAME_CONFIG.tileSize,
            size: 1 + Math.random() * 2,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}

function initClouds() {
    gameState.clouds = [];
    for (let i = 0; i < 6; i++) {
        gameState.clouds.push({
            x: Math.random() * GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize,
            y: 30 + Math.random() * 100,
            width: 80 + Math.random() * 100,
            height: 30 + Math.random() * 30,
            speed: 0.15 + Math.random() * 0.2
        });
    }
}

// ==================== 时间系统 ====================
function updateTimeSystem() {
    const now = Date.now();
    if (now - gameState.cachedTime < GAME_CONFIG.timeSystem.updateInterval) return;

    gameState.cachedTime = now;
    const phaseIndex = Math.floor((now % (GAME_CONFIG.timeSystem.phaseDuration * GAME_CONFIG.timeSystem.phases.length)) / GAME_CONFIG.timeSystem.phaseDuration);
    const newPhase = GAME_CONFIG.timeSystem.phases[phaseIndex];

    if (newPhase !== GAME_CONFIG.timeSystem.currentPhase) {
        GAME_CONFIG.timeSystem.currentPhase = newPhase;
        const scene = TIME_SCENES[newPhase];
        showNotification(`🌅 时间流逝，现在是${scene.name}`, 'info');
        updateTimeIndicator(); // 同步更新HUD时间指示器
    }
}

function getCurrentScene() {
    return TIME_SCENES[GAME_CONFIG.timeSystem.currentPhase] || TIME_SCENES.day;
}

// ==================== 绘制天空和背景 ====================
function drawSkyAndBackground() {
    const scene = getCurrentScene();

    // 天空渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const colors = scene.skyGradient;
    for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / (colors.length - 1), colors[i]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 太阳
    if (scene.hasSun && scene.sunAlpha > 0) {
        const sunX = canvas.width * 0.85;
        const sunY = canvas.height * 0.15;
        ctx.save();
        ctx.globalAlpha = scene.sunAlpha;
        ctx.fillStyle = scene.sunColor;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
        ctx.fill();
        // 太阳光晕
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 80);
        sunGlow.addColorStop(0, scene.sunColor);
        sunGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 月亮
    if (scene.hasMoon && scene.moonAlpha > 0) {
        const moonX = canvas.width * 0.8;
        const moonY = canvas.height * 0.12;
        ctx.save();
        ctx.globalAlpha = scene.moonAlpha;
        ctx.fillStyle = scene.moonColor;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
        ctx.fill();
        // 月亮光晕
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 25, moonX, moonY, 60);
        moonGlow.addColorStop(0, scene.moonColor);
        moonGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 星星
    if (scene.hasStars) {
        const time = Date.now() * 0.001;
        ctx.fillStyle = scene.starColor;
        for (const star of gameState.stars) {
            const sx = star.x - camera.x * 0.05;
            const sy = star.y - camera.y * 0.05;
            if (sx < -10 || sx > canvas.width + 10 || sy < -10 || sy > canvas.height * 0.6) continue;
            const alpha = scene.starAlpha * (0.5 + 0.5 * Math.sin(time * 2 + star.twinkle));
            ctx.globalAlpha = alpha;
            ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(star.size), Math.ceil(star.size));
        }
        ctx.globalAlpha = 1;
    }

    // 云朵
    if (scene.hasClouds) {
        ctx.fillStyle = scene.cloudColor;
        const time = Date.now() * 0.0001;
        for (const cloud of gameState.clouds) {
            const cx = ((cloud.x - camera.x * 0.2 + time * cloud.speed * 1000) % (GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize + 200)) - 100;
            const cy = cloud.y - camera.y * 0.05;
            if (cy < -50 || cy > canvas.height * 0.5) continue;

            ctx.beginPath();
            ctx.ellipse(cx, cy, cloud.width * 0.5, cloud.height * 0.5, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - cloud.width * 0.25, cy + 5, cloud.width * 0.3, cloud.height * 0.35, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + cloud.width * 0.25, cy + 3, cloud.width * 0.28, cloud.height * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 环境光效覆盖层
    ctx.fillStyle = scene.ambientLight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ==================== 绘制地块 ====================
function drawTile(x, y, type) {
    const tileSize = GAME_CONFIG.tileSize;
    const screenX = x * tileSize - camera.x;
    const screenY = y * tileSize - camera.y;

    // 屏幕裁剪
    if (screenX < -tileSize || screenX > canvas.width ||
        screenY < -tileSize || screenY > canvas.height) return;

    const scene = getCurrentScene();
    const ix = Math.floor(screenX);
    const iy = Math.floor(screenY);
    const time = Date.now() * 0.001;

    switch (type) {
        case 0: // 草地
            ctx.fillStyle = ((x + y) % 2 === 0) ? scene.grassColor1 : scene.grassColor2;
            ctx.fillRect(ix, iy, tileSize, tileSize);
            if ((x * 7 + y * 13) % 17 === 0) {
                ctx.fillStyle = '#2a4a1a';
                ctx.fillRect(ix + 12, iy + 12, 4, 4);
            }
            break;

        case 1: // 浅水
            const waveOffset = Math.sin(time * 2 + x * 0.5 + y * 0.3) * 3;
            ctx.fillStyle = scene.waterColor;
            ctx.fillRect(ix, iy, tileSize, tileSize);
            ctx.fillStyle = scene.waterHighlight;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(ix + waveOffset, iy + 8, 16, 4);
            ctx.fillRect(ix - waveOffset * 0.5, iy + 20, 12, 3);
            ctx.globalAlpha = 1;
            // 水面闪光
            ctx.fillStyle = scene.waterShimmer;
            if ((x + y + Math.floor(time * 2)) % 5 === 0) {
                ctx.fillRect(ix + 10, iy + 10, 6, 3);
            }
            break;

        case 2: // 树
            ctx.fillStyle = scene.grassColor1;
            ctx.fillRect(ix, iy, tileSize, tileSize);
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(ix + 12, iy + 16, 8, 16);
            ctx.fillStyle = '#2a6a2a';
            ctx.beginPath();
            ctx.moveTo(ix + 16, iy);
            ctx.lineTo(ix + 4, iy + 20);
            ctx.lineTo(ix + 28, iy + 20);
            ctx.closePath();
            ctx.fill();
            break;

        case 3: // 沙滩
            ctx.fillStyle = scene.sandColor;
            ctx.fillRect(ix, iy, tileSize, tileSize);
            ctx.fillStyle = '#c4a866';
            for (let i = 0; i < 4; i++) {
                const sx = (x * 17 + y * 13 + i * 7) % 22 + 5;
                const sy = (x * 11 + y * 19 + i * 11) % 18 + 7;
                ctx.fillRect(ix + sx, iy + sy, 3, 2);
            }
            break;

        case 5: // 深水
            const deepWave = Math.sin(time * 1.5 + x * 0.3 + y * 0.2) * 4;
            ctx.fillStyle = scene.waterColor;
            ctx.fillRect(ix, iy, tileSize, tileSize);
            ctx.fillStyle = scene.waterHighlight;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(ix + deepWave, iy + 6, 20, 5);
            ctx.fillRect(ix - deepWave * 0.7, iy + 18, 18, 4);
            ctx.globalAlpha = 1;
            // 深水特殊波光
            ctx.fillStyle = scene.waterShimmer;
            if ((x + y + Math.floor(time * 1.5)) % 4 === 0) {
                ctx.fillRect(ix + 8, iy + 10, 8, 4);
            }
            break;

        case 6: // 码头木板
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(ix, iy, tileSize, tileSize);
            ctx.fillStyle = '#6B5335';
            ctx.fillRect(ix, iy, tileSize, 2);
            ctx.fillRect(ix, iy + tileSize - 2, tileSize, 2);
            for (let i = 1; i < 3; i++) {
                ctx.fillStyle = '#7B6335';
                ctx.fillRect(ix, iy + i * 11, tileSize, 1);
            }
            break;

        case 7: // 城市地基
            ctx.fillStyle = '#606060';
            ctx.fillRect(ix, iy, tileSize, tileSize);
            break;

        case 8: // 街道
            ctx.fillStyle = '#404040';
            ctx.fillRect(ix, iy, tileSize, tileSize);
            ctx.fillStyle = '#505050';
            ctx.fillRect(ix, iy, tileSize, 2);
            ctx.fillRect(ix, iy + tileSize - 2, tileSize, 2);
            break;

        case 9: // 建筑物
            const buildingColors = ['#c0a080', '#a08060', '#b09070', '#908060', '#d0b090'];
            ctx.fillStyle = buildingColors[(x + y) % buildingColors.length];
            ctx.fillRect(ix + 2, iy + 2, tileSize - 4, tileSize - 4);
            // 窗户
            ctx.fillStyle = '#4a6080';
            ctx.fillRect(ix + 6, iy + 8, 8, 8);
            ctx.fillRect(ix + 18, iy + 8, 8, 8);
            // 门
            ctx.fillStyle = '#5a4030';
            ctx.fillRect(ix + 12, iy + 20, 8, 10);
            break;

        case 10: // 海水
            const seaWave = Math.sin(time * 1.2 + x * 0.4 + y * 0.2) * 3;
            const seaWave2 = Math.sin(time * 0.8 + x * 0.6 + y * 0.3) * 4;
            const seaWave3 = Math.sin(time * 1.5 + x * 0.3 + y * 0.5) * 2;
            ctx.fillStyle = '#1E5B8C';
            ctx.fillRect(ix, iy, tileSize, tileSize);

            // 海浪层1
            ctx.fillStyle = '#2E7BBD';
            ctx.globalAlpha = 0.6;
            ctx.fillRect(ix + seaWave, iy + 4, 20, 5);
            ctx.fillRect(ix - seaWave * 0.6, iy + 14, 18, 4);
            ctx.fillRect(ix + seaWave2 * 0.7, iy + 24, 16, 4);

            // 海浪层2 - 不同步的波浪
            ctx.fillStyle = '#3A8BC9';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(ix + seaWave2 * 0.5, iy + 8, 14, 3);
            ctx.fillRect(ix - seaWave3 * 0.8, iy + 18, 12, 3);
            ctx.fillRect(ix + seaWave * 0.3, iy + 28, 10, 2);

            // 白色浪峰
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(ix + seaWave + 2, iy + 3, 8, 2);
            ctx.fillRect(ix - seaWave2 * 0.5 + 4, iy + 13, 6, 2);

            ctx.globalAlpha = 1;

            // 海水反光
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            const shimmerOffset = Math.floor(time * 2) % 8;
            if ((x + y + shimmerOffset) % 7 === 0) {
                ctx.fillRect(ix + 10 + seaWave3, iy + 10, 8, 4);
            }

            // 随机泡沫 (海浪拍打效果)
            if ((x * 13 + y * 17 + Math.floor(time * 3)) % 23 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(ix + 8, iy + 20, 3, 3);
            }
            if ((x * 11 + y * 19 + Math.floor(time * 2.5)) % 29 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(ix + 18, iy + 8, 2, 2);
            }
            break;
    }
}

// ==================== 绘制码头 ====================
function drawDock() {
    const tileSize = GAME_CONFIG.tileSize;
    const dx = DOCK.x * tileSize - camera.x;
    const dy = DOCK.y * tileSize - camera.y;

    // 码头支架
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(Math.floor(dx), Math.floor(dy + tileSize), 6, tileSize * 2);
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(Math.floor(dx + tileSize), Math.floor(dy + tileSize), 6, tileSize * 2);
}

// ==================== 绘制路灯 (夜晚) ====================
function drawStreetLamps() {
    const scene = getCurrentScene();
    if (!scene.streetLamps) return;

    const time = Date.now() * 0.001;
    const glowColor = scene.lampGlow || 'rgba(255, 200, 100, 0.5)';

    for (const lamp of streetLamps) {
        const sx = lamp.x - camera.x;
        const sy = lamp.y - camera.y;

        // 屏幕外检测
        if (sx < -50 || sx > canvas.width + 50 || sy < -50 || sy > canvas.height + 50) continue;

        // 路灯杆
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(Math.floor(sx) - 2, Math.floor(sy) - 20, 4, 25);

        // 路灯灯头
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(Math.floor(sx) - 6, Math.floor(sy) - 24, 12, 6);

        // 灯光 (发光效果)
        ctx.save();
        const flicker = 0.9 + 0.1 * Math.sin(time * 3 + lamp.x);
        ctx.globalAlpha = flicker * 0.8;

        // 光晕
        const glow = ctx.createRadialGradient(sx, sy - 20, 5, sx, sy - 20, 80);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(0.5, 'rgba(255, 200, 100, 0.2)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy - 20, 80, 0, Math.PI * 2);
        ctx.fill();

        // 光束 (向下)
        ctx.globalAlpha = flicker * 0.15;
        const beam = ctx.createLinearGradient(sx, sy - 20, sx, sy + 60);
        beam.addColorStop(0, glowColor);
        beam.addColorStop(1, 'transparent');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(sx - 20, sy - 15);
        ctx.lineTo(sx + 20, sy - 15);
        ctx.lineTo(sx + 40, sy + 60);
        ctx.lineTo(sx - 40, sy + 60);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ==================== 绘制船上角色（坐姿） ====================
function drawPlayerOnBoat(px, py, direction, isMoving, frame) {
    const time = Date.now() * 0.001;
    const bobOffset = Math.sin(time * 2) * 2; // 船在水上晃动

    // 角色坐在船上的位置
    const seatY = py - 5 + bobOffset;

    // 身体（坐姿，比站立时更宽更矮）
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(px + 4, seatY + 4, 16, 14); // 头部

    // 身体（坐着的姿态）
    ctx.fillStyle = '#4169E1'; // 蓝色衣服
    ctx.fillRect(px + 2, seatY + 16, 20, 12);

    // 腿（坐在船里，弯曲的）
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(px + 4, seatY + 26, 6, 6);
    ctx.fillRect(px + 14, seatY + 26, 6, 6);

    // 划桨动作（当移动时）
    if (isMoving) {
        const paddleAngle = Math.sin(frame * 0.3) * 0.4;
        const paddleX = direction === 'left' ? px - 10 : px + 24;
        const paddleY = seatY + 10;

        // 船桨
        ctx.save();
        ctx.translate(paddleX, paddleY);
        ctx.rotate(paddleAngle);
        ctx.fillStyle = '#654321';
        ctx.fillRect(-2, -20, 4, 30);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-4, 8, 8, 12);
        ctx.restore();
    }

    // 方向对应的眼睛
    ctx.fillStyle = '#000';
    if (direction === 'down') {
        ctx.fillRect(px + 7, seatY + 8, 3, 3);
        ctx.fillRect(px + 14, seatY + 8, 3, 3);
    } else if (direction === 'left') {
        ctx.fillRect(px + 5, seatY + 8, 3, 3);
    } else if (direction === 'right') {
        ctx.fillRect(px + 16, seatY + 8, 3, 3);
    } else if (direction === 'up') {
        ctx.fillRect(px + 7, seatY + 6, 3, 3);
        ctx.fillRect(px + 14, seatY + 6, 3, 3);
    }
}

// ==================== 绘制小船 ====================
function drawBoat() {
    const bx = gameState.boat.x - camera.x;
    const by = gameState.boat.y - camera.y;

    // 船体
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(bx - 15, by + 15);
    ctx.lineTo(bx + 40, by + 15);
    ctx.lineTo(bx + 30, by);
    ctx.lineTo(bx - 5, by);
    ctx.closePath();
    ctx.fill();

    // 船桨
    ctx.fillStyle = '#654321';
    ctx.fillRect(bx + 8, by - 25, 3, 35);
    ctx.fillRect(bx + 20, by - 25, 3, 35);

    // 交互提示
    if (!gameState.isOnBoat && gameState.fishingState === FISHING_STATE.IDLE) {
        const dx = Math.abs(player.x - gameState.boat.x);
        const dy = Math.abs(player.y - gameState.boat.y);
        if (dx < 60 && dy < 60) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(Math.floor(bx - 35), Math.floor(by - 50), 90, 22);
            ctx.fillStyle = '#FFD700';
            ctx.font = '12px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('按 E 登船', bx + 10, by - 35);
        }
    }
}

// ==================== 绘制玩家 ====================
function drawPlayer(px, py, direction, isMoving, frame) {
    const armOffset = isMoving ? Math.sin(frame * 0.5) * 3 : 0;
    const legOffset = isMoving ? Math.sin(frame * 0.5) * 4 : 0;

    // 身体
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(px + 4, py, 16, 12);
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(px + 2, py - 2, 20, 6);
    ctx.fillRect(px + 2, py, 4, 8);
    ctx.fillRect(px + 18, py, 4, 8);
    ctx.fillStyle = '#000';
    if (direction === 'down') {
        ctx.fillRect(px + 7, py + 4, 3, 3);
        ctx.fillRect(px + 14, py + 4, 3, 3);
    } else if (direction === 'left') {
        ctx.fillRect(px + 5, py + 4, 3, 3);
    } else if (direction === 'right') {
        ctx.fillRect(px + 14, py + 4, 3, 3);
    }
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(px + 4, py + 8, 16, 16);
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(px + 2, py + 14, 20, 14);
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(px - 2, py + 14 + armOffset, 4, 10);
    ctx.fillRect(px + 22, py + 14 - armOffset, 4, 10);
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(px + 4, py + 26 + legOffset, 6, 8);
    ctx.fillRect(px + 14, py + 26 - legOffset, 6, 8);

    // 钓鱼竿 - 竿子指向天空，鱼线垂入水中
    if (gameState.fishingState !== FISHING_STATE.IDLE) {
        const isCasting = Date.now() - player.fishingRod.castAnimStart < 500; // 抛竿动画500ms

        // 竿子基础位置（玩家手中）
        const rodHandleX = px + 12;
        const rodHandleY = py + 16;

        // 竿子朝向：向上朝向天空（约-60度，即向左上方）
        const rodAngle = -Math.PI / 3; // 固定向上60度
        const rodLength = 28;

        if (isCasting) {
            // 抛竿动画 - 竿子向前向上挥动
            const castProgress = (Date.now() - player.fishingRod.castAnimStart) / 500;
            // 从后上方位置挥到前上方
            const swingStart = -Math.PI * 0.8; // 开始于左后方
            const swingEnd = -Math.PI / 3; // 结束于前上方
            const swingAngle = swingStart + (swingEnd - swingStart) * castProgress;

            // 竿身
            ctx.save();
            ctx.translate(rodHandleX, rodHandleY);
            ctx.rotate(swingAngle);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rodLength, 0);
            ctx.stroke();
            ctx.restore();

            // 竿尖位置
            const rodTipX = rodHandleX + Math.cos(swingAngle) * rodLength;
            const rodTipY = rodHandleY + Math.sin(swingAngle) * rodLength;
            const targetX = player.fishingRod.floatX - camera.x;
            const targetY = player.fishingRod.floatY - camera.y;

            // 抛出的鱼线（弧形下落）
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);

            // 鱼线随抛物线下落
            const midX = (rodTipX + targetX) / 2;
            const midY = Math.max(rodTipY, targetY) + 20;
            ctx.quadraticCurveTo(midX, midY, targetX, targetY);
            ctx.stroke();

            // 飞行中的浮标
            const flyX = rodTipX + (targetX - rodTipX) * castProgress;
            const flyY = rodTipY + (targetY - rodTipY) * castProgress - Math.sin(castProgress * Math.PI) * 30;
            ctx.fillStyle = '#FF4444';
            ctx.beginPath();
            ctx.arc(flyX, flyY, 4, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // 正常钓鱼状态 - 竿子向上，鱼线垂入水中到浮标

            // 竿身（向上指）
            ctx.save();
            ctx.translate(rodHandleX, rodHandleY);
            ctx.rotate(rodAngle);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rodLength, 0);
            ctx.stroke();
            ctx.restore();

            // 竿尖位置（向上竿子的末端）
            const rodTipX = rodHandleX + Math.cos(rodAngle) * rodLength;
            const rodTipY = rodHandleY + Math.sin(rodAngle) * rodLength;

            // 鱼线（从竿尖垂入水中到浮标）
            const targetX = player.fishingRod.floatX - camera.x;
            const targetY = player.fishingRod.floatY - camera.y;
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rodTipX, rodTipY);

            // 鱼线自然下垂到浮标
            const midX = (rodTipX + targetX) / 2;
            const midY = Math.max(rodTipY, targetY) + 15;
            ctx.quadraticCurveTo(midX, midY, targetX, targetY);
            ctx.stroke();

            // 浮标（带轻微浮动动画）
            const floatBob = Math.sin(Date.now() * 0.003) * 2;
            const floatShake = gameState.fishingState === FISHING_STATE.BITE_ALERT ?
                Math.sin(Date.now() * 0.03) * 5 : 0;
            const floatColor = gameState.fishingState === FISHING_STATE.BITE_ALERT ? '#FF0000' : '#FF4444';

            const floatX = targetX + floatShake;
            const floatY = targetY + floatBob;

            // 浮标主体
            ctx.fillStyle = floatColor;
            ctx.beginPath();
            ctx.arc(floatX, floatY, 5, 0, Math.PI * 2);
            ctx.fill();

            // 浮标顶部高光
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(floatX - 1, floatY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ==================== 绘制NPC ====================
function drawNPC(npc) {
    const screenX = npc.x - camera.x;
    const screenY = npc.y - camera.y;

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX + 12, screenY + 32, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = npc.type === 'shop' ? '#DAA520' : '#9370DB';
    ctx.fillRect(screenX + 4, screenY + 12, 16, 16);
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(screenX + 4, screenY + 4, 16, 12);
    ctx.fillStyle = npc.type === 'shop' ? '#B8860B' : '#4169E1';
    ctx.fillRect(screenX + 2, screenY, 20, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX + 7, screenY + 6, 2, 2);
    ctx.fillRect(screenX + 15, screenY + 6, 2, 2);

    if (npc.type === 'shop') {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(screenX + 20, screenY - 8, 12, 12);
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', screenX + 26, screenY + 1);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenX - 10, screenY - 20, 50, 16);
    ctx.fillStyle = npc.type === 'shop' ? '#FFD700' : '#FFF';
    ctx.font = '10px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, screenX + 15, screenY - 8);
}

// ==================== 相机更新 ====================
function updateCamera() {
    let targetX, targetY;

    if (gameState.isOnBoat) {
        targetX = gameState.boat.x - canvas.width / 2;
        targetY = gameState.boat.y - canvas.height / 2;
    } else {
        targetX = player.x - canvas.width / 2 + player.width / 2;
        targetY = player.y - canvas.height / 2 + player.height / 2;
    }

    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;

    camera.x = Math.max(0, Math.min(camera.x, GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize - canvas.height));
}

// ==================== 碰撞检测 ====================
function checkCollision(x, y) {
    const tileX = Math.floor((x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((y + player.height / 2) / GAME_CONFIG.tileSize);
    if (tileX < 0 || tileX >= GAME_CONFIG.mapWidth || tileY < 0 || tileY >= GAME_CONFIG.mapHeight) return true;
    const tile = mapData.tiles[tileY][tileX];
    return tile === 1 || tile === 2 || tile === 5 || tile === 7 || tile === 9 || tile === 10;
}

function isNearWater() {
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [dx, dy] of directions) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (nx >= 0 && nx < GAME_CONFIG.mapWidth && ny >= 0 && ny < GAME_CONFIG.mapHeight) {
            const tile = mapData.tiles[ny][nx];
            if (tile === 1) return 'river';
            if (tile === 5) return 'deep';
            if (tile === 10) return 'sea';
        }
    }
    return false;
}

function isNearBoat() {
    const dx = player.x - gameState.boat.x;
    const dy = player.y - gameState.boat.y;
    return Math.sqrt(dx * dx + dy * dy) < 50;
}

function isNearDock() {
    // 检查玩家是否在码头附近
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    return tileX >= DOCK.x - 2 && tileX <= DOCK.x + DOCK.width + 2 &&
           tileY >= DOCK.y - 2 && tileY <= DOCK.y + DOCK.height + 3;
}

function isBoatAtDock() {
    // 检查船是否在码头位置
    const boatTileX = Math.floor((gameState.boat.x + 16) / GAME_CONFIG.tileSize);
    const boatTileY = Math.floor((gameState.boat.y + 16) / GAME_CONFIG.tileSize);
    return boatTileX >= DOCK.x - 1 && boatTileX <= DOCK.x + DOCK.width + 1 &&
           boatTileY >= DOCK.y - 1 && boatTileY <= DOCK.y + DOCK.height + 2;
}

function getNearbyNPC() {
    const currentPhase = GAME_CONFIG.timeSystem.currentPhase;
    const isNightTime = currentPhase === 'night' || currentPhase === 'midnight';
    for (const npc of npcs) {
        if (isNightTime && npc.nightHide) continue;
        const dx = player.x - npc.x;
        const dy = player.y - npc.y;
        if (Math.sqrt(dx * dx + dy * dy) < 60) return npc;
    }
    return null;
}

// ==================== 玩家移动 ====================
function updatePlayer(dt) {
    if (gameState.fishingState !== FISHING_STATE.IDLE) return;

    const speed = GAME_CONFIG.playerSpeed * (dt / 16.67);
    let dx = 0, dy = 0;

    if (gameState.isOnBoat) {
        if (gameState.keys['w'] || gameState.keys['ArrowUp']) { dy = -speed; player.direction = 'up'; }
        if (gameState.keys['s'] || gameState.keys['ArrowDown']) { dy = speed; player.direction = 'down'; }
        if (gameState.keys['a'] || gameState.keys['ArrowLeft']) { dx = -speed; player.direction = 'left'; }
        if (gameState.keys['d'] || gameState.keys['ArrowRight']) { dx = speed; player.direction = 'right'; }

        if (dx !== 0 || dy !== 0) {
            player.isMoving = true;
            player.animationFrame++;
            const newBoatX = gameState.boat.x + dx;
            const newBoatY = gameState.boat.y + dy;

            const tileX = Math.floor((newBoatX + 15) / GAME_CONFIG.tileSize);
            const tileY = Math.floor((newBoatY + 15) / GAME_CONFIG.tileSize);
            if (tileX >= 0 && tileX < GAME_CONFIG.mapWidth && tileY >= 0 && tileY < GAME_CONFIG.mapHeight) {
                const tile = mapData.tiles[tileY][tileX];
                if (tile === 1 || tile === 5 || tile === 10) {
                    gameState.boat.x = newBoatX;
                    gameState.boat.y = newBoatY;
                    if (player.animationFrame % 10 === 0) {
                        particles.emit(newBoatX + 15, newBoatY + 20, {
                            count: 5, spread: 4, upward: 2, gravity: 0.1, life: 20,
                            size: 3, colors: ['#87CEEB', '#ADD8E6', '#FFFFFF']
                        });
                    }
                }
            }
        } else {
            player.isMoving = false;
        }
    } else {
        if (gameState.keys['w'] || gameState.keys['ArrowUp']) { dy = -speed; player.direction = 'up'; }
        if (gameState.keys['s'] || gameState.keys['ArrowDown']) { dy = speed; player.direction = 'down'; }
        if (gameState.keys['a'] || gameState.keys['ArrowLeft']) { dx = -speed; player.direction = 'left'; }
        if (gameState.keys['d'] || gameState.keys['ArrowRight']) { dx = speed; player.direction = 'right'; }

        player.isMoving = dx !== 0 || dy !== 0;
        if (player.isMoving) {
            player.animationFrame++;
            if (player.animationFrame % 15 === 0) AudioSystem.sfx.step();
            if (!checkCollision(player.x + dx, player.y)) player.x += dx;
            if (!checkCollision(player.x, player.y + dy)) player.y += dy;
        }
    }

    player.x = Math.max(0, Math.min(player.x, GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize - player.width));
    player.y = Math.max(0, Math.min(player.y, GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize - player.height));
}

// ==================== 钓鱼小游戏 ====================
let fishingGame = {
    active: false,
    zoneY: 150,
    zoneHeight: 80,
    cursorY: 150,
    cursorVelocity: 0,
    progress: 30,
    fishToCatch: null,
    fishDifficulty: 1,
    gravity: 0.35,
    lift: 0.7,
    progressGain: 0.8,
    progressLoss: 0.25
};

function getCurrentRod() {
    return SHOP_ITEMS.rods.find(r => r.id === gameState.equippedRod) || SHOP_ITEMS.rods[0];
}

function getCurrentBait() {
    if (!gameState.equippedBait || gameState.baitCount <= 0) return null;
    return SHOP_ITEMS.baits.find(b => b.id === gameState.equippedBait) || null;
}

function getCurrentAccessory() {
    return SHOP_ITEMS.accessories.find(a => a.id === gameState.equippedAccessory) || SHOP_ITEMS.accessories[0];
}

function getTotalLuck() {
    const accessory = getCurrentAccessory();
    return accessory.luckBonus || 0;
}

// ==================== 钓鱼流程 ====================
function startCasting() {
    const waterType = isNearWater();
    if (!waterType) {
        showNotification('请走到水边再钓鱼！', 'warning');
        return;
    }
    if (gameState.fishingState !== FISHING_STATE.IDLE) return;

    const bait = getCurrentBait();
    if (!bait) {
        showNotification('🪱 没有鱼饵了！请先购买鱼饵', 'error');
        return;
    }

    // 海鱼需要海藻鱼饵
    if (waterType === 'sea' && bait.type !== 'sea' && bait.type !== 'legend') {
        showNotification('🌿 海水需要海藻鱼饵才能钓鱼！', 'warning');
        return;
    }

    gameState.fishingState = FISHING_STATE.CASTING;
    player.fishingRod.isCast = true;
    player.fishingRod.castAnimStart = Date.now(); // 记录抛竿动画开始时间

    // 如果在船上，鱼线从船的位置抛出
    const sourceX = gameState.isOnBoat ? gameState.boat.x : player.x;
    const sourceY = gameState.isOnBoat ? gameState.boat.y : player.y;
    const tileX = Math.floor((sourceX + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((sourceY + player.height / 2) / GAME_CONFIG.tileSize);

    // 浮标位置深入水中（根据朝向偏移更远）
    let floatOffsetX = 0;
    let floatOffsetY = 0;
    if (player.direction === 'up') floatOffsetY = -2;
    else if (player.direction === 'down') floatOffsetY = 2;
    else if (player.direction === 'left') floatOffsetX = -2;
    else if (player.direction === 'right') floatOffsetX = 2;

    player.fishingRod.floatX = (tileX + floatOffsetX) * GAME_CONFIG.tileSize + 16;
    player.fishingRod.floatY = (tileY + floatOffsetY) * GAME_CONFIG.tileSize + 16;

    AudioSystem.sfx.cast();

    particles.emit(player.fishingRod.floatX, player.fishingRod.floatY, {
        count: 15, spread: 8, upward: 3, gravity: 0.15, life: 40,
        size: 4, colors: ['#87CEEB', '#4169E1', '#ADD8E6', '#FFFFFF']
    });

    document.getElementById('castingUI').classList.add('active');

    const zoneNames = { river: '湖边', deep: '深水区', sea: '海边' };
    showNotification(`🎣 已抛竿 (${zoneNames[waterType]})，等待鱼上钩...`, 'info');

    gameState.baitCount--;
    gameState.lastCatchZone = waterType;
    updateHUD();

    const baitBonus = bait ? bait.biteTimeBonus : 0;
    const baseWaitTime = 5000 + Math.random() * 10000;
    const waitTime = baseWaitTime * (1 - baitBonus * 0.3);

    gameState.castingWaitTime = waitTime;
    gameState.castingStartTime = Date.now();

    gameState.biteTimeout = setTimeout(() => {
        if (gameState.fishingState === FISHING_STATE.CASTING) {
            triggerBiteAlert(waterType);
        }
    }, waitTime);
}

function triggerBiteAlert(waterType) {
    gameState.fishingState = FISHING_STATE.BITE_ALERT;
    gameState.biteAlertTimer = Date.now();

    fishingGame.fishToCatch = catchFish(waterType);

    document.getElementById('castingUI').classList.remove('active');
    document.getElementById('biteAlertUI').classList.add('active');

    AudioSystem.sfx.bite();

    particles.emit(player.fishingRod.floatX, player.fishingRod.floatY, {
        count: 20, spread: 10, upward: 4, gravity: 0.1, life: 35,
        size: 5, colors: ['#FFFFFF', '#87CEEB', '#ADD8E6']
    });

    gameState.biteAlertTimeout = setTimeout(() => {
        if (gameState.fishingState === FISHING_STATE.BITE_ALERT) {
            fishEscaped('反应太慢了...');
        }
    }, gameState.biteAlertDuration);
}

function respondToBite() {
    if (gameState.fishingState !== FISHING_STATE.BITE_ALERT) return;

    clearTimeout(gameState.biteAlertTimeout);
    gameState.fishingState = FISHING_STATE.MINIGAME;

    document.getElementById('biteAlertUI').classList.remove('active');
    document.getElementById('fishingUI').classList.add('active');

    const hint = document.querySelector('.fishing-header');
    if (hint) hint.textContent = '🎣 按住空格键控制！保持在绿色区域！';

    const rod = getCurrentRod();
    const fish = fishingGame.fishToCatch;

    setFishingDifficulty(fish);

    fishingGame.active = true;
    fishingGame.progress = 30;
    fishingGame.zoneY = Math.random() * 180 + 40;
    fishingGame.cursorY = 150;
    fishingGame.cursorVelocity = 0;
    fishingGame.zoneHeight = DIFFICULTY_CONFIG[fish.difficulty].zoneBase + rod.zoneBonus;
    fishingGame.progressGain = 0.8 + rod.progressBonus;
    fishingGame.progressLoss = 0.2;

    if (gameState.equippedBait && gameState.baitCount > 0) {
        gameState.baitCount--;
        if (gameState.baitCount <= 0) {
            gameState.equippedBait = null;
            gameState.baitCount = 0;
        }
        updateHUD();
    }

    const diffNames = { 1: '简单', 2: '较易', 3: '中等', 4: '较难', 5: '困难', 6: '极难' };
    showNotification(`🎣 开始收竿！按住空格键控制！ (${diffNames[fish.difficulty]})`, 'info');
}

function fishEscaped(reason = '鱼儿跑掉了...') {
    gameState.fishingState = FISHING_STATE.IDLE;
    player.fishingRod.isCast = false;
    clearTimeout(gameState.biteTimeout);
    clearTimeout(gameState.biteAlertTimeout);

    document.getElementById('castingUI').classList.remove('active');
    document.getElementById('biteAlertUI').classList.remove('active');
    document.getElementById('fishingUI').classList.remove('active');

    showNotification('😔 ' + reason, 'error');
    AudioSystem.sfx.fail();
}

function updateBiteAlertUI() {
    if (gameState.fishingState !== FISHING_STATE.BITE_ALERT) return;

    const elapsed = Date.now() - gameState.biteAlertTimer;
    const remaining = Math.max(0, 1 - elapsed / gameState.biteAlertDuration);
    const bar = document.getElementById('biteAlertBar');
    if (bar) {
        bar.style.width = (remaining * 100) + '%';
        bar.style.background = remaining > 0.5 ? '#32CD32' : remaining > 0.25 ? '#FFD700' : '#FF4444';
    }
}

function updateFishingGame(dt) {
    if (!fishingGame.active) return;

    const time = Date.now() * 0.001;
    const difficulty = DIFFICULTY_CONFIG[fishingGame.fishDifficulty] || DIFFICULTY_CONFIG[1];
    const speedMult = dt / 16.67;

    let movement = 0;
    movement += Math.sin(time * difficulty.speedBase) * difficulty.speedVariance;
    if (fishingGame.fishDifficulty >= 2) {
        movement += Math.sin(time * difficulty.speedBase * 1.7) * (difficulty.speedVariance * 0.6);
    }
    if (fishingGame.fishDifficulty >= 3) {
        movement += Math.sin(time * difficulty.speedBase * 2.3) * (difficulty.speedVariance * 0.4);
        movement += Math.cos(time * difficulty.speedBase * 1.5) * (difficulty.speedVariance * 0.3);
    }
    if (fishingGame.fishDifficulty >= 4) {
        movement += Math.sin(time * difficulty.speedBase * 3.5) * (difficulty.speedVariance * 0.3);
    }
    if (fishingGame.fishDifficulty >= 5) {
        movement += Math.sin(time * difficulty.speedBase * 5.0) * (difficulty.speedVariance * 0.2);
    }
    if (fishingGame.fishDifficulty >= 6) {
        movement += Math.sin(time * difficulty.speedBase * 7.0 + Math.sin(time * 3)) * (difficulty.speedVariance * 0.4);
    }

    fishingGame.zoneY += movement * speedMult;
    fishingGame.zoneY = Math.max(20, Math.min(220, fishingGame.zoneY));

    if (gameState.keys[' '] || gameState.keys['Space']) {
        fishingGame.cursorVelocity -= fishingGame.lift * speedMult;
    } else {
        fishingGame.cursorVelocity += fishingGame.gravity * speedMult;
    }

    fishingGame.cursorVelocity *= 0.97;
    fishingGame.cursorY += fishingGame.cursorVelocity * speedMult;
    fishingGame.cursorY = Math.max(5, Math.min(265, fishingGame.cursorY));

    const cursorCenter = fishingGame.cursorY + 15;
    const inZone = cursorCenter > fishingGame.zoneY - 5 && cursorCenter < fishingGame.zoneY + fishingGame.zoneHeight + 5;

    if (inZone) {
        fishingGame.progress += fishingGame.progressGain * speedMult;
    } else {
        fishingGame.progress -= fishingGame.progressLoss * speedMult;
    }

    fishingGame.progress = Math.max(0, Math.min(100, fishingGame.progress));

    const zone = document.getElementById('fishingZone');
    const cursor = document.getElementById('fishingCursor');
    const progressDisplay = document.getElementById('progressDisplay');

    if (zone) {
        zone.style.top = fishingGame.zoneY + 'px';
        zone.style.height = fishingGame.zoneHeight + 'px';
        zone.style.boxShadow = fishingGame.progress > 70 ? '0 0 30px rgba(50,205,50,1)' :
            fishingGame.progress < 30 ? '0 0 20px rgba(255,68,68,0.8)' : '0 0 20px rgba(50,205,50,0.8)';
    }
    if (cursor) cursor.style.top = fishingGame.cursorY + 'px';
    if (progressDisplay) {
        progressDisplay.textContent = Math.floor(fishingGame.progress) + '%';
        progressDisplay.className = 'progress-display ' +
            (fishingGame.progress > 70 ? 'success' : fishingGame.progress > 30 ? 'warning' : 'danger');
    }

    if (fishingGame.progress >= 100) endFishingGame(true);
    else if (fishingGame.progress <= 0) {
        fishingGame.active = false;
        gameState.fishingState = FISHING_STATE.IDLE;
        player.fishingRod.isCast = false;
        document.getElementById('fishingUI').classList.remove('active');
        fishEscaped('进度归零，鱼儿跑了...');
    }
}

function endFishingGame(success) {
    fishingGame.active = false;
    gameState.fishingState = FISHING_STATE.IDLE;
    player.fishingRod.isCast = false;
    document.getElementById('fishingUI').classList.remove('active');

    setTimeout(() => {
        if (success) {
            const fish = fishingGame.fishToCatch || catchFish('river');
            gameState.inventory.push(fish);
            // 永久记录钓到的鱼（即使卖掉也在图鉴中显示）
            gameState.fishCaught[fish.id] = true;
            gameState.exp += Math.floor(fish.value / 10);

            checkQuestCompletion();
            checkAchievements(fish);

            // 如果图鉴打开着，更新显示
            if (document.getElementById('encyclopediaOverlay').classList.contains('active')) {
                renderEncyclopedia();
            }

            showCatchModal(fish);

            particles.emit(player.x + 12, player.y - 20, {
                count: 30, spread: 15, upward: 5, gravity: 0.08, life: 60,
                size: 6, colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#FFFFFF']
            });

            createFloatingText(player.x - camera.x + 12, player.y - camera.y - 20, `${fish.icon} ${fish.name}!`, 'gold');
            createFloatingText(player.x - camera.x + 12, player.y - camera.y - 45, `+${Math.floor(fish.value / 10)} XP`, 'exp');

            AudioSystem.sfx.success();
            checkLevelUp();
            updateHUD();
        } else {
            fishEscaped();
        }
    }, 500);
}

function catchFish(waterType) {
    const rod = getCurrentRod();
    const bait = getCurrentBait();
    const luck = getTotalLuck();
    const currentTime = GAME_CONFIG.timeSystem.currentPhase;

    let availableFish = GAME_CONFIG.fishTypes.filter(fish => {
        const zoneMatch = fish.zones.includes(waterType) || fish.zones.includes('any');
        // 海鱼需要特殊鱼饵
        if (fish.zones.includes('sea') && bait && bait.type !== 'sea' && bait.type !== 'legend') {
            return false;
        }
        return zoneMatch;
    });

    if (availableFish.length === 0) availableFish = GAME_CONFIG.fishTypes.filter(f => f.zones.includes('any'));

    let adjustedFish = availableFish.map(fish => {
        let chance = fish.chance;
        if (fish.rarity === 'rare') chance += rod.rarityBonus * 0.3;
        if (fish.rarity === 'uncommon') chance += rod.rarityBonus * 0.5;
        if (fish.rarity === 'legendary') chance += rod.legendaryBonus;
        if (bait) {
            if (fish.rarity === 'rare') chance += bait.rarityBonus * 0.5;
            if (fish.rarity === 'uncommon') chance += bait.rarityBonus * 0.3;
            if (fish.rarity === 'legendary') chance += bait.rarityBonus;
        }
        if (fish.rarity === 'rare') chance += luck * 0.005;
        if (fish.rarity === 'legendary') chance += luck * 0.002;
        if (fish.rarity === 'uncommon') chance += luck * 0.003;
        return { ...fish, chance: Math.max(chance, 0) };
    });

    const totalChance = adjustedFish.reduce((sum, f) => sum + f.chance, 0);
    adjustedFish = adjustedFish.map(f => ({ ...f, chance: f.chance / totalChance }));

    const rand = Math.random();
    let cumulative = 0;
    for (const fish of adjustedFish) {
        cumulative += fish.chance;
        if (rand < cumulative) return { ...fish, date: new Date() };
    }
    return { ...availableFish[0], date: new Date() };
}

function setFishingDifficulty(fish) {
    const difficulty = DIFFICULTY_CONFIG[fish.difficulty] || DIFFICULTY_CONFIG[1];
    fishingGame.fishDifficulty = fish.difficulty;
    fishingGame.zoneHeight = difficulty.zoneBase;
}

function checkLevelUp() {
    const expNeeded = gameState.level * 100;
    if (gameState.exp >= expNeeded) {
        gameState.level++;
        gameState.exp -= expNeeded;
        showNotification(`⭐ 升级了！现在等级 ${gameState.level}！`, 'success');
        AudioSystem.sfx.levelUp();
        checkAchievements();
    }
}

// ==================== 成就系统 ====================
const ACHIEVEMENTS = {
    achievements: [
        { id: 'first_fish', name: '初试身手', desc: '钓到第一条鱼', icon: '🎣', reward: 20, unlocked: false },
        { id: 'sea_fish', name: '航海家', desc: '在海边钓到一条鱼', icon: '🌊', reward: 100, unlocked: false, target: { zone: 'sea' } },
        { id: 'rare_hunter', name: '稀有猎手', desc: '钓到一条稀有鱼', icon: '⭐', reward: 100, unlocked: false, target: { rarity: 'rare' } },
        { id: 'legendary_1', name: '传说诞生', desc: '钓到一条传说鱼', icon: '👑', reward: 500, unlocked: false, target: { rarity: 'legendary' } },
        { id: 'deep_fisher', name: '深海渔夫', desc: '在深水区钓到一条鱼', icon: '🚀', reward: 200, unlocked: false, target: { zone: 'deep' } }
    ]
};

function checkAchievements(fish) {
    for (const ach of ACHIEVEMENTS.achievements) {
        if (ach.unlocked) continue;
        let unlocked = false;
        if (ach.id === 'first_fish' && gameState.inventory.length >= 1) unlocked = true;
        else if (ach.target) {
            if (ach.target.rarity && fish && fish.rarity === ach.target.rarity) unlocked = true;
            else if (ach.target.zone && gameState.lastCatchZone === ach.target.zone) unlocked = true;
        }
        if (unlocked) {
            ach.unlocked = true;
            gameState.money += ach.reward;
            showNotification(`🏆 成就解锁：「${ach.name}」！奖励 ${ach.reward} 金币`, 'success');
            AudioSystem.sfx.levelUp();
        }
    }
}

// ==================== 浮动文字 ====================
function createFloatingText(x, y, text, type) {
    const el = document.createElement('div');
    el.className = 'floating-text ' + type;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.querySelector('.game-container').appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

// ==================== UI 功能 ====================
function showDialog(title, text, avatar = '🎣') {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogText').textContent = text;
    document.getElementById('dialogAvatar').textContent = avatar;
    document.getElementById('dialogBox').classList.add('active');
    const closeHandler = () => {
        document.getElementById('dialogBox').classList.remove('active');
        window.removeEventListener('keydown', closeHandler);
        window.removeEventListener('click', closeHandler);
    };
    setTimeout(() => {
        window.addEventListener('keydown', closeHandler);
        window.addEventListener('click', closeHandler);
    }, 100);
}

function showNotification(text, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notif = document.createElement('div');
    const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    notif.className = 'notification ' + type;
    notif.innerHTML = `<span class="notification-icon">${icons[type]}</span><span>${text}</span>`;
    container.appendChild(notif);
    requestAnimationFrame(() => notif.classList.add('show'));
    setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 300); }, 3000);
}

function updateHUD() {
    document.getElementById('fishCount').textContent = gameState.inventory.length;
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = `Lv.${gameState.level}`;

    const expNeeded = gameState.level * 100;
    const expPercent = (gameState.exp / expNeeded) * 100;
    document.getElementById('xpFill').style.width = expPercent + '%';

    const rod = getCurrentRod();
    document.getElementById('equippedRod').textContent = rod.icon + ' ' + rod.name;

    const baitEl = document.getElementById('equippedBait');
    const bait = getCurrentBait();
    if (bait) {
        baitEl.textContent = bait.icon + ' ' + bait.name + ' ×' + gameState.baitCount;
    } else {
        baitEl.textContent = '🪱 无鱼饵';
    }

    const luckEl = document.getElementById('luckValue');
    if (luckEl) {
        const luck = getTotalLuck();
        luckEl.textContent = luck > 0 ? `🍀 ${luck}` : '—';
    }

    updateQuestTracker();
    updateTimeIndicator();
}

// ==================== 时间指示器更新 ====================
function updateTimeIndicator() {
    const scene = getCurrentScene();
    const phase = GAME_CONFIG.timeSystem.currentPhase;

    const timeIcon = document.getElementById('timeIcon');
    const timePhase = document.getElementById('timePhase');
    const timeIndicator = document.getElementById('timeIndicator');

    const phaseConfig = {
        dawn: { icon: '🌅', name: '黎明', class: 'dawn' },
        day: { icon: '☀️', name: '白天', class: 'day' },
        dusk: { icon: '🌆', name: '黄昏', class: 'dusk' },
        night: { icon: '🌙', name: '夜晚', class: 'night' },
        midnight: { icon: '🌑', name: '午夜', class: 'midnight' }
    };

    const config = phaseConfig[phase] || phaseConfig.day;

    if (timeIcon) timeIcon.textContent = config.icon;
    if (timePhase) timePhase.textContent = config.name;
    if (timeIndicator) {
        timeIndicator.className = 'hud-item time-indicator ' + config.class;
    }
}

function updateQuestTracker() {
    const panel = document.getElementById('questPanelContent');
    const quest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];

    if (!gameState.questPanelOpen && panel.style.display === 'none') return;

    panel.style.display = 'block';

    if (!quest || quest.turnedIn) {
        panel.innerHTML = `
            <div class="quest-header">📋 当前任务</div>
            <div class="quest-item" style="text-align:center;color:#888;">
                <div style="padding:20px;">暂无进行中的任务</div>
                <div style="font-size:12px;color:#666;">与渔夫老张对话获取新任务</div>
            </div>
        `;
        return;
    }

    let progress = '';
    if (quest.target.fishId) {
        if (quest.target.fishId === 'any') {
            progress = `${Math.min(gameState.inventory.length, quest.target.count)}/${quest.target.count}`;
        } else {
            const count = gameState.inventory.filter(f => f.id === quest.target.fishId).length;
            progress = `${Math.min(count, quest.target.count)}/${quest.target.count}`;
        }
    } else if (quest.target.type === 'value') {
        const totalValue = gameState.inventory.reduce((sum, f) => sum + f.value, 0);
        progress = `${Math.min(totalValue, quest.target.amount)}/${quest.target.amount}`;
    }

    const statusClass = quest.completed ? 'completed' : 'in-progress';
    const statusText = quest.completed ? '✅ 可提交' : '⏳ 进行中';

    panel.innerHTML = `
        <div class="quest-header">📋 当前任务</div>
        <div class="quest-item ${statusClass}">
            <div class="quest-name">${quest.name}</div>
            <div class="quest-desc">${quest.desc}</div>
            <div class="quest-progress">进度: ${progress} ${statusText}</div>
            <div class="quest-reward">🎁 ${quest.reward.exp} 经验 + ${quest.reward.money} 金币</div>
        </div>
    `;
}

function toggleQuestPanel() {
    const panel = document.getElementById('questPanelContent');
    if (gameState.questPanelOpen) {
        panel.style.display = 'none';
        gameState.questPanelOpen = false;
        AudioSystem.sfx.closeMenu();
    } else {
        gameState.questPanelOpen = true;
        panel.style.display = 'block';
        updateQuestTracker();
        AudioSystem.sfx.openMenu();
    }
}

function toggleControlsHint() {
    const hint = document.querySelector('.controls-hint');
    gameState.controlsHintOpen = !gameState.controlsHintOpen;

    if (gameState.controlsHintOpen) {
        hint.style.opacity = '1';
        hint.style.pointerEvents = 'auto';
    } else {
        hint.style.opacity = '0';
        hint.style.pointerEvents = 'none';
    }
}

function showCatchModal(fish) {
    const modal = document.getElementById('catchModal');
    document.getElementById('catchFishIcon').textContent = fish.icon;
    document.getElementById('catchFishName').textContent = fish.name;
    document.getElementById('catchFishName').style.color = fish.color;
    document.getElementById('catchFishValue').textContent = fish.value;

    const rarityEl = document.getElementById('catchFishRarity');
    const rarityTexts = { common: '⭐ 普通', uncommon: '⭐⭐ 稀有', rare: '⭐⭐⭐ 珍贵', legendary: '👑 传说' };
    rarityEl.textContent = rarityTexts[fish.rarity];
    rarityEl.className = 'catch-rarity ' + fish.rarity;

    modal.classList.add('active');
}

function closeCatchModal() {
    document.getElementById('catchModal').classList.remove('active');
}

function openInventory() {
    AudioSystem.sfx.openMenu();
    const list = document.getElementById('fishList');
    list.innerHTML = '';

    const fishCount = {};
    let totalValue = 0;
    gameState.inventory.forEach(fish => {
        fishCount[fish.id] = (fishCount[fish.id] || 0) + 1;
        totalValue += fish.value;
    });

    document.getElementById('fishTypes').textContent = Object.keys(fishCount).length;
    document.getElementById('totalFish').textContent = gameState.inventory.length;
    document.getElementById('totalValue').textContent = totalValue;

    if (gameState.inventory.length === 0) {
        list.innerHTML = `<div class="empty-inventory"><div class="empty-inventory-icon">🎣</div><div>背包是空的，快去钓鱼吧！</div></div>`;
    } else {
        Object.entries(fishCount).forEach(([id, count]) => {
            const fish = GAME_CONFIG.fishTypes.find(f => f.id === id);
            const item = document.createElement('div');
            item.className = 'fish-item';
            item.innerHTML = `
                <div class="fish-icon-wrapper" style="background: ${fish.color}20; border: 2px solid ${fish.color};">${fish.icon}</div>
                <div class="fish-info">
                    <div class="fish-name" style="color: ${fish.color}">${fish.name}<span class="fish-rarity ${fish.rarity}">${getRarityText(fish.rarity)}</span></div>
                    <div class="fish-value">💰 ${fish.value} 金币/条</div>
                </div>
                <div class="fish-count">×${count}</div>
            `;
            list.appendChild(item);
        });
    }

    document.getElementById('inventoryOverlay').classList.add('active');
}

function closeInventory() {
    AudioSystem.sfx.closeMenu();
    document.getElementById('inventoryOverlay').classList.remove('active');
}

function getRarityText(rarity) {
    const texts = { common: '普通', uncommon: '稀有', rare: '珍贵', legendary: '传说' };
    return texts[rarity] || '普通';
}

// ==================== 商店系统 ====================
function openShop() {
    AudioSystem.sfx.openMenu();
    gameState.shopTab = 'buy';
    renderShop();
    document.getElementById('shopOverlay').classList.add('active');
}

function closeShop() {
    AudioSystem.sfx.closeMenu();
    document.getElementById('shopOverlay').classList.remove('active');
}

// ==================== 存档菜单 ====================
function openSaveMenu() {
    if (!gameState.isPlaying) return;
    if (gameState.fishingState !== FISHING_STATE.IDLE) {
        showNotification('⚠️ 钓鱼中无法打开存档菜单', 'warning');
        return;
    }
    AudioSystem.sfx.openMenu();
    updateSaveMenuSlots();
    document.getElementById('saveOverlay').classList.add('active');
}

function closeSaveMenu() {
    AudioSystem.sfx.closeMenu();
    document.getElementById('saveOverlay').classList.remove('active');
}

function updateSaveMenuSlots() {
    const slots = SaveSystem.getSaveSlots();
    for (let i = 0; i < 3; i++) {
        const saveSlot = document.getElementById('saveSlot' + i);
        const loadSlot = document.getElementById('loadSlot' + i);
        if (slots[i].data) {
            const date = new Date(slots[i].data.timestamp);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            saveSlot.textContent = `槽位${i + 1} - ${dateStr}`;
            saveSlot.style.color = '#4CAF50';
            loadSlot.textContent = `槽位${i + 1} - ${dateStr}`;
            loadSlot.style.color = '#2196F3';
            loadSlot.classList.add('has-save');
        } else {
            saveSlot.textContent = `槽位${i + 1} - 空`;
            saveSlot.style.color = '#888';
            loadSlot.textContent = `槽位${i + 1} - 空`;
            loadSlot.style.color = '#888';
            loadSlot.classList.remove('has-save');
        }
    }
}

function saveToSlot(slotIndex) {
    if (gameState.fishingState !== FISHING_STATE.IDLE) {
        showNotification('⚠️ 钓鱼中无法存档', 'warning');
        return;
    }
    const slots = SaveSystem.getSaveSlots();
    if (slots[slotIndex].data) {
        if (!confirm('该槽位已有存档，确定要覆盖吗？')) {
            return;
        }
    }
    SaveSystem.saveGame(slotIndex);
    updateSaveMenuSlots();
    showNotification('💾 存档成功！', 'success');
}

function loadFromSlot(slotIndex) {
    if (gameState.fishingState !== FISHING_STATE.IDLE) {
        showNotification('⚠️ 钓鱼中无法读档', 'warning');
        return;
    }
    const slots = SaveSystem.getSaveSlots();
    if (!slots[slotIndex].data) {
        showNotification('⚠️ 该槽位没有存档', 'warning');
        return;
    }
    if (SaveSystem.loadGame(slotIndex)) {
        closeSaveMenu();
    }
}

// ==================== 图鉴系统 ====================
function openEncyclopedia() {
    if (!gameState.isPlaying) return;
    AudioSystem.sfx.openMenu();
    renderEncyclopedia();
    document.getElementById('encyclopediaOverlay').classList.add('active');
}

function closeEncyclopedia() {
    AudioSystem.sfx.closeMenu();
    document.getElementById('encyclopediaOverlay').classList.remove('active');
}

function renderEncyclopedia() {
    const content = document.getElementById('encyclopediaContent');
    const countEl = document.getElementById('encyclopediaCount');
    const totalEl = document.getElementById('encyclopediaTotal');

    const allFish = GAME_CONFIG.fishTypes;
    totalEl.textContent = allFish.length;

    // 使用永久记录判断哪些鱼已钓到（即使卖掉也在图鉴中显示）
    const caughtFish = gameState.fishCaught || {};

    // 显示鱼类图鉴
    let html = '';
    allFish.forEach(fish => {
        const isCaught = caughtFish[fish.id];
        const rarityColors = {
            common: '#888',
            uncommon: '#4CAF50',
            rare: '#2196F3',
            legendary: '#FF69B4'
        };
        const rarityNames = {
            common: '普通',
            uncommon: '稀有',
            rare: '罕见',
            legendary: '传说'
        };

        // 获取鱼的出现时间和区域
        const timeInfo = getFishTimeInfo(fish);
        const zoneInfo = getFishZoneInfo(fish);

        html += `
            <div class="encyclopedia-fish ${isCaught ? 'caught' : 'uncaught'}">
                <span class="fish-icon" style="${isCaught ? '' : 'opacity: 0.3; filter: grayscale(1);'}">${fish.icon || '🐟'}</span>
                <div class="fish-name" style="${isCaught ? '' : 'color: #666;'}">${isCaught ? fish.name : '???'}</div>
                <div class="fish-info">
                    <div class="fish-info-row fish-rarity" style="color: ${rarityColors[fish.rarity]}">
                        ${isCaught ? rarityNames[fish.rarity] : '???'}
                    </div>
                    <div class="fish-info-row fish-time">
                        ${isCaught ? timeInfo : '???'}
                    </div>
                    <div class="fish-info-row fish-zone">
                        ${isCaught ? zoneInfo : '???'}
                    </div>
                </div>
            </div>
        `;
    });

    content.innerHTML = html;

    // 更新已收集数量
    const caughtCount = Object.keys(caughtFish).length;
    countEl.textContent = caughtCount;
}

function getFishTimeInfo(fish) {
    // 鱼的活跃时间
    const timeNames = {
        dawn: '黎明',
        day: '白天',
        dusk: '黄昏',
        night: '夜晚',
        midnight: '午夜'
    };

    if (fish.times && fish.times.length > 0) {
        return fish.times.map(t => timeNames[t] || t).join('/');
    }
    return '全天';
}

function getFishZoneInfo(fish) {
    const zoneNames = {
        pond: '淡水湖',
        river: '河流',
        deep: '深水区',
        sea: '海边'
    };

    if (fish.zones && fish.zones.length > 0) {
        return fish.zones.map(z => zoneNames[z] || z).join('/');
    }
    return '未知';
}

function switchShopTab(tab) {
    gameState.shopTab = tab;
    renderShop();
}

function renderShop() {
    const content = document.getElementById('shopContent');
    const buyTab = document.getElementById('shopTabBuy');
    const sellTab = document.getElementById('shopTabSell');

    buyTab.className = 'shop-tab' + (gameState.shopTab === 'buy' ? ' active' : '');
    sellTab.className = 'shop-tab' + (gameState.shopTab === 'sell' ? ' active' : '');

    if (gameState.shopTab === 'buy') {
        renderShopBuy(content);
    } else {
        renderShopSell(content);
    }

    document.getElementById('shopMoney').textContent = gameState.money;
}

function renderShopBuy(container) {
    let html = '';

    html += '<div class="shop-section"><div class="shop-section-title">🎣 钓竿</div>';
    SHOP_ITEMS.rods.forEach(rod => {
        const isEquipped = gameState.equippedRod === rod.id;
        const canBuy = gameState.money >= rod.price && !rod.owned;
        const isOwned = rod.owned;

        html += `<div class="shop-item ${isEquipped ? 'equipped' : ''} ${isOwned ? 'owned' : ''}">
            <div class="shop-item-icon">${rod.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${rod.name} ${isEquipped ? '<span class="equipped-badge">装备中</span>' : ''}</div>
                <div class="shop-item-desc">${rod.desc}</div>
                <div class="shop-item-stats">
                    ${rod.rarityBonus > 0 ? `<span class="stat-tag rare">稀有+${(rod.rarityBonus * 100)}%</span>` : ''}
                    ${rod.legendaryBonus > 0 ? `<span class="stat-tag legend">传说+${(rod.legendaryBonus * 100)}%</span>` : ''}
                    ${rod.zoneBonus > 0 ? `<span class="stat-tag zone">区域+${rod.zoneBonus}</span>` : ''}
                    ${rod.progressBonus > 0 ? `<span class="stat-tag progress">进度+${(rod.progressBonus * 100)}%</span>` : ''}
                </div>
            </div>
            <div class="shop-item-action">`;

        if (isOwned && !isEquipped) {
            html += `<button class="shop-btn equip-btn" onclick="equipRod('${rod.id}')">装备</button>`;
        } else if (isEquipped) {
            html += `<span class="shop-btn equipped-btn">✓ 装备中</span>`;
        } else if (canBuy) {
            html += `<button class="shop-btn buy-btn" onclick="buyRod('${rod.id}')">💰 ${rod.price}</button>`;
        } else {
            html += `<button class="shop-btn disabled-btn" disabled>💰 ${rod.price}</button>`;
        }

        html += '</div></div>';
    });
    html += '</div>';

    html += '<div class="shop-section"><div class="shop-section-title">🪱 鱼饵</div>';
    SHOP_ITEMS.baits.forEach(bait => {
        const isEquipped = gameState.equippedBait === bait.id;
        const canBuy = gameState.money >= bait.price;
        const count = isEquipped ? gameState.baitCount : 0;

        html += `<div class="shop-item ${isEquipped ? 'equipped' : ''}">
            <div class="shop-item-icon">${bait.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${bait.name} ${isEquipped ? '<span class="equipped-badge">装备中 ×' + count + '</span>' : ''}</div>
                <div class="shop-item-desc">${bait.desc}</div>
                <div class="shop-item-stats">
                    ${bait.biteTimeBonus > 0 ? `<span class="stat-tag bite">咬钩+${(bait.biteTimeBonus * 100)}%</span>` : ''}
                    ${bait.rarityBonus > 0 ? `<span class="stat-tag rare">稀有+${(bait.rarityBonus * 100)}%</span>` : ''}
                </div>
            </div>
            <div class="shop-item-action">
                <button class="shop-btn buy-btn" onclick="buyBait('${bait.id}')" ${canBuy ? '' : 'disabled'}>💰 ${bait.price}</button>
            </div>
        </div>`;
    });
    html += '</div>';

    html += '<div class="shop-section"><div class="shop-section-title">💍 饰品</div>';
    SHOP_ITEMS.accessories.forEach(acc => {
        if (acc.id === 'acc_none') return;
        const isEquipped = gameState.equippedAccessory === acc.id;
        const canBuy = gameState.money >= acc.price && !acc.owned;
        const isOwned = acc.owned;

        html += `<div class="shop-item ${isEquipped ? 'equipped' : ''} ${isOwned ? 'owned' : ''}">
            <div class="shop-item-icon">${acc.icon}</div>
            <div class="shop-item-info">
                <div class="shop-item-name">${acc.name} ${isEquipped ? '<span class="equipped-badge">装备中</span>' : ''}</div>
                <div class="shop-item-desc">${acc.desc}</div>
                <div class="shop-item-stats">
                    ${acc.luckBonus > 0 ? `<span class="stat-tag rare">幸运+${acc.luckBonus}</span>` : ''}
                </div>
            </div>
            <div class="shop-item-action">`;

        if (isOwned && !isEquipped) {
            html += `<button class="shop-btn equip-btn" onclick="equipAccessory('${acc.id}')">装备</button>`;
        } else if (isEquipped) {
            html += `<span class="shop-btn equipped-btn">✓ 装备中</span>`;
        } else if (canBuy) {
            html += `<button class="shop-btn buy-btn" onclick="buyAccessory('${acc.id}')">💰 ${acc.price}</button>`;
        } else {
            html += `<button class="shop-btn disabled-btn" disabled>💰 ${acc.price}</button>`;
        }

        html += '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

function renderShopSell(container) {
    const fishCount = {};
    let totalValue = 0;
    gameState.inventory.forEach(fish => {
        fishCount[fish.id] = (fishCount[fish.id] || 0) + 1;
        totalValue += fish.value;
    });

    let html = `<div class="shop-sell-header">
        <span>背包: ${gameState.inventory.length} 条鱼</span>
        <span>总价值: 💰 ${totalValue}</span>
        ${totalValue > 0 ? '<button class="shop-btn sell-all-btn" onclick="sellAllFish()">全部卖出</button>' : ''}
    </div>`;

    if (gameState.inventory.length === 0) {
        html += '<div class="empty-inventory"><div class="empty-inventory-icon">🎣</div><div>背包空空如也，快去钓鱼吧！</div></div>';
    } else {
        Object.entries(fishCount).forEach(([id, count]) => {
            const fish = GAME_CONFIG.fishTypes.find(f => f.id === id);
            html += `<div class="shop-item sell-item">
                <div class="shop-item-icon" style="background: ${fish.color}20; border: 2px solid ${fish.color};">${fish.icon}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name" style="color: ${fish.color}">${fish.name}<span class="fish-rarity ${fish.rarity}">${getRarityText(fish.rarity)}</span></div>
                    <div class="shop-item-desc">💰 ${fish.value} 金币/条 · 数量: ×${count}</div>
                </div>
                <div class="shop-item-action">
                    <button class="shop-btn sell-btn" onclick="sellFish('${id}')">卖出</button>
                    <button class="shop-btn sell-btn" onclick="sellFish('${id}', true)">全卖</button>
                </div>
            </div>`;
        });
    }

    container.innerHTML = html;
}

// ==================== 装备系统 ====================
function openEquipment() {
    if (gameState.fishingState !== FISHING_STATE.IDLE) return;
    AudioSystem.sfx.openMenu();
    gameState.equipmentPanelOpen = true;
    renderEquipment();
    document.getElementById('equipmentOverlay').classList.add('active');
}

function closeEquipment() {
    AudioSystem.sfx.closeMenu();
    gameState.equipmentPanelOpen = false;
    document.getElementById('equipmentOverlay').classList.remove('active');
}

function renderEquipment() {
    const container = document.getElementById('equipmentContent');
    const luck = getTotalLuck();

    let html = '';

    html += `
        <div class="equipment-overview">
            <div class="equip-slot ${gameState.equippedRod ? 'equipped' : ''}">
                <div class="equip-label">🎣 钓竿</div>
                <div class="equip-icon">${getCurrentRod().icon}</div>
                <div class="equip-name">${getCurrentRod().name}</div>
            </div>
            <div class="equip-slot ${gameState.equippedBait ? 'equipped' : ''}">
                <div class="equip-label">🪱 鱼饵</div>
                <div class="equip-icon">${getCurrentBait()?.icon || '❌'}</div>
                <div class="equip-name">${getCurrentBait()?.name || '无'} ${gameState.baitCount > 0 ? '×' + gameState.baitCount : ''}</div>
            </div>
            <div class="equip-slot ${gameState.equippedAccessory !== 'acc_none' ? 'equipped' : ''}">
                <div class="equip-label">💍 饰品</div>
                <div class="equip-icon">${getCurrentAccessory().icon}</div>
                <div class="equip-name">${getCurrentAccessory().name}</div>
                <div class="equip-bonus">幸运 +${luck}</div>
            </div>
        </div>
    `;

    html += '<div class="equip-section"><div class="equip-section-title">🎣 选择钓竿</div><div class="equip-grid">';
    SHOP_ITEMS.rods.forEach(rod => {
        const isEquipped = gameState.equippedRod === rod.id;
        const canEquip = rod.owned;
        html += `
            <div class="equip-card ${isEquipped ? 'active' : ''} ${!canEquip ? 'locked' : ''}" onclick="${canEquip ? `equipRod('${rod.id}')` : ''}">
                <div class="equip-card-icon">${rod.icon}</div>
                <div class="equip-card-name">${rod.name}</div>
                <div class="equip-card-desc">${rod.desc}</div>
                ${!canEquip ? '<div class="equip-card-locked">🔒 商店购买</div>' : ''}
                ${isEquipped ? '<div class="equip-card-status">✓ 装备中</div>' : ''}
            </div>
        `;
    });
    html += '</div></div>';

    html += '<div class="equip-section"><div class="equip-section-title">💍 选择饰品</div><div class="equip-grid">';
    SHOP_ITEMS.accessories.forEach(acc => {
        const isEquipped = gameState.equippedAccessory === acc.id;
        const canEquip = acc.owned;
        html += `
            <div class="equip-card ${isEquipped ? 'active' : ''} ${!canEquip ? 'locked' : ''}" onclick="${canEquip ? `equipAccessory('${acc.id}')` : ''}">
                <div class="equip-card-icon">${acc.icon}</div>
                <div class="equip-card-name">${acc.name}</div>
                <div class="equip-card-desc">${acc.desc}</div>
                ${!canEquip ? '<div class="equip-card-locked">🔒 商店购买</div>' : ''}
                ${isEquipped ? '<div class="equip-card-status">✓ 装备中</div>' : ''}
            </div>
        `;
    });
    html += '</div></div>';

    container.innerHTML = html;
}

function equipAccessory(accessoryId) {
    const acc = SHOP_ITEMS.accessories.find(a => a.id === accessoryId);
    if (!acc || !acc.owned) return;
    gameState.equippedAccessory = accessoryId;
    AudioSystem.sfx.coin();
    showNotification(`💍 装备了 ${acc.name}！幸运值 +${acc.luckBonus}`, 'success');
    updateHUD();
    renderEquipment();
}

function buyRod(rodId) {
    const rod = SHOP_ITEMS.rods.find(r => r.id === rodId);
    if (!rod || rod.owned || gameState.money < rod.price) return;
    gameState.money -= rod.price;
    rod.owned = true;
    gameState.equippedRod = rodId;
    AudioSystem.sfx.buy();
    showNotification(`✨ 购买并装备了 ${rod.name}！`, 'success');
    updateHUD();
    renderShop();
}

function buyBait(baitId) {
    const bait = SHOP_ITEMS.baits.find(b => b.id === baitId);
    if (!bait || gameState.money < bait.price) return;
    gameState.money -= bait.price;
    if (gameState.equippedBait === baitId) {
        gameState.baitCount += 5;
    } else {
        gameState.equippedBait = baitId;
        gameState.baitCount = 5;
    }
    AudioSystem.sfx.buy();
    showNotification(`✨ 购买了 ${bait.name} ×5！`, 'success');
    updateHUD();
    renderShop();
}

function buyAccessory(accessoryId) {
    const acc = SHOP_ITEMS.accessories.find(a => a.id === accessoryId);
    if (!acc || acc.owned || gameState.money < acc.price) return;
    gameState.money -= acc.price;
    acc.owned = true;
    gameState.equippedAccessory = accessoryId;
    AudioSystem.sfx.buy();
    showNotification(`💍 购买并装备了 ${acc.name}！幸运值 +${acc.luckBonus}`, 'success');
    updateHUD();
    renderShop();
}

function equipRod(rodId) {
    const rod = SHOP_ITEMS.rods.find(r => r.id === rodId);
    if (!rod || !rod.owned) return;
    gameState.equippedRod = rodId;
    AudioSystem.sfx.coin();
    showNotification(`🎣 装备了 ${rod.name}！`, 'info');
    updateHUD();
    renderShop();
}

function sellFish(fishId, sellAll = false) {
    const fishType = GAME_CONFIG.fishTypes.find(f => f.id === fishId);
    if (!fishType) return;
    const count = sellAll ? gameState.inventory.filter(f => f.id === fishId).length : 1;
    if (count === 0) return;
    let sold = 0;
    for (let i = gameState.inventory.length - 1; i >= 0 && sold < count; i--) {
        if (gameState.inventory[i].id === fishId) {
            gameState.inventory.splice(i, 1);
            gameState.money += fishType.value;
            sold++;
        }
    }
    AudioSystem.sfx.sell();
    showNotification(`💰 卖出 ${fishType.name} ×${sold}，获得 ${fishType.value * sold} 金币！`, 'success');
    updateHUD();
    renderShop();
}

function sellAllFish() {
    if (gameState.inventory.length === 0) return;
    let totalEarned = 0;
    gameState.inventory.forEach(fish => { totalEarned += fish.value; });
    gameState.money += totalEarned;
    gameState.inventory = [];
    AudioSystem.sfx.sell();
    setTimeout(() => AudioSystem.sfx.coin(), 300);
    showNotification(`💰 全部卖出！获得 ${totalEarned} 金币！`, 'success');
    updateHUD();
    renderShop();
}

// ==================== 任务系统 ====================
const QUEST_CONFIG = {
    quests: [
        { id: 'quest_1', name: '初入钓途', desc: '钓到3条鲤鱼', target: { fishId: 'carp', count: 3 }, reward: { exp: 50, money: 30 }, completed: false, turnedIn: false },
        { id: 'quest_2', name: '小有收获', desc: '钓到5条鱼', target: { fishId: 'any', count: 5 }, reward: { exp: 80, money: 50 }, completed: false, turnedIn: false },
        { id: 'quest_3', name: '稀有挑战', desc: '钓到1条稀有鱼', target: { rarity: 'rare' }, reward: { exp: 150, money: 100 }, completed: false, turnedIn: false },
        { id: 'quest_4', name: '深海渔夫', desc: '在深水区钓到1条鱼', target: { zone: 'deep' }, reward: { exp: 200, money: 150 }, completed: false, turnedIn: false },
        { id: 'quest_5', name: '航海家', desc: '在海边钓到1条鱼', target: { zone: 'sea' }, reward: { exp: 180, money: 120 }, completed: false, turnedIn: false }
    ],
    currentQuestIndex: 0
};

function checkQuestCompletion() {
    const quest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];
    if (!quest || quest.turnedIn) return;

    let completed = false;
    if (quest.target.fishId) {
        if (quest.target.fishId === 'any') {
            completed = gameState.inventory.length >= quest.target.count;
        } else {
            const count = gameState.inventory.filter(f => f.id === quest.target.fishId).length;
            completed = count >= quest.target.count;
        }
    } else if (quest.target.rarity) {
        completed = gameState.inventory.some(f => f.rarity === quest.target.rarity);
    } else if (quest.target.zone) {
        completed = gameState.lastCatchZone === quest.target.zone;
    }

    quest.completed = completed;
    if (completed) {
        showNotification('📋 任务可提交！找渔夫老张领取奖励', 'info');
    }
}

function turnInQuest() {
    const quest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];
    if (!quest || quest.turnedIn) {
        showDialog('渔夫老张', '目前没有新的任务了，年轻人继续加油钓鱼吧！', '🧔');
        return;
    }

    if (!quest.completed) {
        showDialog('渔夫老张', `任务还没完成呢！\n${quest.desc}`, '🧔');
        return;
    }

    gameState.exp += quest.reward.exp;
    gameState.money += quest.reward.money;
    quest.turnedIn = true;
    QUEST_CONFIG.currentQuestIndex++;

    AudioSystem.sfx.levelUp();
    showNotification(`🎉 完成任务「${quest.name}」！获得 ${quest.reward.exp} 经验、${quest.reward.money} 金币！`, 'success');
    updateHUD();
}

// ==================== 鱼影系统 ====================
function initFishShadows() {
    gameState.fishShadows = [];
}

function updateFishShadows() {
    const now = Date.now();

    if (now - gameState.lastShadowSpawn > 2000 + Math.random() * 3000) {
        const waterTiles = [];
        for (let y = 0; y < GAME_CONFIG.mapHeight; y++) {
            for (let x = 0; x < GAME_CONFIG.mapWidth; x++) {
                if (mapData.tiles[y][x] === 1 || mapData.tiles[y][x] === 5 || mapData.tiles[y][x] === 10) {
                    waterTiles.push({ x, y });
                }
            }
        }

        if (waterTiles.length > 0) {
            const tile = waterTiles[Math.floor(Math.random() * waterTiles.length)];
            gameState.fishShadows.push({
                x: tile.x * GAME_CONFIG.tileSize + 16,
                y: tile.y * GAME_CONFIG.tileSize + 16,
                size: 0,
                maxSize: 8 + Math.random() * 8,
                opacity: 0,
                phase: 'appear',
                startTime: now,
                duration: 2000 + Math.random() * 2000
            });
        }
        gameState.lastShadowSpawn = now;
    }

    gameState.fishShadows = gameState.fishShadows.filter(shadow => {
        const elapsed = now - shadow.startTime;

        if (shadow.phase === 'appear') {
            const progress = Math.min(elapsed / 500, 1);
            shadow.size = shadow.maxSize * progress;
            shadow.opacity = 0.6 * progress;
            if (progress >= 1) shadow.phase = 'stay';
        } else if (shadow.phase === 'stay') {
            shadow.size = shadow.maxSize + Math.sin(elapsed * 0.005) * 2;
            if (elapsed > shadow.duration - 500) shadow.phase = 'disappear';
        } else if (shadow.phase === 'disappear') {
            const progress = Math.min((elapsed - (shadow.duration - 500)) / 500, 1);
            shadow.opacity = 0.6 * (1 - progress);
            shadow.size = shadow.maxSize * (1 - progress * 0.5);
        }

        return elapsed < shadow.duration;
    });
}

// ==================== 水怪影子 (夜晚深水区) ====================
function updateWaterMonsterShadow() {
    const scene = getCurrentScene();
    const isNight = scene.hasStars && !scene.hasSun;

    if (isNight && !gameState.waterMonsterShadow) {
        // 生成水怪影子 - 在湖泊深水区中心
        const monsterX = 14 * GAME_CONFIG.tileSize;
        const monsterY = 22 * GAME_CONFIG.tileSize;
        gameState.waterMonsterShadow = {
            x: monsterX,
            y: monsterY,
            targetX: monsterX,
            targetY: monsterY,
            size: 40,
            opacity: 0,
            phase: 'appear',
            startTime: Date.now(),
            moveTimer: 0,
            baseY: monsterY
        };
    } else if (!isNight && gameState.waterMonsterShadow) {
        gameState.waterMonsterShadow = null;
    }

    if (gameState.waterMonsterShadow) {
        const monster = gameState.waterMonsterShadow;
        const now = Date.now();
        const elapsed = now - monster.startTime;

        // 移动行为
        monster.moveTimer += 16;
        if (monster.moveTimer > 3000) {
            monster.moveTimer = 0;
            // 随机移动到附近深水区
            monster.targetX = monster.x + (Math.random() - 0.5) * 200;
            monster.targetY = monster.baseY + (Math.random() - 0.5) * 150;
            monster.targetX = Math.max(6 * GAME_CONFIG.tileSize, Math.min(monster.targetX, 22 * GAME_CONFIG.tileSize));
            monster.targetY = Math.max(16 * GAME_CONFIG.tileSize, Math.min(monster.targetY, 28 * GAME_CONFIG.tileSize));
        }

        // 缓慢移动向目标
        monster.x += (monster.targetX - monster.x) * 0.001;
        monster.y += (monster.targetY - monster.y) * 0.001;

        // 上下浮动
        monster.floatOffset = Math.sin(elapsed * 0.001) * 8;

        // 透明度动画
        if (monster.phase === 'appear') {
            monster.opacity = Math.min(monster.opacity + 0.01, 0.7);
            if (monster.opacity >= 0.7) monster.phase = 'stay';
        }
    }
}

// ==================== 海浪音效更新 ====================
function updateSeaSound() {
    if (!AudioSystem.bgmEnabled || AudioSystem.isMuted) {
        AudioSystem.waveSound.stop();
        return;
    }

    // 检查玩家是否靠近海边 (tile type 10)
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    let nearSea = false;

    // 检查周围9格是否有海
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            const nx = tileX + dx;
            const ny = tileY + dy;
            if (nx >= 0 && nx < GAME_CONFIG.mapWidth && ny >= 0 && ny < GAME_CONFIG.mapHeight) {
                if (mapData.tiles[ny] && mapData.tiles[ny][nx] === 10) {
                    nearSea = true;
                    break;
                }
            }
        }
        if (nearSea) break;
    }

    AudioSystem.waveSound.update(nearSea);

    if (nearSea && !AudioSystem.waveSound.active) {
        AudioSystem.waveSound.start();
    } else if (!nearSea && AudioSystem.waveSound.active) {
        AudioSystem.waveSound.stop();
    }
}

function drawWaterMonsterShadow() {
    const monster = gameState.waterMonsterShadow;
    if (!monster) return;

    const screenX = monster.x - camera.x;
    const screenY = monster.y - camera.y + (monster.floatOffset || 0);

    if (screenX < -100 || screenX > canvas.width + 100 || screenY < -100 || screenY > canvas.height + 100) return;

    ctx.save();
    ctx.globalAlpha = monster.opacity;
    ctx.fillStyle = '#0a0a15';

    // 水怪主体 - 大型椭圆阴影
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, monster.size, monster.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 水怪头部 - 左侧
    ctx.beginPath();
    ctx.ellipse(screenX - monster.size * 0.7, screenY - 5, monster.size * 0.35, monster.size * 0.3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 水怪尾鳍 - 右侧
    ctx.beginPath();
    ctx.moveTo(screenX + monster.size * 0.8, screenY);
    ctx.lineTo(screenX + monster.size * 1.4, screenY - monster.size * 0.3);
    ctx.lineTo(screenX + monster.size * 1.4, screenY + monster.size * 0.3);
    ctx.closePath();
    ctx.fill();

    // 水怪背鳍
    ctx.beginPath();
    ctx.moveTo(screenX - monster.size * 0.2, screenY - monster.size * 0.4);
    ctx.lineTo(screenX + monster.size * 0.1, screenY - monster.size * 0.8);
    ctx.lineTo(screenX + monster.size * 0.3, screenY - monster.size * 0.4);
    ctx.closePath();
    ctx.fill();

    // 眼睛 - 发光效果
    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.beginPath();
    ctx.arc(screenX - monster.size * 0.85, screenY - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawFishShadows() {
    for (const shadow of gameState.fishShadows) {
        const screenX = shadow.x - camera.x;
        const screenY = shadow.y - camera.y;

        if (screenX < -20 || screenX > canvas.width + 20 || screenY < -20 || screenY > canvas.height + 20) continue;

        ctx.save();
        ctx.globalAlpha = shadow.opacity;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(Math.floor(screenX), Math.floor(screenY), shadow.size, shadow.size * 0.4, Math.sin(shadow.startTime * 0.001) * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(Math.floor(screenX - shadow.size * 0.8), Math.floor(screenY));
        ctx.lineTo(Math.floor(screenX - shadow.size * 1.3), Math.floor(screenY - shadow.size * 0.3));
        ctx.lineTo(Math.floor(screenX - shadow.size * 1.3), Math.floor(screenY + shadow.size * 0.3));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 渲染 ====================
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSkyAndBackground();

    // 渲染地图
    const startX = Math.max(0, Math.floor(camera.x / GAME_CONFIG.tileSize));
    const startY = Math.max(0, Math.floor(camera.y / GAME_CONFIG.tileSize));
    const endX = Math.min(GAME_CONFIG.mapWidth, Math.ceil((camera.x + canvas.width) / GAME_CONFIG.tileSize) + 1);
    const endY = Math.min(GAME_CONFIG.mapHeight, Math.ceil((camera.y + canvas.height) / GAME_CONFIG.tileSize) + 1);

    for (let y = startY; y < endY; y++) {
        if (!mapData.tiles[y]) continue;
        for (let x = startX; x < endX; x++) {
            const tileType = mapData.tiles[y][x];
            if (tileType !== undefined) {
                drawTile(x, y, tileType);
            }
        }
    }

    // 绘制鱼影
    drawFishShadows();

    // 绘制水怪影子 (夜晚)
    drawWaterMonsterShadow();

    // 绘制码头
    drawDock();

    // 绘制路灯 (夜晚)
    drawStreetLamps();

    // 绘制小船
    drawBoat();

    // NPC (夜晚不显示回家的NPC)
    const currentPhase = GAME_CONFIG.timeSystem.currentPhase;
    const isNightTime = currentPhase === 'night' || currentPhase === 'midnight';
    for (const npc of npcs) {
        if (isNightTime && npc.nightHide) continue;
        drawNPC(npc);
    }

    // 玩家
    if (!gameState.isOnBoat) {
        drawPlayer(
            Math.floor(player.x - camera.x),
            Math.floor(player.y - camera.y),
            player.direction,
            player.isMoving,
            player.animationFrame
        );
    } else {
        // 船上钓鱼时，鱼线跟随船的位置
        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            const boatTileX = Math.floor((gameState.boat.x + player.width / 2) / GAME_CONFIG.tileSize);
            const boatTileY = Math.floor((gameState.boat.y + player.height / 2) / GAME_CONFIG.tileSize);
            player.fishingRod.floatX = (boatTileX + (player.direction === 'left' ? -1 : 1)) * GAME_CONFIG.tileSize + 16;
            player.fishingRod.floatY = boatTileY * GAME_CONFIG.tileSize + 16;
        }
        // 绘制船上角色（坐姿）
        drawPlayerOnBoat(
            Math.floor(gameState.boat.x - camera.x),
            Math.floor(gameState.boat.y - camera.y),
            player.direction,
            player.isMoving,
            player.animationFrame
        );
    }

    // 粒子
    particles.draw(ctx, camera);

    // NPC提示
    const nearbyNPC = getNearbyNPC();
    if (nearbyNPC && gameState.fishingState === FISHING_STATE.IDLE && !gameState.isOnBoat) {
        const screenX = nearbyNPC.x - camera.x + 15;
        const screenY = nearbyNPC.y - camera.y - 35;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(Math.floor(screenX - 55), Math.floor(screenY - 5), 130, 22);
        ctx.fillStyle = '#FFD700';
        ctx.font = '12px Microsoft YaHei';
        ctx.textAlign = 'center';
        if (nearbyNPC.type === 'shop') {
            ctx.fillText('按空格键打开商店', screenX + 10, screenY + 10);
        } else {
            ctx.fillText('按空格键对话/任务', screenX + 10, screenY + 10);
        }
    }

    // 夜晚黑暗效果覆盖层
    if (currentPhase === 'night' || currentPhase === 'midnight') {
        const darkness = currentPhase === 'midnight' ? 0.4 : 0.25;
        // 边缘暗角效果
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.9
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `rgba(0, 0, 20, ${darkness})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ==================== 游戏主循环 ====================
function gameLoop(timestamp) {
    if (!gameState.isPlaying) return;

    const dt = timestamp - gameState.lastTime;
    gameState.deltaTime = dt > 0 ? Math.min(dt, 50) : 16.67;
    gameState.lastTime = timestamp;

    updatePlayer(gameState.deltaTime);
    updateCamera();
    updateTimeSystem();
    updateBiteAlertUI();
    updateFishingGame(gameState.deltaTime);
    updateFishShadows();
    updateWaterMonsterShadow();
    updateSeaSound();
    particles.update();
    render();

    requestAnimationFrame(gameLoop);
}

// ==================== 键盘事件 ====================
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;

    if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (!gameState.isPlaying) return;

        // 登船/下船
        if (gameState.fishingState === FISHING_STATE.IDLE) {
            if (isNearBoat() && !gameState.isOnBoat) {
                gameState.isOnBoat = true;
                AudioSystem.sfx.horn();
                showNotification('🚣 登上小船！使用WASD移动，E键下船', 'success');
            } else if (gameState.isOnBoat) {
                if (isBoatAtDock()) {
                    gameState.isOnBoat = false;
                    // 玩家下船到码头上方的陆地
                    player.x = (DOCK.x + DOCK.width / 2) * GAME_CONFIG.tileSize - player.width / 2;
                    player.y = (DOCK.y - 1) * GAME_CONFIG.tileSize;
                    AudioSystem.sfx.splash();
                    showNotification('🧍 下船了！', 'info');
                } else {
                    showNotification('⚠️ 需要靠近码头才能下船！', 'warning');
                }
            } else if (!document.getElementById('saveOverlay').classList.contains('active')) {
                // E键打开装备栏
                if (gameState.equipmentPanelOpen) {
                    closeEquipment();
                } else {
                    openEquipment();
                }
            }
        }
    }

    if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        if (gameState.fishingState === FISHING_STATE.IDLE && (isNearWater() || gameState.isOnBoat)) {
            startCasting();
        }
    }

    if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (!gameState.isPlaying) return;

        if (gameState.fishingState === FISHING_STATE.BITE_ALERT) {
            respondToBite();
        } else if (gameState.fishingState === FISHING_STATE.IDLE) {
            const npc = getNearbyNPC();
            if (npc) {
                if (npc.type === 'shop') {
                    openShop();
                } else {
                    const quest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];
                    if (quest && !quest.turnedIn && quest.completed) {
                        turnInQuest();
                    } else if (quest && !quest.turnedIn) {
                        showDialog(npc.name, `【${quest.name}】\n${quest.desc}\n\n🎁 奖励：${quest.reward.exp} 经验 + ${quest.reward.money} 金币\n\n${quest.completed ? '✅ 已完成，按空格键领取奖励！' : '⏳ 任务进行中...'}`, npc.avatar);
                    } else {
                        showDialog(npc.name, '恭喜你！所有任务都完成了，你已经是真正的钓鱼大师！', npc.avatar);
                    }
                }
            }
        }
    }

    if (e.key === 'b' || e.key === 'B') {
        if (document.getElementById('inventoryOverlay').classList.contains('active')) {
            closeInventory();
        } else if (!document.getElementById('shopOverlay').classList.contains('active') &&
                   !document.getElementById('saveOverlay').classList.contains('active') && !gameState.isOnBoat) {
            openInventory();
        }
    }

    if (e.key === 'q' || e.key === 'Q') {
        if (gameState.fishingState === FISHING_STATE.IDLE && !gameState.isOnBoat &&
            !document.getElementById('saveOverlay').classList.contains('active') &&
            !document.getElementById('encyclopediaOverlay').classList.contains('active')) {
            toggleQuestPanel();
        }
    }

    // P键 - 打开图鉴
    if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            showNotification('⚠️ 钓鱼中无法打开图鉴', 'warning');
            return;
        }
        if (document.getElementById('encyclopediaOverlay').classList.contains('active')) {
            closeEncyclopedia();
        } else {
            openEncyclopedia();
        }
    }

    if (e.key === 't' || e.key === 'T') {
        toggleControlsHint();
    }

    // N键 - 打开存档菜单
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            showNotification('⚠️ 钓鱼中无法打开存档菜单', 'warning');
            return;
        }
        if (document.getElementById('saveOverlay').classList.contains('active')) {
            closeSaveMenu();
        } else {
            openSaveMenu();
        }
    }

    if (e.key === 'm' || e.key === 'M') {
        toggleMute();
    }

    // F5 快速存档
    if (e.key === 'F5') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            showNotification('⚠️ 钓鱼中无法存档', 'warning');
            return;
        }
        // 自动保存到槽位0
        SaveSystem.saveGame(0);
    }

    // F9 快速读档
    if (e.key === 'F9') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            showNotification('⚠️ 钓鱼中无法读档', 'warning');
            return;
        }
        SaveSystem.loadGame(0);
    }

    if (e.key === 'Escape') {
        closeCatchModal();
        closeInventory();
        closeShop();
        closeSaveMenu();
        closeEncyclopedia();
        if (gameState.equipmentPanelOpen) closeEquipment();
        if (gameState.questPanelOpen) toggleQuestPanel();
        if (gameState.controlsHintOpen) toggleControlsHint();
        document.getElementById('dialogBox').classList.remove('active');

        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            clearTimeout(gameState.biteTimeout);
            clearTimeout(gameState.biteAlertTimeout);
            fishingGame.active = false;
            gameState.fishingState = FISHING_STATE.IDLE;
            player.fishingRod.isCast = false;
            document.getElementById('castingUI').classList.remove('active');
            document.getElementById('biteAlertUI').classList.remove('active');
            document.getElementById('fishingUI').classList.remove('active');
            showNotification('⛔ 取消了钓鱼', 'info');
        }
    }
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

function toggleMute() {
    const isMuted = AudioSystem.toggleMute();
    document.getElementById('muteBtn').textContent = isMuted ? '🔕' : '🔔';
    document.getElementById('muteBtn').classList.toggle('muted', isMuted);
    showNotification(isMuted ? '🔕 已静音' : '🔔 声音已开启', isMuted ? 'warning' : 'success');
}

function toggleBGM() {
    const bgmEnabled = AudioSystem.toggleBGM();
    document.getElementById('bgmBtn').classList.toggle('muted', !bgmEnabled);
    showNotification(bgmEnabled ? '🎵 背景音乐已开启' : '🎵 背景音乐已关闭', bgmEnabled ? 'success' : 'info');
}

function toggleSFX() {
    const sfxEnabled = AudioSystem.toggleSFX();
    document.getElementById('sfxBtn').classList.toggle('muted', !sfxEnabled);
    showNotification(sfxEnabled ? '🔊 音效已开启' : '🔊 音效已关闭', sfxEnabled ? 'success' : 'info');
}

// ==================== 开始游戏 ====================
function startGame() {
    AudioSystem.init();
    document.getElementById('startScreen').classList.add('hidden');
    initMap();
    initFishShadows();

    gameState.equippedBait = 'bait_worm';
    gameState.baitCount = 10;

    gameState.isPlaying = true;
    gameState.lastTime = performance.now();
    updateHUD();
    requestAnimationFrame(gameLoop);

    // 初始不显示tips框，按T键才显示
    gameState.controlsHintOpen = false;
    const hint = document.querySelector('.controls-hint');
    hint.style.opacity = '0';
    hint.style.pointerEvents = 'none';

    setTimeout(() => {
        showDialog('欢迎来到像素钓鱼！', `🎮 操作说明：

WASD - 移动角色
F键 - 抛竿钓鱼
空格键 - 收竿/与NPC对话
E键 - 登船/下船/打开装备栏
B键 - 打开背包
Q键 - 任务菜单
N键 - 存档菜单

🌅 时间系统：黎明/白天/黄昏/夜晚/午夜五个时间段，不同时间段可钓到不同的鱼！

🚣 小船系统：找到小船后按E键登船，乘船可前往深水区！

🌊 海边系统：地图底部有大海，需要购买"海藻鱼饵"才能在海边钓鱼！

💡 提示：你现在位于湖泊上方，可以直接开始钓鱼！`, '👋');
        AudioSystem.sfx.success();
        AudioSystem.startBGM();
    }, 500);
}

// ==================== 初始化 ====================
initMap();
render();
