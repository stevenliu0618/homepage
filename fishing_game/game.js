// 像素钓鱼游戏 - 核心框架
// Pixel Fishing Game - Core Framework

// 游戏配置
const GAME_CONFIG = {
    width: 800,
    height: 600,
    tileSize: 32,
    playerSpeed: 3,
    fishingTime: { min: 2, max: 5 },
    fishTypes: [
        { id: 'carp', name: '鲤鱼', rarity: 'common', color: '#FFA500', value: 10, chance: 0.4 },
        { id: 'bass', name: '鲈鱼', rarity: 'common', color: '#90EE90', value: 15, chance: 0.3 },
        { id: 'trout', name: '鳟鱼', rarity: 'uncommon', color: '#FF6347', value: 30, chance: 0.15 },
        { id: 'salmon', name: '鲑鱼', rarity: 'uncommon', color: '#FA8072', value: 50, chance: 0.1 },
        { id: 'golden', name: '金鱼', rarity: 'rare', color: '#FFD700', value: 100, chance: 0.04 },
        { id: 'legendary', name: '传说鱼', rarity: 'legendary', color: '#FF00FF', value: 500, chance: 0.01 }
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
    lastTime: 0
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
const camera = {
    x: 0,
    y: 0
};

// 游戏地图（0:草地 1:水 2:树木 3:码头 4:商店）
const mapData = {
    width: 40,
    height: 30,
    tiles: []
};

// NPC 列表
const npcs = [
    { x: 200, y: 150, name: '渔夫老张', dialog: '早安！今天天气不错，适合钓鱼。' },
    { x: 600, y: 200, name: '小鱼贩', dialog: '钓到好鱼可以卖给我哦！' }
];

// 初始化地图
function initMap() {
    for (let y = 0; y < mapData.height; y++) {
        mapData.tiles[y] = [];
        for (let x = 0; x < mapData.width; x++) {
            // 创建一个简单的湖泊地图
            const dx = x - 20;
            const dy = y - 15;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 8) {
                mapData.tiles[y][x] = 1; // 水
            } else if (dist < 9) {
                mapData.tiles[y][x] = 3; // 码头/岸边
            } else if (Math.random() < 0.1 && dist > 12) {
                mapData.tiles[y][x] = 2; // 树木
            } else {
                mapData.tiles[y][x] = 0; // 草地
            }
        }
    }
    
    // 添加一些装饰
    mapData.tiles[5][10] = 4; // 商店
    mapData.tiles[8][30] = 2; // 树木群
    mapData.tiles[9][31] = 2;
    mapData.tiles[7][32] = 2;
}

// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 禁用平滑缩放（保持像素风）
ctx.imageSmoothingEnabled = false;

// 绘制像素风格的矩形
function drawPixelRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), width, height);
}

// 绘制像素角色（类似口袋妖怪的Q版风格）
function drawPlayer(x, y, direction, isMoving, frame) {
    const pixelSize = 2;
    const animOffset = isMoving ? Math.sin(frame * 0.3) * 2 : 0;
    
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
    
    // 眼睛（根据方向）
    ctx.fillStyle = '#000';
    if (direction === 'down') {
        ctx.fillRect(x + 7, y + 4, 3, 3);
        ctx.fillRect(x + 14, y + 4, 3, 3);
    } else if (direction === 'up') {
        // 背面不画眼睛
    } else if (direction === 'left') {
        ctx.fillRect(x + 5, y + 4, 3, 3);
    } else if (direction === 'right') {
        ctx.fillRect(x + 14, y + 4, 3, 3);
    }
    
    // 身体（衣服）
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 2, y + 14, 20, 14);
    
    // 手臂（带动画）
    ctx.fillStyle = '#FFE4C4';
    const armOffset = isMoving ? Math.sin(frame * 0.5) * 3 : 0;
    ctx.fillRect(x - 2, y + 14 + armOffset, 4, 10);
    ctx.fillRect(x + 22, y + 14 - armOffset, 4, 10);
    
    // 腿部（带动画）
    ctx.fillStyle = '#2F4F4F';
    const legOffset = isMoving ? Math.sin(frame * 0.5) * 4 : 0;
    ctx.fillRect(x + 4, y + 26 + legOffset, 6, 8);
    ctx.fillRect(x + 14, y + 26 - legOffset, 6, 8);
    
    // 钓鱼竿（如果在钓鱼）
    if (gameState.isFishing || player.fishingRod.isCast) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 16);
        ctx.lineTo(x + 35, y + 8);
        ctx.stroke();
        
        // 钓鱼线
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 35, y + 8);
        ctx.lineTo(player.fishingRod.floatX - camera.x, player.fishingRod.floatY - camera.y);
        ctx.stroke();
        
        // 浮标
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(player.fishingRod.floatX - camera.x - 3, player.fishingRod.floatY - camera.y - 3, 6, 6);
    }
}

