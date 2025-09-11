const API_URL = `${window.location.origin}`;
document.getElementById("formCadastro").addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const mensagem = document.getElementById("mensagem");

    if (!nome || !email || !senha) {
        mensagem.textContent = "Preencha todos os campos!";
        mensagem.style.color = "red";
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/usuarios/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, email, senha })
        });

        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const resultado = await resposta.json();

        mensagem.textContent = resultado.mensagem || "Usuário cadastrado com sucesso!";
        mensagem.style.color = "green";

        document.getElementById("formCadastro").reset();

    } catch (erro) {
        console.error("Erro:", erro);
        mensagem.textContent = "Erro ao cadastrar usuário!";
        mensagem.style.color = "red";
    }
});
