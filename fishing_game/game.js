// 像素钓鱼游戏 - 完善UI版
// Pixel Fishing Game - Enhanced UI Edition

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
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
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
        bite: () => AudioSystem.playTone(600, 0.1, 'square', 0.2),
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
        closeMenu: () => AudioSystem.playTone(330, 0.1, 'sine', 0.1)
    },
    
    startBGM() {
        if (!this.ctx || this.isMuted || !this.bgmEnabled) return;
        
        this.stopBGM();
        
        const melody = [
            { freq: 261.63, duration: 0.5 },
            { freq: 293.66, duration: 0.5 },
            { freq: 329.63, duration: 0.5 },
            { freq: 349.23, duration: 0.5 },
            { freq: 392.00, duration: 0.5 },
            { freq: 349.23, duration: 0.5 },
            { freq: 329.63, duration: 0.5 },
            { freq: 293.66, duration: 0.5 },
        ];
        
        let currentNote = 0;
        
        const playNextNote = () => {
            if (!this.bgmEnabled || this.isMuted) return;
            
            const note = melody[currentNote];
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = note.freq;
            
            gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + note.duration * 0.9);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + note.duration);
            
            this.bgmOscillators.push(osc);
            
            currentNote = (currentNote + 1) % melody.length;
            
            setTimeout(() => {
                if (this.bgmEnabled && !this.isMuted) {
                    playNextNote();
                }
            }, note.duration * 1000);
        };
        
        playNextNote();
    },
    
    stopBGM() {
        this.bgmOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {}
        });
        this.bgmOscillators = [];
    },
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBGM();
        } else if (this.bgmEnabled) {
            this.startBGM();
        }
        return this.isMuted;
    },
    
    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        if (!this.bgmEnabled) {
            this.stopBGM();
        } else if (!this.isMuted) {
            this.startBGM();
        }
        return this.bgmEnabled;
    },
    
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }
};

// 游戏配置
const GAME_CONFIG = {
    width: 800,
    height: 600,
    tileSize: 32,
    playerSpeed: 3,
    fishingTime: { min: 2, max: 5 },
    fishTypes: [
        { id: 'carp', name: '鲤鱼', rarity: 'common', color: '#FFA500', value: 10, chance: 0.4, icon: '🐟' },
        { id: 'bass', name: '鲈鱼', rarity: 'common', color: '#90EE90', value: 15, chance: 0.3, icon: '🐠' },
        { id: 'trout', name: '鳟鱼', rarity: 'uncommon', color: '#FF6347', value: 30, chance: 0.15, icon: '🐡' },
        { id: 'salmon', name: '鲑鱼', rarity: 'uncommon', color: '#FA8072', value: 50, chance: 0.1, icon: '🦈' },
        { id: 'golden', name: '金鱼', rarity: 'rare', color: '#FFD700', value: 100, chance: 0.04, icon: '🐡' },
        { id: 'legendary', name: '传说鱼', rarity: 'legendary', color: '#FF00FF', value: 500, chance: 0.01, icon: '🐉' }
    ]
};

// 游戏状态
const gameState = {
    isPlaying: false,
    isFishing: false,
    inventory: [],
    money: 0,
    level: 1,
    exp: 0,
    keys: {},
    lastTime: 0,
    notifications: []
};

// 玩家对象
const player = {
    x: 400,
    y: 300,
    width: 24,
    height: 32,
    direction: 'down',
    isMoving: false,
    animationFrame: 0,
    fishingRod: {
        isCast: false,
        targetX: 0,
        targetY: 0,
        floatX: 0,
        floatY: 0
    }
};

// 相机对象
const camera = { x: 0, y: 0 };

// 游戏地图
const mapData = { width: 40, height: 30, tiles: [] };

// NPC 列表
const npcs = [
    { x: 200, y: 150, name: '渔夫老张', dialog: '早安！今天天气不错，适合钓鱼。', avatar: '🧔' },
    { x: 600, y: 200, name: '小鱼贩', dialog: '钓到好鱼可以卖给我哦！', avatar: '👨‍💼' }
];

// 初始化地图
function initMap() {
    for (let y = 0; y < mapData.height; y++) {
        mapData.tiles[y] = [];
        for (let x = 0; x < mapData.width; x++) {
            const dx = x - 20;
            const dy = y - 15;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 8) {
                mapData.tiles[y][x] = 1;
            } else if (dist < 9) {
                mapData.tiles[y][x] = 3;
            } else if (Math.random() < 0.1 && dist > 12) {
                mapData.tiles[y][x] = 2;
            } else {
                mapData.tiles[y][x] = 0;
            }
        }
    }
    
    mapData.tiles[5][10] = 4;
    mapData.tiles[8][30] = 2;
    mapData.tiles[9][31] = 2;
    mapData.tiles[7][32] = 2;
}

// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// 绘制像素角色
function drawPlayer(x, y, direction, isMoving, frame) {
    const armOffset = isMoving ? Math.sin(frame * 0.5) * 3 : 0;
    const legOffset = isMoving ? Math.sin(frame * 0.5) * 4 : 0;
    
    // 身体底色
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(x + 4, y + 8, 16, 16);
    
    // 头部
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(x + 4, y, 16, 12);
    
    // 头发
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x + 2, y - 2, 20, 6);
    ctx.fillRect(x + 2, y, 4, 8);
    ctx.fillRect(x + 18, y, 4, 8);
    
    // 眼睛
    ctx.fillStyle = '#000';
    if (direction === 'down') {
        ctx.fillRect(x + 7, y + 4, 3, 3);
        ctx.fillRect(x + 14, y + 4, 3, 3);
    } else if (direction === 'left') {
        ctx.fillRect(x + 5, y + 4, 3, 3);
    } else if (direction === 'right') {
        ctx.fillRect(x + 14, y + 4, 3, 3);
    }
    
    // 身体（衣服）
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 2, y + 14, 20, 14);
    
    // 手臂
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(x - 2, y + 14 + armOffset, 4, 10);
    ctx.fillRect(x + 22, y + 14 - armOffset, 4, 10);
    
    // 腿部
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(x + 4, y + 26 + legOffset, 6, 8);
    ctx.fillRect(x + 14, y + 26 - legOffset, 6, 8);
    
    // 钓鱼竿
    if (gameState.isFishing || player.fishingRod.isCast) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 16);
        ctx.lineTo(x + 35, y + 8);
        ctx.stroke();
        
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 35, y + 8);
        ctx.lineTo(player.fishingRod.floatX - camera.x, player.fishingRod.floatY - camera.y);
        ctx.stroke();
        
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(player.fishingRod.floatX - camera.x - 3, player.fishingRod.floatY - camera.y - 3, 6, 6);
    }
}

// 绘制地图格子
function drawTile(x, y, type) {
    const screenX = x * GAME_CONFIG.tileSize - camera.x;
    const screenY = y * GAME_CONFIG.tileSize - camera.y;
    
    if (screenX < -GAME_CONFIG.tileSize || screenX > canvas.width ||
        screenY < -GAME_CONFIG.tileSize || screenY > canvas.height) {
        return;
    }
    
    switch (type) {
        case 0:
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#7CFC00' : '#7FFF00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            if ((x * y) % 7 === 0) {
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(screenX + 8, screenY + 8, 4, 4);
            }
            break;
            
        case 1:
            const waveOffset = Math.sin(Date.now() * 0.002 + x * 0.5 + y * 0.3) * 3;
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(screenX + waveOffset, screenY + 8, 16, 4);
            break;
            
        case 2:
            ctx.fillStyle = '#7CFC00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX + 12, screenY + 16, 8, 16);
            ctx.fillStyle = '#228B22';
            ctx.fillRect(screenX + 4, screenY, 24, 20);
            ctx.fillRect(screenX + 8, screenY - 4, 16, 8);
            break;
            
        case 3:
            ctx.fillStyle = '#DEB887';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(screenX + 4, screenY + 4, 4, 24);
            ctx.fillRect(screenX + 24, screenY + 4, 4, 24);
            break;
            
        case 4:
            ctx.fillStyle = '#7CFC00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            ctx.fillStyle = '#F4A460';
            ctx.fillRect(screenX + 4, screenY + 8, 24, 20);
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + 8);
            ctx.lineTo(screenX + 16, screenY - 4);
            ctx.lineTo(screenX + 32, screenY + 8);
            ctx.closePath();
            ctx.fill();
            break;
    }
}

// 绘制NPC
function drawNPC(npc) {
    const screenX = npc.x - camera.x;
    const screenY = npc.y - camera.y;
    
    // 身体
    ctx.fillStyle = '#9370DB';
    ctx.fillRect(screenX + 4, screenY + 12, 16, 16);
    
    // 头
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(screenX + 4, screenY + 4, 16, 12);
    
    // 帽子
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(screenX + 2, screenY, 20, 6);
    
    // 眼睛
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX + 7, screenY + 6, 2, 2);
    ctx.fillRect(screenX + 15, screenY + 6, 2, 2);
    
    // 名字标签
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenX - 10, screenY - 20, 50, 16);
    ctx.fillStyle = '#FFF';
    ctx.font = '10px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, screenX + 15, screenY - 8);
}

