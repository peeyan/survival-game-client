import React, { useState } from 'react';
import { multiplayerManager } from '../../game/systems/MultiplayerManager';
import { firebaseReady } from '../../config/firebase';
import { generateWorldSeed } from '../../game/systems/SeededRandom';

interface Props {
  onGameStart: (seed: number, isHost: boolean) => void;
  onClose: () => void;
}

type Phase = 'menu' | 'creating' | 'waiting' | 'joining' | 'error';

const RoomPanel: React.FC<Props> = ({ onGameStart, onClose }) => {
  const [phase,       setPhase]       = useState<Phase>('menu');
  const [roomCode,    setRoomCode]    = useState('');
  const [inputCode,   setInputCode]   = useState('');
  const [playerName,  setPlayerName]  = useState('冒険者');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [loading,     setLoading]     = useState(false);

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99995,
  };
  const panel: React.CSSProperties = {
    background: '#0d1117',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    padding: '32px',
    width: '360px',
    maxWidth: '95vw',
    color: '#fff',
    textAlign: 'center',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px', color: '#fff', fontSize: '16px',
    boxSizing: 'border-box', marginBottom: '12px',
    letterSpacing: '4px', textAlign: 'center',
  };
  const btn = (color: string): React.CSSProperties => ({
    width: '100%', padding: '12px',
    background: color, border: 'none', borderRadius: '10px',
    color: '#fff', fontSize: '15px', fontWeight: 'bold',
    cursor: 'pointer', marginBottom: '10px',
  });

  async function handleCreate() {
    setLoading(true);
    try {
      const seed = generateWorldSeed();
      const code = await multiplayerManager.createRoom(playerName, seed);
      setRoomCode(code);
      setPhase('waiting');
    } catch(e) {
      setErrorMsg(String(e));
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (inputCode.length < 4) { setErrorMsg('ルームコードを入力してください'); setPhase('error'); return; }
    setLoading(true);
    try {
      const seed = await multiplayerManager.joinRoom(inputCode.toUpperCase(), playerName);
      onGameStart(seed, false);
    } catch(e) {
      setErrorMsg(String(e));
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }

  function handleHostStart() {
    onGameStart(multiplayerManager.worldSeed, true);
  }

  if (!firebaseReady) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={panel} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ marginBottom: '16px', color: '#ff8844' }}>Firebase未設定</div>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px', lineHeight: 1.6 }}>
            オンライン機能を使うには<br/>
            <code style={{ color: '#88ccff' }}>.env</code> ファイルに<br/>
            Firebase設定が必要です。<br/>
            <code>.env.example</code> を参照してください。
          </div>
          <button style={btn('#444')} onClick={onClose}>閉じる</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
          🌐 オンライン協力
        </div>

        {/* 名前入力（共通） */}
        {(phase === 'menu' || phase === 'joining') && (
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>プレイヤー名</div>
            <input
              style={{ ...inputStyle, letterSpacing: '0', textAlign: 'left' }}
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={12}
              placeholder="冒険者"
            />
          </div>
        )}

        {/* メニュー */}
        {phase === 'menu' && (
          <>
            <button style={btn('#1a6b3a')} onClick={handleCreate} disabled={loading}>
              🏠 部屋を作る（ホスト）
            </button>
            <button style={btn('#1a3a6b')} onClick={() => setPhase('joining')} disabled={loading}>
              🚪 部屋に入る
            </button>
            <button style={btn('#333')} onClick={onClose}>キャンセル</button>
          </>
        )}

        {/* 参加コード入力 */}
        {phase === 'joining' && (
          <>
            <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
              ルームコードを入力
            </div>
            <input
              style={inputStyle}
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABCD12"
            />
            <button style={btn('#1a3a6b')} onClick={handleJoin} disabled={loading || inputCode.length < 4}>
              {loading ? '接続中...' : '参加する'}
            </button>
            <button style={btn('#333')} onClick={() => setPhase('menu')}>← 戻る</button>
          </>
        )}

        {/* 待機中（ホスト） */}
        {phase === 'waiting' && (
          <>
            <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
              このコードを仲間に伝えてください
            </div>
            <div style={{
              fontSize: '36px', fontWeight: 'bold', letterSpacing: '8px',
              color: '#ffcc44', background: '#1a1f2e',
              padding: '16px', borderRadius: '12px', marginBottom: '20px',
            }}>
              {roomCode}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
              仲間が参加したらゲームを開始してください
            </div>
            <button style={btn('#1a6b3a')} onClick={handleHostStart}>
              ▶ ゲーム開始
            </button>
            <button style={btn('#333')} onClick={() => { multiplayerManager.disconnect(); setPhase('menu'); }}>
              キャンセル
            </button>
          </>
        )}

        {/* エラー */}
        {phase === 'error' && (
          <>
            <div style={{ color: '#ff6644', marginBottom: '16px' }}>{errorMsg}</div>
            <button style={btn('#333')} onClick={() => setPhase('menu')}>← 戻る</button>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomPanel;
