
        const SB_URL = 'https://kzfmovttwabubuncknsw.supabase.co';
        const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Zm1vdnR0d2FidWJ1bmNrbnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MTQ4NDcsImV4cCI6MjA2MjE5MDg0N30.9CeAZHJKU0xs80ygDjL7L0XrN970drJ3mILPr9t_LFU';
        window.sb=null; window.currentUser=null; window.auditState={}; window.stockData=[]; window.categories=[]; window.currentCategory='all'; window.staffMap={};

        function waitForLib(){if(typeof supabase!=='undefined')init();else setTimeout(waitForLib,100)}
        function init() {
            window.sb = supabase.createClient(SB_URL, SB_KEY, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });
            document.getElementById('system-loading')
                .classList.add('hidden');
            document.getElementById('login-screen')
                .classList.remove('hidden')
        }
        window.handleLogin = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login');
            btn.innerHTML = '...';
            btn.disabled = true;
            const {
                data,
                error
            } = await window.sb.auth.signInWithPassword({
                email: document.getElementById('email')
                    .value,
                password: document.getElementById('password')
                    .value
            });
            if (error) {
                document.getElementById('login-msg')
                    .classList.remove('hidden');
                document.getElementById('login-msg')
                    .innerText = "Erro.";
                btn.innerHTML = 'ENTRAR';
                btn.disabled = false
            } else {
                window.currentUser = data.user;
                let n = data.user.email.split('@')[0];
                try {
                    const {
                        data: u
                    } = await window.sb.from('usuarios')
                        .select('funcionario')
                        .eq('id', data.user.id)
                        .single();
                    if (u) {
                        const {
                            data: f
                        } = await window.sb.from('funcionarios')
                            .select('nome')
                            .eq('id', u.funcionario)
                            .single();
                        if (f) n = f.nome
                    }
                    if (typeof window.loadMyProfile === "function") {
  await window.loadMyProfile().catch(console.error);
}

                } catch (e) {}
                const nameEl =
                    document.getElementById('top-user-name') ||
                    document.getElementById('dash-user');

                    if (nameEl) nameEl.innerText = n;
                    

                btn.innerHTML = 'ENTRAR';
                btn.disabled = false
                document.getElementById('login-screen')
                    .classList.add('hidden');
                document.getElementById('app-container')
                    .classList.remove('hidden');
                await loadData(true);          // se for async, use await. se não, deixa sem.
switchTab('dashboard');  
            }
        };        window.logout=async()=>{await window.sb.auth.signOut();window.location.reload()};
        window.switchTab = async (t) => {
  // desativa todos
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));

  // ativa o nav se existir (profile não tem nav)
  const nav = document.getElementById(`nav-${t}`);
  if (nav) nav.classList.add('active');
  // ativa também na SIDEBAR (desktop)
  document.querySelectorAll('.side-item').forEach(e => e.classList.remove('active'));
  const side = document.querySelector(`.side-item[data-tab="${t}"]`);
  if (side) side.classList.add('active');

  // esconde todas as tabs
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));

  // mostra a tab alvo (se existir)
  const tab = document.getElementById(`tab-${t}`);
  if (tab) tab.classList.remove('hidden');

  // carregamentos específicos
  if (t === 'stock' && !window.stockData.length) loadStock();
  if (t === 'maintenance' && typeof loadMaintenances === 'function') {
    setTimeout(() => loadMaintenances().catch(e => console.error('[MANUT] erro:', e)), 50);
  }
if (t === 'dashboard' && typeof window.loadDashboardKpis === 'function') {
  setTimeout(() => window.loadDashboardKpis().catch(console.error), 50);
}

  // quando abrir perfil, carrega dados do perfil
  if (t === 'profile' && typeof window.loadMyProfile === 'function') {
    window.loadMyProfile().catch(console.error);
  }
};
    window.logout = async () => {
  try {
    await window.sb.auth.signOut();
  } catch (e) {
    console.error("Erro no logout:", e);
  }

  window.currentUser = null;

  // fecha menu do topo se estiver aberto
  if (window.toggleTopMenu) window.toggleTopMenu(false);

  // volta para login
  document.getElementById('app-container')?.classList.add('hidden');
  document.getElementById('login-screen')?.classList.remove('hidden');

  // opcional: limpa senha
  const p = document.getElementById('password');
  if (p) p.value = "";
};

