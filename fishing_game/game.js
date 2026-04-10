// 像素钓鱼游戏 - 商店版 + 上钩提示版
// Pixel Fishing Game - Shop & Bite Alert Edition

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
        alert: () => {
            AudioSystem.playTone(600, 0.15, 'square', 0.2);
            setTimeout(() => AudioSystem.playTone(800, 0.15, 'square', 0.2), 150);
        }
    },
    
    startBGM() {
        if (!this.ctx || this.isMuted || !this.bgmEnabled) return;
        this.stopBGM();
        const melody = [
            { freq: 261.63, duration: 0.5 }, { freq: 293.66, duration: 0.5 },
            { freq: 329.63, duration: 0.5 }, { freq: 349.23, duration: 0.5 },
            { freq: 392.00, duration: 0.5 }, { freq: 349.23, duration: 0.5 },
            { freq: 329.63, duration: 0.5 }, { freq: 293.66, duration: 0.5 },
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
            osc.stop(this.ctx.currentTime);
            this.bgmOscillators.push(osc);
            currentNote = (currentNote + 1) % melody.length;
            setTimeout(() => { if (this.bgmEnabled && !this.isMuted) playNextNote(); }, note.duration * 1000);
        };
        playNextNote();
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

// ==================== 游戏配置 ====================
const GAME_CONFIG = {
    width: 800,
    height: 600,
    tileSize: 32,
    playerSpeed: 3,
    fishTypes: [
        // 普通鱼 - 简单难度
        { id: 'carp', name: '鲤鱼', rarity: 'common', color: '#FFA500', value: 10, chance: 0.25, icon: '🐟', difficulty: 1 },
        { id: 'bass', name: '鲈鱼', rarity: 'common', color: '#90EE90', value: 15, chance: 0.20, icon: '🐠', difficulty: 1 },
        { id: 'crucian', name: '鲫鱼', rarity: 'common', color: '#CD853F', value: 12, chance: 0.18, icon: '🐟', difficulty: 1 },
        { id: 'grass_carp', name: '草鱼', rarity: 'common', color: '#556B2F', value: 18, chance: 0.12, icon: '🐠', difficulty: 2 },
        
        // 稀有鱼 - 中等难度
        { id: 'trout', name: '鳟鱼', rarity: 'uncommon', color: '#FF6347', value: 35, chance: 0.10, icon: '🐡', difficulty: 2 },
        { id: 'salmon', name: '鲑鱼', rarity: 'uncommon', color: '#FA8072', value: 55, chance: 0.08, icon: '🦈', difficulty: 3 },
        { id: 'perch', name: '鲈鱼', rarity: 'uncommon', color: '#20B2AA', value: 45, chance: 0.06, icon: '🐟', difficulty: 3 },
        
        // 珍贵鱼 - 困难难度
        { id: 'golden', name: '金鱼', rarity: 'rare', color: '#FFD700', value: 120, chance: 0.03, icon: '🐡', difficulty: 4 },
        { id: 'arowana', name: '龙鱼', rarity: 'rare', color: '#C0C0C0', value: 180, chance: 0.02, icon: '🐠', difficulty: 5 },
        
        // 传说鱼 - 极难难度
        { id: 'legendary', name: '传说鱼', rarity: 'legendary', color: '#FF00FF', value: 600, chance: 0.01, icon: '🐉', difficulty: 6 }
    ]
};

// 难度配置 - 提高速度和复杂度，不停顿
const DIFFICULTY_CONFIG = {
    1: { zoneBase: 80, zoneDecay: 0, speedBase: 3.0, speedVariance: 1.0 },      // 简单 - 更快
    2: { zoneBase: 70, zoneDecay: 5, speedBase: 4.0, speedVariance: 1.5 },      // 较易
    3: { zoneBase: 60, zoneDecay: 8, speedBase: 5.0, speedVariance: 2.0 },      // 中等
    4: { zoneBase: 50, zoneDecay: 10, speedBase: 6.0, speedVariance: 2.5 },     // 较难
    5: { zoneBase: 45, zoneDecay: 12, speedBase: 7.0, speedVariance: 3.0 },     // 困难
    6: { zoneBase: 40, zoneDecay: 15, speedBase: 8.0, speedVariance: 3.5 }      // 极难 - 极快且不规则
};

// ==================== 商店商品配置 ====================
const SHOP_ITEMS = {
    rods: [
        { id: 'rod_bamboo', name: '竹竿', price: 0, icon: '🎋', desc: '基础钓竿，新手必备', rarityBonus: 0, legendaryBonus: 0, zoneBonus: 0, progressBonus: 0, owned: true },
        { id: 'rod_iron', name: '铁竿', price: 100, icon: '🔧', desc: '坚固耐用，稀有鱼概率+10%', rarityBonus: 0.10, legendaryBonus: 0, zoneBonus: 5, progressBonus: 0.1, owned: false },
        { id: 'rod_gold', name: '金竿', price: 500, icon: '✨', desc: '闪耀金光，稀有+25%/传说+5%', rarityBonus: 0.25, legendaryBonus: 0.05, zoneBonus: 10, progressBonus: 0.15, owned: false },
        { id: 'rod_legend', name: '传说之竿', price: 2000, icon: '👑', desc: '传说神竿，稀有+50%/传说+15%', rarityBonus: 0.50, legendaryBonus: 0.15, zoneBonus: 20, progressBonus: 0.25, owned: false }
    ],
    baits: [
        { id: 'bait_worm', name: '蚯蚓', price: 5, icon: '🪱', desc: '基础鱼饵，通用', biteTimeBonus: 0, rarityBonus: 0, stackable: true },
        { id: 'bait_bread', name: '面包虫', price: 15, icon: '🍞', desc: '普通鱼咬钩率+20%', biteTimeBonus: 0.2, rarityBonus: 0.05, stackable: true },
        { id: 'bait_special', name: '特制鱼饵', price: 50, icon: '🪰', desc: '稀有鱼咬钩率+30%', biteTimeBonus: 0.3, rarityBonus: 0.15, stackable: true },
        { id: 'bait_legend', name: '传说鱼饵', price: 200, icon: '💎', desc: '传说鱼咬钩率+50%', biteTimeBonus: 0.5, rarityBonus: 0.30, stackable: true }
    ],
    accessories: [
        { id: 'acc_none', name: '无饰品', price: 0, icon: '⭕', desc: '未装备饰品', luckBonus: 0, owned: true },
        { id: 'acc_lucky1', name: '幸运徽章', price: 150, icon: '🍀', desc: '增加5点幸运值', luckBonus: 5, owned: false },
        { id: 'acc_lucky2', name: '招财猫', price: 400, icon: '🐱', desc: '增加12点幸运值', luckBonus: 12, owned: false },
        { id: 'acc_lucky3', name: '黄金四叶草', price: 1200, icon: '🌟', desc: '增加25点幸运值', luckBonus: 25, owned: false },
        { id: 'acc_lucky4', name: '传说护符', price: 3000, icon: '🔮', desc: '增加50点幸运值', luckBonus: 50, owned: false }
    ]
};

// ==================== 钓鱼状态常量 ====================
const FISHING_STATE = {
    IDLE: 'idle',           // 未钓鱼
    CASTING: 'casting',     // 抛竿等待中
    BITE_ALERT: 'biteAlert', // 鱼上钩提示
    MINIGAME: 'minigame'    // 钓鱼小游戏
};

// ==================== 游戏状态 ====================
const gameState = {
    isPlaying: false,
    fishingState: FISHING_STATE.IDLE,
    inventory: [],
    money: 50,           // 初始给50金币
    level: 1,
    exp: 0,
    keys: {},
    lastTime: 0,
    notifications: [],
    // 装备系统
    equippedRod: 'rod_bamboo',
    equippedBait: null,
    baitCount: 0,         // 当前鱼饵数量
    equippedAccessory: 'acc_none', // 装备饰品
    // 商店标签
    shopTab: 'buy',       // buy / sell
    // 上钩提示
    biteTimer: 0,
    biteAlertTimer: 0,
    biteAlertDuration: 2000, // 2秒限时
    biteTimeout: null,
    biteAlertTimeout: null,
    // 钓鱼等待时间
    castingWaitTime: 0,    // 当前抛竿等待时间
    castingStartTime: 0,   // 抛竿开始时间
    // 界面状态
    questPanelOpen: false,
    controlsHintOpen: false,
    equipmentPanelOpen: false, // 装备界面
    // 水面鱼影
    fishShadows: [],
    lastShadowSpawn: 0
};

// 玩家对象
const player = {
    x: 400, y: 300,
    width: 24, height: 32,
    direction: 'down',
    isMoving: false,
    animationFrame: 0,
    fishingRod: {
        isCast: false,
        targetX: 0, targetY: 0,
        floatX: 0, floatY: 0
    }
};

const camera = { x: 0, y: 0 };
const mapData = { width: 40, height: 30, tiles: [] };

// NPC 列表 - 小鱼贩改为商店NPC
const npcs = [
    { x: 200, y: 150, name: '渔夫老张', dialog: '早安！今天天气不错，适合钓鱼。试试商店里的好装备吧！', avatar: '🧔', type: 'dialog' },
    { x: 600, y: 200, name: '小鱼贩', dialog: '欢迎光临！钓到好鱼可以卖给我，我也卖好装备！', avatar: '👨‍💼', type: 'shop' }
];

// 初始化地图
function initMap() {
    for (let y = 0; y < mapData.height; y++) {
        mapData.tiles[y] = [];
        for (let x = 0; x < mapData.width; x++) {
            const dx = x - 20;
            const dy = y - 15;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 8) mapData.tiles[y][x] = 1;
            else if (dist < 9) mapData.tiles[y][x] = 3;
            else if (Math.random() < 0.1 && dist > 12) mapData.tiles[y][x] = 2;
            else mapData.tiles[y][x] = 0;
        }
    }
    mapData.tiles[5][10] = 4;
    mapData.tiles[8][30] = 2;
    mapData.tiles[9][31] = 2;
    mapData.tiles[7][32] = 2;
}

