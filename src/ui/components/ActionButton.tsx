import { GameEventBus, GAME_EVENTS } from '../../logic/GameEventBus';

const ActionButton: React.FC = () => {
  const handleAction = () => {
    GameEventBus.emit(GAME_EVENTS.ACTION_BUTTON);
  };

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '40px',
    right: '40px',
    width: '80px',
    height: '80px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'bold',
    fontSize: '0.8em',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    userSelect: 'none',
    touchAction: 'none',
    zIndex: 10,
    boxShadow: '0 4px 0 rgba(0,0,0,0.3)'
  };

  return (
    <div
      style={buttonStyle}
      onTouchStart={handleAction}
      onMouseDown={handleAction} // PCデバッグ用
    >
      ACTION
    </div>
  );
};

export default ActionButton;