// 更新相机位置
function updateCamera() {
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;
    
    camera.x = Math.max(0, Math.min(camera.x, mapData.width * GAME_CONFIG.tileSize - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, mapData.height * GAME_CONFIG.tileSize - canvas.height));
}

// 碰撞检测
function checkCollision(x, y) {
    const tileX = Math.floor((x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((y + player.height / 2) / GAME_CONFIG.tileSize);
    
    if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) {
        return true;
    }
    
    const tile = mapData.tiles[tileY][tileX];
    return tile === 1 || tile === 2;
}

// 检测是否在水边
function isNearWater() {
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of directions) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (nx >= 0 && nx < mapData.width && ny >= 0 && ny < mapData.height) {
            if (mapData.tiles[ny][nx] === 1) {
                return true;
            }
        }
    }
    return false;
}

// 更新玩家位置
function updatePlayer() {
    if (gameState.isFishing) return;
    
    let dx = 0;
    let dy = 0;
    
    if (gameState.keys['w'] || gameState.keys['ArrowUp']) {
        dy = -GAME_CONFIG.playerSpeed;
        player.direction = 'up';
    }
    if (gameState.keys['s'] || gameState.keys['ArrowDown']) {
        dy = GAME_CONFIG.playerSpeed;
        player.direction = 'down';
    }
    if (gameState.keys['a'] || gameState.keys['ArrowLeft']) {
        dx = -GAME_CONFIG.playerSpeed;
        player.direction = 'left';
    }
    if (gameState.keys['d'] || gameState.keys['ArrowRight']) {
        dx = GAME_CONFIG.playerSpeed;
        player.direction = 'right';
    }
    
    player.isMoving = dx !== 0 || dy !== 0;
    
    if (player.isMoving) {
        player.animationFrame++;
        
        if (player.animationFrame % 15 === 0) {
            AudioSystem.sfx.step();
        }
        
        if (!checkCollision(player.x + dx, player.y)) {
            player.x += dx;
        }
        if (!checkCollision(player.x, player.y + dy)) {
            player.y += dy;
        }
    }
    
    player.x = Math.max(0, Math.min(player.x, mapData.width * GAME_CONFIG.tileSize - player.width));
    player.y = Math.max(0, Math.min(player.y, mapData.height * GAME_CONFIG.tileSize - player.height));
}

// 钓鱼小游戏
let fishingGame = {
    active: false,
    zoneY: 0,
    zoneHeight: 80,
    cursorY: 150,
    cursorVelocity: 0,
    progress: 30,
    fishCaught: null,
    gravity: 0.3,
    lift: 0.6,
    progressGain: 0.8,
    progressLoss: 0.2
};

function startFishingGame() {
    if (!isNearWater()) {
        showNotification('请走到水边再钓鱼！', 'warning');
        return;
    }
    
    gameState.isFishing = true;
    fishingGame.active = true;
    fishingGame.progress = 30;
    fishingGame.zoneY = Math.random() * 180 + 40;
    fishingGame.cursorY = 150;
    fishingGame.cursorVelocity = 0;
    
    player.fishingRod.isCast = true;
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    player.fishingRod.floatX = (tileX + (player.direction === 'left' ? -1 : 1)) * GAME_CONFIG.tileSize + 16;
    player.fishingRod.floatY = tileY * GAME_CONFIG.tileSize + 16;
    
    document.getElementById('fishingUI').classList.add('active');
    showNotification('🎣 有鱼上钩了！按住空格键控制！', 'info');
    
    AudioSystem.sfx.cast();
    
    setTimeout(() => {
        if (fishingGame.active) {
            AudioSystem.sfx.bite();
        }
    }, 1000);
}