// 画布
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ==================== 任务系统 ====================
const QUEST_CONFIG = {
    quests: [
        { id: 'quest_1', name: '初入钓途', desc: '钓到3条鲤鱼', target: { fishId: 'carp', count: 3 }, reward: { exp: 50, money: 30 }, completed: false, turnedIn: false },
        { id: 'quest_2', name: '小有收获', desc: '钓到5条鱼', target: { fishId: 'any', count: 5 }, reward: { exp: 80, money: 50 }, completed: false, turnedIn: false },
        { id: 'quest_3', name: '寻找鲈鱼', desc: '钓到2条鲈鱼', target: { fishId: 'bass', count: 2 }, reward: { exp: 60, money: 40 }, completed: false, turnedIn: false },
        { id: 'quest_4', name: '稀有挑战', desc: '钓到1条稀有鱼（金鱼）', target: { fishId: 'golden', count: 1 }, reward: { exp: 150, money: 100 }, completed: false, turnedIn: false },
        { id: 'quest_5', name: '大鱼之梦', desc: '钓到1条鲑鱼', target: { fishId: 'salmon', count: 1 }, reward: { exp: 100, money: 80 }, completed: false, turnedIn: false },
        { id: 'quest_6', name: '财富积累', desc: '钓到总价值300金币的鱼', target: { type: 'value', amount: 300 }, reward: { exp: 200, money: 150 }, completed: false, turnedIn: false },
        { id: 'quest_7', name: '钓鱼大师', desc: '钓到10条鱼', target: { fishId: 'any', count: 10 }, reward: { exp: 300, money: 200 }, completed: false, turnedIn: false }
    ],
    currentQuestIndex: 0
};

