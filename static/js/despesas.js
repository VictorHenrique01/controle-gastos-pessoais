document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-despesa");
    const tabela = document.getElementById("tabela-despesas");
    const corpoTabela = tabela.querySelector("tbody");
    const mensagemVazia = document.getElementById("mensagem-vazia");

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
    };

    const buscarDespesas = async () => {
        try {
            const response = await fetch('/despesas/');
            if (!response.ok) {
                throw new Error('Erro ao buscar despesas.');
            }
            const despesas = await response.json();
            renderizarDespesas(despesas);
        } catch (error) {
            console.error(error);
            alert("Não foi possível carregar as despesas.");
        }
    };

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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosDespesa)
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.erro || 'Erro ao cadastrar despesa.');
            }
            await buscarDespesas();
            form.reset();

            // 🔔 Dispara evento personalizado para o orçamento atualizar
            document.dispatchEvent(new CustomEvent("despesaAtualizada"));

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    buscarDespesas();
});
