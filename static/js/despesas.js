//FIZ COM DICIONÁRIO PRA VER COMO IA FICAR, NÃO ESTÁ INTEGRADO COM A API


document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-despesa");
    const tabela = document.getElementById("tabela-despesas");
    const corpoTabela = tabela.querySelector("tbody");
    const mensagemVazia = document.getElementById("mensagem-vazia");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // valores do form
        const categoria = document.getElementById("categoria").value;
        const valor = document.getElementById("valor").value;
        const descricao = document.getElementById("descricao").value || "-";
        const data = document.getElementById("data").value;

        if (!categoria || !valor || !data) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }

        const novaLinha = document.createElement("tr");

        novaLinha.innerHTML = `
            <td>${categoria}</td>
            <td>${descricao}</td>
            <td>R$ ${parseFloat(valor).toFixed(2)}</td>
            <td>${data}</td>
        `;

        corpoTabela.appendChild(novaLinha);

        tabela.style.display = "table";
        mensagemVazia.style.display = "none";

        form.reset();
    });
});
