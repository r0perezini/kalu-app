

// ==== DEBUG MANUTENÇÃO (cole no final do script) ====
(function () {
  console.log('[MANUT] script carregou');

  // 1) Confirma se o Supabase existe
  if (!window.sb) {
    console.warn('[MANUT] window.sb NÃO existe (Supabase não inicializado ou escopo errado)');
  } else {
    console.log('[MANUT] window.sb OK');
  }
})();

// POPUP DE CONFIRMAÇÃO GENÊRICO
(function initConfirmModal() {
  if (window.__confirmModalReady) return;
  window.__confirmModalReady = true;

  let onConfirm = null;

  window.confirmOpen = ({
    title = "Confirmar",
    message = "Tem certeza?",
    okText = "Confirmar",
    okClass = "bg-red-600 active:bg-red-700 shadow-red-200", // classes Tailwind do botão
    iconHtml = '<i class="fas fa-triangle-exclamation text-amber-500 text-sm"></i>',
  } = {}, cb = null) => {
    onConfirm = typeof cb === "function" ? cb : null;

    const modal = document.getElementById("confirm-modal");
    if (!modal) return;

    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;

    const icon = document.getElementById("confirm-icon");
    if (icon) icon.innerHTML = iconHtml;

    const okBtn = document.getElementById("confirm-ok");
    okBtn.textContent = okText;

    // mantém classes base e troca só o “tema”
    okBtn.className =
      "flex-1 py-2.5 rounded-xl font-extrabold text-white shadow-lg " + okClass;

    modal.classList.remove("hidden");
  };

  window.confirmClose = () => {
    document.getElementById("confirm-modal")?.classList.add("hidden");
    onConfirm = null;
  };

  document.addEventListener("click", (e) => {
    const okBtn = e.target.closest("#confirm-ok");
    if (!okBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const fn = onConfirm;
    window.confirmClose();
    if (fn) fn();
  }, true);
})();

window.toggleTopMenu = (force) => {
  const el = document.getElementById("top-menu");
  if (!el) return;

  const shouldOpen = (typeof force === "boolean")
    ? force
    : el.classList.contains("hidden");

  el.classList.toggle("hidden", !shouldOpen);
};

// Fecha clicando fora
document.addEventListener("click", (e) => {
  const menu = document.getElementById("top-menu");
  const btn = document.getElementById("btn-top-menu");
  if (!menu || !btn) return;

  const inside = menu.contains(e.target) || btn.contains(e.target);
  if (!inside) menu.classList.add("hidden");
});

// ===============================
// PERFIL (foto, email, senha, dados)
// ===============================
window.loadMyProfile = async () => {
  if (!window.currentUser?.id) return;

  const { data, error } = await window.sb
    .from("usuarios")
    .select("nome_completo, primeiro_nome, email, url_avatar")
    .eq("id", window.currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("[PROFILE] loadMyProfile error:", error);
    return;
  }
  if (!data) { console.warn("Sem linha em public.usuarios para esse auth id"); return; }

  const nome = data?.primeiro_nome || data?.nome_completo || "Usuário";
  const email = data?.email || window.currentUser.email || "—";

  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const nomeCompletoEl = document.getElementById("profile-nome-completo");
  const primeiroNomeEl = document.getElementById("profile-primeiro-nome");

  if (nameEl) nameEl.textContent = nome;
  if (emailEl) emailEl.textContent = email;
  if (nomeCompletoEl) nomeCompletoEl.value = data?.nome_completo || "";
  if (primeiroNomeEl) primeiroNomeEl.value = data?.primeiro_nome || "";

 let url = data.url_avatar || "";
if (url.startsWith("//")) url = "https:" + url;

const topImg = document.getElementById("top-avatar");
const topIcon = document.getElementById("top-avatar-icon");

if (topImg && topIcon) {
  if (url) {
    topImg.src = url;
    topImg.classList.remove("hidden");
    topIcon.classList.add("hidden");
  } else {
    topImg.src = "";
    topImg.classList.add("hidden");
    topIcon.classList.remove("hidden");
  }
}
};

window.saveProfileData = async () => {
  if (!window.currentUser?.id) return;

  const nome_completo = (document.getElementById("profile-nome-completo")?.value || "").trim();
  const primeiro_nome = (document.getElementById("profile-primeiro-nome")?.value || "").trim() || null;

  if (!nome_completo) return alert("Informe o nome completo.");

  await window.withLoading(async () => {
    const { error } = await window.sb
      .from("usuarios")
      .update({
        nome_completo,
        primeiro_nome,
        atualizado_em: new Date().toISOString()
      })
      .eq("id", window.currentUser.id);

    if (error) throw error;

    await window.loadMyProfile();
    alert("✅ Dados atualizados!");
  }, { title: "Salvando perfil...", subtitle: "Aguarde um instante." }).catch(e => {
    alert("Erro ao salvar perfil:\n\n" + (e?.message || JSON.stringify(e)));
  });
};

window.uploadProfileAvatar = async (inp) => {
  const file = (inp?.files || [])[0];
  if (!file) return;
  if (!window.currentUser?.id) return;

  await window.withLoading(async () => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `avatars/${window.currentUser.id}/${fileName}`;

    const { data: up, error: upErr } = await window.sb.storage
      .from("imagens")
      .upload(storagePath, file, { upsert: true, contentType: file.type });

    if (upErr) throw upErr;

    const { data: urlData } = window.sb.storage
      .from("imagens")
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    const { error: updErr } = await window.sb
      .from("usuarios")
      .update({ url_avatar: publicUrl, atualizado_em: new Date().toISOString() })
      .eq("id", window.currentUser.id);

    if (updErr) throw updErr;

    await window.loadMyProfile();
    alert("✅ Foto atualizada!");
  }, { title: "Enviando foto...", subtitle: "Aguarde o upload." }).catch(e => {
    alert("Erro ao enviar foto:\n\n" + (e?.message || JSON.stringify(e)));
  });

  inp.value = "";
};

