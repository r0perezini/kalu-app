

        // ===============================
// GRUPOS DE MANUTENÇÃO
// ===============================
window.loadGrupoMaintOptions = async (selectId = "maint-grupo-id", selectedId = null) => {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const { data, error } = await window.sb
    .from("grupo_manutencoes")
    .select("id,nome")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GRUPO] erro ao carregar grupo_manutencoes:", error);
    return;
  }

  const current = selectedId ?? sel.value ?? "";
  sel.innerHTML = `<option value="">Selecione...</option>` + (data || [])
    .map(g => `<option value="${g.id}">${g.nome}</option>`)
    .join("");

  if (current) sel.value = String(current);
};

window.openGrupoMaintModal = () => {
  document.getElementById("grupo-maint-modal")?.classList.remove("hidden");
  document.getElementById("grupo-maint-nome").value = "";
  document.getElementById("grupo-maint-descricao").value = "";
  document.getElementById("grupo-maint-nome")?.focus();
};

window.closeGrupoMaintModal = () => {
  document.getElementById("grupo-maint-modal")?.classList.add("hidden");
};

window.saveGrupoMaint = async () => {
  const btn = document.getElementById("btn-save-grupo-maint");
  const nomeEl = document.getElementById("grupo-maint-nome");
  const descEl = document.getElementById("grupo-maint-descricao");

  const nome = (nomeEl?.value || "").trim();
  const descricao = (descEl?.value || "").trim() || null;

  if (!nome) {
    alert("Informe o nome do grupo.");
    return;
  }

  const original = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = "Salvando..."; }

  try {
    const { data, error } = await window.sb
      .from("grupo_manutencoes")
      .insert([{ nome, descricao }])
      .select("id")
      .single();

    if (error) throw error;

    // recarrega dropdown e seleciona o recém-criado
    await window.loadGrupoMaintOptions("maint-grupo-id", data.id);
    window.closeGrupoMaintModal();

  } catch (e) {
    alert("Erro ao salvar grupo:\n\n" + (e?.message || JSON.stringify(e)));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = original; }
  }
};
window.getLast30DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  // ISO para filtro no Supabase (com tempo)
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // Texto bonitinho
  const fmt = (d) => d.toLocaleDateString('pt-BR');
  const label = `${fmt(start)} até ${fmt(end)}`;

  return { startISO, endISO, label };
};

window.loadDashboardKpis = async () => {
  if (!window.sb) return;

  const { startISO, endISO, label } = window.getLast30DaysRange();
  const elPeriod = document.getElementById("dash-period");
  if (elPeriod) elPeriod.textContent = label;

  // placeholders rápidos
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  ["fx-total","fx-perc","fx-perfeitas","fx-media","mt-pendente","mt-fazendo","mt-feito","mt-total"].forEach(id => setTxt(id, "—"));

  try {
    const [fax, manut] = await Promise.all([
      window.sb
        .from("revisao_de_faxina")
        .select("id,pontos_perdidos,data_da_revisao")
        .gte("data_da_revisao", startISO)
        .lte("data_da_revisao", endISO),

      window.sb
        .from("manutencoes")
        .select("id,status,created_at")
        .gte("created_at", startISO)
        .lte("created_at", endISO),
    ]);

    if (fax.error) throw fax.error;
    if (manut.error) throw manut.error;

    // ===== FAXINA =====
    const rowsF = fax.data || [];
    const totalF = rowsF.length;
    const perfeitas = rowsF.filter(r => (r.pontos_perdidos ?? 0) === 0).length;
    const somaPts = rowsF.reduce((acc, r) => acc + (r.pontos_perdidos ?? 0), 0);
    const media = totalF ? (somaPts / totalF) : 0;
    const perc = totalF ? ((perfeitas / totalF) * 100) : 0;

    setTxt("fx-total", String(totalF));
    setTxt("fx-perfeitas", String(perfeitas));
    setTxt("fx-media", totalF ? media.toFixed(1) : "0.0");
    setTxt("fx-perc", totalF ? `${perc.toFixed(0)}%` : "0%");

    // ===== MANUTENÇÃO =====
    const rowsM = manut.data || [];
    const pend = rowsM.filter(r => (r.status || "").toLowerCase() === "pendente").length;
    const faz = rowsM.filter(r => (r.status || "").toLowerCase() === "fazendo").length;
    const fei = rowsM.filter(r => (r.status || "").toLowerCase() === "feito").length;

    setTxt("mt-pendente", String(pend));
    setTxt("mt-fazendo", String(faz));
    setTxt("mt-feito", String(fei));
    setTxt("mt-total", String(rowsM.length));

  } catch (e) {
    console.error("[DASH] erro KPIs:", e);
    // se der erro, deixa um indicativo simples
    const el = document.getElementById("dash-period");
    if (el) el.textContent = "Erro ao carregar KPIs";
  }
};

//----------------------MANUTENÇÃO----------------------//
// Viewer tela cheia
window.openPhotoViewer = (url) => {
  const box = document.getElementById("photo-viewer");
  const img = document.getElementById("photo-viewer-img");
  if (!box || !img) return;
  img.src = url;
  box.classList.remove("hidden");
};

