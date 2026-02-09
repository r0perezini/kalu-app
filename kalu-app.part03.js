

// ===============================
// EDITAR STATUS DA MANUTENÇÃO
// ===============================
window.updateMaintStatus = async (id, newStatus) => {
  if (!id) return;

  // normaliza
  const s = (newStatus || "").toString().toLowerCase().trim();
  if (!["pendente", "fazendo", "feito"].includes(s)) {
    alert("Status inválido: " + newStatus);
    return;
  }

  return window.withLoading(async () => {
    const { error } = await window.sb
      .from("manutencoes")
      .update({ status: s })
      .eq("id", id);

    if (error) throw error;

    // Atualiza lista e reabre detalhes já com status novo
    await window.loadMaintenances?.();
  }, { title: "Atualizando status...", subtitle: "Salvando alteração." });
};

window.loadMaintenances = async () => {
  console.log('[MANUT] loadMaintenances() iniciou');

  const list = document.getElementById('maintenance-list');
  if (!list) {
    console.error('[MANUT] #maintenance-list não existe no DOM');
    return;
  }

  if (!window.sb) {
    console.error('[MANUT] window.sb não existe -> impossível chamar Supabase');
    list.innerHTML = '<div class="text-center text-red-500">Sem conexão com Supabase (window.sb)</div>';
    return;
  }

  // ✅ AQUI entram os filtros
  let q = window.sb
    .from('manutencoes')
   .select("*, grupo:grupo_id(nome)")
    .order('created_at', { ascending: false });

  const scope = window.maintFilter?.scope || 'todas';       // todas|minhas
  const statusFilter = window.maintFilter?.status || 'todos'; // todos|pendente|fazendo|feito

  if (statusFilter !== 'todos') {
    q = q.ilike('status', statusFilter.trim());

  }

  if (scope === 'minhas') {
    const myFunc = await window.getMyFuncionarioId();
    if (myFunc) q = q.eq('responsavel_id', myFunc);
  }

  const resp = await q;
  console.log('[MANUT] resposta Supabase:', resp);

  const { data, error } = resp;

  if (error) {
    console.error('[MANUT] erro Supabase:', error);
    list.innerHTML = `<div class="text-center text-red-500">Erro Supabase: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<div class="text-center text-gray-400">Nenhuma manutenção registrada.</div>';
    return;
  }

  // (debug opcional pra você ver os status reais que estão vindo)
  console.log("[MANUT] filtros:", window.maintFilter);
  console.log("[MANUT] status existentes:", [...new Set(data.map(x => x.status))]);
//   // ====== (A) Buscar nomes de responsável e criador ======
  const respIds = [...new Set((data || []).map(m => m.responsavel_id).filter(Boolean))];
  const criadorUuids = [...new Set((data || []).map(m => m.criado_por_usuario).filter(Boolean))];

  // mapa funcionarioId -> nome (você já usa staffMap no app) :contentReference[oaicite:2]{index=2}
  const funcMap = { ...(window.staffMap || {}) };

  // 1) Carrega nomes dos responsáveis (funcionarios)
  if (respIds.length) {
    const { data: funcs } = await window.sb
      .from("funcionarios")
      .select("id,nome")
      .in("id", respIds);

    (funcs || []).forEach(f => { funcMap[f.id] = f.nome; });
  }

  // 2) Carrega criador -> (usuarios.funcionario) -> nome
    // (mesma lógica que você usa no login: usuarios -> funcionario -> funcionarios.nome) :contentReference[oaicite:3]{index=3}
    let criadorFuncByUser = {};
    if (criadorUuids.length) {
        const { data: users } = await window.sb
        .from("usuarios")
        .select("id,funcionario")
        .in("id", criadorUuids);

        (users || []).forEach(u => { criadorFuncByUser[u.id] = u.funcionario; });

        const criadorFuncIds = [...new Set((users || []).map(u => u.funcionario).filter(Boolean))];
        if (criadorFuncIds.length) {
        const { data: funcs2 } = await window.sb
            .from("funcionarios")
            .select("id,nome")
            .in("id", criadorFuncIds);

        (funcs2 || []).forEach(f => { funcMap[f.id] = f.nome; });
        }
    }
    


  // ====== (B) Helpers de cor ======
  const urgencyClass = (u) => {
  const x = (u || "")
    .toString()
    .normalize("NFD")                 // separa acentos
    .replace(/[\u0300-\u036f]/g, "")  // remove acentos
    .toLowerCase()
    .trim();

    if (x.includes("urgente") || x.includes("alta")) {
        return "bg-red-100 text-red-700 border-red-200";
    }
    if (x.includes("media")) {
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
    if (x.includes("baixa")) {
        return "bg-green-100 text-green-700 border-green-200";
    }
    return "bg-slate-100 text-slate-600 border-slate-200";
    };


  const dueInfo = (dateStr) => {
    if (!dateStr) return { label: "Sem vencimento", cls: "text-slate-400" };

    // Supabase date geralmente vem "YYYY-MM-DD"
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0,0,0,0);

    const diffDays = Math.floor((d - today) / (1000 * 60 * 60 * 24));

    let cls = "text-slate-500";
    if (diffDays < 0) cls = "text-red-600 font-bold";
    else if (diffDays <= 2) cls = "text-red-500 font-bold";
    else if (diffDays <= 7) cls = "text-amber-600 font-bold";

    const label = d.toLocaleDateString("pt-BR");
    return { label, cls };
  };

  // ====== (C) Contador no topo ======
  const resultsEl = document.getElementById("maint-results");
  if (resultsEl) resultsEl.textContent = `${data.length} manutenção(ões) encontrada(s).`;

  // ====== (D) Render do card (novo layout) ======
  list.innerHTML = data.map((m) => {
    const titulo = m.titulo ?? "(sem título)";
    const suite = m.suite ?? "Sem suíte vinculadaa";
    const local = m.local ?? " ";
    const status = m.status ?? "-";
    const st = (status || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const statusValue =
  st.includes("feito") ? "feito" :
  st.includes("fazendo") ? "fazendo" :
  st.includes("pend") ? "pendente" :
  "pendente";

    const statusCls =
        st.includes("feito") ? "bg-green-100 text-green-700 border-green-200" :
        st.includes("fazendo") ? "bg-blue-100 text-blue-700 border-blue-200" :
        st.includes("pend") ? "bg-amber-100 text-amber-700 border-amber-200" :
        "bg-slate-100 text-slate-600 border-slate-200";
    const menuOpen = window.__openMaintStatusMenuId === m.id;



    const urg = m.URGENCIA ?? m.urgencia ?? "-"; // sua coluna está como "URGENCIA" no insert :contentReference[oaicite:4]{index=4}
    const urgCls = urgencyClass(urg);
    

    const respNome = m.responsavel_id ? (funcMap[m.responsavel_id] || `#${m.responsavel_id}`) : "Não definido";
    const criadorFuncId = m.criado_por_usuario ? criadorFuncByUser[m.criado_por_usuario] : null;
    const criadorNome = criadorFuncId ? (funcMap[criadorFuncId] || "—") : "Não definido";

    const { label: vencLabel, cls: vencCls } = dueInfo(m.data_vencimento);

    return `
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer"
     onclick="window.openMaintDetails(${m.id})">

  <div class="flex items-center gap-2 mb-1">
    <!-- (3) badge: SUÍTE -->
    <span class="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
      ${suite}
    </span>

    <!-- tracinho + LOCAL -->
    <span class="text-[10px] font-bold text-slate-300">—</span>
    <span class="text-[10px] font-bold uppercase text-slate-500">${local}</span>

    <!-- (4) urgência colorida -->
    <span class="ml-auto text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${urgCls}">
      ${urg}
    </span>
  </div>

  <div class="font-bold text-gray-800 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
    ${titulo}
  </div>

  <div class="mt-2">
    <span class="inline-flex items-center text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
      GRUPO:
      <span class="ml-1 ${m.grupo?.nome ? 'text-slate-700' : 'text-slate-400'}">
        ${m.grupo?.nome ? m.grupo.nome : 'Não definido'}
      </span>
    </span>
  </div>

  <div class="mt-2 flex items-center justify-between text-xs">
    <!-- (1) responsável e criador -->
    <div class="text-slate-500">
      <div>
        <i class="fas fa-user-tie mr-1.5 text-slate-400"></i>
        <span class="text-slate-400">Resp:</span>
        <span class="font-bold text-slate-700">${respNome}</span>
      </div>

      <div>
        <i class="fas fa-user-tie mr-1.5 text-slate-400"></i>
        <span class="text-slate-400">Criado por:</span>
        <span class="font-bold text-slate-700">${criadorNome}</span>
      </div>
    </div>

    <!-- (2) vencimento + status -->
    <div class="text-right flex flex-col items-end h-full">
      <div class="${vencCls}">
        <i class="far fa-calendar-alt mr-1"></i>${vencLabel}
      </div>

      <div class="mt-auto pt-2 flex items-center justify-end gap-2 relative maint-status-menu-wrap">
  <span class="inline-flex items-center text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border ${statusCls}">
    ${status}
  </span>

  <button type="button"
    class="w-8 h-8 rounded-xl border border-slate-200 bg-white/70 hover:bg-white flex items-center justify-center"
    onclick="event.stopPropagation(); window.toggleMaintStatusMenu(${m.id});"
    title="Alterar status">
    <i class="fas fa-ellipsis-v text-slate-500 text-xs"></i>
  </button>

${menuOpen ? `
  <div class="absolute right-0 top-9 z-50 w-48 rounded-2xl border border-slate-200 bg-white shadow-xl p-2"
       onclick="event.stopPropagation();">

    <div class="text-[10px] font-extrabold uppercase text-slate-400 px-2 pb-1">
      Alterar status
    </div>

    <select
      class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold outline-none
             ${statusValue === 'feito' ? 'bg-green-50 text-green-700' :
               statusValue === 'fazendo' ? 'bg-blue-50 text-blue-700' :
               'bg-amber-50 text-amber-700'}"
      onchange="window.setMaintStatusFromMenu(${m.id}, this.value)">

      <option value="pendente" ${statusValue === "pendente" ? "selected" : ""}>🟡 Pendente</option>
      <option value="fazendo"  ${statusValue === "fazendo"  ? "selected" : ""}>🔵 Fazendo</option>
      <option value="feito"    ${statusValue === "feito"    ? "selected" : ""}>🟢 Feito</option>
    </select>
  </div>
` : ``}
</div>

    </div>
  </div>

</div>

    `;
  }).join("");
  };
