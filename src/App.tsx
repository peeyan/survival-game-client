import { PhaserGame } from './game/PhaserGame';
import { VirtualJoystick, ActionButton, InventoryUI, CraftMenu } from './ui/components/index';

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* ゲーム画面のレイヤー */}
      <PhaserGame />

      {/* React UI レイヤー（前面） */}
      <VirtualJoystick />
      <ActionButton />
      <InventoryUI />
      <CraftMenu />
    </div>
  );
}

export default App;