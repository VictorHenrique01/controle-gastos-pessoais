// /static/js/cartao.js
// Integração completa da página de parcelamentos.
//
// ENDPOINTS UTILIZADOS:
//   GET  /cartao/resumo/                    → cards do topo
//   GET  /cartao/compras/                   → lista de compras ativas
//   POST /cartao/compras/                   → registrar nova compra
//   DELETE /cartao/compras/<id>             → cancelar compra
//   PATCH /cartao/parcelas/<id>/pagar       → marcar parcela como paga

document.addEventListener("DOMContentLoaded", () => {

    // ─── Utilitários ─────────────────────────────────────────
    const formatBRL = (valor) =>
        Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const formatData = (isoDate) => {
        const [ano, mes, dia] = isoDate.split("-");
        return `${dia}/${mes}/${ano}`;
    };

    const diasAteVencer = (isoDate) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const venc = new Date(isoDate + "T00:00:00");
        return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
    };

    const nomesMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
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
    const formCartao        = document.getElementById("form-cartao");
    const elDescricao       = document.getElementById("fc-descricao");
    const elValor           = document.getElementById("fc-valor");
    const elParcelas        = document.getElementById("fc-parcelas");
    const elCategoria       = document.getElementById("fc-categoria");
    const elDataCompra      = document.getElementById("fc-data-compra");
    const elDiaVenc         = document.getElementById("fc-dia-vencimento");
    const elPreview         = document.getElementById("fc-preview");
    const elPreviewValor    = document.getElementById("fc-preview-valor");
    const elFormErro        = document.getElementById("form-erro");
    const modalOverlay      = document.getElementById("modal-overlay");

    // ─── Preview automático de parcelas no modal ─────────────
    const atualizarPreviewModal = () => {
        const valor    = parseFloat(elValor.value);
        const parcelas = parseInt(elParcelas.value);

        if (valor > 0 && parcelas > 0) {
            const valorParcela = valor / parcelas;
            elPreviewValor.textContent =
                `${parcelas}x de ${formatBRL(valorParcela)}`;
            elPreview.classList.remove("hidden");
        } else {
            elPreview.classList.add("hidden");
        }
    };

    elValor.addEventListener("input", atualizarPreviewModal);
    elParcelas.addEventListener("change", atualizarPreviewModal);

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

            // Label dinâmico do card verde
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

        // Busca a próxima parcela não paga para exibir vencimento
        // O back-end não retorna parcelas individuais no GET /compras/,
        // então calculamos o vencimento estimado localmente
        const card = document.createElement("div");
        card.className = "card-parcela";
        card.dataset.id = compra.id;

        // Badge de progresso
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
            </div>` : ""}
        `;

        // Listener de cancelar
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

            // Filtra apenas compras com parcelas restantes (ativas)
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

            // Atualiza contagem e resumo
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

    // ─── Submit do form — nova compra ─────────────────────────
    formCartao.addEventListener("submit", async (e) => {
        e.preventDefault();

        elFormErro.classList.add("hidden");
        elFormErro.textContent = "";

        const descricao     = elDescricao.value.trim();
        const valor         = parseFloat(elValor.value);
        const parcelas      = parseInt(elParcelas.value);
        const categoria     = elCategoria.value;
        const dataCompra    = elDataCompra.value;
        const diaVencimento = parseInt(elDiaVenc.value);

        // Validação client-side
        if (!descricao || isNaN(valor) || valor <= 0) {
            mostrarErroForm("Informe uma descrição e um valor válido.");
            return;
        }
        if (!parcelas || parcelas < 1 || parcelas > 12) {
            mostrarErroForm("Selecione o número de parcelas (1 a 12).");
            return;
        }
        if (!categoria) {
            mostrarErroForm("Selecione uma categoria.");
            return;
        }
        if (!dataCompra) {
            mostrarErroForm("Informe a data da compra.");
            return;
        }
        if (!diaVencimento || diaVencimento < 1 || diaVencimento > 28) {
            mostrarErroForm("Informe o dia de vencimento entre 1 e 28.");
            return;
        }

        const payload = {
            descricao,
            valor_total:     valor,
            parcelas,
            categoria,
            data_compra:     dataCompra,
            dia_vencimento:  diaVencimento
        };

        try {
            const res = await fetch("/cartao/compras/", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.erro || `Erro HTTP ${res.status}`);
            }

            // Fecha modal, limpa form e recarrega
            modalOverlay.classList.add("hidden");
            formCartao.reset();
            elPreview.classList.add("hidden");

            await carregarCompras();
            await carregarResumo();

        } catch (err) {
            console.error("[cartao] Erro ao salvar compra:", err);
            mostrarErroForm(err.message);
        }
    });

    const mostrarErroForm = (msg) => {
        elFormErro.textContent = msg;
        elFormErro.classList.remove("hidden");
    };

    // Limpa erro ao fechar modal
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
            elFormErro.classList.add("hidden");
            elFormErro.textContent = "";
        }
    });

    // ─── Inicialização ────────────────────────────────────────
    carregarResumo();
    carregarCompras();

});