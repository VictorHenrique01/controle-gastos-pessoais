document.addEventListener("DOMContentLoaded", () => {
    const inputOrcamento = document.getElementById("orcamento");
    const btnSalvar = document.getElementById("salvarOrcamento");
    const spanValorOrcamento = document.getElementById("valorOrcamento");
    const spanTotalDespesas = document.getElementById("totalDespesas");
    const progresso = document.getElementById("progresso");
    const percentualGasto = document.getElementById("percentualGasto");

    let valorOrcamento = 0;
    let totalDespesas = 0;

    // ===== Funções principais =====

    // Atualiza barra de progresso e percentuais
    const atualizarStatus = () => {
        const percentual = valorOrcamento > 0 ? (totalDespesas / valorOrcamento) * 100 : 0;
        const percentualFormatado = percentual.toFixed(1);

        // Atualiza textos
        spanValorOrcamento.textContent = valorOrcamento.toFixed(2).replace('.', ',');
        spanTotalDespesas.textContent = totalDespesas.toFixed(2).replace('.', ',');
        percentualGasto.textContent = `${percentualFormatado}% do orçamento utilizado`;

        // Atualiza largura da barra
        progresso.style.width = `${Math.min(percentual, 100)}%`;

        // Altera cor da barra conforme o percentual
        if (percentual < 50) {
            progresso.style.backgroundColor = "#4CAF50"; // verde
        } else if (percentual < 80) {
            progresso.style.backgroundColor = "#FFC107"; // amarelo
        } else {
            progresso.style.backgroundColor = "#F44336"; // vermelho
        }
    };

    // Busca o orçamento atual na API
    const buscarOrcamento = async () => {
        try {
            const response = await fetch('/orcamentos/');
            if (!response.ok) {
                throw new Error('Erro ao buscar orçamento.');
            }
            const data = await response.json();
            valorOrcamento = parseFloat(data.valor || 0);
            atualizarStatus();
        } catch (error) {
            console.error('Erro ao carregar orçamento:', error);
        }
    };

    // Busca o total de despesas atual na API
    const buscarTotalDespesas = async () => {
        try {
            const response = await fetch('/despesas/');
            if (!response.ok) {
                throw new Error('Erro ao buscar despesas.');
            }
            const despesas = await response.json();
            totalDespesas = despesas.reduce((soma, item) => soma + parseFloat(item.valor), 0);
            atualizarStatus();
        } catch (error) {
            console.error('Erro ao calcular total de despesas:', error);
        }
    };

    // Envia orçamento definido pelo usuário para a API
    const salvarOrcamento = async () => {
        const novoOrcamento = parseFloat(inputOrcamento.value);

        if (isNaN(novoOrcamento) || novoOrcamento <= 0) {
            alert("Por favor, insira um valor válido para o orçamento.");
            return;
        }

        try {
            const response = await fetch('/orcamentos/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ valor: novoOrcamento })
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.erro || "Erro ao salvar orçamento.");
            }

            valorOrcamento = novoOrcamento;
            inputOrcamento.value = "";
            atualizarStatus();
            alert("Orçamento atualizado com sucesso!");

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // ===== Listeners =====

    // Clique no botão de confirmar orçamento
    btnSalvar.addEventListener("click", salvarOrcamento);

    // Atualiza o status sempre que o usuário cadastrar nova despesa
    document.addEventListener("despesaAtualizada", async () => {
        await buscarTotalDespesas();
    });

    // ===== Inicialização =====
    buscarOrcamento();
    buscarTotalDespesas();
});