// ===============================
// MENU ⋮ DO STATUS (LISTA)
// ===============================
window.__openMaintStatusMenuId = null;

window.toggleMaintStatusMenu = (id) => {
  window.__openMaintStatusMenuId = (window.__openMaintStatusMenuId === id) ? null : id;
  window.loadMaintenances?.(); // re-render da lista
};

window.setMaintStatusFromMenu = async (id, status) => {
  window.__openMaintStatusMenuId = null;
  await window.updateMaintStatus(id, status);
  window.loadMaintenances?.();
};

// fecha ao clicar fora
document.addEventListener("click", (e) => {
  if (!window.__openMaintStatusMenuId) return;
  const inside = e.target.closest?.(".maint-status-menu-wrap");
  if (!inside) {
    window.__openMaintStatusMenuId = null;
    window.loadMaintenances?.();
  }
});


 // ===== Loading Overlay (reutilizável) =====
window.showLoading = (title = "Carregando...", subtitle = "Aguarde um instante.") => {
  const ov = document.getElementById("loading-overlay");
  const t = document.getElementById("loading-title");
  const s = document.getElementById("loading-subtitle");

  if (t) t.textContent = title;
  if (s) s.textContent = subtitle;

  if (ov) ov.classList.remove("hidden");
};

window.hideLoading = () => {
  const ov = document.getElementById("loading-overlay");
  if (ov) ov.classList.add("hidden");
};

