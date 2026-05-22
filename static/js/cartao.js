// /static/js/cartao.js
// Integração completa da página de parcelamentos.
//
// ENDPOINTS UTILIZADOS:
//   GET    /cartao/resumo/                  → cards do topo
//   GET    /cartao/compras/                 → lista de compras ativas
//   POST   /cartao/compras/                 → registrar nova compra
//   PATCH  /cartao/compras/<id>             → editar compra existente
//   DELETE /cartao/compras/<id>             → cancelar compra
//   PATCH  /cartao/parcelas/<id>/pagar      → marcar parcela como paga

document.addEventListener("DOMContentLoaded", () => {

    // ─── Utilitários ─────────────────────────────────────────
    const formatBRL = (valor) =>
        Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const formatData = (isoDate) => {
        const [ano, mes, dia] = isoDate.split("-");
        return `${dia}/${mes}/${ano}`;
    };

    const nomesMeses = [
        "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    // ─── Referências DOM ─────────────────────────────────────
    const elTotalMes        = document.getElementById("totalMes");
    const elTotalAtivos     = document.getElementById("totalAtivos");
    const elTotalParc       = document.getElementById("totalParcelamentos");
    const elTotalProximo    = document.getElementById("totalProximoMes");
    const elProximoLabel    = document.getElementById("proximoMesLabel");
    const elLista           = document.getElementById("lista-parcelamentos");
    const elMsgVazia        = document.getElementById("msg-vazia");
    const elCountAtivos     = document.getElementById("countAtivos");

    // Modal / form
    const modalOverlay      = document.getElementById("modal-overlay");
    const formCartao        = document.getElementById("form-cartao");
    const elModalTitulo     = document.querySelector(".modal-header h3");
    const elDescricao       = document.getElementById("fc-descricao");
    const elValor           = document.getElementById("fc-valor");
    const elParcelas        = document.getElementById("fc-parcelas");
    const elCategoria       = document.getElementById("fc-categoria");
    const elDataCompra      = document.getElementById("fc-data-compra");
    const elDiaVenc         = document.getElementById("fc-dia-vencimento");
    const elPreview         = document.getElementById("fc-preview");
    const elPreviewValor    = document.getElementById("fc-preview-valor");
    const elFormErro        = document.getElementById("form-erro");

    // Campos bloqueados na edição (valor e parcelas não podem mudar)
    const camposBloqueadosEdicao = [elValor, elParcelas, elDataCompra];

    // Estado do modal: "novo" ou "editar"
    let modoModal    = "novo";
    let editandoId   = null;
    let editandoDados = null; // dados originais da compra sendo editada

    // ─── Abrir modal para NOVA compra ────────────────────────
    document.getElementById("btnNovaCompra").addEventListener("click", () => {
        abrirModalNovo();
    });

    function abrirModalNovo() {
        modoModal  = "novo";
        editandoId = null;
        editandoDados = null;

        elModalTitulo.textContent = "Registrar compra parcelada";
        formCartao.reset();
        elPreview.classList.add("hidden");
        elFormErro.classList.add("hidden");

        // Desbloqueia campos
        camposBloqueadosEdicao.forEach(el => {
            el.disabled = false;
            el.style.opacity = "";
            el.style.cursor = "";
        });

        modalOverlay.classList.remove("hidden");
    }

    // ─── Abrir modal para EDITAR compra ──────────────────────
    function abrirModalEdicao(compra) {
        modoModal     = "editar";
        editandoId    = compra.id;
        editandoDados = compra;

        elModalTitulo.textContent = "Editar compra";
        elFormErro.classList.add("hidden");

        // Preenche campos com os dados atuais
        elDescricao.value   = compra.descricao;
        elValor.value       = compra.valor_total;
        elParcelas.value    = compra.parcelas;
        elCategoria.value   = compra.categoria;
        elDataCompra.value  = compra.data_compra;
        elDiaVenc.value     = compra.dia_vencimento;

        // Bloqueia campos que não podem ser editados
        camposBloqueadosEdicao.forEach(el => {
            el.disabled = true;
            el.style.opacity = "0.5";
            el.style.cursor  = "not-allowed";
        });

        // Preview com os valores travados
        const valorParcela = compra.valor_total / compra.parcelas;
        elPreviewValor.textContent = `${compra.parcelas}x de ${formatBRL(valorParcela)}`;
        elPreview.classList.remove("hidden");

        modalOverlay.classList.remove("hidden");
    }

    // ─── Fechar modal ─────────────────────────────────────────
    function fecharModal() {
        modalOverlay.classList.add("hidden");
        formCartao.reset();
        elPreview.classList.add("hidden");
        elFormErro.classList.add("hidden");
        camposBloqueadosEdicao.forEach(el => {
            el.disabled = false;
            el.style.opacity = "";
            el.style.cursor  = "";
        });
        modoModal     = "novo";
        editandoId    = null;
        editandoDados = null;
    }

    document.getElementById("btnFecharModal").addEventListener("click", fecharModal);
    document.getElementById("btnCancelarModal").addEventListener("click", fecharModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) fecharModal();
    });

    // ─── Preview automático de parcelas (só no modo novo) ────
    const atualizarPreviewModal = () => {
        if (modoModal === "editar") return;
        const valor    = parseFloat(elValor.value);
        const parcelas = parseInt(elParcelas.value);
        if (valor > 0 && parcelas > 0) {
            elPreviewValor.textContent = `${parcelas}x de ${formatBRL(valor / parcelas)}`;
            elPreview.classList.remove("hidden");
        } else {
            elPreview.classList.add("hidden");
        }
    };

    elValor.addEventListener("input", atualizarPreviewModal);
    elParcelas.addEventListener("change", atualizarPreviewModal);

    // ─── Submit do form ───────────────────────────────────────
    formCartao.addEventListener("submit", async (e) => {
        e.preventDefault();
        elFormErro.classList.add("hidden");

        if (modoModal === "editar") {
            await handleSalvarEdicao();
        } else {
            await handleSalvarNovo();
        }
    });

    // ─── Salvar NOVA compra ───────────────────────────────────
    async function handleSalvarNovo() {
        const descricao     = elDescricao.value.trim();
        const valor         = parseFloat(elValor.value);
        const parcelas      = parseInt(elParcelas.value);
        const categoria     = elCategoria.value;
        const dataCompra    = elDataCompra.value;
        const diaVencimento = parseInt(elDiaVenc.value);

        if (!descricao || isNaN(valor) || valor <= 0) {
            mostrarErroForm("Informe uma descrição e um valor válido."); return;
        }
        if (!parcelas || parcelas < 1 || parcelas > 12) {
            mostrarErroForm("Selecione o número de parcelas (1 a 12)."); return;
        }
        if (!categoria) {
            mostrarErroForm("Selecione uma categoria."); return;
        }
        if (!dataCompra) {
            mostrarErroForm("Informe a data da compra."); return;
        }
        if (!diaVencimento || diaVencimento < 1 || diaVencimento > 28) {
            mostrarErroForm("Informe o dia de vencimento entre 1 e 28."); return;
        }

        try {
            const res = await fetch("/cartao/compras/", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    descricao,
                    valor_total:    valor,
                    parcelas,
                    categoria,
                    data_compra:    dataCompra,
                    dia_vencimento: diaVencimento
                })
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.erro || `Erro HTTP ${res.status}`);
            }

            fecharModal();
            await carregarCompras();
            await carregarResumo();

        } catch (err) {
            console.error("[cartao] Erro ao salvar compra:", err);
            mostrarErroForm(err.message);
        }
    }

    // ─── Salvar EDIÇÃO de compra ──────────────────────────────
    async function handleSalvarEdicao() {
        const descricao     = elDescricao.value.trim();
        const categoria     = elCategoria.value;
        const diaVencimento = parseInt(elDiaVenc.value);

        if (!descricao) {
            mostrarErroForm("A descrição não pode estar vazia."); return;
        }
        if (!categoria) {
            mostrarErroForm("Selecione uma categoria."); return;
        }
        if (!diaVencimento || diaVencimento < 1 || diaVencimento > 28) {
            mostrarErroForm("Informe o dia de vencimento entre 1 e 28."); return;
        }

        // Envia apenas os campos editáveis
        const payload = { descricao, categoria, dia_vencimento: diaVencimento };

        try {
            const res = await fetch(`/cartao/compras/${editandoId}`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.erro || `Erro HTTP ${res.status}`);
            }

            fecharModal();
            await carregarCompras();
            await carregarResumo();

        } catch (err) {
            console.error("[cartao] Erro ao editar compra:", err);
            mostrarErroForm(err.message);
        }
    }

    const mostrarErroForm = (msg) => {
        elFormErro.textContent = msg;
        elFormErro.classList.remove("hidden");
    };

    // ─── Carregar resumo (cards do topo) ─────────────────────
    const carregarResumo = async () => {
        try {
            const res = await fetch("/cartao/resumo/");
            if (!res.ok) return;
            const dados = await res.json();

            elTotalMes.textContent     = formatBRL(dados.total_mes);
            elTotalParc.textContent    = formatBRL(dados.total_aberto);
            elTotalProximo.textContent = formatBRL(dados.total_proximo_mes);
            elTotalAtivos.textContent  = `${dados.compras_ativas} ativo${dados.compras_ativas !== 1 ? "s" : ""}`;

            const proximo = new Date();
            proximo.setMonth(proximo.getMonth() + 1);
            elProximoLabel.textContent = nomesMeses[proximo.getMonth()];

        } catch (err) {
            console.error("[cartao] Erro ao carregar resumo:", err);
        }
    };

    // ─── Renderizar card de compra ────────────────────────────
    const renderizarCard = (compra) => {
        const parcelasRestantes = compra.parcelas - compra.parcelas_pagas;
        const valorParcela      = compra.valor_total / compra.parcelas;
        const progresso         = Math.round((compra.parcelas_pagas / compra.parcelas) * 100);
        const quitado           = parcelasRestantes === 0;

        const card = document.createElement("div");
        card.className = "card-parcela";
        card.dataset.id = compra.id;

        const badgeClass = quitado ? "badge-parcela badge-quitado" : "badge-parcela";
        const badgeTexto = quitado
            ? "✓ Quitado"
            : `${compra.parcelas_pagas + 1}/${compra.parcelas}`;

        card.innerHTML = `
            <div class="card-parcela-header">
                <span class="card-parcela-nome">${compra.descricao}</span>
                <span class="${badgeClass}">${badgeTexto}</span>
            </div>

            <div class="card-parcela-info">
                <div class="info-item">
                    <label>Parcela</label>
                    <span class="destaque">${formatBRL(valorParcela)}</span>
                </div>
                <div class="info-item">
                    <label>Total</label>
                    <span>${formatBRL(compra.valor_total)}</span>
                </div>
                <div class="info-item">
                    <label>Vencimento</label>
                    <span>Todo dia ${compra.dia_vencimento}</span>
                </div>
                <div class="info-item">
                    <label>Compra em</label>
                    <span>${formatData(compra.data_compra)}</span>
                </div>
            </div>

            <div class="progresso-wrap">
                <div class="progresso-label">
                    <span>${compra.parcelas_pagas} de ${compra.parcelas} pagas</span>
                    <span>${progresso}%</span>
                </div>
                <div class="progresso-bar">
                    <div class="progresso-fill" style="width: ${progresso}%"></div>
                </div>
            </div>

            ${!quitado ? `
            <div class="card-acoes">
                <button class="btn-card-acao btn-editar-card" data-id="${compra.id}">Editar</button>
                <button class="btn-card-acao btn-cancelar-card" data-id="${compra.id}">Cancelar</button>
                <a href="/pagina_inicial#tabela-despesas-section" class="btn-card-acao btn-ver-despesas">📋 Ver despesas</a>
            </div>` : ""}
        `;

        // Listener Editar
        const btnEditar = card.querySelector(".btn-editar-card");
        if (btnEditar) {
            btnEditar.addEventListener("click", () => abrirModalEdicao(compra));
        }

        // Listener Cancelar
        const btnCancelar = card.querySelector(".btn-cancelar-card");
        if (btnCancelar) {
            btnCancelar.addEventListener("click", () => handleCancelar(compra.id, card));
        }

        return card;
    };

    // ─── Carregar lista de compras ────────────────────────────
    const carregarCompras = async () => {
        try {
            const res = await fetch("/cartao/compras/");
            if (!res.ok) return;
            const compras = await res.json();

            elLista.innerHTML = "";

            const ativas = compras.filter(c => c.parcelas_pagas < c.parcelas);

            if (ativas.length === 0) {
                elMsgVazia.classList.add("visivel");
                elCountAtivos.textContent = "0 compras";
            } else {
                elMsgVazia.classList.remove("visivel");
                elCountAtivos.textContent = `${ativas.length} compra${ativas.length !== 1 ? "s" : ""}`;
                ativas.forEach(c => elLista.appendChild(renderizarCard(c)));
            }

        } catch (err) {
            console.error("[cartao] Erro ao carregar compras:", err);
        }
    };

    // ─── Cancelar compra ─────────────────────────────────────
    const handleCancelar = async (compraId, cardEl) => {
        if (!confirm("Deseja cancelar este parcelamento? Todas as parcelas serão removidas.")) return;

        try {
            const res = await fetch(`/cartao/compras/${compraId}`, { method: "DELETE" });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.erro || `Erro HTTP ${res.status}`);
            }

            cardEl.remove();

            const restantes = elLista.querySelectorAll(".card-parcela").length;
            if (restantes === 0) {
                elMsgVazia.classList.add("visivel");
                elCountAtivos.textContent = "0 compras";
            } else {
                elCountAtivos.textContent = `${restantes} compra${restantes !== 1 ? "s" : ""}`;
            }

            carregarResumo();

        } catch (err) {
            console.error("[cartao] Erro ao cancelar:", err);
            alert(`Não foi possível cancelar: ${err.message}`);
        }
    };

    // ─── Inicialização ────────────────────────────────────────
    carregarResumo();
    carregarCompras();

});