// 检查任务完成状态
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
    } else if (quest.target.type === 'value') {
        const totalValue = gameState.inventory.reduce((sum, f) => sum + f.value, 0);
        completed = totalValue >= quest.target.amount;
    }
    
    quest.completed = completed;
    if (completed) {
        showNotification('📋 任务可提交！找渔夫老张领取奖励', 'info');
    }
}

// 提交任务
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
    
    // 扣除任务要求的鱼
    if (quest.target.fishId && quest.target.fishId !== 'any') {
        const targetFish = GAME_CONFIG.fishTypes.find(f => f.id === quest.target.fishId);
        if (targetFish) {
            let removed = 0;
            for (let i = gameState.inventory.length - 1; i >= 0 && removed < quest.target.count; i--) {
                if (gameState.inventory[i].id === quest.target.fishId) {
                    gameState.inventory.splice(i, 1);
                    removed++;
                }
            }
        }
    } else if (quest.target.type === 'value') {
        // 移除指定价值的鱼（优先移除便宜的）
        let remainingValue = quest.target.amount;
        const sorted = [...gameState.inventory].sort((a, b) => a.value - b.value);
        while (remainingValue > 0 && gameState.inventory.length > 0) {
            const fish = sorted.shift();
            const idx = gameState.inventory.findIndex(f => f === fish);
            if (idx !== -1) {
                gameState.inventory.splice(idx, 1);
                remainingValue -= fish.value;
            }
        }
    }
    
    // 发放奖励
    gameState.exp += quest.reward.exp;
    gameState.money += quest.reward.money;
    quest.turnedIn = true;
    QUEST_CONFIG.currentQuestIndex++;
    
    AudioSystem.sfx.levelUp();
    showNotification(`🎉 完成任务「${quest.name}」！获得 ${quest.reward.exp} 经验、${quest.reward.money} 金币！`, 'success');
    updateHUD();
}

// 显示任务面板
function showQuestPanel() {
    const quest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];
    const completedCount = QUEST_CONFIG.quests.filter(q => q.turnedIn).length;
    
    let html = `<div class="quest-panel">`;
    html += `<div class="quest-header">📋 当前任务 (${completedCount}/${QUEST_CONFIG.quests.length})</div>`;
    
    if (quest && !quest.turnedIn) {
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
        const statusText = quest.completed ? '✅ 已完成' : '⏳ 进行中';
        
        html += `
            <div class="quest-item ${statusClass}">
                <div class="quest-name">${quest.name}</div>
                <div class="quest-desc">${quest.desc}</div>
                <div class="quest-progress">进度: ${progress} ${statusText}</div>
                <div class="quest-reward">🎁 奖励: ${quest.reward.exp} 经验 + ${quest.reward.money} 金币</div>
            </div>
        `;
    } else {
        html += `<div class="quest-empty">🎉 所有任务已完成！你是真正的钓鱼大师！</div>`;
    }
    
    html += `</div>`;
    return html;
}

// ==================== 绘制函数 ====================
function drawPlayer(x, y, direction, isMoving, frame) {
    const armOffset = isMoving ? Math.sin(frame * 0.5) * 3 : 0;
    const legOffset = isMoving ? Math.sin(frame * 0.5) * 4 : 0;
    
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(x + 4, y, 16, 12);
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x + 2, y - 2, 20, 6);
    ctx.fillRect(x + 2, y, 4, 8);
    ctx.fillRect(x + 18, y, 4, 8);
    ctx.fillStyle = '#000';
    if (direction === 'down') { ctx.fillRect(x + 7, y + 4, 3, 3); ctx.fillRect(x + 14, y + 4, 3, 3); }
    else if (direction === 'left') { ctx.fillRect(x + 5, y + 4, 3, 3); }
    else if (direction === 'right') { ctx.fillRect(x + 14, y + 4, 3, 3); }
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(x + 4, y + 8, 16, 16);
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 2, y + 14, 20, 14);
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(x - 2, y + 14 + armOffset, 4, 10);
    ctx.fillRect(x + 22, y + 14 - armOffset, 4, 10);
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(x + 4, y + 26 + legOffset, 6, 8);
    ctx.fillRect(x + 14, y + 26 - legOffset, 6, 8);
    
    // 钓鱼竿绘制 - 只在抛竿/等待/上钩状态
    if (gameState.fishingState !== FISHING_STATE.IDLE) {
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
        
        // 浮标 - 上钩时抖动
        const floatShake = gameState.fishingState === FISHING_STATE.BITE_ALERT ? 
            Math.sin(Date.now() * 0.03) * 5 : 0;
        ctx.fillStyle = gameState.fishingState === FISHING_STATE.BITE_ALERT ? '#FF0000' : '#FF4444';
        ctx.fillRect(
            player.fishingRod.floatX - camera.x - 3 + floatShake, 
            player.fishingRod.floatY - camera.y - 3, 
            6, 6
        );
    }
}