function updateFishingGame() {
    if (!fishingGame.active) return;
    
    fishingGame.zoneY += Math.sin(Date.now() * 0.002) * 1.5;
    fishingGame.zoneY = Math.max(20, Math.min(220, fishingGame.zoneY));
    
    if (gameState.keys[' ']) {
        fishingGame.cursorVelocity -= fishingGame.lift;
    } else {
        fishingGame.cursorVelocity += fishingGame.gravity;
    }
    
    fishingGame.cursorVelocity *= 0.97;
    fishingGame.cursorY += fishingGame.cursorVelocity;
    fishingGame.cursorY = Math.max(5, Math.min(265, fishingGame.cursorY));
    
    const cursorCenter = fishingGame.cursorY + 15;
    const inZone = cursorCenter > fishingGame.zoneY - 5 && cursorCenter < fishingGame.zoneY + fishingGame.zoneHeight + 5;
    
    if (inZone) {
        fishingGame.progress += fishingGame.progressGain;
    } else {
        fishingGame.progress -= fishingGame.progressLoss;
    }
    
    fishingGame.progress = Math.max(0, Math.min(100, fishingGame.progress));
    
    // 更新UI
    const zone = document.getElementById('fishingZone');
    const cursor = document.getElementById('fishingCursor');
    const progressDisplay = document.getElementById('progressDisplay');
    
    zone.style.top = fishingGame.zoneY + 'px';
    zone.style.height = fishingGame.zoneHeight + 'px';
    cursor.style.top = fishingGame.cursorY + 'px';
    
    // 更新进度显示
    progressDisplay.textContent = Math.floor(fishingGame.progress) + '%';
    progressDisplay.className = 'progress-display ' + 
        (fishingGame.progress > 70 ? 'success' : fishingGame.progress > 30 ? 'warning' : 'danger');
    
    // 区域颜色根据进度变化
    if (fishingGame.progress > 70) {
        zone.style.boxShadow = '0 0 30px rgba(50,205,50,1)';
    } else if (fishingGame.progress < 30) {
        zone.style.boxShadow = '0 0 20px rgba(255,68,68,0.8)';
    } else {
        zone.style.boxShadow = '0 0 20px rgba(50,205,50,0.8)';
    }
    
    if (fishingGame.progress >= 100) {
        endFishingGame(true);
    } else if (fishingGame.progress <= 0) {
        endFishingGame(false);
    }
}

function endFishingGame(success) {
    fishingGame.active = false;
    gameState.isFishing = false;
    player.fishingRod.isCast = false;
    document.getElementById('fishingUI').classList.remove('active');
    
    if (success) {
        const fish = catchFish();
        gameState.inventory.push(fish);
        gameState.money += fish.value;
        gameState.exp += Math.floor(fish.value / 10);
        
        // 显示捕获弹窗
        showCatchModal(fish);
        
        // 创建浮动文字
        createFloatingText(player.x - camera.x + 12, player.y - camera.y - 20, `+${fish.value}`, 'gold');
        createFloatingText(player.x - camera.x + 12, player.y - camera.y - 40, `+${Math.floor(fish.value/10)} XP`, 'exp');
        
        AudioSystem.sfx.success();
        setTimeout(() => AudioSystem.sfx.coin(), 500);
        
        checkLevelUp();
        updateHUD();
    } else {
        showNotification('😔 鱼儿跑掉了...', 'error');
        AudioSystem.sfx.fail();
    }
}

// 随机钓鱼
function catchFish() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const fish of GAME_CONFIG.fishTypes) {
        cumulative += fish.chance;
        if (rand < cumulative) {
            return { ...fish, date: new Date() };
        }
    }
    
    return { ...GAME_CONFIG.fishTypes[0], date: new Date() };
}

// 检查升级
function checkLevelUp() {
    const expNeeded = gameState.level * 100;
    if (gameState.exp >= expNeeded) {
        gameState.level++;
        gameState.exp -= expNeeded;
        showNotification(`⭐ 升级了！现在等级 ${gameState.level}！`, 'success');
        AudioSystem.sfx.levelUp();
    }
}

// 浮动文字效果
function createFloatingText(x, y, text, type) {
    const el = document.createElement('div');
    el.className = 'floating-text ' + type;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.querySelector('.game-container').appendChild(el);
    
    setTimeout(() => el.remove(), 1500);
}

// UI 功能 - 显示对话框
function showDialog(title, text, avatar = '🎣') {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogText').textContent = text;
    document.getElementById('dialogAvatar').textContent = avatar;
    document.getElementById('dialogBox').classList.add('active');
    
    const closeHandler = (e) => {
        document.getElementById('dialogBox').classList.remove('active');
        window.removeEventListener('keydown', closeHandler);
        window.removeEventListener('click', closeHandler);
    };
    
    setTimeout(() => {
        window.addEventListener('keydown', closeHandler);
        window.addEventListener('click', closeHandler);
    }, 100);
}

// 显示通知
function showNotification(text, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notif = document.createElement('div');
    
    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };
    
    notif.className = 'notification ' + type;
    notif.innerHTML = `
        <span class="notification-icon">${icons[type]}</span>
        <span>${text}</span>
    `;
    
    container.appendChild(notif);
    
    // 触发显示动画
    requestAnimationFrame(() => {
        notif.classList.add('show');
    });
    
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// 更新HUD
function updateHUD() {
    document.getElementById('fishCount').textContent = gameState.inventory.length;
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = `Lv.${gameState.level}`;
    
    // 更新经验条
    const expNeeded = gameState.level * 100;
    const expPercent = (gameState.exp / expNeeded) * 100;
    document.getElementById('xpFill').style.width = expPercent + '%';
}