window.closePhotoViewer = () => {
  const box = document.getElementById("photo-viewer");
  const img = document.getElementById("photo-viewer-img");
  if (img) img.src = "";
  if (box) box.classList.add("hidden");
};

// Abrir/fechar detalhes da manutenção
window.openMaintDetails = async (id) => {
  const screen = document.getElementById("maint-details-screen");
  const content = document.getElementById("maint-details-content");
  if (!screen || !content) return;

  screen.classList.remove("hidden");
  content.innerHTML = `<div class="text-center text-gray-400 py-10"><i class="fas fa-circle-notch fa-spin text-blue-300 text-2xl"></i></div>`;

  try {
    // 1) manutenção + grupo
    const { data: m, error: e1 } = await window.sb
      .from("manutencoes")
      .select("*, grupo:grupo_id(nome)")
      .eq("id", id)
      .single();
    if (e1) throw e1;

    // 2) fotos
    const { data: fotos, error: e2 } = await window.sb
      .from("manutencoes_fotos")
      .select("public_url")
      .eq("manutencao_id", id)
      .order("created_at", { ascending: true });
    if (e2) throw e2;

    // 3) responsável (funcionarios)
    let respNome = "—";
    if (m.responsavel_id) {
      const { data: fr } = await window.sb
        .from("funcionarios")
        .select("nome")
        .eq("id", m.responsavel_id)
        .maybeSingle();
      if (fr?.nome) respNome = fr.nome;
      else respNome = window.staffMap?.[m.responsavel_id] || `#${m.responsavel_id}`;
    }

    // 4) criador (usuarios -> funcionario -> funcionarios)
    let criadorNome = "—";
    if (m.criado_por_usuario) {
      const { data: u } = await window.sb
        .from("usuarios")
        .select("funcionario")
        .eq("id", m.criado_por_usuario)
        .maybeSingle();

      if (u?.funcionario) {
        const { data: fc } = await window.sb
          .from("funcionarios")
          .select("nome")
          .eq("id", u.funcionario)
          .maybeSingle();
        if (fc?.nome) criadorNome = fc.nome;
        else criadorNome = window.staffMap?.[u.funcionario] || `#${u.funcionario}`;
      }
    }

    // helpers
    const safe = (v, fallback = "—") => {
      const s = (v ?? "").toString().trim();
      if (!s) return fallback;
      if (s.toLowerCase().startsWith("selecione")) return fallback;
      return s;
    };

    const normalizeTxt = (v) =>
      (v || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const urg = safe(m.URGENCIA, "Não definida");
    const urgNorm = normalizeTxt(urg);

    const urgCls =
      urgNorm.includes("urgente") || urgNorm.includes("alta")
        ? "bg-red-100 text-red-700"
        : urgNorm.includes("media")
        ? "bg-amber-100 text-amber-700"
        : urgNorm.includes("baixa")
        ? "bg-green-100 text-green-700"
        : "bg-slate-100 text-slate-600";

    const status = safe(m.status, "—");
    const stNorm = normalizeTxt(status);
    const statusCls =
      stNorm.includes("feito")
        ? "bg-green-100 text-green-700"
        : stNorm.includes("fazendo")
        ? "bg-blue-100 text-blue-700"
        : stNorm.includes("pend")
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

    const suite = safe(m.suite, "Não definida");
    const local = safe(m.local, "Não definido");
    const grupo = m.grupo?.nome ? m.grupo.nome : "Não definido";
    const tipo = safe(m.TIPO_MANUTENCAO, "—");
    const titulo = safe(m.titulo, "(sem título)");

    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

    const vencStr = m.data_vencimento ? fmtDate(m.data_vencimento) : "Sem vencimento";

    // proximidade vencimento (só pra destaque)
    let vencHintCls = "text-slate-500";
    if (m.data_vencimento) {
      const today = new Date(); today.setHours(0,0,0,0);
      const d = new Date(m.data_vencimento + "T00:00:00");
      d.setHours(0,0,0,0);
      const diff = Math.round((d - today) / (1000*60*60*24));
      if (diff < 0) vencHintCls = "text-red-600 font-bold";
      else if (diff <= 2) vencHintCls = "text-red-500 font-bold";
      else if (diff <= 7) vencHintCls = "text-amber-600 font-bold";
    }

    const fotosHtml = (fotos || []).length
      ? `
        <div class="card-premium p-5 mt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-slate-700 text-xs uppercase">Fotos (${fotos.length})</h3>
            <span class="text-[10px] text-slate-400">toque para abrir</span>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${(fotos || []).map(f => `
              <button type="button"
                onclick="window.openPhotoViewer('${f.public_url}')"
                class="flex-none w-28 h-24 rounded-2xl bg-cover bg-center border border-slate-200"
                style="background-image:url('${f.public_url}')"></button>
            `).join("")}
          </div>
        </div>
      `
      : `
        <div class="card-premium p-5 mt-4">
          <h3 class="font-bold text-slate-700 text-xs uppercase mb-2">Fotos</h3>
          <div class="text-xs text-slate-400">Sem fotos.</div>
        </div>
      `;

    // ✅ layout “estilo auditoria”
    content.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-4">

        <!-- RESULTADO / STATUS (estilo auditoria) -->
        <div class="card-premium p-6 text-center">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manutenção</p>

          <div class="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span class="px-4 py-1 rounded-2xl ${statusCls} text-xs font-black uppercase">${status}</span>
            <span class="px-4 py-1 rounded-2xl ${urgCls} text-xs font-black uppercase">${urg}</span>
          </div>

          <h1 class="mt-4 text-xl font-black text-slate-800 leading-snug">${titulo}</h1>
          <p class="text-xs text-slate-500 mt-2">${tipo}</p>
        </div>

        <!-- INFO PRINCIPAL -->
        <div class="card-premium p-5 text-xs space-y-3">
          <div class="flex justify-between border-b border-slate-50 pb-2">
            <span>Suíte</span>
            <span class="font-bold text-slate-700 text-sm">${suite}</span>
          </div>

          <div class="flex justify-between border-b border-slate-50 pb-2">
            <span>Local</span>
            <span class="font-bold text-slate-700 text-sm">${local}</span>
          </div>

          <div class="flex justify-between border-b border-slate-50 pb-2">
            <span>Grupo</span>
            <span class="font-bold ${grupo === "Não definido" ? "text-slate-400" : "text-slate-700"}">${grupo}</span>
          </div>

          <div class="flex justify-between border-b border-slate-50 pb-2">
            <span>Vencimento</span>
            <span class="${vencHintCls}"><i class="far fa-calendar-alt mr-1 text-slate-400"></i>${vencStr}</span>
          </div>

          <div class="flex justify-between">
            <span>Data do problema</span>
            <span class="font-bold text-slate-700"><i class="far fa-clock mr-1 text-slate-400"></i>${fmtDate(m.data_problema)}</span>
          </div>
        </div>

        <!-- RESPONSÁVEL / CRIADOR -->
        <div class="card-premium p-5 text-xs space-y-3">
          <div class="flex justify-between border-b border-slate-50 pb-2">
            <span>Responsável</span>
            <span class="font-bold text-slate-700"><i class="fas fa-user-tie mr-1 text-slate-400"></i>${respNome}</span>
          </div>
          <div class="flex justify-between">
            <span>Criado por</span>
            <span class="font-bold text-slate-700"><i class="fas fa-user mr-1 text-slate-400"></i>${criadorNome}</span>
          </div>
        </div>

        <!-- DESCRIÇÃO -->
        <div class="card-premium p-5">
          <h3 class="font-bold text-slate-700 text-xs uppercase mb-2">Descrição</h3>
          <div class="text-sm text-slate-600 whitespace-pre-line">${safe(m.descricao, "Sem descrição.")}</div>
        </div>

        ${fotosHtml}

      </div>
    `;
  } catch (e) {
    console.error("[MANUT] openMaintDetails error:", e);
    content.innerHTML = `<div class="text-center text-red-500 py-8">Erro ao carregar detalhes.</div>`;
  }
};


// // ===============================
// // FILTROS MANUTENÇÃO (GLOBAL)
// // ===============================
window.maintFilter = {
  scope: "todas",   // todas | minhas
  status: "todos"   // todos | pendente | fazendo | feito
};

function paintPills(containerId, attr, value) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.querySelectorAll(`button[${attr}]`).forEach((b) => {
    const active = b.getAttribute(attr) === value;
    b.className = active
      ? "px-4 py-1 bg-blue-600 text-white rounded-full text-xs font-bold whitespace-nowrap"
      : "px-4 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold whitespace-nowrap";
  });
}

window.setMaintScope = (scope) => {
  window.maintFilter.scope = scope;
  paintPills("maint-scope", "data-scope", scope);
  window.loadMaintenances?.();
};

window.setMaintStatus = (status) => {
  window.maintFilter.status = status;
  paintPills("maint-status", "data-status", status);
  window.loadMaintenances?.();
};

// (mesmo helper de antes)
window.getMyFuncionarioId = async () => {
  if (window.myFuncionarioId) return window.myFuncionarioId;
  if (!window.currentUser?.id) return null;

  const { data, error } = await window.sb
    .from("usuarios")
    .select("funcionario")
    .eq("id", window.currentUser.id)
    .maybeSingle();

  if (error) return null;
  window.myFuncionarioId = data?.funcionario ?? null;
  return window.myFuncionarioId;
};
window.closeMaintDetails = () => {
  const s = document.getElementById("maint-details-screen");
  if (s) s.classList.add("hidden");
};

// 1. Carregar Dados
// window.loadMaintenances = async () => {
//   console.log('[MANUT] loadMaintenances() iniciou');

//   const list = document.getElementById('maintenance-list');
//   if (!list) {
//     console.error('[MANUT] #maintenance-list não existe no DOM');
//     return;
//   }

//   if (!window.sb) {
//     console.error('[MANUT] window.sb não existe -> impossível chamar Supabase');
//     list.innerHTML = '<div class="text-center text-red-500">Sem conexão com Supabase (window.sb)</div>';
//     return;
//   }