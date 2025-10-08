document.addEventListener("DOMContentLoaded", () => {
    // ELEMENTOS DA PÁGINA
    const form = document.getElementById("form-despesa");
    const tabela = document.getElementById("tabela-despesas");
    const corpoTabela = tabela.querySelector("tbody");
    const mensagemVazia = document.getElementById("mensagem-vazia");
    const valorTotalTabela = document.getElementById("valorTotalTabela");

    // ELEMENTOS DO ORÇAMENTO
    const inputOrcamento = document.getElementById("orcamento");
    const btnSalvarOrcamento = document.getElementById("salvarOrcamento");
    const spanValorOrcamento = document.getElementById("valorOrcamento");
    const spanTotalDespesas = document.getElementById("totalDespesas");
    const barraProgresso = document.getElementById("progresso");
    const percentualGasto = document.getElementById("percentualGasto");

    let valorOrcamento = 0;
    let totalDespesas = 0;

    // -----------------------------
    // FUNÇÕES DE ORÇAMENTO
    // -----------------------------

    // Busca o orçamento atual na API
    const buscarOrcamento = async () => {
        try {
            const response = await fetch("/orcamentos/");
            if (!response.ok) throw new Error("Erro ao buscar orçamento.");
            const orcamentos = await response.json();

            // Usa o orçamento mais recente (caso haja mais de um)
            if (orcamentos.length > 0) {
                const ultimo = orcamentos[orcamentos.length - 1];
                valorOrcamento = parseFloat(ultimo.valor_previsto);
                spanValorOrcamento.textContent = valorOrcamento.toFixed(2).replace(".", ",");
            }
            atualizarBarraProgresso();
        } catch (error) {
            console.error("Erro ao carregar orçamento:", error);
        }
    };

    // Salva novo orçamento na API
    const salvarOrcamento = async () => {
        const valor = parseFloat(inputOrcamento.value);
        if (isNaN(valor) || valor <= 0) {
            alert("Por favor, insira um valor válido para o orçamento.");
            return;
        }

        try {
            const response = await fetch("/orcamentos/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoria: "geral",
                    valor_previsto: valor,
                    mes_referencia: new Date().toISOString().slice(0, 7),
                    valor_real: totalDespesas
                })
            });

            if (!response.ok) throw new Error("Erro ao salvar orçamento.");

            valorOrcamento = valor;
            spanValorOrcamento.textContent = valor.toFixed(2).replace(".", ",");
            inputOrcamento.value = "";
            atualizarBarraProgresso();
        } catch (error) {
            console.error("Erro ao salvar orçamento:", error);
        }
    };

    // Atualiza visualmente a barra de progresso
    const atualizarBarraProgresso = () => {
        const percentual = valorOrcamento > 0 ? (totalDespesas / valorOrcamento) * 100 : 0;
        const percentualFormatado = Math.min(percentual, 100);
        barraProgresso.style.width = `${percentualFormatado}%`;

        if (percentual >= 100) {
            barraProgresso.style.backgroundColor = "#e74c3c"; // vermelho
        } else if (percentual >= 75) {
            barraProgresso.style.backgroundColor = "#f1c40f"; // amarelo
        } else {
            barraProgresso.style.backgroundColor = "#2ecc71"; // verde
        }

        percentualGasto.textContent = `${percentual.toFixed(1)}% do orçamento utilizado`;
    };

    btnSalvarOrcamento.addEventListener("click", salvarOrcamento);

    // -----------------------------
    // FUNÇÕES DE DESPESAS
    // -----------------------------

    // Renderiza as despesas na tabela
    const renderizarDespesas = (despesas) => {
        corpoTabela.innerHTML = "";
        totalDespesas = 0;

        if (despesas.length === 0) {
            tabela.style.display = "none";
            mensagemVazia.style.display = "block";
        } else {
            tabela.style.display = "table";
            mensagemVazia.style.display = "none";

            despesas.forEach((despesa) => {
                const novaLinha = document.createElement("tr");

                const [ano, mes, dia] = despesa.data.split("-");
                const dataFormatada = `${dia}/${mes}/${ano}`;

                novaLinha.innerHTML = `
                    <td>${despesa.categoria}</td>
                    <td>${despesa.descricao}</td>
                    <td>R$ ${parseFloat(despesa.valor).toFixed(2).replace(".", ",")}</td>
                    <td>${dataFormatada}</td>
                `;
                corpoTabela.appendChild(novaLinha);

                totalDespesas += parseFloat(despesa.valor);
            });
        }

        valorTotalTabela.textContent = `R$ ${totalDespesas.toFixed(2).replace(".", ",")}`;
        spanTotalDespesas.textContent = totalDespesas.toFixed(2).replace(".", ",");
        atualizarBarraProgresso();
    };

    // Busca despesas na API
    const buscarDespesas = async () => {
        try {
            const response = await fetch("/despesas/");
            if (!response.ok) throw new Error("Erro ao buscar despesas.");
            const despesas = await response.json();
            renderizarDespesas(despesas);
        } catch (error) {
            console.error("Erro ao carregar despesas:", error);
            alert("Não foi possível carregar as despesas.");
        }
    };

    // Cadastra nova despesa
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dadosDespesa = {
            categoria: document.getElementById("categoria").value,
            valor: document.getElementById("valor").value,
            descricao: document.getElementById("descricao").value || "-",
            data: document.getElementById("data").value,
        };

        try {
            const response = await fetch("/despesas/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosDespesa),
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.erro || "Erro ao cadastrar despesa.");
            }

            buscarDespesas();
            form.reset();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // -----------------------------
    // INICIALIZAÇÃO
    // -----------------------------
    buscarDespesas();
    buscarOrcamento();
});