// 显示捕获弹窗
function showCatchModal(fish) {
    const modal = document.getElementById('catchModal');
    document.getElementById('catchFishIcon').textContent = fish.icon;
    document.getElementById('catchFishName').textContent = fish.name;
    document.getElementById('catchFishName').style.color = fish.color;
    document.getElementById('catchFishValue').textContent = fish.value;
    
    const rarityEl = document.getElementById('catchFishRarity');
    const rarityTexts = {
        common: '⭐ 普通',
        uncommon: '⭐⭐ 稀有',
        rare: '⭐⭐⭐ 珍贵',
        legendary: '👑 传说'
    };
    rarityEl.textContent = rarityTexts[fish.rarity];
    rarityEl.className = 'catch-rarity ' + fish.rarity;
    
    modal.classList.add('active');
}

function closeCatchModal() {
    document.getElementById('catchModal').classList.remove('active');
}

// 打开背包
function openInventory() {
    AudioSystem.sfx.openMenu();
    
    const list = document.getElementById('fishList');
    list.innerHTML = '';
    
    // 更新统计
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
        list.innerHTML = `
            <div class="empty-inventory">
                <div class="empty-inventory-icon">🎣</div>
                <div>背包是空的，快去钓鱼吧！</div>
            </div>
        `;
    } else {
        Object.entries(fishCount).forEach(([id, count]) => {
            const fish = GAME_CONFIG.fishTypes.find(f => f.id === id);
            const item = document.createElement('div');
            item.className = 'fish-item';
            item.innerHTML = `
                <div class="fish-icon-wrapper" style="background: ${fish.color}20; border: 2px solid ${fish.color};">
                    ${fish.icon}
                </div>
                <div class="fish-info">
                    <div class="fish-name" style="color: ${fish.color}">
                        ${fish.name}
                        <span class="fish-rarity ${fish.rarity}">${getRarityText(fish.rarity)}</span>
                    </div>
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
    const texts = {
        common: '普通',
        uncommon: '稀有',
        rare: '珍贵',
        legendary: '传说'
    };
    return texts[rarity] || '普通';
}

// 主渲染循环
function render() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            drawTile(x, y, mapData.tiles[y][x]);
        }
    }
    
    npcs.forEach(npc => drawNPC(npc));
    
    drawPlayer(
        player.x - camera.x,
        player.y - camera.y,
        player.direction,
        player.isMoving,
        player.animationFrame
    );
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            if (mapData.tiles[y][x] === 1) {
                const screenX = x * GAME_CONFIG.tileSize - camera.x;
                const screenY = y * GAME_CONFIG.tileSize - camera.y;
                if ((x + y + Math.floor(Date.now() / 500)) % 3 === 0) {
                    ctx.fillRect(screenX + 8, screenY + 8, 4, 4);
                }
            }
        }
    }
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!gameState.isPlaying) return;
    
    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    
    updatePlayer();
    updateCamera();
    updateFishingGame();
    render();
    
    requestAnimationFrame(gameLoop);
}

// 键盘事件
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    if (e.key === ' ') {
        e.preventDefault();
        if (!gameState.isFishing && gameState.isPlaying) {
            startFishingGame();
        }
    }
    
    if (e.key === 'b' || e.key === 'B') {
        if (document.getElementById('inventoryOverlay').classList.contains('active')) {
            closeInventory();
        } else {
            openInventory();
        }
    }
    
    if (e.key === 'm' || e.key === 'M') {
        toggleMute();
    }
    
    // ESC关闭弹窗
    if (e.key === 'Escape') {
        closeCatchModal();
        closeInventory();
    }
});

// 音频控制函数
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

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// 开始游戏
function startGame() {
    AudioSystem.init();
    
    document.getElementById('startScreen').classList.add('hidden');
    initMap();
    gameState.isPlaying = true;
    gameState.lastTime = performance.now();
    updateHUD();
    requestAnimationFrame(gameLoop);
    
    setTimeout(() => {
        showDialog('欢迎来到像素钓鱼！', '使用 WASD 移动，走到水边按空格键钓鱼，B 键打开背包。', '👋');
        AudioSystem.sfx.success();
        AudioSystem.startBGM();
    }, 500);
}

// 初始化
initMap();
render();
