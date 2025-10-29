document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-despesa");
    const tabela = document.getElementById("tabela-despesas");
    const corpoTabela = tabela.querySelector("tbody");
    const mensagemVazia = document.getElementById("mensagem-vazia");

    // 🔹 Filtros
    const inputBusca = document.getElementById("buscaDescricao");
    const selectCategoria = document.getElementById("filtroCategoria");
    const inputMes = document.getElementById("filtroMes");
    const btnLimpar = document.getElementById("limparFiltros");

    // 🔹 Total
    const totalElement = document.getElementById("valorTotalTabela");

    let despesasOriginais = [];

    // Função utilitária: remove acentos para comparar textos corretamente
    const normalizarTexto = (texto) =>
        texto
            ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            : "";

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
                novaLinha.innerHTML = `
                    <td>${despesa.categoria}</td>
                    <td>${despesa.descricao}</td>
                    <td>R$ ${parseFloat(despesa.valor).toFixed(2).replace('.', ',')}</td>
                    <td>${dataFormatada}</td>
                `;
                corpoTabela.appendChild(novaLinha);
            });
        }

        // Atualiza o total
        const total = despesas.reduce((soma, d) => soma + parseFloat(d.valor), 0);
        totalElement.textContent = `Total: R$ ${total.toFixed(2).replace('.', ',')}`;
    };

    const buscarDespesas = async () => {
        try {
            const response = await fetch('/despesas/');
            if (!response.ok) {
                throw new Error('Erro ao buscar despesas.');
            }
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
        const mesSelecionado = inputMes.value; // yyyy-mm

        // Filtro por descrição
        if (termoBusca) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                normalizarTexto(d.descricao).includes(termoBusca)
            );
        }

        // Filtro por categoria
        if (categoria) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                normalizarTexto(d.categoria) === categoria
            );
        }

        // Filtro por mês (formato yyyy-mm)
        if (mesSelecionado) {
            despesasFiltradas = despesasFiltradas.filter(d =>
                d.data.startsWith(mesSelecionado)
            );
        }

        renderizarDespesas(despesasFiltradas);
    };

    // 🔹 Limpar filtros
    btnLimpar.addEventListener("click", () => {
        inputBusca.value = "";
        selectCategoria.value = "";
        inputMes.value = "";
        renderizarDespesas(despesasOriginais);
    });

    // 🔹 Eventos de filtro dinâmico
    inputBusca.addEventListener("input", aplicarFiltros);
    selectCategoria.addEventListener("change", aplicarFiltros);
    inputMes.addEventListener("change", aplicarFiltros);

    // 🔹 Adicionar nova despesa
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dadosDespesa = {
            categoria: document.getElementById("categoria").value,
            valor: document.getElementById("valor").value,
            descricao: document.getElementById("descricao").value || "-",
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

            // Atualiza orçamento
            document.dispatchEvent(new CustomEvent("despesaAtualizada"));

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // 🔹 Inicializa
    buscarDespesas();
});
