import React, { useState, useEffect } from 'react';
import { SaveSystem, GameEventBus, GAME_EVENTS } from '../../logic/index';
import type { SaveData } from '../../logic/index';

interface TitleScreenProps {
  onStart: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const [visible, setVisible] = useState(true);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(SaveSystem.hasSave());
  }, []);

  if (!visible) return null;

  const handleStart = () => {
    setVisible(false);
    onStart();
  };

  const handleContinue = () => {
    const saveData: SaveData | null = SaveSystem.load();
    if (saveData) {
      GameEventBus.emit(GAME_EVENTS.GAME_LOADED, saveData);
    }
    setVisible(false);
    onStart();
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(180deg, #1a3a1a 0%, #2d5a2d 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
    userSelect: 'none',
  };

  const titleStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '48px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    marginBottom: '12px',
    textShadow: '2px 4px 8px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.15)',
    fontFamily: 'serif',
    textAlign: 'center',
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#f5e6a3',
    fontSize: '18px',
    letterSpacing: '2px',
    marginBottom: '64px',
    fontFamily: 'serif',
    textAlign: 'center',
    opacity: 0.85,
  };

  const startButtonStyle: React.CSSProperties = {
    padding: '16px 56px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '32px',
    color: '#ffffff',
    fontSize: '22px',
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: '3px',
    cursor: 'pointer',
    marginBottom: '20px',
    boxShadow: '0 4px 16px rgba(255,107,53,0.5)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    display: 'block',
  };

  const continueButtonStyle: React.CSSProperties = {
    padding: '14px 48px',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '32px',
    color: '#ffffff',
    fontSize: '20px',
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: '3px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(76,175,80,0.5)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    display: 'block',
  };

  const decorStyle: React.CSSProperties = {
    color: '#8fbc8f',
    fontSize: '32px',
    marginBottom: '24px',
    letterSpacing: '8px',
  };

  return (
    <div style={overlayStyle}>
      <div style={decorStyle}>🌲 🏕 🌲</div>
      <div style={titleStyle}>サバイバルファミリー</div>
      <div style={subtitleStyle}>〜時を超えた世界で生き延びろ〜</div>
      <button
        style={startButtonStyle}
        onClick={handleStart}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff8c5a';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FF6B35';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        スタート
      </button>
      {hasSave && (
        <button
          style={continueButtonStyle}
          onClick={handleContinue}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#66bb6a';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4CAF50';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          続きから
        </button>
      )}
    </div>
  );
};

export default TitleScreen;
