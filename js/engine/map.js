// ========== 地图/网格系统 ==========
// 0 = 空地, 1 = 硬墙, 2 = 屎山(软墙)

const GRID_SIZE = 13;
const CELL_SIZE = 42;
const TILE = {
  EMPTY: 0,
  WALL: 1,
  SHISHAN: 2,
  SHISHAN_HARD: 3,     // 硬屎山 — 需2颗炸弹
  SHISHAN_LEGACY: 4,   // 祖传代码 — 需3颗炸弹，炸掉必掉道具
};

const GameMap = {
  grid: [],
  shishanHealth: {},   // "x,y" -> 剩余血量（仅对硬/祖传有效）
  initialShishanCount: 0,
  destroyedShishan: 0,
  totalShishanEver: 0,  // 所有曾出现的屎山（统计用）
  productRespawnCount: 0,  // 产品复活屎山数（计入清除率分母）
  maxShishan: 25,  // 屎山总量上限，防止地图被填满

  init() {
    this.grid = [];
    this.shishanHealth = {};
    this.destroyedShishan = 0;
    this.initialShishanCount = 0;
    this.totalShishanEver = 0;
    this.productRespawnCount = 0;

    // 第一步：全部初始化为空地，边界设为硬墙
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        if (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1) {
          row.push(TILE.WALL);
        } else {
          row.push(TILE.EMPTY);
        }
      }
      this.grid.push(row);
    }

    // 第二步：随机散布内部硬墙隔断
    // 策略：在内部区域随机放一些"隔断段"（1~3格长的线段），形成不规则迷宫感
    // 目标硬墙数量约为内部格数的 18%~22%
    const innerCells = (GRID_SIZE - 2) * (GRID_SIZE - 2);
    const targetWalls = Math.floor(innerCells * 0.20);
    let placedWalls = 0;
    let attempts = 0;

    while (placedWalls < targetWalls && attempts < 200) {
      attempts++;
      // 随机起点（内部）
      const sx = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
      const sy = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));

      // 跳过已占据的格子
      if (this.grid[sy][sx] !== TILE.EMPTY) continue;

      // 随机隔断长度 1~3
      const len = 1 + Math.floor(Math.random() * 3);
      // 随机方向
      const dir = Math.floor(Math.random() * 4);
      const dx = [1, -1, 0, 0][dir];
      const dy = [0, 0, 1, -1][dir];

      // 尝试放置隔断段
      let canPlace = true;
      const cellsToPlace = [];
      for (let i = 0; i < len; i++) {
        const cx = sx + dx * i;
        const cy = sy + dy * i;
        // 检查是否在内部区域
        if (cx < 1 || cx >= GRID_SIZE - 1 || cy < 1 || cy >= GRID_SIZE - 1) {
          canPlace = false;
          break;
        }
        // 检查是否已被占据
        if (this.grid[cy][cx] !== TILE.EMPTY) {
          canPlace = false;
          break;
        }
        // 检查是否会形成 2x2 硬墙块（避免堵死通道）
        if (this.wouldForm2x2(cx, cy)) {
          canPlace = false;
          break;
        }
        cellsToPlace.push([cx, cy]);
      }

      if (canPlace && cellsToPlace.length > 0) {
        for (const [cx, cy] of cellsToPlace) {
          this.grid[cy][cx] = TILE.WALL;
          placedWalls++;
        }
      }
    }

    // 第三步：验证连通性，修复孤岛
    this.ensureConnectivity();

    // 第四步：随机生成屎山（12% 概率，减少初始量，主要靠杀Bug后生成）
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === TILE.EMPTY && Math.random() < 0.12) {
          const roll = Math.random();
          if (roll < 0.03) {
            this.grid[y][x] = TILE.SHISHAN_LEGACY;
            this.shishanHealth[x + ',' + y] = 3;
          } else if (roll < 0.12) {
            this.grid[y][x] = TILE.SHISHAN_HARD;
            this.shishanHealth[x + ',' + y] = 2;
          } else {
            this.grid[y][x] = TILE.SHISHAN;
          }
          this.initialShishanCount++;
        }
      }
    }

    // 确保玩家出生点和旁边安全区域没有屎山
    const isShishan = (t) => t === TILE.SHISHAN || t === TILE.SHISHAN_HARD || t === TILE.SHISHAN_LEGACY;
    const safeZones = [
      [1, 1], [2, 1], [1, 2],
      [GRID_SIZE-2, GRID_SIZE-2], [GRID_SIZE-3, GRID_SIZE-2], [GRID_SIZE-2, GRID_SIZE-3],
    ];
    for (const [x, y] of safeZones) {
      if (isShishan(this.grid[y][x])) {
        delete this.shishanHealth[x + ',' + y];
        this.grid[y][x] = TILE.EMPTY;
        this.initialShishanCount--;
      }
    }
  },

  // 检查在 (x,y) 放硬墙是否会形成 2x2 硬墙块
  wouldForm2x2(x, y) {
    // 检查以 为右下角的 2x2
    if (x > 1 && y > 1 &&
        this.grid[y-1][x-1] === TILE.WALL && this.grid[y-1][x] === TILE.WALL &&
        this.grid[y][x-1] === TILE.WALL) return true;
    // 检查以 为左下角的 2x2
    if (x < GRID_SIZE - 2 && y > 1 &&
        this.grid[y-1][x] === TILE.WALL && this.grid[y-1][x+1] === TILE.WALL &&
        this.grid[y][x+1] === TILE.WALL) return true;
    // 检查以 为右上角的 2x2
    if (x > 1 && y < GRID_SIZE - 2 &&
        this.grid[y][x-1] === TILE.WALL && this.grid[y-1][x-1] === TILE.WALL &&
        this.grid[y-1][x] === TILE.WALL) return true;
    // 检查以 为左上角的 2x2
    if (x < GRID_SIZE - 2 && y < GRID_SIZE - 2 &&
        this.grid[y][x+1] === TILE.WALL && this.grid[y+1][x] === TILE.WALL &&
        this.grid[y+1][x+1] === TILE.WALL) return true;
    return false;
  },

  // 用洪水填充验证连通性，把无法到达出生点的孤岛打通
  ensureConnectivity() {
    const visited = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      visited.push(new Array(GRID_SIZE).fill(false));
    }

    // 从出生点 (1,1) 开始洪水填充（只走空地和屎山，不走硬墙）
    const queue = [{x: 1, y: 1}];
    visited[1][1] = true;
    while (queue.length > 0) {
      const {x, y} = queue.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 1 && nx < GRID_SIZE - 1 && ny >= 1 && ny < GRID_SIZE - 1 &&
            !visited[ny][nx] && this.grid[ny][nx] !== TILE.WALL) {
          visited[ny][nx] = true;
          queue.push({x: nx, y: ny});
        }
      }
    }

    // 找到所有未访问的空地（孤岛），打通通往已访问区域的最短路径
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === TILE.EMPTY && !visited[y][x]) {
          // 找一个相邻的已访问区域，打通中间的墙
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const wx = x + dx, wy = y + dy;
            if (wx >= 1 && wx < GRID_SIZE - 1 && wy >= 1 && wy < GRID_SIZE - 1 &&
                this.grid[wy][wx] === TILE.WALL && this.hasVisitedNeighbor(wx, wy, visited)) {
              this.grid[wy][wx] = TILE.EMPTY;
              // 重新洪水填充这个区域
              this.floodFill(x, y, visited);
              break;
            }
          }
        }
      }
    }
  },

  // 检查硬墙 是否有相邻的已访问空地
  hasVisitedNeighbor(x, y, visited) {
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && visited[ny][nx]) {
        return true;
      }
    }
    return false;
  },

  // 从 开始洪水填充，标记可达区域
  floodFill(sx, sy, visited) {
    const queue = [{x: sx, y: sy}];
    visited[sy][sx] = true;
    while (queue.length > 0) {
      const {x, y} = queue.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 1 && nx < GRID_SIZE - 1 && ny >= 1 && ny < GRID_SIZE - 1 &&
            !visited[ny][nx] && this.grid[ny][nx] !== TILE.WALL) {
          visited[ny][nx] = true;
          queue.push({x: nx, y: ny});
        }
      }
    }
  },

  get(x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return TILE.WALL;
    return this.grid[y][x];
  },

  set(x, y, val) {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      this.grid[y][x] = val;
    }
  },

  isWalkable(x, y) {
    return this.get(x, y) === TILE.EMPTY;
  },

  destroyShishan(x, y) {
    const tile = this.get(x, y);
    const key = x + ',' + y;
    if (tile === TILE.SHISHAN || tile === TILE.SHISHAN_HARD || tile === TILE.SHISHAN_LEGACY) {
      this.set(x, y, TILE.EMPTY);
      delete this.shishanHealth[key];
      this.destroyedShishan++;
      return true;
    }
    return false;
  },

  respawnShishan(x, y) {
    if (this.get(x, y) === TILE.EMPTY && this.countShishan() < this.maxShishan) {
      const roll = Math.random();
      let tileType = TILE.SHISHAN;
      if (roll < 0.08) tileType = TILE.SHISHAN_HARD;
      this.set(x, y, tileType);
      if (tileType === TILE.SHISHAN_HARD) {
        this.shishanHealth[x + ',' + y] = 2;
      }
      this.totalShishanEver++;
      this.productRespawnCount++;
      return true;
    }
    return false;
  },

  // 在指定位置生成屎山（杀Bug后触发），如果位置被占则找附近空地
  spawnShishanAt(x, y) {
    if (this.countShishan() >= this.maxShishan) return false;

    // 随机决定类型：5% 祖传代码 / 20% 硬屎山 / 75% 普通
    const roll = Math.random();
    let tileType = TILE.SHISHAN;
    if (roll < 0.05) tileType = TILE.SHISHAN_LEGACY;
    else if (roll < 0.25) tileType = TILE.SHISHAN_HARD;

    const placeShishan = (nx, ny) => {
      this.set(nx, ny, tileType);
      this.totalShishanEver++;
      if (tileType !== TILE.SHISHAN) {
        const key = nx + ',' + ny;
        this.shishanHealth[key] = tileType === TILE.SHISHAN_LEGACY ? 3 : 2;
      }
      // 提示文字
      const texts = tileType === TILE.SHISHAN_LEGACY
        ? ['💀 祖传代码出现！前人留下的咒语', '⚔️ 这段代码没人敢动、、、、']
        : tileType === TILE.SHISHAN_HARD
        ? ['🧱 硬屎山！需要两颗测试用例', '🧱 这块屎山有点硬、、、、']
        : ['💩 又一座屎山拔地而起！', '🎉 屎山生成成功！程序员落泪'];
      Effects.banner(texts[0]);
      Danmaku.showBatch('shishanSpawn', 1);
    };

    // 尝试指定位置
    if (this.get(x, y) === TILE.EMPTY) {
      placeShishan(x, y);
      return true;
    }

    // 找附近的空地
    const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (this.get(nx, ny) === TILE.EMPTY) {
        placeShishan(nx, ny);
        return true;
      }
    }
    return false;
  },

  // 统计当前地图上的屎山总数
  countShishan() {
    let count = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const t = this.grid[y][x];
        if (t === TILE.SHISHAN || t === TILE.SHISHAN_HARD || t === TILE.SHISHAN_LEGACY) count++;
      }
    }
    return count;
  },

  getClearRate() {
    // 分母用 initialShishanCount + 产品复活的屎山数
    // 杀Bug生成的屎山不计入分母（它是惩罚机制，不应拉低清除率）
    const denominator = this.initialShishanCount + this.productRespawnCount;
    if (denominator === 0) return 1;
    return Math.min(1, this.destroyedShishan / denominator);
  },

  // 找一个空地随机位置（用于生成 Bug 怪等）
  getRandomEmptyCell() {
    const empties = [];
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === TILE.EMPTY) {
          empties.push({ x, y });
        }
      }
    }
    if (empties.length === 0) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  },

  // 找一个屎山旁边的空地（用于屎山复活时的位置选择）
  getRandomShishanAdjacent() {
    const candidates = [];
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === TILE.EMPTY) {
          // 检查周围是否有屎山
          const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
          for (const [nx, ny] of neighbors) {
            if (this.get(nx, ny) === TILE.SHISHAN || this.get(nx, ny) === TILE.SHISHAN_HARD || this.get(nx, ny) === TILE.SHISHAN_LEGACY) {
              candidates.push({ x, y });
              break;
            }
          }
        }
      }
    }
    if (candidates.length === 0) return this.getRandomEmptyCell();
    return candidates[Math.floor(Math.random() * candidates.length)];
  },
};
