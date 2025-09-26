import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAmPj2LcCZH5E7dojWIZe4krDtOWwWwmpg",
  authDomain: "tester-f8e3c.firebaseapp.com",
  projectId: "tester-f8e3c",
  storageBucket: "tester-f8e3c.firebasestorage.app",
  messagingSenderId: "128966097854",
  appId: "1:128966097854:web:7bb2a56d525f680a8f57ef",
  measurementId: "G-EQQ26KM5P0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const enableFirestoreNetwork = () => enableNetwork(db);
export const disableFirestoreNetwork = () => disableNetwork(db);

let connectionStatus = 'unknown';
export const getConnectionStatus = () => connectionStatus;

export const monitorConnection = () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      connectionStatus = 'offline';
      resolve(false);
    }, 5000);
    
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'tests', 'connection-test'))
        .then(() => {
          clearTimeout(timeout);
          connectionStatus = 'online';
          resolve(true);
        })
        .catch(() => {
          clearTimeout(timeout);
          connectionStatus = 'offline';
          resolve(false);
        });
    });
  });
};

const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('WebChannelConnection RPC')) {
    return;
  }
  if (typeof message === 'string' && message.includes('@firebase/firestore')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('WebChannelConnection') || 
       event.reason.message.includes('@firebase/firestore'))) {
    event.preventDefault();
  }
});

export default app;
