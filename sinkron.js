/* Sinkronisasi data antar pengguna (Firebase Firestore).
   Isi blok FIREBASE_CONFIG di bawah dengan konfigurasi dari Firebase Console.
   Selama masih "ISI", aplikasi tetap berjalan di mode lokal (data hanya di browser). */
(function(){
  var FIREBASE_CONFIG = {
    apiKey: "ISI",
    authDomain: "ISI",
    projectId: "ISI",
    storageBucket: "ISI",
    messagingSenderId: "ISI",
    appId: "ISI"
  };
  if(!FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId==="ISI" || !window.firebase) return;
  var db;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    db.settings({ignoreUndefinedProperties:true, experimentalAutoDetectLongPolling:true});
  }catch(e){ if(window.console)console.error('Firebase gagal diinisialisasi',e); return; }
  /* Aplikasi memilih mode penyimpanan saat mulai. Tahan sampai semua skrip selesai dimuat
     (termasuk keuangan.js) agar semua koleksi ikut tersinkron. */
  var ready = new Promise(function(r){ if(document.readyState==='complete')r(); else window.addEventListener('load',function(){r()}); });
  window.claude = { use: function(k){ return ready.then(function(){ return k==='db' ? db : null; }); } };
})();
