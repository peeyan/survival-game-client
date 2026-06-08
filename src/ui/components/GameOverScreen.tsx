import React, { useState, useEffect } from 'react';
import { GameEventBus, GAME_EVENTS, gameState } from '../../logic/index';

interface GameOverProps {
  onShowTitle?: () => void;
}

const GameOverScreen: React.FC<GameOverProps> = ({ onShowTitle }) => {
  const [visible, setVisible] = useState(false);
  const [daysAlive, setDaysAlive] = useState(0);
  const [score, setScore] = useState(0);
  const [hintsFound, setHintsFound] = useState(0);

  useEffect(() => {
    const handleGameOver = () => {
      const days = gameState.daysAlive;
      const hints = gameState.hintsFound;
      const totalScore = gameState.calculateScore();
      setDaysAlive(days);
      setHintsFound(hints);
      setScore(totalScore);
      setVisible(true);
    };

    GameEventBus.on(GAME_EVENTS.GAME_OVER, handleGameOver);

    return () => {
      GameEventBus.off(GAME_EVENTS.GAME_OVER, handleGameOver);
    };
  }, []);

  if (!visible) return null;

  const survivalBonus = daysAlive * 100;
  const hintBonus = hintsFound * 500;

  const handleRetry = () => {
    window.location.reload();
  };

  const handleTitle = () => {
    if (onShowTitle) {
      onShowTitle();
    }
    setVisible(false);
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    userSelect: 'none',
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '24px',
    padding: '48px 56px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
    minWidth: '340px',
    maxWidth: '480px',
    width: '90vw',
  };

  const gameovertitleStyle: React.CSSProperties = {
    color: '#cc2222',
    fontSize: '52px',
    fontWeight: 'bold',
    letterSpacing: '6px',
    marginBottom: '28px',
    textShadow: '0 2px 12px rgba(204,34,34,0.35)',
    fontFamily: 'serif',
    textAlign: 'center',
  };

  const dividerStyle: React.CSSProperties = {
    width: '80%',
    height: '2px',
    backgroundColor: '#e0e0e0',
    margin: '8px 0 24px 0',
    borderRadius: '1px',
  };

  const infoLargeStyle: React.CSSProperties = {
    color: '#333333',
    fontSize: '26px',
    fontWeight: 'bold',
    marginBottom: '8px',
    fontFamily: 'serif',
    letterSpacing: '2px',
    textAlign: 'center',
  };

  const scoreLargeStyle: React.CSSProperties = {
    color: '#FF6B35',
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '20px',
    fontFamily: 'serif',
    letterSpacing: '2px',
    textAlign: 'center',
  };

  const breakdownBoxStyle: React.CSSProperties = {
    backgroundColor: '#f9f6f0',
    borderRadius: '12px',
    padding: '16px 28px',
    marginBottom: '32px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const breakdownItemStyle: React.CSSProperties = {
    color: '#666666',
    fontSize: '16px',
    fontFamily: 'serif',
    letterSpacing: '1px',
    marginBottom: '6px',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  };

  const retryButtonStyle: React.CSSProperties = {
    padding: '14px 36px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '28px',
    color: '#ffffff',
    fontSize: '18px',
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255,107,53,0.4)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  };

  const titleButtonStyle: React.CSSProperties = {
    padding: '14px 36px',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '28px',
    color: '#ffffff',
    fontSize: '18px',
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(76,175,80,0.4)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={gameovertitleStyle}>GAME OVER</div>
        <div style={dividerStyle} />

        <div style={infoLargeStyle}>生存：{daysAlive} 日</div>
        <div style={scoreLargeStyle}>スコア：{score.toLocaleString()} pt</div>

        <div style={breakdownBoxStyle}>
          <div style={breakdownItemStyle}>
            <span>生存ボーナス</span>
            <span>{survivalBonus.toLocaleString()} pt</span>
          </div>
          <div style={{ ...breakdownItemStyle, marginBottom: 0 }}>
            <span>ヒント発見</span>
            <span>{hintBonus.toLocaleString()} pt</span>
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button
            style={retryButtonStyle}
            onClick={handleRetry}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff8c5a';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FF6B35';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            もう一度プレイ
          </button>
          <button
            style={titleButtonStyle}
            onClick={handleTitle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#66bb6a';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4CAF50';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            タイトルへ
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
