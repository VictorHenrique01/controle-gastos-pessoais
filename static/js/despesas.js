document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-despesa");
    const tabela = document.getElementById("tabela-despesas");
    const corpoTabela = tabela.querySelector("tbody");
    const mensagemVazia = document.getElementById("mensagem-vazia");

    // Função para renderizar as despesas na tabela
    const renderizarDespesas = (despesas) => {
        // Limpa a tabela antes de adicionar novas linhas
        corpoTabela.innerHTML = '';

        if (despesas.length === 0) {
            tabela.style.display = "none";
            mensagemVazia.style.display = "block";
        } else {
            tabela.style.display = "table";
            mensagemVazia.style.display = "none";

            despesas.forEach(despesa => {
                const novaLinha = document.createElement("tr");
                
                // Formata a data para o padrão brasileiro (dd/mm/yyyy)
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

    // Função para buscar as despesas do usuário na API
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

    // Event listener para o formulário de envio
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

            // Se o cadastro foi bem-sucedido, busca e renderiza a lista atualizada
            buscarDespesas(); 
            form.reset();

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // Chama a função para buscar e exibir as despesas ao carregar a página
    buscarDespesas();
});