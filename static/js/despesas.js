document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-despesa");
    const tabela = document.getElementById("tabela-despesas");
    const corpoTabela = tabela.querySelector("tbody");
    const mensagemVazia = document.getElementById("mensagem-vazia");

    // 🔹 Filtros
    const inputBusca = document.getElementById("buscaDescricao");
    const selectCategoria = document.getElementById("filtroCategoria");
    const selectTipo = document.getElementById("filtroTipo");
    const inputMes = document.getElementById("filtroMes");
    const btnLimpar = document.getElementById("limparFiltros");

    // 🔹 Total
    const totalElement = document.getElementById("valorTotalTabela");

    let despesasOriginais = [];

    const normalizarTexto = (texto) =>
        texto
            ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            : "";

    const renderizarBadgeTipo = (tipo) => {
        if (tipo === "fixa") return `<span class="badge-tipo badge-fixa">Fixa</span>`;
        if (tipo === "variavel") return `<span class="badge-tipo badge-variavel">Variável</span>`;
        return `<span>—</span>`;
    };

    const renderizarDespesas = (despesas) => {
        corpoTabela.innerHTML = '';

        if (despesas.length === 0) {
            tabela.style.display = "none";
            mensagemVazia.style.display = "block";
        } else {
            tabela.style.display = "table";
            mensagemVazia.style.display = "none";

            despesas.forEach(despesa => {
                const novaLinha = document.createElement("tr");
                const [ano, mes, dia] = despesa.data.split('-');
                const dataFormatada = `${dia}/${mes}/${ano}`;

                // ✅ CORREÇÃO — grava o ID do backend direto na linha.
                // O despesas2.js lê tr.dataset.id para DELETE e PATCH.
                // Sem isso, o fetch nunca recebe um ID válido.
                novaLinha.dataset.id = despesa.id;

                // ✅ CORREÇÃO — cada <td> tem data-col com o nome do campo.
                // O despesas2.js usa td[data-col="x"] em vez de tds[índice].
                // Isso torna o código imune a qualquer reordenação de colunas.
                novaLinha.innerHTML = `
                    <td data-col="categoria">${despesa.categoria}</td>
                    <td data-col="descricao">${despesa.descricao}</td>
                    <td data-col="valor">R$ ${parseFloat(despesa.valor).toFixed(2).replace('.', ',')}</td>
                    <td data-col="tipo">${renderizarBadgeTipo(despesa.tipo)}</td>
                    <td data-col="data">${dataFormatada}</td>
                `;

                corpoTabela.appendChild(novaLinha);
            });
        }

        const total = despesas.reduce((soma, d) => soma + parseFloat(d.valor), 0);
        totalElement.textContent = `Total: R$ ${total.toFixed(2).replace('.', ',')}`;
    };

    const buscarDespesas = async () => {
        try {
            const response = await fetch('/despesas/');
            if (!response.ok) throw new Error('Erro ao buscar despesas.');
            const despesas = await response.json();
            despesasOriginais = despesas;
            renderizarDespesas(despesas);
        } catch (error) {
            console.error(error);
            alert("Não foi possível carregar as despesas.");
        }
    };

    const aplicarFiltros = () => {
        let despesasFiltradas = [...despesasOriginais];

        const termoBusca = normalizarTexto(inputBusca.value.trim());
        const categoria = normalizarTexto(selectCategoria.value);
        const tipoSelecionado = normalizarTexto(selectTipo.value);
        const mesSelecionado = inputMes.value;

        if (termoBusca) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                normalizarTexto(d.descricao).includes(termoBusca)
            );
        }

        if (categoria) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                normalizarTexto(d.categoria) === categoria
            );
        }

        if (tipoSelecionado) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                normalizarTexto(d.tipo) === tipoSelecionado
            );
        }

        if (mesSelecionado) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                d.data.startsWith(mesSelecionado)
            );
        }

        renderizarDespesas(despesasFiltradas);
    };

    btnLimpar.addEventListener("click", () => {
        inputBusca.value = "";
        selectCategoria.value = "";
        selectTipo.value = "";
        inputMes.value = "";
        renderizarDespesas(despesasOriginais);
    });

    inputBusca.addEventListener("input", aplicarFiltros);
    selectCategoria.addEventListener("change", aplicarFiltros);
    selectTipo.addEventListener("change", aplicarFiltros);
    inputMes.addEventListener("change", aplicarFiltros);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dadosDespesa = {
            categoria: document.getElementById("categoria").value,
            valor: document.getElementById("valor").value,
            descricao: document.getElementById("descricao").value || "-",
            tipo: document.getElementById("tipo").value,
            data: document.getElementById("data").value
        };

        try {
            const response = await fetch('/despesas/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosDespesa)
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.erro || 'Erro ao cadastrar despesa.');
            }

            await buscarDespesas();
            form.reset();

            document.dispatchEvent(new CustomEvent("despesaAtualizada"));

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    buscarDespesas();
});