// Helper: envolve qualquer async com loading automaticamente
window.withLoading = async (fn, { title, subtitle } = {}) => {
  window.showLoading(title, subtitle);
  try {
    return await fn();
  } finally {
    window.hideLoading();
  }
};

window.loadSuitesForMaint = async () => {
  const sel = document.getElementById('maint-suite-id');
  if (!sel) return;

  sel.innerHTML = '<option value="">Carregando...</option>';

  const { data, error } = await window.sb
    .from('suites')
    .select('id, numero_quarto, titulo, ativo')
    .eq('ativo', true)
    .order('numero_quarto', { ascending: true });

  if (error) {
    console.error('[MANUT] suites error:', error);
    sel.innerHTML = '<option value="">Erro ao carregar</option>';
    return;
  }

  sel.innerHTML =
    ['<option value="">Selecione...</option>']
      .concat((data || []).map(s => {
        const label = s.numero_quarto ? `Suíte ${s.numero_quarto}` : (s.titulo || `Suíte ${s.id}`);
        return `<option value="${s.id}">${label}</option>`;
      }))
      .join('');
       
};
// ===============================
// UPLOAD FOTOS - MANUTENÇÃO
// ===============================
window.maintPhotos = window.maintPhotos || []; 
// cada item: { storage_file_id, storage_path, file_name, public_url }