// 绘制地图格子
function drawTile(x, y, type) {
    const screenX = x * GAME_CONFIG.tileSize - camera.x;
    const screenY = y * GAME_CONFIG.tileSize - camera.y;
    
    // 只在屏幕内绘制
    if (screenX < -GAME_CONFIG.tileSize || screenX > canvas.width ||
        screenY < -GAME_CONFIG.tileSize || screenY > canvas.height) {
        return;
    }
    
    switch (type) {
        case 0: // 草地
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#7CFC00' : '#7FFF00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            // 添加一些草地纹理
            if ((x * y) % 7 === 0) {
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(screenX + 8, screenY + 8, 4, 4);
            }
            break;
            
        case 1: // 水
            const waveOffset = Math.sin(Date.now() * 0.002 + x * 0.5 + y * 0.3) * 3;
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(screenX + waveOffset, screenY + 8, 16, 4);
            break;
            
        case 2: // 树木
            ctx.fillStyle = '#7CFC00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            // 树干
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX + 12, screenY + 16, 8, 16);
            // 树冠
            ctx.fillStyle = '#228B22';
            ctx.fillRect(screenX + 4, screenY, 24, 20);
            ctx.fillRect(screenX + 8, screenY - 4, 16, 8);
            break;
            
        case 3: // 码头
            ctx.fillStyle = '#DEB887';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(screenX + 4, screenY + 4, 4, 24);
            ctx.fillRect(screenX + 24, screenY + 4, 4, 24);
            break;
            
        case 4: // 商店
            ctx.fillStyle = '#7CFC00';
            ctx.fillRect(screenX, screenY, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
            // 房子
            ctx.fillStyle = '#F4A460';
            ctx.fillRect(screenX + 4, screenY + 8, 24, 20);
            // 屋顶
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
    
    // 限制相机范围
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
    return tile === 1 || tile === 2; // 水和树木不能走
}

// 检测是否在水边
function isNearWater() {
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    
    // 检查周围是否有水
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
        
        // 尝试移动X
        if (!checkCollision(player.x + dx, player.y)) {
            player.x += dx;
        }
        // 尝试移动Y
        if (!checkCollision(player.x, player.y + dy)) {
            player.y += dy;
        }
    }
    
    // 限制在地图内
    player.x = Math.max(0, Math.min(player.x, mapData.width * GAME_CONFIG.tileSize - player.width));
    player.y = Math.max(0, Math.min(player.y, mapData.height * GAME_CONFIG.tileSize - player.height));
}

// 钓鱼小游戏（降低难度）
let fishingGame = {
    active: false,
    zoneY: 0,
    zoneHeight: 80,        // 增加区域高度（原60）
    cursorY: 150,
    cursorVelocity: 0,
    progress: 30,          // 初始进度（原0）
    fishCaught: null,
    gravity: 0.3,           // 降低重力（原0.5）
    lift: 0.6,             // 增加上升力（原0.8）
    progressGain: 0.8,    // 增加进度增长（原0.5）
    progressLoss: 0.2     // 降低进度损失（原0.3）
};

function startFishingGame() {
    if (!isNearWater()) {
        showDialog('提示', '请走到水边再钓鱼！');
        return;
    }
    
    gameState.isFishing = true;
    fishingGame.active = true;
    fishingGame.progress = 30;        // 初始30%进度，更容易开始
    fishingGame.zoneY = Math.random() * 180 + 40;  // 区域位置更居中
    fishingGame.cursorY = 150;
    fishingGame.cursorVelocity = 0;
    
    // 抛竿动画
    player.fishingRod.isCast = true;
    const tileX = Math.floor((player.x + player.width / 2) / GAME_CONFIG.tileSize);
    const tileY = Math.floor((player.y + player.height / 2) / GAME_CONFIG.tileSize);
    player.fishingRod.floatX = (tileX + (player.direction === 'left' ? -1 : 1)) * GAME_CONFIG.tileSize + 16;
    player.fishingRod.floatY = tileY * GAME_CONFIG.tileSize + 16;
    
    document.getElementById('fishingUI').classList.add('active');
    showNotification('🎣 有鱼上钩了！按住空格键控制！');
}

