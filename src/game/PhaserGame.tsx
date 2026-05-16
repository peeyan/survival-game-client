import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export const PhaserGame = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // React StrictMode対策: 既にインスタンスがあればスキップ
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'phaser-container', // 対象のDOM ID
      scene: [MainScene],
      scale: {
        mode: Phaser.Scale.RESIZE, // スマホの画面サイズ変更に自動追従
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: true, // 開発中はtrueにしておくと当たり判定が見えて便利です
          gravity: { x: 0, y: 0 } // トップダウンビューなので重力はゼロ
        }
      },
    };

    gameRef.current = new Phaser.Game(config);

    // クリーンアップ関数: コンポーネント破棄時にゲームインスタンスも破棄
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Phaserがキャンバスを展開するためのコンテナ
  return (
    <div
      id="phaser-container"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} 
    />
  );
};