// compatibilidade com seus botões atuais
window.doLogout = () => window.logout();

        window.resetAuditForm = () => {
            window.auditState = {};
            document.getElementById("audit-list").innerHTML = "";
            document.getElementById("obs").value = "";
            document.getElementById("suite").value = "";
            document.getElementById("camareira").value = "";
            document.getElementById("supervisor").value = "";
            document.getElementById("data_faxina").valueAsDate = new Date();
            };

        window.goToAudit=()=>{document.getElementById('app-container').classList.add('hidden');document.getElementById('audit-screen').classList.remove('hidden');if(document.getElementById('audit-list').innerHTML==='')loadData()};
        window.backToDash=()=>{{document.getElementById('details-screen').classList.add('hidden');document.getElementById('app-container').classList.remove('hidden');switchTab('dashboard');
        loadHistory()}};
        window.requestExitReview = () => {
            window.confirmOpen(
                {
                title: "Descartar revisão?",
                message: "As alterações não salvas serão perdidas.",
                okText: "Descartar",
                okClass: "bg-amber-600 active:bg-amber-700 shadow-amber-200",
                iconHtml: '<i class="fas fa-trash text-amber-600 text-sm"></i>',
                },
                () => {
                document.getElementById("audit-screen")?.classList.add("hidden");
                document.getElementById("app-container")?.classList.remove("hidden");
                loadHistory()
                }
            );
            };

    async function loadData(firstLoad = false) {
     if (!firstLoad) document.getElementById('data-loader')
         .classList.remove('hidden');
     document.getElementById('data_faxina')
         .valueAsDate = new Date();
     try {
         const {
             data: st
         } = await window.sb.from('funcionarios')
             .select('id,nome')
             .eq('ativo', true)
             .order('nome', { ascending: true });
         if (st) st.forEach(f => window.staffMap[f.id] = f.nome);
         const [c, i, su] = await Promise.all([window.sb.from('categorias_avaliacao')
             .select('*')
             .order('id'), window.sb.from('itens_de_avaliacao')
             .select('*')
             .order('id'), window.sb.from('suites')
             .select('id,numero_quarto')
             .eq('ativo', true)
             .order('numero_quarto')
         ]);
         const ca = document.getElementById('camareira'),
      sup = document.getElementById('supervisor'),
      sui = document.getElementById('suite');

        // NOVOS (manutenção)
            const maintResp = document.getElementById('maint-responsavel-id');
            const maintSuite = document.getElementById('maint-suite-id');

            // Reseta
            if (ca) ca.innerHTML = '<option value="">Selecione...</option>';
            if (sup) sup.innerHTML = '<option value="">Selecione...</option>';
            if (maintResp) maintResp.innerHTML = '<option value="">Selecione...</option>';

            if (sui) sui.innerHTML = '<option value="">--</option>';
            if (maintSuite) maintSuite.innerHTML = '<option value="">Selecione...</option>';

            // Funcionários
            if (st) st.forEach(f => {
            if (ca) ca.add(new Option(f.nome, f.id));
            if (sup) sup.add(new Option(f.nome, f.id));
            if (maintResp) maintResp.add(new Option(f.nome, f.id));
            });

            // Suítes (no seu loadData você usa numero_quarto como value; vamos manter o padrão)
            if (su.data) su.data.forEach(s => {
            if (sui) sui.add(new Option(s.numero_quarto, s.numero_quarto));
            if (maintSuite) maintSuite.add(new Option(s.numero_quarto, s.numero_quarto));
            });
         renderChecklist(c.data || [], i.data || []);
         loadHistory();
         if (!firstLoad) document.getElementById('data-loader')
             .classList.add('hidden');
         document.getElementById('obs-area')
             .classList.remove('hidden');
     } catch (e) {
         console.log(e)
     }
 }

        async function loadHistory(){
            const l=document.getElementById('history-list');
            l.innerHTML='<div class="text-center py-6"><i class="fas fa-circle-notch fa-spin text-blue-300"></i></div>';
            try{
                const{data}=await window.sb.from('revisao_de_faxina').select('id,suite,data_da_revisao,pontos_perdidos,camareira,supervisor').order('id',{ascending:false}).limit(20);
                window.updateDashboardKpis(data || []);

                if(!data||!data.length){
                    l.innerHTML=`
                    <div class="flex flex-col items-center justify-center py-10 opacity-60">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <i class="fas fa-folder-open text-slate-300 text-2xl"></i>
                        </div>
                        <p class="text-xs font-bold text-slate-400 uppercase">Nenhum registro encontrado</p>
                    </div>`;
                    return;
                }

                l.innerHTML='';
                data.forEach(r=>{
                    let pts = r.pontos_perdidos;
                    if(pts === null || pts === undefined) pts = 0;
                    const isPerfect = (pts === 0);
                    const camName = window.staffMap[r.camareira] || 'Camareira';
                    const supName = window.staffMap[r.supervisor] || 'Sup';
                    
                    // CORREÇÃO: Ícones adicionados e botão de Ver Detalhes estilizado
                    l.innerHTML+=`
                    <div class="card-premium p-4 mb-3 relative overflow-hidden active:bg-slate-50 transition-colors" onclick="openDetails(${r.id})">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 font-black text-sm border border-slate-100 shadow-sm">${r.suite}</div>
                                <div>
                                    <h4 class="text-sm font-bold text-slate-800">Revisão #${r.id}</h4>
                                    <div class="mt-1 flex items-center gap-3 text-[10px] font-medium text-slate-500">
                                        <span class="flex items-center"><i class="fas fa-broom mr-1.5 text-slate-400"></i>${camName}</span>
                                        <span class="flex items-center"><i class="fas fa-user-tie mr-1.5 text-slate-400"></i>${supName}</span>
                                    </div>
                                </div>
                            </div>
                            <span class="px-2 py-1 rounded-lg text-[10px] font-black uppercase ${isPerfect?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}">${isPerfect?'100%':'-'+pts}</span>
                        </div>
                        <div class="flex justify-between items-center mt-3 border-t border-slate-50 pt-2">
                             <span class="text-[10px] text-slate-400 font-medium flex items-center"><i class="far fa-calendar-alt mr-1.5"></i> ${new Date(r.data_da_revisao).toLocaleDateString('pt-BR')}</span>
                             <button class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center hover:bg-blue-100 transition-colors">Ver Detalhes <i class="fas fa-chevron-right ml-1 text-[8px]"></i></button>
                        </div>
                    </div>`;
                });
            }catch(e){ console.error(e); }
        }
