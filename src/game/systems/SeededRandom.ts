/**
 * Mulberry32 シードRNG
 * 同じシードを渡せば全プレイヤーで同一のワールドが生成される
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s += 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ワールドシードを生成（ホスト用） */
export function generateWorldSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}