window.uploadMaintPhoto = async (inp) => {
  const files = Array.from(inp.files || []);
  if (!files.length) return;

  const loader = document.getElementById("maint-photo-loader");
  const container = document.getElementById("maint-photos-container");
  const label = container?.querySelector('label[for="maint-photos"]');

  if (loader) loader.classList.remove("hidden");
  if (label) label.classList.add("pointer-events-none", "opacity-60");

  try {
    for (const f of files) {
      const n = `${Date.now()}_${Math.floor(Math.random() * 999)}.jpg`;
      const storage_path = `manutencoes/${n}`; // ✅ pasta separada p/ manutenção

      const { data, error } = await window.sb.storage
        .from("imagens")
        .upload(storage_path, f);

      if (error) throw error;

      const { data: { publicUrl } } = window.sb.storage
        .from("imagens")
        .getPublicUrl(storage_path);

      // salva no estado do form
      window.maintPhotos.push({
        storage_file_id: data.path,
        storage_path,
        file_name: n,
        public_url: publicUrl
      });

      // cria thumb
      const t = document.createElement("div");
      t.className = "w-10 h-10 rounded-lg bg-cover bg-center border border-slate-200 relative";
      t.style.backgroundImage = `url('${publicUrl}')`;
      t.dataset.path = storage_path;

      t.innerHTML = `
        <button type="button"
          class="absolute -top-2 -right-2 bg-red-500 teSSxt-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center shadow-md border border-white"
          onclick="window.removeMaintPhoto && window.removeMaintPhoto('${storage_path}', this)">
          <i class="fas fa-times"></i>
        </button>
      `;

      // insere antes do label (pra label ficar por último)
      container.insertBefore(t, label);
    }
  } catch (e) {
    alert("Erro ao enviar foto:\n\n" + (e?.message || JSON.stringify(e)));
  } finally {
    if (loader) loader.classList.add("hidden");
    if (label) label.classList.remove("pointer-events-none", "opacity-60");
    inp.value = ""; // ✅ permite escolher outra foto depois
  }
};

