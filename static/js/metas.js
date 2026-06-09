// /static/js/metas.js
// Integração completa da página de Metas Financeiras.
//
// ENDPOINTS UTILIZADOS:
//   GET    /metas/api/                        → lista todas as metas
//   POST   /metas/api/                        → criar nova meta
//   PATCH  /metas/api/<id>                    → editar meta
//   DELETE /metas/api/<id>                    → remover meta
//   POST   /metas/api/<id>/aportes            → registrar aporte
//   GET    /metas/api/<id>/historico          → histórico de aportes
//   GET    /despesas/                         → despesas do usuário (integração)

document.addEventListener("DOMContentLoaded", () => {

    // ─── Utilitários ─────────────────────────────────────────
    const formatBRL = (valor) =>
        Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const formatData = (isoDate) => {
        const [ano, mes, dia] = isoDate.split("-");
        return `${dia}/${mes}/${ano}`;
    };

    const hoje = () => new Date().toISOString().split("T")[0];

    const mesAtual = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    // ─── Referências DOM — resumo ─────────────────────────────
    const elMetasAtivas    = document.getElementById("totalMetasAtivas");
    const elBadgeAtivas    = document.getElementById("badgeMetasAtivas");
    const elTotalObjetivo  = document.getElementById("totalObjetivo");
    const elTotalAcumulado = document.getElementById("totalAcumulado");
    const elLista          = document.getElementById("lista-metas");
    const elMsgVazia       = document.getElementById("msg-vazia");

    // ─── Referências DOM — modal meta ────────────────────────
    const modalMeta         = document.getElementById("modal-meta");
    const formMeta          = document.getElementById("form-meta");
    const elModalMetaTitulo = document.getElementById("modal-meta-titulo");
    const elTitulo          = document.getElementById("m-titulo");
    const elDescricao       = document.getElementById("m-descricao");
    const elValorObj        = document.getElementById("m-valor-objetivo");
    const elValorAcum       = document.getElementById("m-valor-acumulado");
    const elDataInicio      = document.getElementById("m-data-inicio");
    const elDataPrazo       = document.getElementById("m-data-prazo");
    const elMetaFormErro    = document.getElementById("meta-form-erro");

    // ─── Referências DOM — modal aporte ──────────────────────
    const modalAporte      = document.getElementById("modal-aporte");
    const formAporte       = document.getElementById("form-aporte");
    const elAporteValor    = document.getElementById("a-valor");
    const elAporteDesc     = document.getElementById("a-descricao");
    const elAporteFormErro = document.getElementById("aporte-form-erro");

    // ─── Referências DOM — modal histórico ───────────────────
    const modalHistorico    = document.getElementById("modal-historico");
    const elHistoricoTitulo = document.getElementById("modal-historico-titulo");
    const elHistoricoLista  = document.getElementById("historico-lista");

    // ─── Estado ───────────────────────────────────────────────
    let todasMetas      = [];
    let gastosMes       = 0;     // total gasto no mês atual (todas as despesas)
    let filtroAtivo     = "";
    let modoModal       = "novo";
    let editandoId      = null;
    let aporteMetaId    = null;

    // ─── Filtros de status ────────────────────────────────────
    document.querySelectorAll(".btn-filtro").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".btn-filtro").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            filtroAtivo = btn.dataset.status;
            renderizarLista();
        });
    });

    // ─── Abrir / fechar modais ────────────────────────────────
    document.getElementById("btnNovaMeta").addEventListener("click", () => abrirModalNovo());
    document.getElementById("btnFecharModalMeta").addEventListener("click", fecharModalMeta);
    document.getElementById("btnCancelarModalMeta").addEventListener("click", fecharModalMeta);
    document.getElementById("btnFecharModalAporte").addEventListener("click", fecharModalAporte);
    document.getElementById("btnCancelarModalAporte").addEventListener("click", fecharModalAporte);
    document.getElementById("btnFecharModalHistorico").addEventListener("click", () => {
        modalHistorico.classList.add("hidden");
    });

    [modalMeta, modalAporte, modalHistorico].forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.add("hidden");
        });
    });

    // ─── Modal meta — novo ────────────────────────────────────
    function abrirModalNovo() {
        modoModal  = "novo";
        editandoId = null;
        elModalMetaTitulo.textContent = "Nova meta";
        formMeta.reset();
        elDataInicio.value = hoje();
        elMetaFormErro.classList.add("hidden");
        modalMeta.classList.remove("hidden");
    }

    // ─── Modal meta — editar ──────────────────────────────────
    function abrirModalEditar(meta) {
        modoModal  = "editar";
        editandoId = meta.id;
        elModalMetaTitulo.textContent = "Editar meta";
        elMetaFormErro.classList.add("hidden");

        elTitulo.value     = meta.titulo;
        elDescricao.value  = meta.descricao || "";
        elValorObj.value   = meta.valor_objetivo;
        elValorAcum.value  = meta.valor_acumulado;
        elDataInicio.value = meta.data_inicio;
        elDataPrazo.value  = meta.data_prazo;

        modalMeta.classList.remove("hidden");
    }

    function fecharModalMeta() {
        modalMeta.classList.add("hidden");
        formMeta.reset();
        elMetaFormErro.classList.add("hidden");
        modoModal  = "novo";
        editandoId = null;
    }

    // ─── Modal aporte ─────────────────────────────────────────
    function abrirModalAporte(metaId) {
        aporteMetaId = metaId;
        formAporte.reset();
        elAporteFormErro.classList.add("hidden");
        modalAporte.classList.remove("hidden");
    }

    function fecharModalAporte() {
        modalAporte.classList.add("hidden");
        formAporte.reset();
        elAporteFormErro.classList.add("hidden");
        aporteMetaId = null;
    }

    // ─── Submit — nova / editar meta ──────────────────────────
    formMeta.addEventListener("submit", async (e) => {
        e.preventDefault();
        elMetaFormErro.classList.add("hidden");

        const titulo     = elTitulo.value.trim();
        const descricao  = elDescricao.value.trim();
        const valorObj   = parseFloat(elValorObj.value);
        const valorAcum  = parseFloat(elValorAcum.value) || 0;
        const dataInicio = elDataInicio.value;
        const dataPrazo  = elDataPrazo.value;

        if (!titulo)                          { mostrarErroMeta("Informe um título para a meta."); return; }
        if (isNaN(valorObj) || valorObj <= 0) { mostrarErroMeta("Informe um valor objetivo válido."); return; }
        if (!dataInicio || !dataPrazo)        { mostrarErroMeta("Informe as datas de início e prazo."); return; }
        if (dataPrazo <= dataInicio)          { mostrarErroMeta("O prazo deve ser posterior à data de início."); return; }

        const payload = {
            titulo,
            descricao,
            valor_objetivo:  valorObj,
            valor_acumulado: valorAcum,
            data_inicio:     dataInicio,
            data_prazo:      dataPrazo
        };

        try {
            let res;
            if (modoModal === "novo") {
                res = await fetch("/metas/api/", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify(payload)
                });
            } else {
                res = await fetch(`/metas/api/${editandoId}`, {
                    method:  "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.erro || `Erro HTTP ${res.status}`);
            }

            fecharModalMeta();
            await carregarTudo();

        } catch (err) {
            console.error("[metas] Erro ao salvar meta:", err);
            mostrarErroMeta(err.message);
        }
    });

    // ─── Submit — aporte ──────────────────────────────────────
    formAporte.addEventListener("submit", async (e) => {
        e.preventDefault();
        elAporteFormErro.classList.add("hidden");

        const valor     = parseFloat(elAporteValor.value);
        const descricao = elAporteDesc.value.trim();

        if (isNaN(valor) || valor === 0) {
            elAporteFormErro.textContent = "Informe um valor diferente de zero.";
            elAporteFormErro.classList.remove("hidden");
            return;
        }

        try {
            const res = await fetch(`/metas/api/${aporteMetaId}/aportes`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ valor, descricao })
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.erro || `Erro HTTP ${res.status}`);
            }

            fecharModalAporte();
            await carregarTudo();

        } catch (err) {
            console.error("[metas] Erro ao registrar aporte:", err);
            elAporteFormErro.textContent = err.message;
            elAporteFormErro.classList.remove("hidden");
        }
    });

    // ─── Carregar histórico ───────────────────────────────────
    async function abrirHistorico(meta) {
        elHistoricoTitulo.textContent = `Histórico — ${meta.titulo}`;
        elHistoricoLista.innerHTML = `<p class="historico-vazio">Carregando...</p>`;
        modalHistorico.classList.remove("hidden");

        try {
            const res = await fetch(`/metas/api/${meta.id}/historico`);
            if (!res.ok) throw new Error();
            const historico = await res.json();

            if (!historico.length) {
                elHistoricoLista.innerHTML = `<p class="historico-vazio">Nenhum aporte registrado ainda.</p>`;
                return;
            }

            elHistoricoLista.innerHTML = historico.map(h => {
                const positivo = h.valor >= 0;
                return `
                    <div class="historico-item">
                        <div class="historico-item-esq">
                            <span class="historico-item-desc">${h.descricao || "Aporte"}</span>
                            <span class="historico-item-data">${formatData(h.data)}</span>
                        </div>
                        <span class="historico-item-valor ${positivo ? "positivo" : "negativo"}">
                            ${positivo ? "+" : ""}${formatBRL(h.valor)}
                        </span>
                    </div>
                `;
            }).join("");

        } catch {
            elHistoricoLista.innerHTML = `<p class="historico-vazio">Erro ao carregar histórico.</p>`;
        }
    }

    // ─── Cancelar / remover meta ──────────────────────────────
    async function handleCancelarMeta(meta) {
        if (meta.status === "ativa" || meta.status === "concluida") {
            if (!confirm(`Deseja cancelar a meta "${meta.titulo}"?`)) return;
            try {
                const res = await fetch(`/metas/api/${meta.id}`, {
                    method:  "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ status: "cancelada" })
                });
                if (!res.ok) throw new Error();
                await carregarTudo();
            } catch {
                alert("Não foi possível cancelar a meta.");
            }
        } else {
            if (!confirm(`Deseja excluir permanentemente a meta "${meta.titulo}"?`)) return;
            try {
                const res = await fetch(`/metas/api/${meta.id}`, { method: "DELETE" });
                if (!res.ok) throw new Error();
                await carregarTudo();
            } catch {
                alert("Não foi possível excluir a meta.");
            }
        }
    }

    // ─── Bloco de integração com despesas ─────────────────────
    // Exibido apenas em metas ativas.
    // Mostra: total gasto no mês, % do aporte mensal necessário já comprometido,
    // e um aviso colorido se os gastos ultrapassam o aporte sugerido.
    function renderizarBlocoImpacto(meta) {
        if (meta.status !== "ativa" || meta.aporte_mensal_necessario <= 0) return "";

        const percentualComprometido = gastosMes > 0
            ? Math.round((gastosMes / meta.aporte_mensal_necessario) * 100)
            : 0;

        // Define o tom do aviso
        let corAviso, icone, mensagem;
        if (gastosMes === 0) {
            corAviso = "impacto-neutro";
            icone    = "📊";
            mensagem = "Nenhum gasto registrado este mês ainda.";
        } else if (percentualComprometido <= 80) {
            corAviso = "impacto-ok";
            icone    = "✅";
            mensagem = `Seus gastos este mês representam ${percentualComprometido}% do aporte sugerido. Você está no caminho certo!`;
        } else if (percentualComprometido <= 100) {
            corAviso = "impacto-atencao";
            icone    = "⚠️";
            mensagem = `Atenção: seus gastos este mês já comprometem ${percentualComprometido}% do aporte sugerido para esta meta.`;
        } else {
            corAviso = "impacto-critico";
            icone    = "🚨";
            mensagem = `Seus gastos este mês (${formatBRL(gastosMes)}) ultrapassam o aporte sugerido de ${formatBRL(meta.aporte_mensal_necessario)}. Sua meta pode atrasar.`;
        }

        return `
            <div class="bloco-impacto ${corAviso}">
                <div class="impacto-header">
                    <span class="impacto-icone">${icone}</span>
                    <span class="impacto-titulo">Impacto das despesas</span>
                </div>
                <div class="impacto-valores">
                    <span>Gasto este mês: <strong>${formatBRL(gastosMes)}</strong></span>
                    <span>Aporte sugerido: <strong>${formatBRL(meta.aporte_mensal_necessario)}</strong></span>
                </div>
                <p class="impacto-mensagem">${mensagem}</p>
            </div>
        `;
    }

    // ─── Renderizar card ──────────────────────────────────────
    const renderizarCard = (meta) => {
        const card = document.createElement("div");
        card.className = "card-meta";
        card.dataset.id = meta.id;

        const badgeLabel = { ativa: "Ativa", concluida: "Concluída", cancelada: "Cancelada" };
        const badgeClass = { ativa: "badge-ativa", concluida: "badge-concluida", cancelada: "badge-cancelada" };
        const fillClass  = { ativa: "fill-ativa", concluida: "fill-concluida", cancelada: "fill-cancelada" };

        const cancelarLabel = meta.status === "cancelada" ? "🗑 Excluir" : "Cancelar";
        const mostrarAporte = meta.status === "ativa";
        const mostrarEditar = meta.status !== "cancelada";

        card.innerHTML = `
            <div class="card-meta-header">
                <div>
                    <div class="card-meta-titulo">${meta.titulo}</div>
                    ${meta.descricao ? `<div class="card-meta-descricao">${meta.descricao}</div>` : ""}
                </div>
                <span class="badge-status ${badgeClass[meta.status]}">${badgeLabel[meta.status]}</span>
            </div>

            <div class="card-meta-info">
                <div class="info-item">
                    <label>Acumulado</label>
                    <span class="destaque">${formatBRL(meta.valor_acumulado)}</span>
                </div>
                <div class="info-item">
                    <label>Objetivo</label>
                    <span>${formatBRL(meta.valor_objetivo)}</span>
                </div>
                <div class="info-item">
                    <label>Faltam</label>
                    <span class="${meta.valor_restante === 0 ? "positivo" : ""}">${formatBRL(meta.valor_restante)}</span>
                </div>
                <div class="info-item">
                    <label>Prazo</label>
                    <span class="${meta.meses_restantes <= 1 ? "urgente" : ""}">${formatData(meta.data_prazo)}</span>
                </div>
                ${meta.status === "ativa" ? `
                <div class="info-item">
                    <label>Aporte/mês</label>
                    <span>${formatBRL(meta.aporte_mensal_necessario)}</span>
                </div>
                <div class="info-item">
                    <label>Meses restantes</label>
                    <span>${meta.meses_restantes}</span>
                </div>` : ""}
            </div>

            <div class="progresso-wrap">
                <div class="progresso-label">
                    <span>${meta.percentual}% concluído</span>
                    <span>${formatBRL(meta.valor_acumulado)} / ${formatBRL(meta.valor_objetivo)}</span>
                </div>
                <div class="progresso-bar">
                    <div class="progresso-fill ${fillClass[meta.status]}" style="width: ${meta.percentual}%"></div>
                </div>
            </div>

            ${renderizarBlocoImpacto(meta)}

            <div class="card-acoes">
                ${mostrarAporte ? `<button class="btn-card-acao btn-aporte">+ Aporte</button>` : ""}
                ${mostrarEditar ? `<button class="btn-card-acao btn-editar-meta">Editar</button>` : ""}
                <button class="btn-card-acao btn-historico">Histórico</button>
                <button class="btn-card-acao btn-cancelar-meta">${cancelarLabel}</button>
            </div>
        `;

        card.querySelector(".btn-aporte")?.addEventListener("click", () => abrirModalAporte(meta.id));
        card.querySelector(".btn-editar-meta")?.addEventListener("click", () => abrirModalEditar(meta));
        card.querySelector(".btn-historico").addEventListener("click", () => abrirHistorico(meta));
        card.querySelector(".btn-cancelar-meta").addEventListener("click", () => handleCancelarMeta(meta));

        return card;
    };

    // ─── Renderizar lista com filtro ──────────────────────────
    const renderizarLista = () => {
        const filtradas = filtroAtivo
            ? todasMetas.filter(m => m.status === filtroAtivo)
            : todasMetas;

        elLista.innerHTML = "";

        if (!filtradas.length) {
            elMsgVazia.classList.add("visivel");
        } else {
            elMsgVazia.classList.remove("visivel");
            filtradas.forEach(m => elLista.appendChild(renderizarCard(m)));
        }
    };

    // ─── Atualizar cards de resumo ────────────────────────────
    const atualizarResumo = () => {
        const ativas    = todasMetas.filter(m => m.status === "ativa");
        const totalObj  = ativas.reduce((s, m) => s + m.valor_objetivo,  0);
        const totalAcum = ativas.reduce((s, m) => s + m.valor_acumulado, 0);

        elMetasAtivas.textContent    = ativas.length;
        elBadgeAtivas.textContent    = `${ativas.length} ativa${ativas.length !== 1 ? "s" : ""}`;
        elTotalObjetivo.textContent  = formatBRL(totalObj);
        elTotalAcumulado.textContent = formatBRL(totalAcum);
    };

    // ─── Buscar gastos do mês atual em /despesas/ ─────────────
    const carregarGastosMes = async () => {
        try {
            const res = await fetch("/despesas/");
            if (!res.ok) return;
            const despesas = await res.json();
            const prefixo  = mesAtual();
            gastosMes = despesas
                .filter(d => d.data.startsWith(prefixo))
                .reduce((s, d) => s + parseFloat(d.valor), 0);
        } catch (err) {
            console.warn("[metas] Não foi possível carregar despesas para integração:", err);
            gastosMes = 0;
        }
    };

    // ─── Carregar tudo em paralelo ────────────────────────────
    const carregarTudo = async () => {
        await Promise.all([
            fetch("/metas/api/")
                .then(r => r.ok ? r.json() : [])
                .then(data => { todasMetas = data; }),
            carregarGastosMes()
        ]);
        atualizarResumo();
        renderizarLista();
    };

    // ─── Helper de erro ───────────────────────────────────────
    const mostrarErroMeta = (msg) => {
        elMetaFormErro.textContent = msg;
        elMetaFormErro.classList.remove("hidden");
    };

    // ─── Inicialização ────────────────────────────────────────
    elDataInicio.value = hoje();
    carregarTudo();

});