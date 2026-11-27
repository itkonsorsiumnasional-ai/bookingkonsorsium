/* Sinkronisasi data antar pengguna + login (Firebase Firestore & Authentication).
   Login memakai Firebase Authentication bila skrip firebase-auth-compat.js dimuat di index.html.
   Tanpa skrip itu, aplikasi memakai login lokal lama. */
(function(){
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCYwI-We7TLn-TH08EIw7ebNkKv3wf2hUo",
    authDomain: "kn-booking.firebaseapp.com",
    projectId: "kn-booking",
    storageBucket: "kn-booking.firebasestorage.app",
    messagingSenderId: "109592597882",
    appId: "1:109592597882:web:cfdfd825213fe83864f2c3"
  };

  /* Lencana status koneksi (pojok kanan bawah) */
  window.addEventListener('load',function(){
    var el=document.createElement('div');el.id='syncbadge';
    el.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;font:600 12px/1.3 Inter,system-ui,sans-serif;padding:6px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);color:#fff;pointer-events:none;max-width:70vw';
    document.body.appendChild(el);
    function upd(){
      var t,c;
      try{
        if(S.err){t='Gagal terhubung ke database ('+S.err+')';c='#c0392b'}
        else if(S.mode==='db'){ if(S.loaded){t='Online: data tersinkron antar pengguna';c='#0f8a5f'} else if(S.authMode&&S.authState!=='ok'){t='Online: belum masuk';c='#555'} else {t='Menghubungkan ke database...';c='#b7791f'} }
        else {t='Mode lokal: data TIDAK dibagikan ke pengguna lain';c='#c2570c'}
      }catch(e){t='Memuat...';c='#555'}
      el.textContent=t;el.style.background=c;
    }
    upd();setInterval(upd,1000);
  });
  if(!FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId==="ISI" || !window.firebase) return;
  var db;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    db.settings({ignoreUndefinedProperties:true, experimentalAutoDetectLongPolling:true});
  }catch(e){ if(window.console)console.error('Firebase gagal diinisialisasi',e); return; }

  /* Firebase Authentication (aktif bila firebase-auth-compat.js dimuat) */
  if(firebase.auth){
    var auth=firebase.auth();
    window.KN_AUTH={
      onChange:function(cb){return auth.onAuthStateChanged(cb)},
      signIn:function(e,p){return auth.signInWithEmailAndPassword(e,p)},
      signOut:function(){return auth.signOut()},
      reset:function(e){return auth.sendPasswordResetEmail(e)},
      changePassword:function(oldp,newp){
        var u=auth.currentUser;
        var cred=firebase.auth.EmailAuthProvider.credential(u.email,oldp);
        return u.reauthenticateWithCredential(cred).then(function(){return u.updatePassword(newp)});
      },
      /* Membuat akun login baru tanpa mengeluarkan admin: dipakai aplikasi kedua (sec) */
      createUser:function(e,p){
        var app;try{app=firebase.app('sec')}catch(x){app=firebase.initializeApp(FIREBASE_CONFIG,'sec')}
        var a=app.auth();
        return a.createUserWithEmailAndPassword(e,p).then(function(c){var uid=c.user.uid;return a.signOut().then(function(){return uid})});
      }
    };
  }

  /* Aplikasi memilih mode penyimpanan saat mulai. Tahan sampai semua skrip selesai dimuat
     (termasuk keuangan.js) agar semua koleksi ikut tersinkron. */
  var ready = new Promise(function(r){ if(document.readyState==='complete')r(); else window.addEventListener('load',function(){r()}); });
  window.claude = { use: function(k){ return ready.then(function(){ return k==='db' ? db : null; }); } };
})();