function drawTile(x, y, type) {
    const screenX = x * GAME_CONFIG.tileSize - camera.x;
    const screenY = y * GAME_CONFIG.tileSize - camera.y;
    if (screenX < -GAME_CONFIG.tileSize || screenX > canvas.width || screenY < -GAME_CONFIG.tileSize || screenY > canvas.height) return;
    
    switch (type) {
        case 0:
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#7CFC00' : '#7FFF00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            if ((x * y) % 7 === 0) { ctx.fillStyle = '#32CD32'; ctx.fillRect(screenX + 8, screenY + 8, 4, 4); }
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

function drawNPC(npc) {
    const screenX = npc.x - camera.x;
    const screenY = npc.y - camera.y;
    
    ctx.fillStyle = npc.type === 'shop' ? '#DAA520' : '#9370DB';
    ctx.fillRect(screenX + 4, screenY + 12, 16, 16);
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(screenX + 4, screenY + 4, 16, 12);
    ctx.fillStyle = npc.type === 'shop' ? '#B8860B' : '#4169E1';
    ctx.fillRect(screenX + 2, screenY, 20, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(screenX + 7, screenY + 6, 2, 2);
    ctx.fillRect(screenX + 15, screenY + 6, 2, 2);
    
    // 商店NPC添加商店图标
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

function updateCamera() {
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;
    camera.x = Math.max(0, Math.min(camera.x, mapData.width * GAME_CONFIG.tileSize - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, mapData.height * GAME_CONFIG.tileSize - canvas.height));
}

function checkCollision(x, y) {
    const tileX = Math.floor((x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((y + player.height / 2) / GAME_CONFIG.tileSize);
    if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) return true;
    const tile = mapData.tiles[tileY][tileX];
    return tile === 1 || tile === 2;
}

function isNearWater() {
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of directions) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (nx >= 0 && nx < mapData.width && ny >= 0 && ny < mapData.height) {
            if (mapData.tiles[ny][nx] === 1) return true;
        }
    }
    return false;
}

// 检测是否靠近NPC
function getNearbyNPC() {
    for (const npc of npcs) {
        const dx = player.x - npc.x;
        const dy = player.y - npc.y;
        if (Math.sqrt(dx * dx + dy * dy) < 60) return npc;
    }
    return null;
}

// ==================== 玩家移动 ====================
function updatePlayer() {
    if (gameState.fishingState !== FISHING_STATE.IDLE) return;
    
    let dx = 0, dy = 0;
    if (gameState.keys['w'] || gameState.keys['ArrowUp']) { dy = -GAME_CONFIG.playerSpeed; player.direction = 'up'; }
    if (gameState.keys['s'] || gameState.keys['ArrowDown']) { dy = GAME_CONFIG.playerSpeed; player.direction = 'down'; }
    if (gameState.keys['a'] || gameState.keys['ArrowLeft']) { dx = -GAME_CONFIG.playerSpeed; player.direction = 'left'; }
    if (gameState.keys['d'] || gameState.keys['ArrowRight']) { dx = GAME_CONFIG.playerSpeed; player.direction = 'right'; }
    
    player.isMoving = dx !== 0 || dy !== 0;
    if (player.isMoving) {
        player.animationFrame++;
        if (player.animationFrame % 15 === 0) AudioSystem.sfx.step();
        if (!checkCollision(player.x + dx, player.y)) player.x += dx;
        if (!checkCollision(player.x, player.y + dy)) player.y += dy;
    }
    player.x = Math.max(0, Math.min(player.x, mapData.width * GAME_CONFIG.tileSize - player.width));
    player.y = Math.max(0, Math.min(player.y, mapData.height * GAME_CONFIG.tileSize - player.height));
}

// ==================== 钓鱼小游戏 ====================
let fishingGame = {
    active: false,
    zoneY: 0,
    zoneHeight: 80,
    cursorY: 150,
    cursorVelocity: 0,
    progress: 30,
    fishCaught: null,
    fishDifficulty: 1,
    gravity: 0.3,
    lift: 0.6,
    progressGain: 0.8,
    progressLoss: 0.2,
    zoneSpeed: 1.5,
    zoneSpeedVariance: 0.5
};

// 获取当前钓竿属性
function getCurrentRod() {
    return SHOP_ITEMS.rods.find(r => r.id === gameState.equippedRod) || SHOP_ITEMS.rods[0];
}

// 获取当前鱼饵属性
function getCurrentBait() {
    if (!gameState.equippedBait || gameState.baitCount <= 0) return null;
    return SHOP_ITEMS.baits.find(b => b.id === gameState.equippedBait) || null;
}

// 获取当前饰品属性
function getCurrentAccessory() {
    return SHOP_ITEMS.accessories.find(a => a.id === gameState.equippedAccessory) || SHOP_ITEMS.accessories[0];
}

// 计算总幸运值
function getTotalLuck() {
    const accessory = getCurrentAccessory();
    return accessory.luckBonus || 0;
}

// ==================== 钓鱼流程 - 状态机 ====================

// 1. 抛竿 - 进入等待状态
function startCasting() {
    if (!isNearWater()) {
        showNotification('请走到水边再钓鱼！', 'warning');
        return;
    }
    if (gameState.fishingState !== FISHING_STATE.IDLE) return;
    
    // 检查是否有鱼饵
    if (!gameState.equippedBait || gameState.baitCount <= 0) {
        showNotification('🪱 没有鱼饵了！请先购买鱼饵', 'error');
        return;
    }
    
    gameState.fishingState = FISHING_STATE.CASTING;
    player.fishingRod.isCast = true;
    
    // 设置浮标位置
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    player.fishingRod.floatX = (tileX + (player.direction === 'left' ? -1 : 1)) * GAME_CONFIG.tileSize + 16;
    player.fishingRod.floatY = tileY * GAME_CONFIG.tileSize + 16;
    
    AudioSystem.sfx.cast();
    
    // 显示等待UI
    document.getElementById('castingUI').classList.add('active');
    showNotification('🎣 已抛竿，等待鱼上钩...', 'info');
    
    // 消耗一个鱼饵
    gameState.baitCount--;
    updateHUD();
    
    // 随机等待时间：5-15秒（更长的等待时间）
    const bait = getCurrentBait();
    const baitBonus = bait ? bait.biteTimeBonus : 0;
    const baseWaitTime = 5000 + Math.random() * 10000; // 5-15秒基础等待
    const waitTime = baseWaitTime * (1 - baitBonus * 0.3); // 鱼饵减少等待时间
    
    gameState.castingWaitTime = waitTime;
    gameState.castingStartTime = Date.now();
    
    gameState.biteTimeout = setTimeout(() => {
        if (gameState.fishingState === FISHING_STATE.CASTING) {
            triggerBiteAlert();
        }
    }, waitTime);
}

// 2. 鱼上钩提示
function triggerBiteAlert() {
    gameState.fishingState = FISHING_STATE.BITE_ALERT;
    gameState.biteAlertTimer = Date.now();
    
    // 预先生成要钓的鱼（用于设置难度）
    fishingGame.fishToCatch = catchFish();
    
    // 隐藏等待UI，显示上钩提示
    document.getElementById('castingUI').classList.remove('active');
    document.getElementById('biteAlertUI').classList.add('active');
    
    AudioSystem.sfx.bite();
    
    // 2秒限时，超时逃跑
    gameState.biteAlertTimeout = setTimeout(() => {
        if (gameState.fishingState === FISHING_STATE.BITE_ALERT) {
            fishEscaped('反应太慢了...');
        }
    }, gameState.biteAlertDuration);
}

// 3. 玩家响应上钩 → 进入小游戏
function respondToBite() {
    if (gameState.fishingState !== FISHING_STATE.BITE_ALERT) return;
    
    clearTimeout(gameState.biteAlertTimeout);
    gameState.fishingState = FISHING_STATE.MINIGAME;
    
    // 隐藏上钩提示，显示钓鱼小游戏
    document.getElementById('biteAlertUI').classList.remove('active');
    document.getElementById('fishingUI').classList.add('active');
    // 显示空格键收竿提示
    const hint = document.querySelector('.fishing-header');
    if (hint) hint.textContent = '🎣 按住空格键控制！保持在绿色区域！';
    
    // 初始化钓鱼小游戏参数（受钓竿影响）
    const rod = getCurrentRod();
    const fish = fishingGame.fishToCatch;
    
    // 根据鱼的稀有度设置难度
    setFishingDifficulty(fish);
    
    fishingGame.active = true;
    fishingGame.progress = 30;
    fishingGame.zoneY = Math.random() * 180 + 40;
    fishingGame.cursorY = 150;
    fishingGame.cursorVelocity = 0;
    fishingGame.zoneHeight += rod.zoneBonus;         // 钓竿加宽绿色区域
    fishingGame.progressGain = 0.8 + rod.progressBonus;   // 钓竿加快进度
    fishingGame.progressLoss = 0.2;
    
    // 消耗鱼饵
    if (gameState.equippedBait && gameState.baitCount > 0) {
        gameState.baitCount--;
        if (gameState.baitCount <= 0) {
            gameState.equippedBait = null;
            gameState.baitCount = 0;
        }
        updateHUD();
    }
    
    showNotification(`🎣 开始收竿！按住空格键控制！ (${getDifficultyName(fish.difficulty)})`, 'info');
}

function getDifficultyName(level) {
    const names = { 1: '简单', 2: '较易', 3: '中等', 4: '较难', 5: '困难', 6: '极难' };
    return names[level] || '普通';
}

// 鱼逃跑
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

// 更新上钩提示倒计时条
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

// 更新钓鱼小游戏 - 更快更复杂的绿区移动
function updateFishingGame() {
    if (!fishingGame.active) return;
    
    const time = Date.now() * 0.001;
    const difficulty = DIFFICULTY_CONFIG[fishingGame.fishDifficulty] || DIFFICULTY_CONFIG[1];
    
    // 计算复合波动 - 不停顿，持续高速移动
    let movement = 0;
    
    // 基础正弦波 - 持续移动不停顿
    movement += Math.sin(time * difficulty.speedBase) * difficulty.speedVariance;
    
    // 难度2+：添加高频成分
    if (fishingGame.fishDifficulty >= 2) {
        movement += Math.sin(time * difficulty.speedBase * 1.7) * (difficulty.speedVariance * 0.6);
    }
    
    // 难度3+：添加不规则突变
    if (fishingGame.fishDifficulty >= 3) {
        movement += Math.sin(time * difficulty.speedBase * 2.3) * (difficulty.speedVariance * 0.4);
    }
    
    // 难度4+：添加快速抖动
    if (fishingGame.fishDifficulty >= 4) {
        movement += Math.sin(time * difficulty.speedBase * 3.5) * (difficulty.speedVariance * 0.3);
    }
    
    // 难度5+：添加极快变化
    if (fishingGame.fishDifficulty >= 5) {
        movement += Math.sin(time * difficulty.speedBase * 5.0) * (difficulty.speedVariance * 0.2);
    }
    
    // 难度6（传说鱼）：完全不规则
    if (fishingGame.fishDifficulty >= 6) {
        movement += Math.sin(time * difficulty.speedBase * 7.0 + Math.sin(time * 3)) * (difficulty.speedVariance * 0.4);
    }
    
    // 保持持续移动，没有明显停顿点
    fishingGame.zoneY += movement;
    fishingGame.zoneY = Math.max(20, Math.min(220, fishingGame.zoneY));
    
    // 空格键控制收竿
    if (gameState.keys[' '] || gameState.keys['Space']) {
        fishingGame.cursorVelocity -= fishingGame.lift;
    } else {
        fishingGame.cursorVelocity += fishingGame.gravity;
    }
    
    fishingGame.cursorVelocity *= 0.97;
    fishingGame.cursorY += fishingGame.cursorVelocity;
    fishingGame.cursorY = Math.max(5, Math.min(265, fishingGame.cursorY));
    
    const cursorCenter = fishingGame.cursorY + 15;
    const inZone = cursorCenter > fishingGame.zoneY - 5 && cursorCenter < fishingGame.zoneY + fishingGame.zoneHeight + 5;
    
    if (inZone) fishingGame.progress += fishingGame.progressGain;
    else fishingGame.progress -= fishingGame.progressLoss;
    
    fishingGame.progress = Math.max(0, Math.min(100, fishingGame.progress));
    
    // 更新UI
    const zone = document.getElementById('fishingZone');
    const cursor = document.getElementById('fishingCursor');
    const progressDisplay = document.getElementById('progressDisplay');
    
    zone.style.top = fishingGame.zoneY + 'px';
    zone.style.height = fishingGame.zoneHeight + 'px';
    cursor.style.top = fishingGame.cursorY + 'px';
    
    progressDisplay.textContent = Math.floor(fishingGame.progress) + '%';
    progressDisplay.className = 'progress-display ' + 
        (fishingGame.progress > 70 ? 'success' : fishingGame.progress > 30 ? 'warning' : 'danger');
    
    if (fishingGame.progress > 70) zone.style.boxShadow = '0 0 30px rgba(50,205,50,1)';
    else if (fishingGame.progress < 30) zone.style.boxShadow = '0 0 20px rgba(255,68,68,0.8)';
    else zone.style.boxShadow = '0 0 20px rgba(50,205,50,0.8)';
    
    // 百分比掉到0，自动收杆（失败）
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
    
    // 自动收杆 - 无论成功失败，都自动结束
    setTimeout(() => {
        if (success) {
            // 使用之前生成的鱼
            const fish = fishingGame.fishToCatch || catchFish();
            gameState.inventory.push(fish);
            // 不再自动加金币，需要去商店卖鱼
            gameState.exp += Math.floor(fish.value / 10);
            
            // 检查任务完成情况
            checkQuestCompletion();
            
            showCatchModal(fish);
            createFloatingText(player.x - camera.x + 12, player.y - camera.y - 20, `${fish.name}!`, 'exp');
            createFloatingText(player.x - camera.x + 12, player.y - camera.y - 40, `+${Math.floor(fish.value/10)} XP`, 'exp');
            
            AudioSystem.sfx.success();
            checkLevelUp();
            updateHUD();
        } else {
            fishEscaped();
        }
    }, 500); // 短暂延迟让玩家看到结果
}

// 钓鱼概率 - 受钓竿、鱼饵和幸运值影响
function catchFish() {
    const rod = getCurrentRod();
    const bait = getCurrentBait();
    const luck = getTotalLuck();
    
    // 计算调整后的概率
    let adjustedFish = GAME_CONFIG.fishTypes.map(fish => {
        let chance = fish.chance;
        
        // 钓竿加成
        if (fish.rarity === 'rare') chance += rod.rarityBonus * 0.3;
        if (fish.rarity === 'uncommon') chance += rod.rarityBonus * 0.5;
        if (fish.rarity === 'legendary') chance += rod.legendaryBonus;
        
        // 鱼饵加成
        if (bait) {
            if (fish.rarity === 'rare') chance += bait.rarityBonus * 0.5;
            if (fish.rarity === 'uncommon') chance += bait.rarityBonus * 0.3;
            if (fish.rarity === 'legendary') chance += bait.rarityBonus;
        }
        
        // 幸运值加成（每点幸运增加0.5%稀有鱼概率）
        if (fish.rarity === 'rare') chance += luck * 0.005;
        if (fish.rarity === 'legendary') chance += luck * 0.002;
        if (fish.rarity === 'uncommon') chance += luck * 0.003;
        
        return { ...fish, chance: Math.max(chance, 0) };
    });
    
    // 归一化概率
    const totalChance = adjustedFish.reduce((sum, f) => sum + f.chance, 0);
    adjustedFish = adjustedFish.map(f => ({ ...f, chance: f.chance / totalChance }));
    
    const rand = Math.random();
    let cumulative = 0;
    for (const fish of adjustedFish) {
        cumulative += fish.chance;
        if (rand < cumulative) return { ...fish, date: new Date() };
    }
    return { ...GAME_CONFIG.fishTypes[0], date: new Date() };
}

// 根据鱼的稀有度设置小游戏难度
function setFishingDifficulty(fish) {
    const difficulty = DIFFICULTY_CONFIG[fish.difficulty] || DIFFICULTY_CONFIG[1];
    fishingGame.fishDifficulty = fish.difficulty;
    fishingGame.zoneHeight = difficulty.zoneBase;
    fishingGame.zoneSpeed = difficulty.speedBase;
    fishingGame.zoneSpeedVariance = difficulty.speedVariance;
}

function checkLevelUp() {
    const expNeeded = gameState.level * 100;
    if (gameState.exp >= expNeeded) {
        gameState.level++;
        gameState.exp -= expNeeded;
        showNotification(`⭐ 升级了！现在等级 ${gameState.level}！`, 'success');
        AudioSystem.sfx.levelUp();
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

// 对话框
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

// 通知
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

// HUD更新
function updateHUD() {
    document.getElementById('fishCount').textContent = gameState.inventory.length;
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = `Lv.${gameState.level}`;
    
    const expNeeded = gameState.level * 100;
    const expPercent = (gameState.exp / expNeeded) * 100;
    document.getElementById('xpFill').style.width = expPercent + '%';
    
    // 装备信息
    const rod = getCurrentRod();
    document.getElementById('equippedRod').textContent = rod.icon + ' ' + rod.name;
    
    const baitEl = document.getElementById('equippedBait');
    const bait = getCurrentBait();
    if (bait) {
        baitEl.textContent = bait.icon + ' ' + bait.name + ' ×' + gameState.baitCount;
    } else {
        baitEl.textContent = '🪱 无鱼饵';
    }
    
    // 更新幸运值显示
    const luckEl = document.getElementById('luckValue');
    if (luckEl) {
        const luck = getTotalLuck();
        luckEl.textContent = luck > 0 ? `🍀 ${luck}` : '—';
    }
    
    // 更新任务追踪面板
    updateQuestTracker();
}

// 更新任务追踪显示
function updateQuestTracker() {
    const panel = document.getElementById('questPanelContent');
    const quest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];
    
    // 如果任务面板没打开且不需要更新，跳过
    if (!gameState.questPanelOpen && panel.style.display === 'none') {
        return;
    }
    
    panel.style.display = 'block';
    
    // 没有任务时显示空列表
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

// 打开/关闭任务菜单
function toggleQuestPanel() {
    const panel = document.getElementById('questPanelContent');
    
    if (gameState.questPanelOpen) {
        // 关闭
        panel.style.display = 'none';
        gameState.questPanelOpen = false;
        AudioSystem.sfx.closeMenu();
    } else {
        // 打开：先设置状态，再更新内容
        gameState.questPanelOpen = true;
        panel.style.display = 'block';
        updateQuestTracker();
        AudioSystem.sfx.openMenu();
    }
}

// 打开/关闭操作指南
function toggleControlsHint() {
    const hint = document.querySelector('.controls-hint');
    gameState.controlsHintOpen = !gameState.controlsHintOpen;
    
    if (gameState.controlsHintOpen) {
        hint.style.opacity = '1';
        hint.style.pointerEvents = 'auto';
        AudioSystem.sfx.openMenu();
    } else {
        hint.style.opacity = '0';
        hint.style.pointerEvents = 'none';
        AudioSystem.sfx.closeMenu();
    }
}

// 捕获弹窗
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

// ==================== 背包系统 ====================
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

function switchShopTab(tab) {
    gameState.shopTab = tab;
    renderShop();
}

function renderShop() {
    const content = document.getElementById('shopContent');
    const buyTab = document.getElementById('shopTabBuy');
    const sellTab = document.getElementById('shopTabSell');
    
    // 更新标签状态
    buyTab.className = 'shop-tab' + (gameState.shopTab === 'buy' ? ' active' : '');
    sellTab.className = 'shop-tab' + (gameState.shopTab === 'sell' ? ' active' : '');
    
    if (gameState.shopTab === 'buy') {
        renderShopBuy(content);
    } else {
        renderShopSell(content);
    }
    
    // 更新金币显示
    document.getElementById('shopMoney').textContent = gameState.money;
}

function renderShopBuy(container) {
    let html = '';
    
    // 钓竿区
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
    
    // 鱼饵区
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
    
    // 饰品区
    html += '<div class="shop-section"><div class="shop-section-title">💍 饰品</div>';
    SHOP_ITEMS.accessories.forEach(acc => {
        if (acc.id === 'acc_none') return; // 跳过无饰品
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

// ==================== 装备界面系统 ====================
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
    
    // 当前装备概览
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
    
    // 钓竿选择
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
    
    // 饰品选择
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

// 商店操作
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
    
    // 如果已经装备同类鱼饵，增加数量；否则装备新鱼饵
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
    
    const count = sellAll ? 
        gameState.inventory.filter(f => f.id === fishId).length : 1;
    
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

// ==================== 渲染主循环 ====================
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
    
    // 水面闪光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            if (mapData.tiles[y][x] === 1) {
                const screenX = x * GAME_CONFIG.tileSize - camera.x;
                const screenY = y * GAME_CONFIG.tileSize - camera.y;
                if ((x + y + Math.floor(Date.now() / 500)) % 3 === 0) ctx.fillRect(screenX + 8, screenY + 8, 4, 4);
            }
        }
    }
    
    // 绘制鱼影
    drawFishShadows();
    
    // 靠近NPC时显示提示
    const nearbyNPC = getNearbyNPC();
    if (nearbyNPC && gameState.fishingState === FISHING_STATE.IDLE) {
        const screenX = nearbyNPC.x - camera.x + 15;
        const screenY = nearbyNPC.y - camera.y - 35;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(screenX - 55, screenY - 5, 130, 22);
        ctx.fillStyle = '#FFD700';
        ctx.font = '12px Microsoft YaHei';
        ctx.textAlign = 'center';
        if (nearbyNPC.type === 'shop') {
            ctx.fillText('按空格键打开商店', screenX + 10, screenY + 10);
        } else {
            ctx.fillText('按空格键对话/任务', screenX + 10, screenY + 10);
        }
    }
}

// 初始化水面鱼影
function initFishShadows() {
    gameState.fishShadows = [];
}

// 更新水面鱼影
function updateFishShadows() {
    const now = Date.now();
    
    // 随机生成新的鱼影
    if (now - gameState.lastShadowSpawn > 2000 + Math.random() * 3000) {
        // 找到所有水域格子
        const waterTiles = [];
        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                if (mapData.tiles[y][x] === 1) {
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
                phase: 'appear', // appear, stay, disappear
                startTime: now,
                duration: 2000 + Math.random() * 2000
            });
        }
        gameState.lastShadowSpawn = now;
    }
    
    // 更新现有鱼影
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

// 绘制鱼影
function drawFishShadows() {
    gameState.fishShadows.forEach(shadow => {
        const screenX = shadow.x - camera.x;
        const screenY = shadow.y - camera.y;
        
        // 只在屏幕范围内绘制
        if (screenX < -20 || screenX > canvas.width + 20 || screenY < -20 || screenY > canvas.height + 20) return;
        
        ctx.save();
        ctx.globalAlpha = shadow.opacity;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        // 绘制鱼形阴影
        ctx.ellipse(screenX, screenY, shadow.size, shadow.size * 0.4, Math.sin(shadow.startTime * 0.001) * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // 鱼尾
        ctx.beginPath();
        ctx.moveTo(screenX - shadow.size * 0.8, screenY);
        ctx.lineTo(screenX - shadow.size * 1.3, screenY - shadow.size * 0.3);
        ctx.lineTo(screenX - shadow.size * 1.3, screenY + shadow.size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!gameState.isPlaying) return;
    
    gameState.lastTime = timestamp;
    updatePlayer();
    updateCamera();
    updateBiteAlertUI();
    updateFishingGame();
    updateFishShadows();
    render();
    
    requestAnimationFrame(gameLoop);
}

// ==================== 键盘事件 ====================
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    // F键 - 放竿（抛竿）
    if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        
        // F键仅在空闲状态下用于抛竿
        if (gameState.fishingState === FISHING_STATE.IDLE && isNearWater()) {
            startCasting();
        }
    }
    
    // 空格键 - 起竿（响应上钩）+ 收竿小游戏控制
    if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (!gameState.isPlaying) return;
        
        // 空格键在上钩提示时响应
        if (gameState.fishingState === FISHING_STATE.BITE_ALERT) {
            respondToBite();
        }
        // 空格键靠近NPC时对话/商店
        else if (gameState.fishingState === FISHING_STATE.IDLE) {
            const npc = getNearbyNPC();
            if (npc) {
                if (npc.type === 'shop') {
                    openShop();
                } else {
                    // 老张 - 显示任务面板
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
        // MINIGAME状态下空格键由updateFishingGame处理（按住控制）
    }
    
    // B键 - 背包
    if (e.key === 'b' || e.key === 'B') {
        if (document.getElementById('inventoryOverlay').classList.contains('active')) {
            closeInventory();
        } else if (!document.getElementById('shopOverlay').classList.contains('active')) {
            openInventory();
        }
    }
    
    // E键 - 打开/关闭装备栏
    if (e.key === 'e' || e.key === 'E') {
        if (gameState.fishingState === FISHING_STATE.IDLE) {
            if (gameState.equipmentPanelOpen) {
                closeEquipment();
            } else {
                openEquipment();
            }
        }
    }
    
    // Q键 - 任务菜单
    if (e.key === 'q' || e.key === 'Q') {
        if (gameState.fishingState === FISHING_STATE.IDLE) {
            toggleQuestPanel();
        }
    }
    
    // T键 - 操作指南
    if (e.key === 't' || e.key === 'T') {
        toggleControlsHint();
    }
    
    // M键 - 静音
    if (e.key === 'm' || e.key === 'M') {
        toggleMute();
    }
    
    // ESC - 取消所有动作及关闭所有辅助窗口
    if (e.key === 'Escape') {
        // 关闭所有辅助窗口
        closeCatchModal();
        closeInventory();
        closeShop();
        // 关闭装备界面
        if (gameState.equipmentPanelOpen) {
            closeEquipment();
        }
        // 关闭任务面板
        if (gameState.questPanelOpen) {
            toggleQuestPanel();
        }
        // 关闭操作指南
        if (gameState.controlsHintOpen) {
            toggleControlsHint();
        }
        // 关闭对话框
        document.getElementById('dialogBox').classList.remove('active');
        
        // 取消钓鱼动作
        if (gameState.fishingState !== FISHING_STATE.IDLE) {
            // 清除所有钓鱼相关的定时器
            clearTimeout(gameState.biteTimeout);
            clearTimeout(gameState.biteAlertTimeout);
            
            // 重置钓鱼状态
            fishingGame.active = false;
            gameState.fishingState = FISHING_STATE.IDLE;
            player.fishingRod.isCast = false;
            
            // 隐藏所有钓鱼UI
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

// 音频控制
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
    
    // 给初始鱼饵
    gameState.equippedBait = 'bait_worm';
    gameState.baitCount = 10;
    
    gameState.isPlaying = true;
    gameState.lastTime = performance.now();
    updateHUD();
    requestAnimationFrame(gameLoop);
    
    // 显示操作指南，5秒后自动关闭
    gameState.controlsHintOpen = true;
    const hint = document.querySelector('.controls-hint');
    hint.style.opacity = '1';
    hint.style.pointerEvents = 'auto';
    
    setTimeout(() => {
        if (gameState.controlsHintOpen) {
            gameState.controlsHintOpen = false;
            hint.style.opacity = '0';
            hint.style.pointerEvents = 'none';
        }
    }, 5000);
    
    setTimeout(() => {
        const currentQuest = QUEST_CONFIG.quests[QUEST_CONFIG.currentQuestIndex];
        showDialog('欢迎来到像素钓鱼！', `WASD移动，水边按F键抛竿钓鱼。\n鱼上钩后按空格键收竿！\n\n🎯 当前任务：${currentQuest.name}\n${currentQuest.desc}\n\n空格键与NPC互动，E键打开装备栏，B键打开背包，Q键查看任务。\n\n💡 提示：需要鱼饵才能钓鱼，ESC键可随时取消钓鱼！`, '👋');
        AudioSystem.sfx.success();
        AudioSystem.startBGM();
    }, 500);
}

// 初始化
initMap();
render();
