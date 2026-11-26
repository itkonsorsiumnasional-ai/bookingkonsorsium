/* Modul Keuangan: Laba Rugi, Neraca, Kas & Pengeluaran. Dipasang lewat <script src="keuangan.js"></script> di index.html */
(function(){var st=document.createElement('style');st.textContent="table.fin{width:100%;border-collapse:collapse}\ntable.fin td{padding:6px 12px;border-bottom:1px solid var(--line,#dde1ec)}\ntable.fin td.v{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;width:150px}\ntable.fin td.v.neg{color:#c0392b}\ntable.fin tr.h td{font-weight:800;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#59627d);background:var(--surface2,#eef1f8);border-bottom:0}\ntable.fin tr.i td:first-child{padding-left:28px}\ntable.fin tr.s td{font-weight:700;border-top:1px solid var(--fg,#111)}\ntable.fin tr.g td{font-weight:800;font-size:15px;border-top:2px solid var(--fg,#111);border-bottom:2px solid var(--fg,#111)}\ntable.fin tr.n td{font-size:12px;color:var(--muted,#59627d);border-bottom:0}\n.fin2{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}\n.fin2 .paperside{min-width:0}\n@media (max-width:860px){.fin2{grid-template-columns:minmax(0,1fr)}}\n.pos{color:var(--ok);font-weight:600}.negc{color:var(--red);font-weight:600}";document.head.appendChild(st)})();
(function(){
/*ENGINE-START*/
const FZ='0000-01-01';
const FIN_KINDS=[
  ['opex','Beban operasional','out'],
  ['vendor','Bayar vendor / supplier (HPP)','out'],
  ['tax','Setor pajak','out'],
  ['tips','Serahkan tips ke tour leader / guide','out'],
  ['asset','Beli aset tetap','out'],
  ['dep','Penyusutan aset (tanpa kas)','non'],
  ['draw','Prive / penarikan pemilik','out'],
  ['loanpay','Bayar cicilan pinjaman','out'],
  ['capital','Setoran modal pemilik','in'],
  ['loan','Pinjaman diterima','in'],
  ['otherinc','Pendapatan lain (komisi, bunga, dll)','in']
];
const KD={};FIN_KINDS.forEach(k=>{KD[k[0]]=k});
const OPEX=['Gaji & Honor','Sewa Kantor','Listrik, Air & Internet','Marketing & Iklan','Transportasi & Operasional','Perlengkapan Kantor','Administrasi Bank','Komisi & Fee','Beban Lainnya'];
const eSign=e=>{const k=KD[e.kind];return !k?0:k[2]==='in'?1:k[2]==='out'?-1:0};

/* baris pendapatan dan modal dari satu booking */
function finLines(b,c){
  const L=[],pax=paxOf(b),pc=pax.length*num(b.pkgCost);
  if(c.paxTotal||pc)L.push({l:'Paket tour / perjalanan ('+(b.tripType||'Umum')+')',r:c.paxTotal,k:pc});
  (b.items||[]).forEach(i=>L.push({l:i.type||'Lainnya',r:num(i.qty)*num(i.price),k:num(i.qty)*num(i.cost)}));
  return L;
}

/* Laba rugi untuk periode [from,to]. Pendapatan diakui saat invoice terbit (akrual). */
function finPL(from,to){
  const inR=d=>!!d&&d>=from&&d<=to;
  const P={rev:{},cost:{},sales:0,disc:0,admin:0,hpp:0,tax:0,tips:0,n:0,opex:{},opexT:0,dep:0,cancelPay:0,otherinc:0};
  Object.values(S.bookings).forEach(b=>{
    if(b.status==='cancelled'){(b.payments||[]).forEach(p=>{if(inR(p.date))P.cancelPay+=num(p.amount)});return}
    if(b.status==='draft'||!inR(b.invoiceDate))return;
    const c=calc(b);P.n++;
    finLines(b,c).forEach(x=>{P.rev[x.l]=(P.rev[x.l]||0)+x.r;P.cost[x.l]=(P.cost[x.l]||0)+x.k});
    P.sales+=c.subtotal;P.disc+=c.subtotal-c.base;P.admin+=c.admin;P.hpp+=c.cost;P.tax+=c.tax;P.tips+=c.tips;
  });
  Object.values(S.expenses||{}).forEach(e=>{
    if(!inR(e.date))return;const a=num(e.amount);
    if(e.kind==='opex'){const k=e.cat||'Beban Lainnya';P.opex[k]=(P.opex[k]||0)+a;P.opexT+=a}
    else if(e.kind==='dep')P.dep+=a;
    else if(e.kind==='otherinc')P.otherinc+=a;
  });
  P.netRev=P.sales-P.disc+P.admin;
  P.gross=P.netRev-P.hpp;
  P.bebanT=P.opexT+P.dep;
  P.operating=P.gross-P.bebanT;
  P.other=P.cancelPay+P.otherinc;
  P.net=P.operating+P.other;
  return P;
}

/* Neraca per tanggal asOf (kumulatif sejak awal pembukuan). */
function finBS(asOf){
  const st=S.settings||{},ok=d=>!!d&&d<=asOf;
  let cash=num(st.openCash),ar=0,over=0,hpp=0,tax=0,tips=0;
  Object.values(S.bookings).forEach(b=>{
    const paid=(b.payments||[]).reduce((a,p)=>ok(p.date)?a+num(p.amount):a,0);
    cash+=paid;
    if(b.status==='cancelled')return;
    const c=calc(b),inv=ok(b.invoiceDate)&&b.status!=='draft';
    if(inv){hpp+=c.cost;tax+=c.tax;tips+=c.tips}
    const bal=(inv?c.total:0)-paid;
    if(bal>0)ar+=bal;else over-=bal;
  });
  const K={};FIN_KINDS.forEach(k=>{K[k[0]]=0});
  Object.values(S.expenses||{}).forEach(e=>{
    if(!ok(e.date)||!KD[e.kind])return;
    const a=num(e.amount);K[e.kind]+=a;cash+=eSign(e)*a;
  });
  const vendorNet=hpp-K.vendor,taxNet=tax-K.tax,tipsNet=tips-K.tips;
  const fixed=num(st.openAsset)+K.asset-K.dep,loans=num(st.openDebt)+K.loan-K.loanpay;
  const B={cash,ar,over,fixed,loans,capital:K.capital,draw:K.draw,
    vendor:Math.max(0,vendorNet),taxL:Math.max(0,taxNet),tipsL:Math.max(0,tipsNet),
    preV:Math.max(0,-vendorNet),preT:Math.max(0,-taxNet),preP:Math.max(0,-tipsNet)};
  B.cur=cash+ar+B.preV+B.preT+B.preP;
  B.assets=B.cur+fixed;
  B.liab=over+B.vendor+B.taxL+B.tipsL+loans;
  B.openEq=num(st.openCash)+num(st.openAsset)-num(st.openDebt);
  B.retained=finPL(FZ,asOf).net;
  B.equity=B.openEq+K.capital-K.draw+B.retained;
  B.diff=B.assets-B.liab-B.equity;
  return B;
}
/*ENGINE-END*/

/* ---------- Penyesuaian ke aplikasi ---------- */
DEF_SET.openCash=0;DEF_SET.openAsset=0;DEF_SET.openDebt=0;
S.expenses=S.expenses||{};
COLS.push('expenses');
ADMIN_ONLY.push('pengeluaran','labarugi','neraca');
Object.assign(ICON,{
  pengeluaran:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
  labarugi:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  neraca:'<path d="M12 3v18M5 21h14M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>'
});
{const at=NAV.findIndex(n=>n[0]==='laporan');NAV.splice(at<0?NAV.length:at+1,0,['pengeluaran','Kas & Pengeluaran'],['labarugi','Laba Rugi'],['neraca','Neraca'])}
{const t=todayISO();ui.lrFrom=t.slice(0,4)+'-01-01';ui.lrTo=t;ui.nrDate=t;ui.xq='';ui.xKind=''}

/* penyimpanan lokal dan cadangan ikut memuat pengeluaran */
saveLocal=function(){try{localStorage.setItem(LS,JSON.stringify({customers:S.customers,catalog:S.catalog,bookings:S.bookings,departures:S.departures,users:S.users,expenses:S.expenses,settings:S.settings}))}catch(e){}};
loadLocal=function(){try{const d=JSON.parse(localStorage.getItem(LS)||'null');if(d){S.customers=d.customers||{};S.catalog=d.catalog||{};S.bookings=d.bookings||{};S.departures=d.departures||{};S.users=d.users||{};S.expenses=d.expenses||{};S.settings=normSet(d.settings)}}catch(e){}};
backup=function(){saveFile('cadangan-booking-'+todayISO()+'.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),settings:S.settings,customers:S.customers,catalog:S.catalog,bookings:S.bookings,departures:S.departures,users:S.users,expenses:S.expenses},null,2))};

/* halaman baru masuk ke render */
const FIN_ROUTES={pengeluaran:()=>vExpenses(),labarugi:()=>vLabaRugi(),neraca:()=>vNeraca()};
const _render=render;
render=function(force){
  if(FIN_ROUTES[ui.route]&&S.loaded&&meU()&&navOK(ui.route)){const app=$('#app');if(app)app.innerHTML=shell(FIN_ROUTES[ui.route]());return}
  return _render(force);
};
{const h=(location.hash||'').slice(1);if(FIN_ROUTES[h])ui.route=h}

/* ---------- Tabel ---------- */
const fm=n=>{n=Math.round(n||0);return n<0?'('+fnum(-n)+')':fnum(n)};
function finTable(rows){
  return '<table class="fin"><tbody>'+rows.map(([t,l,v])=>{
    if(t==='n')return '<tr class="n"><td colspan="2">'+esc(l)+'</td></tr>';
    return '<tr class="'+t+'"><td>'+esc(l)+'</td><td class="v'+(v<0?' neg':'')+'">'+(v==null?'':fm(v))+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function plRows(P){
  const R=[['h','Pendapatan']];
  Object.entries(P.rev).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>R.push(['i',k,v]));
  if(!Object.keys(P.rev).length)R.push(['i','Belum ada invoice pada periode ini',0]);
  R.push(['s','Total penjualan',P.sales]);
  if(P.disc)R.push(['i','Diskon / agent discount',-P.disc]);
  if(P.admin)R.push(['i','Biaya admin / service',P.admin]);
  R.push(['s','Pendapatan bersih',P.netRev]);
  R.push(['h','Harga pokok penjualan (HPP)']);
  Object.entries(P.cost).filter(e=>e[1]).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>R.push(['i',k,v]));
  R.push(['s','Total HPP',P.hpp]);
  R.push(['g','LABA KOTOR',P.gross]);
  R.push(['h','Beban operasional']);
  Object.entries(P.opex).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>R.push(['i',k,v]));
  if(P.dep)R.push(['i','Penyusutan aset',P.dep]);
  if(!P.bebanT)R.push(['i','Belum ada beban tercatat',0]);
  R.push(['s','Total beban operasional',P.bebanT]);
  R.push(['g','LABA OPERASIONAL',P.operating]);
  R.push(['h','Pendapatan lain-lain']);
  if(P.cancelPay)R.push(['i','Pembayaran dari booking batal (tidak dikembalikan)',P.cancelPay]);
  if(P.otherinc)R.push(['i','Pendapatan lain (komisi, bunga, dll)',P.otherinc]);
  if(!P.other)R.push(['i','Tidak ada',0]);
  R.push(['s','Total pendapatan lain-lain',P.other]);
  R.push(['g','LABA (RUGI) BERSIH',P.net]);
  R.push(['n','Pendapatan diakui saat invoice terbit, bukan saat tamu berangkat. HPP diambil dari harga modal di booking. Pajak ('+rp(P.tax)+') dan tips ('+rp(P.tips)+') yang ditagihkan ke pelanggan bukan pendapatan; keduanya dicatat sebagai titipan di Neraca.']);
  return R;
}
function nrRows(B){
  const A=[['h','Aktiva lancar'],['i','Kas & bank',B.cash],['i','Piutang usaha (invoice belum lunas)',B.ar]];
  if(B.preV)A.push(['i','Uang muka ke vendor',B.preV]);
  if(B.preT)A.push(['i','Pajak dibayar di muka',B.preT]);
  if(B.preP)A.push(['i','Tips dibayar di muka',B.preP]);
  A.push(['s','Total aktiva lancar',B.cur],['h','Aktiva tetap'],['i','Aset tetap (nilai buku)',B.fixed],['s','Total aktiva tetap',B.fixed],['g','TOTAL AKTIVA',B.assets]);
  const L=[['h','Kewajiban'],['i','Utang vendor / supplier',B.vendor],['i','Uang muka & kelebihan bayar pelanggan',B.over],['i','Titipan pajak (belum disetor)',B.taxL],['i','Titipan tips (belum diserahkan)',B.tipsL],['i','Pinjaman / utang lain',B.loans],['s','Total kewajiban',B.liab],
    ['h','Ekuitas'],['i','Modal awal',B.openEq]];
  if(B.capital)L.push(['i','Setoran modal tambahan',B.capital]);
  if(B.draw)L.push(['i','Prive / penarikan pemilik',-B.draw]);
  L.push(['i','Laba (rugi) ditahan sampai tanggal ini',B.retained],['s','Total ekuitas',B.equity],['g','TOTAL PASIVA',B.liab+B.equity]);
  return {A,L};
}
function finPaper(title,sub,body){
  return '<style>table.fin{width:100%;border-collapse:collapse}table.fin td{padding:5px 10px;border-bottom:1px solid #dde1ec}table.fin td.v{text-align:right;white-space:nowrap;width:130px}table.fin td.v.neg{color:#c0392b}table.fin tr.h td{font-weight:800;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#59627d;background:#eef1f8;border-bottom:0}table.fin tr.i td:first-child{padding-left:24px}table.fin tr.s td{font-weight:700;border-top:1px solid #111}table.fin tr.g td{font-weight:800;font-size:14px;border-top:2px solid #111;border-bottom:2px solid #111}table.fin tr.n td{font-size:11px;color:#59627d;border-bottom:0}.fin2{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}</style><div class="paper">'+paperHead(title,'<div>'+esc(sub)+'</div>')+'<div style="margin-top:14px">'+body+'</div></div>';
}
/* ---------- Excel ---------- */
function xFin(sheetName,title,sub,blocks){
  const wb=new XBook(),w=blocks.length===2?[46,18,3,46,18]:[54,20],s=wb.sheet(sheetName,w);
  wb.merge(s,1,1,1,w.length,S.settings.name+' - '+title,{b:1,sz:15,al:'center'});s.heights[1]=26;
  wb.merge(s,2,1,2,w.length,sub,{al:'center'});
  blocks.forEach((rows,bi)=>{
    let r=4;const c0=bi*3+1;
    rows.filter(x=>x[0]!=='n').forEach(([t,l,v])=>{
      const bold=(t==='h'||t==='s'||t==='g')?1:0,fill=t==='h'?'D9D9D9':(t==='g'?'FFF2CC':undefined),bd=t==='s'?'thin':(t==='g'?'medium':undefined);
      wb.set(s,r,c0,(t==='i'?'   ':'')+l,{b:bold,fill,bd,al:'left'});
      wb.set(s,r,c0+1,v==null?'':Math.round(v),{b:bold,fill,bd,al:'right',nf:37});
      r++;
    });
  });
  return wb.build();
}

/* ---------- Laba Rugi ---------- */
function vLabaRugi(){
  const P=finPL(ui.lrFrom,ui.lrTo),mg=P.netRev?Math.round(P.gross/P.netRev*100):0,nm=P.netRev?Math.round(P.net/P.netRev*100):0;
  const cats=Object.keys(P.rev).sort((a,b)=>P.rev[b]-P.rev[a]);
  const catRows=cats.map(k=>{const m=P.rev[k]-P.cost[k];return '<tr><td>'+esc(k)+'</td><td class="r num">'+fm(P.rev[k])+'</td><td class="r num">'+fm(P.cost[k])+'</td><td class="r num">'+fm(m)+'</td><td class="r num">'+(P.rev[k]?Math.round(m/P.rev[k]*100):0)+'%</td></tr>'}).join('');
  return '<div class="pagehead"><div><h1>Laba Rugi</h1><p>Periode '+esc(rangeText(ui.lrFrom,ui.lrTo))+'</p></div><div class="row"><button class="btn" data-fa="lr-xlsx">Unduh Excel</button><button class="btn primary" data-fa="lr-pdf">Cetak / PDF</button></div></div>'
  +'<div class="card"><div class="cb"><div class="row" style="align-items:flex-end"><label class="fld" style="width:170px"><span>Dari tanggal</span><input type="date" id="lrFrom" value="'+ui.lrFrom+'"></label><label class="fld" style="width:170px"><span>Sampai tanggal</span><input type="date" id="lrTo" value="'+ui.lrTo+'"></label>'
  +'<button class="btn sm" data-fa="lr-pre" data-p="m">Bulan ini</button><button class="btn sm" data-fa="lr-pre" data-p="pm">Bulan lalu</button><button class="btn sm" data-fa="lr-pre" data-p="y">Tahun ini</button></div></div></div>'
  +'<div class="kpis"><div class="card kpi"><small>Pendapatan bersih</small><b class="num">'+rp(P.netRev)+'</b><span>'+P.n+' invoice terbit</span></div><div class="card kpi"><small>Laba kotor</small><b class="num">'+rp(P.gross)+'</b><span>margin '+mg+'%</span></div><div class="card kpi"><small>Total beban</small><b class="num">'+rp(P.bebanT)+'</b><span>beban operasional + penyusutan</span></div><div class="card kpi"><small>Laba (rugi) bersih</small><b class="num '+(P.net<0?'negc':'')+'">'+rp(P.net)+'</b><span>'+nm+'% dari pendapatan</span></div></div>'
  +'<div class="card"><div class="ch"><h2>Laporan laba rugi</h2><span class="hint">dalam Rupiah</span></div>'+finTable(plRows(P))+'</div>'
  +(cats.length?'<div class="card"><div class="ch"><h2>Margin per jenis layanan</h2></div><div class="tablewrap"><table class="t" style="min-width:520px"><thead><tr><th>Jenis</th><th class="r">Pendapatan</th><th class="r">HPP</th><th class="r">Margin</th><th class="r">%</th></tr></thead><tbody>'+catRows+'</tbody></table></div></div>':'')
  +'<p class="hint" style="margin:0 2px">Beban operasional dicatat di menu Kas &amp; Pengeluaran. Jika HPP terlihat nol, isi harga modal di booking atau katalog.</p>';
}
/* ---------- Neraca ---------- */
function vNeraca(){
  const B=finBS(ui.nrDate),R=nrRows(B),st=S.settings;
  const empty=!num(st.openCash)&&!num(st.openAsset)&&!num(st.openDebt)&&!Object.keys(S.expenses||{}).length;
  const bal=Math.abs(B.diff)<1;
  return '<div class="pagehead"><div><h1>Neraca</h1><p>Posisi keuangan per '+fmtLong(ui.nrDate)+'</p></div><div class="row"><button class="btn" data-fa="bal-open">Atur saldo awal</button><button class="btn" data-fa="nr-xlsx">Unduh Excel</button><button class="btn primary" data-fa="nr-pdf">Cetak / PDF</button></div></div>'
  +'<div class="card"><div class="cb"><label class="fld" style="width:200px"><span>Per tanggal</span><input type="date" id="nrDate" value="'+ui.nrDate+'"></label></div></div>'
  +(empty?'<div class="banner">Saldo awal kas, aset, dan utang belum diisi. Klik "Atur saldo awal" agar Neraca mencerminkan kondisi usaha yang sebenarnya.</div>':'')
  +(bal?'<div class="banner" style="background:var(--ok-soft);color:var(--ok)">Neraca seimbang: total aktiva sama dengan total pasiva.</div>':'<div class="banner" style="background:var(--red-soft);color:var(--red)">Neraca belum seimbang, selisih '+rp(B.diff)+'. Periksa data tanggal pada booking, pembayaran, dan transaksi.</div>')
  +'<div class="fin2"><div class="card"><div class="ch"><h2>Aktiva</h2><span class="hint">dalam Rupiah</span></div>'+finTable(R.A)+'</div><div class="card"><div class="ch"><h2>Pasiva</h2><span class="hint">dalam Rupiah</span></div>'+finTable(R.L)+'</div></div>'
  +'<p class="hint" style="margin:0 2px">Kas = saldo awal + pembayaran pelanggan + transaksi di Kas &amp; Pengeluaran. Piutang = sisa tagihan invoice. Booking yang dibatalkan dan sudah ada pembayarannya dicatat sebagai pendapatan. Status booking dihitung sesuai kondisi saat ini, bukan kondisi pada tanggal tersebut.</p>';
}
function openBalForm(){
  const st=S.settings,D={openCash:nz(st.openCash),openAsset:nz(st.openAsset),openDebt:nz(st.openDebt)};
  FORM={D,modal:true};
  openModal('<div class="sh"><h2>Saldo awal</h2><button class="x" data-act="close" aria-label="Tutup">&times;</button></div><div class="sb"><p class="hint" style="margin:0">Posisi usaha sebelum data di aplikasi ini mulai dipakai. Modal awal dihitung otomatis: kas + aset tetap - utang.</p><div class="fgrid">'
  +fld('Saldo kas & bank awal (Rp)',inp('openCash',D.openCash,{type:'number'}),'full')+fld('Nilai aset tetap awal (Rp)',inp('openAsset',D.openAsset,{type:'number',min:0}),'full')+fld('Utang / pinjaman awal (Rp)',inp('openDebt',D.openDebt,{type:'number',min:0}),'full')
  +'</div></div><div class="sf"><span class="err" id="ferr"></span><button class="btn" data-act="close">Batal</button><button class="btn primary" data-fa="bal-save">Simpan</button></div>');
}
async function saveBal(){
  const D=FORM.D;
  await safe(async()=>{await put('config','company',{...S.settings,openCash:num(D.openCash),openAsset:num(D.openAsset),openDebt:num(D.openDebt)});closeModal();toast('Saldo awal disimpan');render(true)});
}
/* ---------- Kas & Pengeluaran ---------- */
function tExp(){
  const q=(ui.xq||'').trim().toLowerCase();
  const rows=Object.entries(S.expenses||{}).filter(([id,e])=>(!ui.xKind||e.kind===ui.xKind)&&(!q||[e.desc,e.cat,e.ref,(KD[e.kind]||[])[1]].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b[1].date||'').localeCompare(a[1].date||'')||(b[1].createdAt||0)-(a[1].createdAt||0));
  if(!rows.length)return '<div class="empty"><h3>'+(Object.keys(S.expenses||{}).length?'Tidak ada hasil':'Belum ada transaksi')+'</h3>'+(Object.keys(S.expenses||{}).length?'Ubah kata kunci atau filter.':'Catat beban operasional, pembayaran vendor, setoran modal, dan transaksi kas lainnya di sini.')+'</div>';
  return '<table class="t"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Uraian</th><th>Metode</th><th class="r">Jumlah</th></tr></thead><tbody>'+rows.map(([id,e])=>{
    const k=KD[e.kind]||['', e.kind||'-','out'],sg=k[2]==='in'?1:k[2]==='out'?-1:0;
    return '<tr class="click" data-fa="exp-edit" data-id="'+id+'"><td>'+fmtDate(e.date)+'</td><td class="strong">'+esc(k[1])+(e.cat?'<div class="small mut">'+esc(e.cat)+'</div>':'')+'</td><td>'+esc(e.desc||'-')+(e.ref?'<div class="small mut">Ref: '+esc(e.ref)+'</div>':'')+'</td><td>'+(k[2]==='non'?'<span class="mut">tanpa kas</span>':esc(e.method||'-'))+'</td><td class="r num '+(sg>0?'pos':sg<0?'':'mut')+'">'+(sg>0?'+':sg<0?'-':'')+rp(e.amount)+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function vExpenses(){
  const t=todayISO(),ym=t.slice(0,7);let out=0,inn=0;
  Object.values(S.expenses||{}).forEach(e=>{if((e.date||'').slice(0,7)!==ym)return;const k=KD[e.kind];if(!k)return;if(k[2]==='out')out+=num(e.amount);else if(k[2]==='in')inn+=num(e.amount)});
  const cash=finBS(t).cash;
  return '<div class="pagehead"><div><h1>Kas & Pengeluaran</h1><p>Beban operasional dan transaksi kas di luar pembayaran booking. Dipakai oleh Laba Rugi dan Neraca.</p></div><div class="row"><button class="btn primary" data-fa="exp-new">+ Catat transaksi</button></div></div>'
  +'<div class="kpis"><div class="card kpi"><small>Saldo kas & bank</small><b class="num '+(cash<0?'negc':'')+'">'+rp(cash)+'</b><span>per hari ini, termasuk pembayaran booking</span></div><div class="card kpi"><small>Pengeluaran bulan ini</small><b class="num">'+rp(out)+'</b></div><div class="card kpi"><small>Pemasukan lain bulan ini</small><b class="num">'+rp(inn)+'</b><span>modal, pinjaman, pendapatan lain</span></div></div>'
  +'<div class="card"><div class="filters"><input type="search" id="xq" placeholder="Cari uraian, kategori, referensi" value="'+esc(ui.xq||'')+'" aria-label="Cari transaksi"><select id="xKind" aria-label="Jenis transaksi"><option value="">Semua jenis</option>'+FIN_KINDS.map(k=>'<option value="'+k[0]+'"'+(ui.xKind===k[0]?' selected':'')+'>'+esc(k[1])+'</option>').join('')+'</select></div><div class="tablewrap" id="xbody">'+tExp()+'</div></div>';
}
const KHINT={opex:'Masuk ke Laba Rugi sebagai beban pada tanggal ini.',vendor:'Mengurangi utang vendor. HPP sudah dicatat otomatis dari booking, jadi pembayaran ke vendor tidak dihitung dua kali sebagai beban.',tax:'Mengurangi titipan pajak dari invoice.',tips:'Mengurangi titipan tips yang ditagih dari peserta.',asset:'Menambah aset tetap di Neraca, bukan beban. Catat penyusutannya terpisah.',dep:'Beban tanpa kas: masuk Laba Rugi dan mengurangi nilai aset tetap.',draw:'Mengurangi ekuitas, bukan beban usaha.',loanpay:'Mengurangi pinjaman. Bunga dicatat sebagai beban operasional.',capital:'Menambah kas dan ekuitas.',loan:'Menambah kas dan pinjaman (kewajiban).',otherinc:'Masuk ke Laba Rugi sebagai pendapatan lain.'};
function expBody(D){
  const k=KD[D.kind]||KD.opex;
  return '<div class="fgrid">'+fld('Jenis transaksi *',sel('kind',D.kind,FIN_KINDS.map(x=>[x[0],x[1]]),{re:1}),'span2')
  +(D.kind==='opex'?fld('Kategori beban *',sel('cat',D.cat,OPEX)):'')
  +fld('Tanggal *',inp('date',D.date,{type:'date'}))+fld('Jumlah (Rp) *',inp('amount',nz(D.amount),{type:'number',min:0}))
  +fld('Uraian',inp('desc',D.desc,{ph:'Contoh: Gaji staf November'}),'span2')
  +(k[2]==='non'?'':fld(k[2]==='in'?'Diterima lewat':'Dibayar lewat',sel('method',D.method,METHODS)))
  +fld('No. referensi',inp('ref',D.ref))+fld('Catatan',txa('note',D.note,2),'full')+'</div><p class="hint" style="margin:0">'+esc(KHINT[D.kind]||'')+'</p>';
}
function openExpForm(id){
  const D=id?clone(S.expenses[id]):{date:todayISO(),kind:'opex',cat:OPEX[0],desc:'',amount:0,method:'Transfer Bank',ref:'',note:''};
  if(!D.method)D.method='Transfer Bank';
  FORM={D,modal:true,rerender:()=>{if(D.kind==='opex'){if(!D.cat)D.cat=OPEX[0]}else D.cat='';const sb=$('#esb');if(sb)sb.innerHTML=expBody(D)}};
  openModal('<div class="sh"><h2>'+(id?'Ubah transaksi':'Catat transaksi')+'</h2><button class="x" data-act="close" aria-label="Tutup">&times;</button></div><div class="sb" id="esb">'+expBody(D)+'</div><div class="sf"><span class="err" id="ferr"></span>'+(id?'<button class="btn danger" data-fa="exp-del" data-id="'+id+'" style="margin-right:auto">Hapus</button>':'')+'<button class="btn" data-act="close">Batal</button><button class="btn primary" data-fa="exp-save" data-id="'+(id||'')+'">Simpan</button></div>');
}
async function saveExp(id){
  const D=FORM.D,err=m=>{$('#ferr').textContent=m};
  if(!KD[D.kind])return err('Pilih jenis transaksi.');
  if(!D.date)return err('Tanggal wajib diisi.');
  if(num(D.amount)<=0)return err('Jumlah harus lebih dari 0.');
  await safe(async()=>{
    const rec={...D,amount:num(D.amount),cat:D.kind==='opex'?(D.cat||OPEX[0]):'',createdAt:D.createdAt||Date.now()};
    if(!id){const m=stamp();rec.by=m.by;rec.byName=m.byName}
    await put('expenses',id||uid(),rec);closeModal();toast('Transaksi disimpan');
  });
}
async function delExp(id){await safe(async()=>{await del('expenses',id);closeModal();toast('Transaksi dihapus')})}

/* ---------- Data contoh ---------- */
async function finSeed(){
  const t=todayISO(),E=[
    ['sx1','capital',-100,'','Setoran modal awal (contoh)',100000000],
    ['sx2','opex',-62,'Sewa Kantor','Sewa kantor 3 bulan (contoh)',18000000],
    ['sx3','opex',-35,'Gaji & Honor','Gaji staf (contoh)',9000000],
    ['sx4','opex',-5,'Gaji & Honor','Gaji staf (contoh)',9000000],
    ['sx5','opex',-20,'Marketing & Iklan','Iklan media sosial (contoh)',2500000],
    ['sx6','asset',-90,'','Pembelian laptop (contoh)',15000000],
    ['sx7','dep',-1,'','Penyusutan laptop bulan ini (contoh)',400000],
    ['sx8','vendor',-30,'','Pembayaran tiket ke maskapai (contoh)',8000000]
  ];
  for(const [id,kind,off,cat,desc,amount] of E)await put('expenses',id,{date:addDays(t,off),kind,cat,desc,amount,method:'Transfer Bank',ref:'',note:'',sample:true,createdAt:Date.now()});
}
const _seed=seed;
seed=async function(){await _seed();await safe(finSeed)};

/* ---------- Event ---------- */
function mRange(off){
  const d=new Date(),a=new Date(d.getFullYear(),d.getMonth()+off,1),z=new Date(d.getFullYear(),d.getMonth()+off+1,0),f=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
  return [f(a),f(z)];
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-fa]');if(!el||el.disabled)return;
  const a=el.dataset.fa,id=el.dataset.id;
  switch(a){
    case 'exp-new':openExpForm();break;
    case 'exp-edit':openExpForm(id);break;
    case 'exp-save':saveExp(id||null);break;
    case 'exp-del':if(armed(el))delExp(id);break;
    case 'bal-open':openBalForm();break;
    case 'bal-save':saveBal();break;
    case 'lr-pre':{const p=el.dataset.p;if(p==='m'){[ui.lrFrom,ui.lrTo]=mRange(0)}else if(p==='pm'){[ui.lrFrom,ui.lrTo]=mRange(-1)}else{const y=todayISO().slice(0,4);ui.lrFrom=y+'-01-01';ui.lrTo=y+'-12-31'}render(true);break}
    case 'lr-pdf':{const P=finPL(ui.lrFrom,ui.lrTo);saveFile('Laba-Rugi-'+ui.lrFrom+'-sd-'+ui.lrTo+'.html',docHTML('Laba Rugi',finPaper('LABA RUGI','Periode '+rangeText(ui.lrFrom,ui.lrTo),finTable(plRows(P)))));break}
    case 'lr-xlsx':{const P=finPL(ui.lrFrom,ui.lrTo);saveFile('Laba-Rugi-'+ui.lrFrom+'-sd-'+ui.lrTo+'.xlsx',xFin('Laba Rugi','Laporan Laba Rugi','Periode '+rangeText(ui.lrFrom,ui.lrTo),[plRows(P)]));break}
    case 'nr-pdf':{const R=nrRows(finBS(ui.nrDate));saveFile('Neraca-'+ui.nrDate+'.html',docHTML('Neraca',finPaper('NERACA','Per '+fmtLong(ui.nrDate),'<div class="fin2"><div>'+finTable(R.A)+'</div><div>'+finTable(R.L)+'</div></div>')));break}
    case 'nr-xlsx':{const R=nrRows(finBS(ui.nrDate));saveFile('Neraca-'+ui.nrDate+'.xlsx',xFin('Neraca','Neraca','Per '+fmtLong(ui.nrDate),[R.A,R.L]));break}
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='lrFrom'||t.id==='lrTo'){if(t.value){ui[t.id]=t.value;if(ui.lrTo<ui.lrFrom){if(t.id==='lrFrom')ui.lrTo=ui.lrFrom;else ui.lrFrom=ui.lrTo}}render(true)}
  else if(t.id==='nrDate'){if(t.value)ui.nrDate=t.value;render(true)}
  else if(t.id==='xKind'){ui.xKind=t.value;const b=$('#xbody');if(b)b.innerHTML=tExp()}
});
document.addEventListener('input',e=>{if(e.target.id==='xq'){ui.xq=e.target.value;const b=$('#xbody');if(b)b.innerHTML=tExp()}});
/* Mode lokal: aplikasi sudah memuat data sebelum modul ini terpasang, jadi muat ulang sekarang */
if(S.loaded&&S.mode==='local'){loadLocal();render(true)}
})();
