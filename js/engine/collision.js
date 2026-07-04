// ========== 碰撞检测工具 ==========

const Collision = {
  // 检查两个网格实体是否在同一格
  sameCell(a, b) {
    return a.gridX === b.gridX && a.gridY === b.gridY;
  },

  // 检查网格坐标是否可通行
  canMoveTo(x, y) {
    return GameMap.isWalkable(x, y) && !Bomb.isAt(x, y);
  },

  // 检查玩家是否被 Bug 怪碰到
  playerHitByEnemy() {
    for (const e of Enemy.list) {
      if (e.alive && Collision.sameCell(Player, e)) {
        return true;
      }
    }
    return false;
  },

  // 检查玩家是否在火焰上
  playerInFire() {
    return Bomb.isFireAt(Player.gridX, Player.gridY);
  },
};
