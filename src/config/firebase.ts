import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

let app:  FirebaseApp | null = null;
let db:   Database   | null = null;
let ready = false;

try {
  const cfg = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (cfg.apiKey && cfg.databaseURL) {
    app   = initializeApp(cfg);
    db    = getDatabase(app);
    ready = true;
  } else {
    console.warn('[Firebase] 環境変数が未設定です。オンライン機能は無効。');
  }
} catch (e) {
  console.warn('[Firebase] 初期化失敗:', e);
}

export { db, ready as firebaseReady };
