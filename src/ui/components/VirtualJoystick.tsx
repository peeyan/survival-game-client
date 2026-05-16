import React, { useState, useRef, useCallback, type CSSProperties } from 'react';
import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

// ジョイスティックの物理パラメータ
const JOYSTICK_RADIUS = 60; // ベース（外枠）の半径
const STICK_RADIUS = 30;    // スティック（ツマミ）の半径
const DEADZONE = 5;          // デッドゾーン（反応しない遊び）

const VirtualJoystick: React.FC = () => {
  // スティックの中心座標（親要素内の相対座標）
  const [stickPos, setStickPos] = useState({ x: JOYSTICK_RADIUS, y: JOYSTICK_RADIUS });
  // ジョイスティック自体の表示位置（画面上の絶対座標）
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  // タッチ中かどうか
  const [isActive, setIsActive] = useState(false);
  // タッチを開始した点の座標
  const touchOrigin = useRef({ x: 0, y: 0 });
  // タッチエリアの参照
  const touchAreaRef = useRef<HTMLDivElement>(null);

  // 入力を計算してPhaserに送信する共通関数
  const handleMoveInput = useCallback((currentX: number, currentY: number) => {
    // 1. タッチ開始点からの差分ベクトルを計算
    let deltaX = currentX - touchOrigin.current.x;
    let deltaY = currentY - touchOrigin.current.y;

    // 2. ベクトルの長さを計算
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // デッドゾーン以下の場合は入力を無視
    if (distance < DEADZONE) {
      setStickPos({ x: JOYSTICK_RADIUS, y: JOYSTICK_RADIUS });
      GameEventBus.emit(GAME_EVENTS.PLAYER_MOVE, { x: 0, y: 0 });
      return;
    }

    // 3. ベクトルをクランプ（ベースの範囲内に制限）
    const clampedDistance = Math.min(distance, JOYSTICK_RADIUS);

    // 正規化した方向ベクトル
    const dirX = deltaX / distance;
    const dirY = deltaY / distance;

    // クランプされた移動量
    deltaX = dirX * clampedDistance;
    deltaY = dirY * clampedDistance;

    // 4. UI表現用のスティック位置を更新
    setStickPos({
      x: JOYSTICK_RADIUS + deltaX,
      y: JOYSTICK_RADIUS + deltaY
    });

    // 5. 【重要】アナログ入力値を計算 (-1.0 ～ 1.0)
    // 距離を最大半径で割ることで、0～1の範囲にする
    const inputVector = {
      x: deltaX / JOYSTICK_RADIUS,
      y: deltaY / JOYSTICK_RADIUS
    };

    GameEventBus.emit(GAME_EVENTS.PLAYER_MOVE, inputVector);
  }, []);

  // タッチ開始（またはマウスダウン）
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    let x, y;
    if ('touches' in e) { // タッチイベント
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else { // マウスイベント（デバッグ用）
      x = e.clientX;
      y = e.clientY;
    }

    touchOrigin.current = { x, y };

    // タッチエリアのバウンディングボックスを取得
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    // ジョイスティックのベース位置を表示エリア内の座標に変換して設定
    setBasePos({
      x: x - rect.left - JOYSTICK_RADIUS,
      y: y - rect.top - JOYSTICK_RADIUS,
    });
    setStickPos({ x: JOYSTICK_RADIUS, y: JOYSTICK_RADIUS });
    setIsActive(true);
  };

  // タッチ移動（またはマウスムーブ）
  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isActive) return;

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    handleMoveInput(x, y);
  }, [isActive, handleMoveInput]);

  // タッチ終了（またはマウスアップ）
  const handleEnd = useCallback(() => {
    if (!isActive) return;
    setIsActive(false);
    // スティックを中央に戻す
    setStickPos({ x: JOYSTICK_RADIUS, y: JOYSTICK_RADIUS });
    // 入力をリセット
    GameEventBus.emit(GAME_EVENTS.PLAYER_MOVE, { x: 0, y: 0 });
  }, [isActive]);

  // マウスイベント用のdocumentレベルでの購読（指がエリア外に出ても検知するため）
  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e);
    const onMouseUp = () => handleEnd();

    if (isActive) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isActive, handleMove, handleEnd]);

  // CSSスタイルの定義（インラインで記述）
  const touchAreaStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '40vw', // 画面の左下40%をタッチエリアにする
    height: '60vh', // 画面の高さ60%
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // デバッグ用に薄く色付け（最終的には透明に）
    zIndex: 10,
    overflow: 'hidden',
    userSelect: 'none',
    touchAction: 'none', // スマホのデフォルトスクロール防止
  };

  const baseStyle: CSSProperties = {
    position: 'absolute',
    width: `${JOYSTICK_RADIUS * 2}px`,
    height: `${JOYSTICK_RADIUS * 2}px`,
    left: `${basePos.x}px`,
    top: `${basePos.y}px`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '3px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: isActive ? 'block' : 'none', // アクティブ時のみ表示
    boxSizing: 'border-box',
    // レトロゲーム風にドット絵の影などをつけても良い
  };

  const stickStyle: CSSProperties = {
    position: 'absolute',
    width: `${STICK_RADIUS * 2}px`,
    height: `${STICK_RADIUS * 2}px`,
    // スティックの中心を stickPos に合わせる
    left: `${stickPos.x - STICK_RADIUS}px`,
    top: `${stickPos.y - STICK_RADIUS}px`,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '50%',
    boxSizing: 'border-box',
    boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)', // 少し立体感を出す
  };

  return (
    <div
      ref={touchAreaRef}
      style={touchAreaStyle}
      onTouchStart={handleStart}
      onTouchMove={(e) => handleMove(e.nativeEvent)}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd} // キャンセル時（通知などで中断）も終了処理
      onMouseDown={handleStart} // PCデバッグ用
    >
      <div style={baseStyle}>
        <div style={stickStyle} />
      </div>
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '10px',
        pointerEvents: 'none'
      }}>ANALOG PAD</div>
    </div>
  );
};

export default VirtualJoystick;