window.updateDashboardKpis = (rows = []) => {
  const elRevs = document.getElementById("kpi-revisoes");
  const elPerf = document.getElementById("kpi-perfeitas");
  const elMedia = document.getElementById("kpi-media");
  if (!elRevs || !elPerf || !elMedia) return;

  const total = (rows || []).length;
  const perfeitas = (rows || []).filter(r => (r.pontos_perdidos ?? 0) === 0).length;
  const soma = (rows || []).reduce((acc, r) => acc + (r.pontos_perdidos ?? 0), 0);
  const media = total ? (soma / total) : 0;

  elRevs.textContent = String(total);
  elPerf.textContent = String(perfeitas);
  elMedia.textContent = total ? media.toFixed(1) : "0.0";
};

        function renderChecklist(cats,items){
            const l=document.getElementById('audit-list');l.innerHTML='';
            cats.forEach(cat=>{
                const ci=items.filter(x=>x.grupo===cat.id);if(!ci.length)return;
                const g=document.createElement('div');g.className='card-premium overflow-hidden mb-4';
                g.innerHTML=`<div class="p-5 flex justify-between items-center cursor-pointer bg-white" onclick="this.nextElementSibling.classList.toggle('hidden')"><div class="flex items-center gap-3"><div class="w-1.5 h-5 bg-blue-600 rounded-full"></div><h3 class="font-bold text-slate-800 text-sm uppercase">${cat.categoria}</h3></div><i class="fas fa-chevron-down text-xs text-slate-300"></i></div><div class="hidden border-t border-slate-50 bg-[#fafbfc]"></div>`;
                const b=g.lastElementChild;
                ci.forEach((it,ix)=>{
                    window.auditState[it.id]={status:'Conforme',points:0,def:it,obs:'',photos:[]};
                    const r=document.createElement('div');r.className=`p-5 ${ix<ci.length-1?'border-b border-slate-100':''}`;
                    r.innerHTML=`
                    <div class="flex justify-between items-start mb-3"><p class="text-sm font-bold text-slate-700 w-2/3 leading-snug">${it.nome}</p><div class="flex gap-2"><button onclick="setStatus(${it.id},'Conforme')" id="btn-ok-${it.id}" class="w-10 h-10 rounded-xl bg-green-500 text-white shadow-lg shadow-green-200 flex items-center justify-center transition-all"><i class="fas fa-check"></i></button><button onclick="toggleNOK(${it.id})" id="btn-nok-${it.id}" class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center transition-all"><i class="fas fa-times"></i></button></div></div>
                    <div id="panel-${it.id}" class="hidden bg-white rounded-xl p-4 border border-red-100 shadow-sm relative overflow-hidden mt-3">
                        <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                        <div class="grid grid-cols-3 gap-2 mb-3 pl-2"><button onclick="setNOK(${it.id},'leve')" class="status-toggle bg-slate-50 py-2.5 rounded-lg text-[10px] font-bold text-slate-500">LEVE<br>-${it.pp_leve}</button><button onclick="setNOK(${it.id},'grave')" class="status-toggle bg-slate-50 py-2.5 rounded-lg text-[10px] font-bold text-slate-500">GRAVE<br>-${it.pp_grave}</button><button onclick="setNOK(${it.id},'gravissimo')" class="status-toggle bg-slate-50 py-2.5 rounded-lg text-[10px] font-bold text-slate-500">CRÍTICO<br>-${it.pp_gravissimo}</button></div>
                        <div class="bg-obs-error rounded-xl p-3 mb-3 ml-2"><label class="text-[9px] font-bold text-red-400 uppercase mb-1 block"><i class="fas fa-exclamation-circle mr-1"></i> Observação</label><textarea oninput="auditState[${it.id}].obs=this.value" class="w-full bg-white border border-red-100 rounded-lg p-2 text-xs text-red-600 placeholder-red-200 outline-none" rows="2" placeholder="Descreva o problema..."></textarea></div>
                        <div id="photos-container-${it.id}" class="flex flex-wrap gap-2 pl-2"><label class="cursor-pointer h-10 px-4 flex items-center justify-center gap-2 bg-slate-50 text-slate-400 rounded-xl border border-dashed border-slate-200 hover:bg-slate-100 transition-colors"><i class="fas fa-camera text-sm"></i> <span class="text-[10px] font-bold">FOTO</span><input type="file" accept="image/*" class="hidden" onchange="uploadPhoto(${it.id},this)"></label></div>
                    </div>`;
                    b.appendChild(r);
                });
                l.appendChild(g);
            })
        }

        window.setStatus=(id)=>{const s=window.auditState[id];s.status='Conforme';s.points=0;document.getElementById(`panel-${id}`).classList.add('hidden');document.getElementById(`btn-ok-${id}`).className="w-10 h-10 rounded-xl bg-green-500 text-white shadow-lg shadow-green-200 flex items-center justify-center";document.getElementById(`btn-nok-${id}`).className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center";calcTotal()};
        window.toggleNOK=(id)=>{document.getElementById(`panel-${id}`).classList.remove('hidden');document.getElementById(`btn-ok-${id}`).className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center";document.getElementById(`btn-nok-${id}`).className="w-10 h-10 rounded-xl bg-red-500 text-white shadow-lg shadow-red-200 flex items-center justify-center scale-105"};
        window.setNOK=(id,t)=>{const s=window.auditState[id];const p=document.getElementById(`panel-${id}`);p.querySelectorAll('.status-toggle').forEach(b=>b.className="status-toggle bg-slate-50 py-2.5 rounded-lg text-[10px] font-bold text-slate-500 border border-transparent");const btn=event.currentTarget;btn.className="status-toggle bg-red-500 py-2.5 rounded-lg text-[10px] font-bold text-white shadow-lg transform scale-105";if(t==='leve'){s.points=s.def.pp_leve;s.status='Não conforme leve'}else if(t==='grave'){s.points=s.def.pp_grave;s.status='Não conforme grave'}else{s.points=s.def.pp_gravissimo;s.status='Não conforme gravíssimo'}calcTotal()};
        function calcTotal(){let t=0;Object.values(window.auditState).forEach(i=>t+=i.points);document.getElementById('total-score-header').innerText=t>0?`-${t}`:'0';document.getElementById('total-score-header').className=`text-lg font-black leading-none ${t>0?'text-red-500':'text-slate-800'}`}
       window.uploadPhoto = async (id, inp) => {
            const files = Array.from(inp.files || []);
            if (!files.length) return;

            const c = document.getElementById(`photos-container-${id}`);
            const l = c.querySelector("label");

            // ✅ NÃO apague o label (senão você destrói o <input>)
            const span = l.querySelector("span");
            if (span) span.textContent = "...";

            try {
                for (const f of files) {
                const n = `${Date.now()}_${Math.floor(Math.random() * 999)}.jpg`;
                const storage_path = `revisaofax/${n}`;
                const file_name = n;

                const { data, error } = await window.sb.storage
                    .from("imagens")
                    .upload(storage_path, f);

                if (error) throw error;

                const { data: { publicUrl } } = window.sb.storage
                    .from("imagens")
                    .getPublicUrl(storage_path);

                window.auditState[id].photos.push({
                    storage_file_id: data.path,
                    storage_path,
                    file_name,
                    public_url: publicUrl
                });

                const t = document.createElement("div");
                t.className =
                    "w-10 h-10 rounded-lg bg-cover bg-center border border-slate-200 relative";
                t.style.backgroundImage = `url('${publicUrl}')`;
                t.dataset.path = storage_path;

                t.innerHTML = `<button type="button"
                    onclick="window.removeAuditPhoto && window.removeAuditPhoto('${id}','${storage_path}',this)"
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center shadow-md border border-white">
                    <i class="fas fa-times"></i>
                </button>`;

                c.insertBefore(t, l);
                }

                if (span) span.textContent = "FOTO";
                inp.value = ""; // ✅ permite selecionar a mesma foto de novo depois

            } catch (e) {
                alert("Erro: " + (e?.message || JSON.stringify(e)));
                if (span) span.textContent = "FOTO";
                inp.value = "";
            }
            };



        // REMOVE FOTOS DO UPLOADER
        window.removeAuditPhoto = (id, storagePath, btnEl) => {
            const arr = window.auditState?.[id]?.photos || [];
            window.auditState[id].photos = arr.filter(p => p.storage_path !== storagePath);

            // remove o preview
            const thumb = btnEl?.closest('div');
            if (thumb) thumb.remove();
            };
        window.saveAudit = async () => {
            const b = document.getElementById('btn-save');
            b.innerText = '...';
            b.disabled = true;
            const su = document.getElementById('suite')
                .value,
                ca = document.getElementById('camareira')
                .value,
                sp = document.getElementById('supervisor')
                .value;
            if (!su || !ca || !sp) {
                alert("Preencha tudo");
                b.innerText = 'FINALIZAR';
                b.disabled = false;
                return
            }
            try {
                let pt = 0;
                Object.values(window.auditState)
                    .forEach(i => pt += i.points);
                const {
                    data: r,
                    error: e1
                } = await window.sb.from('revisao_de_faxina')
                    .insert([{
                        suite: su,
                        camareira: parseInt(ca),
                        supervisor: parseInt(sp),
                        pontos_perdidos: pt,
                        data_da_faxina: document.getElementById('data_faxina')
                            .value,
                        observacoes: document.getElementById('obs')
                            .value,
                        status: 'finalizado',
                        data_da_revisao: new Date()
                            .toISOString()
                    }])
                    .select()
                    .single();
                if (e1) throw e1;
                for (const [id, s] of Object.entries(window.auditState)) {
                    const {
                        data: av
                    } = await window.sb.from('avitems')
                        .insert([{
                            revisao_de_faxina_id: r.id,
                            item_avaliado_id: parseInt(id),
                            status: s.status,
                            pontos_perdidos: s.points,
                            comentarios: s.obs
                        }])
                        .select()
                        .single();
                   if (s.photos?.length) {
                        const payload = s.photos.map(p => ({
                            avitem_id: av.id,
                            storage_file_id: p.storage_file_id,
                            storage_path: p.storage_path,
                            file_name: p.file_name,
                            public_url: p.public_url
                        }));

  const { error: fotoErr } = await window.sb
    .from('avitem_fotos')   // <-- NOME CERTO DA TABELA
    .insert(payload);

  if (fotoErr) {
    alert("❌ Erro ao inserir em avitem_fotos:\n\n" + (fotoErr.message || JSON.stringify(fotoErr)));
    return; // ou throw fotoErr;
  }
}
                }
                alert("Salvo!");
                // ... salvou revisão + items + fotos

                    window.resetAuditForm();   // limpa a nova revisão
                    window.backToDash();    // volta pra home
                    loadHistory();             // opcional: atualizar lista na home
                    b.innerText = 'FINALIZAR';
                     b.disabled = false

            } catch (e) {
                alert("Erro: " + e.message);
                b.innerText = 'FINALIZAR';
                b.disabled = false
            }
        };
        function alertSbError(label, err) {
            if (!err) return;
            const msg =
                (err && (err.message || err.error_description)) ||
                (typeof err === "string" ? err : JSON.stringify(err, null, 2));
            alert(`❌ ${label}\n\n${msg}`);
        }

        window.openDetails=async(id)=>{
            document.getElementById('details-screen').classList.remove('hidden');const c=document.getElementById('details-content');c.innerHTML='Carregando...';
            try{
                const{data:r}=await window.sb.from('revisao_de_faxina').select('*').eq('id',id).single();
                const{data:i}=await window.sb.from('avitems').select('*,item_avaliado:item_avaliado_id(nome)').eq('revisao_de_faxina_id',id);
                // ✅ Buscar fotos dos avitems dessa revisão
                const avitemIds = (i || []).map(x => x.id);
                let fotosPorAvitem = {};

                if (avitemIds.length) {
                const { data: fotos, error: fotosErr } = await window.sb
                    .from("avitem_fotos")
                    .select("avitem_id, public_url")
                    .in("avitem_id", avitemIds);

                if (fotosErr) console.error("Erro ao carregar fotos:", fotosErr);

                (fotos || []).forEach(f => {
                    if (!fotosPorAvitem[f.avitem_id]) fotosPorAvitem[f.avitem_id] = [];
                    fotosPorAvitem[f.avitem_id].push(f.public_url);
                });
                }
                const nok=i.filter(x=>x.status!=='Conforme');
                const ok=i.filter(x=>x.status==='Conforme');
                const camName = window.staffMap[r.camareira] || 'Camareira';
                const supName = window.staffMap[r.supervisor] || 'Supervisor';
                
                let pts = r.pontos_perdidos;
                if(pts === null || pts === undefined) pts = 0;
                const isPerfect = (pts === 0);
                const scoreColor = isPerfect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
                
                // CORREÇÃO: Ícones também na tela de detalhes
                let h=`
                <div class="card-premium p-6 text-center mb-4">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultado Final</p>
                    <div class="inline-block px-6 py-2 rounded-2xl ${scoreColor} mt-3 mb-2">
                        <h1 class="text-5xl font-black">${isPerfect?'100%':'-'+pts}</h1>
                    </div>
                    <p class="text-xs font-bold text-slate-500">${isPerfect?'Auditoria Perfeita':'Pontos Perdidos'}</p>
                </div>
                <div class="card-premium p-5 text-xs mb-4 space-y-3">
                    <div class="flex justify-between border-b border-slate-50 pb-2"><span>Suíte</span> <span class="font-bold text-slate-700 text-sm">${r.suite}</span></div>
                    <div class="flex justify-between border-b border-slate-50 pb-2"><span>Data</span> <span class="font-bold text-slate-700"><i class="far fa-calendar-alt mr-1 text-slate-400"></i> ${new Date(r.data_da_revisao).toLocaleDateString('pt-BR')}</span></div>
                    <div class="flex justify-between border-b border-slate-50 pb-2"><span>Camareira</span> <span class="font-bold text-slate-700"><i class="fas fa-broom mr-1 text-slate-400"></i> ${camName}</span></div>
                    <div class="flex justify-between"><span>Supervisor</span> <span class="font-bold text-slate-700"><i class="fas fa-user-tie mr-1 text-slate-400"></i> ${supName}</span></div>
                </div>`;
                
                if(nok.length) h+=`<h3 class="font-bold text-red-500 text-xs uppercase mb-3 pl-2">Falhas (${nok.length})</h3>${
                    nok.map(n=>{
                        const fotosHtml = (fotosPorAvitem[n.id] || [])
                        .map(url => `<img src="${url}" class="w-14 h-14 rounded-xl object-cover border border-slate-200" />`)
                        .join('');

                        return `<div class="bg-white border border-red-100 rounded-xl p-4 mb-3 shadow-sm">
                        <div class="flex justify-between font-bold text-sm text-slate-800 mb-2">
                            <span>${n.item_avaliado?.nome}</span>
                            <span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">-${n.pontos_perdidos}</span>
                        </div>

                        ${n.comentarios?`<div class="bg-red-50 p-2 rounded text-xs text-red-500 italic"><i class="fas fa-comment-alt mr-1"></i> "${n.comentarios}"</div>`:''}

                        ${fotosHtml ? `<div class="flex gap-2 flex-wrap mt-3">${fotosHtml}</div>` : ''}
                        </div>`;
                    }).join('')
                    }`;

                if(ok.length) h+=`<h3 class="font-bold text-green-600 text-xs uppercase mb-3 pl-2 mt-5">Itens Conformes (${ok.length})</h3><div class="bg-white border border-slate-100 rounded-xl p-4"><div class="flex flex-wrap gap-2">${ok.map(o=>`<span class="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100 flex items-center"><i class="fas fa-check-circle mr-1.5"></i>${o.item_avaliado?.nome}</span>`).join('')}</div></div>`;
                c.innerHTML=h;
            }catch(e){c.innerHTML='Erro'}
        };
        window.closeDetails=()=>document.getElementById('details-screen').classList.add('hidden');
        window.openNewProductModal=()=>{document.getElementById('new-product-modal').classList.remove('hidden')};
        window.openQuickCategory=()=>{window.isQuickAdd=true;document.getElementById('new-product-modal').classList.add('hidden');document.getElementById('new-category-modal').classList.remove('hidden')};
        window.cancelQuickCategory=()=>{document.getElementById('new-category-modal').classList.add('hidden');if(window.isQuickAdd)document.getElementById('new-product-modal').classList.remove('hidden');window.isQuickAdd=false};
        window.saveNewCategory=async()=>{const n=document.getElementById('new-cat-name').value;if(!n)return alert("Nome?");try{const{data,error}=await window.sb.from('categorias_estoque').insert([{nome:n,ativo:true}]).select().single();if(error)throw error;window.categories.push(data);updateCategoryUI();document.getElementById('new-category-modal').classList.add('hidden');if(window.isQuickAdd){document.getElementById('new-product-modal').classList.remove('hidden');document.getElementById('new-prod-cat').value=data.id;window.isQuickAdd=false}else{alert("Feito!")}}catch(e){alert("Erro")}};
        window.saveNewProduct=async()=>{const n=document.getElementById('new-prod-name').value,c=document.getElementById('new-prod-cat').value,m=document.getElementById('new-prod-min').value,u=document.querySelector('input[name="unit"]:checked').value,is=parseInt(document.getElementById('new-prod-stock').value)||0;if(!n||!c)return alert("Erro");try{const{data}=await window.sb.from('produtos').insert([{nome:n,categoria_id:parseInt(c),qtd_minima:parseInt(m),unidade:u,qtd_atual:is,ativo:true}]).select().single();if(is>0)await window.sb.from('movimentacoes').insert([{produto_id:data.id,tipo:'entrada',quantidade:is,motivo:'Saldo Inicial',usuario_id:window.currentUser.id}]);window.stockData.push({...data,categoria_nome:window.categories.find(x=>x.id==c)?.nome});filterStock('all');document.getElementById('new-product-modal').classList.add('hidden');alert("Salvo!")}catch(e){alert("Erro")}};
        async function loadStock(){const l=document.getElementById('stock-list');l.innerHTML='...';try{const[c,p]=await Promise.all([window.sb.from('categorias_estoque').select('*'),window.sb.from('produtos').select('*')]);window.categories=c.data;updateCategoryUI();window.stockData=p.data.map(x=>({...x,categoria_nome:c.data.find(y=>y.id===x.categoria_id)?.nome}));renderStockList(window.stockData)}catch(e){}}
        function updateCategoryUI(){const c=document.getElementById('category-chips'),s=document.getElementById('new-prod-cat');c.innerHTML='';s.innerHTML='<option value="">...</option>';window.categories.forEach(x=>{c.innerHTML+=`<button onclick="filterStock(${x.id})" class="chip px-3 py-1 rounded-full text-xs border mr-1 bg-white">${x.nome}</button>`;s.add(new Option(x.nome,x.id))})}
        function renderStockList(i){const l=document.getElementById('stock-list');l.innerHTML='';i.forEach(p=>{l.innerHTML+=`<div class="card-premium p-3 mb-2 flex justify-between"><div><span class="text-[9px] bg-slate-100 p-1 rounded">${p.categoria_nome}</span><h4 class="font-bold">${p.nome}</h4></div><div class="text-right"><h3 class="font-black text-lg">${p.qtd_atual}</h3><div class="flex gap-1"><button onclick="openStockModal(${p.id},'entrada')" class="text-blue-500 text-xs bg-blue-50 p-1 rounded">+</button><button onclick="openStockModal(${p.id},'saida')" class="text-red-500 text-xs bg-red-50 p-1 rounded">-</button></div></div></div>`})}
        window.filterStock=(id)=>{window.currentCategory=id||'all';renderStockList(window.stockData.filter(p=>(window.currentCategory==='all'||p.categoria_id===window.currentCategory)))}
        window.openStockModal=(id,t)=>{document.getElementById('modal-prod-id').value=id;document.getElementById('modal-type').value=t;document.getElementById('stock-modal').classList.remove('hidden')};
        window.closeStockModal=()=>document.getElementById('stock-modal').classList.add('hidden');
        window.confirmStockMove=async()=>{const i=document.getElementById('modal-prod-id').value,t=document.getElementById('modal-type').value,q=parseInt(document.getElementById('modal-qty').value);if(!q)return;await window.sb.from('movimentacoes').insert([{produto_id:i,tipo:t,quantidade:q,usuario_id:window.currentUser.id}]);const p=window.stockData.find(x=>x.id==i);p.qtd_atual=t==='entrada'?p.qtd_atual+q:p.qtd_atual-q;await window.sb.from('produtos').update({qtd_atual:p.qtd_atual}).eq('id',i);renderStockList(window.stockData);closeStockModal()};

        waitForLib();
        // --- CORREÇÃO DO SWITCH TAB E NOVAS FUNÇÕES ---