function updateFishingGame() {
    if (!fishingGame.active) return;
    
    // 移动区域（更慢更稳定）
    fishingGame.zoneY += Math.sin(Date.now() * 0.002) * 1.5;  // 降低移动速度
    fishingGame.zoneY = Math.max(20, Math.min(220, fishingGame.zoneY));
    
    // 控制光标（更灵敏）
    if (gameState.keys[' ']) {
        fishingGame.cursorVelocity -= fishingGame.lift;  // 使用配置的上升力
    } else {
        fishingGame.cursorVelocity += fishingGame.gravity;  // 使用配置的重力
    }
    
    fishingGame.cursorVelocity *= 0.97;  // 增加阻尼，更容易控制
    fishingGame.cursorY += fishingGame.cursorVelocity;
    fishingGame.cursorY = Math.max(5, Math.min(265, fishingGame.cursorY));  // 留出边距
    
    // 检测是否在区域内（扩大判定范围）
    const cursorCenter = fishingGame.cursorY + 15;
    const inZone = cursorCenter > fishingGame.zoneY - 5 && cursorCenter < fishingGame.zoneY + fishingGame.zoneHeight + 5;
    
    if (inZone) {
        fishingGame.progress += fishingGame.progressGain;  // 使用配置的进度增长
    } else {
        fishingGame.progress -= fishingGame.progressLoss;  // 使用配置的进度损失
    }
    
    fishingGame.progress = Math.max(0, Math.min(100, fishingGame.progress));
    
    // 更新UI
    const zone = document.getElementById('fishingZone');
    const cursor = document.getElementById('fishingCursor');
    zone.style.top = fishingGame.zoneY + 'px';
    zone.style.height = fishingGame.zoneHeight + 'px';
    cursor.style.top = fishingGame.cursorY + 'px';
    zone.style.background = `linear-gradient(to bottom, #90EE90 0%, #32CD32 ${fishingGame.progress}%, #FF6B6B ${fishingGame.progress}%, #FF4444 100%)`;
    
    // 结束判断
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
        showNotification(`🎉 钓到了 ${fish.name}！价值 ${fish.value} 金币！`);
        gameState.inventory.push(fish);
        gameState.money += fish.value;
        gameState.exp += Math.floor(fish.value / 10);
        checkLevelUp();
        updateHUD();
    } else {
        showNotification('😔 鱼儿跑掉了...');
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
        showNotification(`⭐ 升级了！现在等级 ${gameState.level}！`);
    }
}

// UI 功能
function showDialog(title, text) {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogText').textContent = text;
    document.getElementById('dialogBox').classList.add('active');
    setTimeout(() => {
        document.getElementById('dialogBox').classList.remove('active');
    }, 3000);
}

function showNotification(text) {
    const notif = document.getElementById('notification');
    notif.textContent = text;
    notif.classList.add('active');
    setTimeout(() => {
        notif.classList.remove('active');
    }, 3000);
}

function updateHUD() {
    document.getElementById('fishCount').textContent = gameState.inventory.length;
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = `Lv.${gameState.level}`;
}

function openInventory() {
    const list = document.getElementById('fishList');
    list.innerHTML = '';
    
    if (gameState.inventory.length === 0) {
        list.innerHTML = '<div class="fish-item"><span>背包是空的，快去钓鱼吧！</span></div>';
    } else {
        // 统计鱼类
        const fishCount = {};
        gameState.inventory.forEach(fish => {
            fishCount[fish.id] = (fishCount[fish.id] || 0) + 1;
        });
        
        Object.entries(fishCount).forEach(([id, count]) => {
            const fish = GAME_CONFIG.fishTypes.find(f => f.id === id);
            const item = document.createElement('div');
            item.className = 'fish-item';
            item.innerHTML = `
                <div class="fish-icon" style="background: ${fish.color}; border-radius: 50%;"></div>
                <div class="fish-info">
                    <div class="fish-name">${fish.name} ×${count}</div>
                    <div class="fish-rarity">${getRarityText(fish.rarity)} · 价值 ${fish.value} 金币</div>
                </div>
            `;
            list.appendChild(item);
        });
    }
    
    document.getElementById('inventory').classList.add('active');
}

function closeInventory() {
    document.getElementById('inventory').classList.remove('active');
}

function getRarityText(rarity) {
    const texts = {
        common: '⭐ 普通',
        uncommon: '⭐⭐ 稀有',
        rare: '⭐⭐⭐ 珍贵',
        legendary: '👑 传说'
    };
    return texts[rarity] || '普通';
}

// 主渲染循环
function render() {
    // 清空画布
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制地图
    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            drawTile(x, y, mapData.tiles[y][x]);
        }
    }
    
    // 绘制NPC
    npcs.forEach(npc => drawNPC(npc));
    
    // 绘制玩家
    drawPlayer(
        player.x - camera.x,
        player.y - camera.y,
        player.direction,
        player.isMoving,
        player.animationFrame
    );
    
    // 绘制水面反光效果（在最上层）
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
        if (document.getElementById('inventory').classList.contains('active')) {
            closeInventory();
        } else {
            openInventory();
        }
    }
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// 开始游戏
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    initMap();
    gameState.isPlaying = true;
    gameState.lastTime = performance.now();
    updateHUD();
    requestAnimationFrame(gameLoop);
    showDialog('欢迎来到像素钓鱼！', '使用 WASD 移动，走到水边按空格键钓鱼，B 键打开背包。');
}

// 初始化
initMap();
render();
