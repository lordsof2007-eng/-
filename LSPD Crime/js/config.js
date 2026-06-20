const AnmarsConfig = {
  apiKey: "AIzaSyB-gbGJ_UfEG0Z-w8iHzECcaJtF8WM9yLQ",
  authDomain: "daadwaaw-9dd30.firebaseapp.com",
  databaseURL: "https://daadwaaw-9dd30-default-rtdb.firebaseio.com",
  projectId: "daadwaaw-9dd30",
  storageBucket: "daadwaaw-9dd30.firebasestorage.app",
  messagingSenderId: "611850352829",
  appId: "1:611850352829:web:d001c690c792ab2fa45fd4",
  measurementId: "G-HPZ4M6Y0SE"
};

const DEFAULT_PASSWORDS = {
  officer: 'officer123',
  admin:   'admin123'
};

let db = null;
let firebaseReady = false;
try{
  if(AnmarsConfig.apiKey && !AnmarsConfig.apiKey.includes('ضع_') && typeof firebase !== 'undefined'){
    firebase.initializeApp(AnmarsConfig);
    db = firebase.database();
    firebaseReady = true;
  }
}catch(e){ firebaseReady = false; }