window.removeMaintPhoto = (storagePath, btnEl) => {
  window.maintPhotos = (window.maintPhotos || []).filter(p => p.storage_path !== storagePath);
  btnEl?.closest("div")?.remove();
};

// chama isso quando abrir "Nova Manutenção"
window.resetMaintPhotosUI = () => {
  window.maintPhotos = [];
  const container = document.getElementById("maint-photos-container");
  if (!container) return;

  // remove thumbs (mantém o label + input)
  container.querySelectorAll('div[data-path]').forEach(el => el.remove());
};


 // SALVAR FOTOS   
 window.maintPhotos = window.maintPhotos || []; // estado das fotos no form

window.uploadMaintPhoto = async (inp) => {
  const files = Array.from(inp.files || []);
  if (!files.length) return;

  const container = document.getElementById("maint-photos-container");
  const label = container?.querySelector('label[for="maint-photos"]');

  try {
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${crypto.randomUUID()}.${ext}`;

      // ✅ upload antes de ter ID -> pasta temporária
      const storagePath = `manutencoes/tmp/${fileName}`;

      const { data: uploadData, error: upErr } = await window.sb.storage
        .from("imagens")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (upErr) throw upErr;

      const { data: urlData } = window.sb.storage
        .from("imagens")
        .getPublicUrl(storagePath);

      const publicUrl = urlData?.publicUrl || null;

      // guarda para inserir depois na tabela manutencoes_fotos
      window.maintPhotos.push({
        storage_file_id: uploadData?.path || storagePath,
        storage_path: storagePath,
        file_name: fileName,
        public_url: publicUrl
      });

      // preview thumb
      const t = document.createElement("div");
      t.className = "w-10 h-10 rounded-lg bg-cover bg-center border border-slate-200 relative";
      t.style.backgroundImage = `url('${publicUrl}')`;
      t.dataset.path = storagePath;

      t.innerHTML = `
        <button type="button"
          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center shadow-md border border-white"
          onclick="window.removeMaintPhoto && window.removeMaintPhoto('${storagePath}', this)">
          <i class="fas fa-times"></i>
        </button>
      `;

      container.insertBefore(t, label);
    }
  } catch (e) {
    alert("Erro ao enviar foto:\n\n" + (e?.message || JSON.stringify(e)));
    console.error("[MANUT] upload foto erro:", e);
  } finally {
    inp.value = ""; // ✅ permite selecionar mais fotos depois
  }
};

window.removeMaintPhoto = (storagePath, btnEl) => {
  window.maintPhotos = (window.maintPhotos || []).filter(p => p.storage_path !== storagePath);
  btnEl?.closest("div")?.remove();
};

// SALVAR FOTOS (DEBUG + INSERT)
window.uploadMaintenancePhotos = async (manutencaoId) => {
  const photos = window.maintPhotos || [];
  if (!photos.length) return;

  const payload = photos.map(p => ({
    manutencao_id: Number(manutencaoId),
    storage_file_id: p.storage_file_id,
    storage_path: p.storage_path,
    file_name: p.file_name,
    public_url: p.public_url
  }));

  const { error } = await window.sb
    .from("manutencoes_fotos")
    .insert(payload);

  if (error) throw error;

  // limpa estado depois de salvar
  window.maintPhotos = [];
};


// 2. Salvar Dados (Insert Real)
window.saveMaintenance = async (e) => {
  e?.preventDefault?.();

  return window.withLoading(async () => {
    const titulo = document.getElementById('maint-titulo')?.value?.trim();
    const local = document.getElementById('maint-local')?.value?.trim();
    const urgencia = document.getElementById('maint-urgencia')?.value;
    const tipo = document.getElementById('maint-tipo')?.value;
    const vencEl = document.getElementById('maint-vencimento');
    const descEl = document.getElementById('maint-descricao');
    const grupoSel = document.getElementById("maint-grupo-id");
    const grupo_id = grupoSel?.value ? Number(grupoSel.value) : null;
    const suiteSel = document.getElementById('maint-suite-id');
    const respSel = document.getElementById('maint-responsavel-id');
    const suiteNome = suiteSel?.options?.[suiteSel.selectedIndex]?.text || null;

    if (!titulo || !local) {
      alert("Preencha o Título e o Local!");
      return;
    }

    const { data, error } = await window.sb
      .from('manutencoes')
      .insert([{
        titulo,
        local,
        suite: suiteNome,
        URGENCIA: urgencia,
        responsavel_id: respSel?.value ? Number(respSel.value) : null,
        TIPO_MANUTENCAO: tipo,
        status: 'pendente',
        data_vencimento: vencEl?.value ? vencEl.value : null,
        grupo_id: grupo_id,
        descricao: descEl?.value?.trim() || null,
        criado_por_usuario: window.currentUser?.id

      }])


      .select('id')
      .single();
    if (error) throw error;

    const newMaintenanceId = data?.id; // ✅ agora é o jeito certo
        if (!newMaintenanceId) throw new Error("Não foi possível obter o ID da manutenção criada.");

  // 2) se tiver fotos já enviadas (estado), salva na tabela manutencoes_fotos
if (window.uploadMaintenancePhotos && (window.maintPhotos?.length || 0) > 0) {
  await window.uploadMaintenancePhotos(newMaintenanceId);
}
window.resetMaintPhotosUI?.();


    // limpa
    document.getElementById('maint-titulo').value = '';
    document.getElementById('maint-local').value = '';
    document.getElementById('maint-descricao').value = '';
    document.getElementById('maint-photos').value = '';

    // fecha tela e recarrega lista
    document.getElementById('maint-screen')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');
    await window.loadMaintenances?.();

  }, { title: "Salvando manutenção...", subtitle: "Não feche esta tela." });
   
    
    window.backFromMaint();
    
};
window.loadSuitesForMaint = async () => {
  const sel = document.getElementById('maint-suite-id');
  if (!sel) return;

  sel.innerHTML = '<option value="">Carregando...</option>';

  const { data, error } = await window.sb
    .from('suites')
    .select('id, numero_quarto, titulo')
    .eq('ativo', true)
    .order('ordem_exibicao', { ascending: true });

  if (error) {
    sel.innerHTML = '<option value="">Erro ao carregar</option>';
    console.error('[MANUT] loadSuitesForMaint error:', error);
    return;
  }

  const options = ['<option value="">Selecione...</option>'].concat(
    (data || []).map(s => {
      const label = (s.numero_quarto ? `Suíte ${s.numero_quarto}` : (s.titulo || `Suíte ${s.id}`));
      return `<option value="${s.id}">${label}</option>`;
    })
  );

  sel.innerHTML = options.join('');
};
window.openMaintForm = () => {
  document.getElementById('app-container')?.classList.add('hidden');
  document.getElementById('maint-screen')?.classList.remove('hidden');
   window.loadGrupoMaintOptions("maint-grupo-id");

  // (opcional) se precisar garantir selects carregados:
  const resp = document.getElementById('maint-responsavel-id');
  const suite = document.getElementById('maint-suite-id');
  const respVazio = !resp || resp.options.length <= 1;
  const suiteVazio = !suite || suite.options.length <= 1;
  if ((respVazio || suiteVazio) && window.sb && typeof loadData === 'function') loadData(true);

};
window.backFromMaint = () => {
  if (confirm("Sair sem salvar?")) {
    document.getElementById('maint-screen')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');loadMaintenances(true);
  }
};
window.requestExitMaint = () => {
  window.confirmOpen(
    {
      title: "Sair sem salvar?",
      message: "Você tem alterações pendentes. Se sair agora, elas serão perdidas.",
      okText: "Sair",
      okClass: "bg-red-600 active:bg-red-700 shadow-red-200",
    },
    () => {
      document.getElementById("maint-screen")?.classList.add("hidden");
      document.getElementById("app-container")?.classList.remove("hidden");
    }
  );
};


// 3. Funções do Modal (Garanta que os botões chamam isso)
window.openMaintModal = () => {
  document.getElementById('maintenance-modal').classList.remove('hidden');

  // Se os selects do modal ainda estiverem vazios, força carregar dados
  const resp = document.getElementById('maint-responsavel-id');
  const suite = document.getElementById('maint-suite-id');

const supabasePronto = !!window.sb;

if ((respVazio || suiteVazio) && supabasePronto && typeof loadData === 'function') {
  loadData(true);
}

  if ((respVazio || suiteVazio) && typeof loadData === 'function') {
    loadData(true); // reaproveita o mesmo carregamento que você já usa na faxina
  }
};
   // --- SCRIPT DE DEBUG E CONEXÃO MANUAL ---

// Aguarda o HTML carregar completamente para não ter erro de "elemento não encontrado"
setTimeout(() => {
    console.log("🔧 MÓDULO DE MANUTENÇÃO: Iniciando...");

    const btnSalvar = document.getElementById('btn-confirmar-manutencao');

    if (btnSalvar) {
        console.log("✅ Botão de Salvar ENCONTRADO no HTML!");
        
        // Remove qualquer evento anterior para não duplicar
        const novoBtn = btnSalvar.cloneNode(true);
        btnSalvar.parentNode.replaceChild(novoBtn, btnSalvar);
        
        // Adiciona o evento de clique "na marra"
        novoBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Impede recarregar a página
            console.log("🖱️ CLIQUE DETECTADO! Iniciando processo de salvamento...");

            // 1. CHECAGEM DO SUPABASE
            if (!window.sb) {
                console.error("❌ ERRO: window.sb (Supabase) não existe ou não iniciou.");
                alert("Erro: Conexão com banco de dados não iniciada.");
                return;
            } else {
                console.log("✅ Supabase detectado.");
            }

            // 2. CAPTURA DOS DADOS
            const titulo = document.getElementById('maint-titulo').value;
            const local = document.getElementById('maint-local').value;
            const urgencia = document.getElementById('maint-urgencia').value;
            const tipo = document.getElementById('maint-tipo').value;

            console.log("📋 Dados capturados:", { titulo, local, urgencia, tipo });

            if (!titulo || !local) {
                console.warn("⚠️ Campos vazios detectados.");
                alert("Preencha o título e o local!");
                return;
            }

            // 3. FEEDBACK VISUAL
            const textoOriginal = novoBtn.innerText;
            novoBtn.innerText = "ENVIANDO...";
            novoBtn.disabled = true;

            // 4. ENVIO PARA O SUPABASE
            console.log("🚀 Enviando para tabela 'manutencoes'...");
            
            try {
                const { data, error } = await window.sb
                    .from('manutencoes')
                    .insert([{
                        titulo: titulo,
                        local: local,
                        urgencia: urgencia,
                        tipo: tipo,
                        status: 'pendente'
                    }])
                    .select();

                if (error) {
                    throw error; // Joga para o catch
                }

                console.log("✅ SUCESSO! Registro salvo:", data);
                alert("Manutenção registrada com sucesso!");
                
                // Limpeza
                document.getElementById('maintenance-modal').classList.add('hidden');
                document.getElementById('maint-titulo').value = '';
                document.getElementById('maint-local').value = '';
                
                // Tenta recarregar a lista se a função existir
                if (typeof window.loadMaintenances === 'function') {
                    window.loadMaintenances();
                }

            } catch (err) {
                console.error("❌ ERRO NO SUPABASE:", err);
                alert("Erro ao salvar: " + (err.message || err));
            } finally {
                // Restaura o botão
                novoBtn.innerText = textoOriginal;
                novoBtn.disabled = false;
            }
        });
    } 
}, 1000); // Espera 1 segundo para garantir que o HTML renderizou