window.removeProfileAvatar = async () => {
  if (!window.currentUser?.id) return;

  await window.withLoading(async () => {
    const { error } = await window.sb
      .from("usuarios")
      .update({ url_avatar: null, atualizado_em: new Date().toISOString() })
      .eq("id", window.currentUser.id);

    if (error) throw error;

    await window.loadMyProfile();
  }, { title: "Removendo foto...", subtitle: "Aguarde." }).catch(e => {
    alert("Erro ao remover foto:\n\n" + (e?.message || JSON.stringify(e)));
  });
};

window.changeMyEmail = async () => {
  const newEmail = (document.getElementById("profile-new-email")?.value || "").trim();
  if (!newEmail) return alert("Informe o novo email.");
  if (!window.currentUser?.id) return;

  await window.withLoading(async () => {
    // 1) altera no Auth
    const { data, error } = await window.sb.auth.updateUser({ email: newEmail });
    if (error) throw error;

    // 2) sincroniza na sua tabela public.usuarios
    const { error: e2 } = await window.sb
      .from("usuarios")
      .update({ email: newEmail, atualizado_em: new Date().toISOString() })
      .eq("id", window.currentUser.id);

    if (e2) throw e2;

    // atualiza cache local
    window.currentUser = data?.user || window.currentUser;

    document.getElementById("profile-new-email").value = "";
    await window.loadMyProfile();
    alert("✅ Email alterado! (pode exigir confirmação por email, dependendo do Auth)");
  }, { title: "Alterando email...", subtitle: "Aguarde." }).catch(e => {
    alert("Erro ao alterar email:\n\n" + (e?.message || JSON.stringify(e)));
  });
};

window.changeMyPassword = async () => {
  const p1 = document.getElementById("profile-new-pass")?.value || "";
  const p2 = document.getElementById("profile-new-pass2")?.value || "";

  if (!p1 || p1.length < 6) return alert("A senha precisa ter pelo menos 6 caracteres.");
  if (p1 !== p2) return alert("As senhas não conferem.");

  await window.withLoading(async () => {
    const { error } = await window.sb.auth.updateUser({ password: p1 });
    if (error) throw error;

    document.getElementById("profile-new-pass").value = "";
    document.getElementById("profile-new-pass2").value = "";
    alert("✅ Senha alterada!");
  }, { title: "Alterando senha...", subtitle: "Aguarde." }).catch(e => {
    alert("Erro ao alterar senha:\n\n" + (e?.message || JSON.stringify(e)));
  });
};

 