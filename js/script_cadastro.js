const API_URL = "/usuarios";

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
        const resposta = await fetch(`${API_URL}/cadastro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, email, senha })
        });

        if (!resposta.ok) {
            // Tenta ler a mensagem de erro do corpo da resposta, se houver
            const erroData = await resposta.json().catch(() => null);
            const msgErro = erroData ? erroData.erro : `Erro HTTP: ${resposta.status}`;
            throw new Error(msgErro);
        }

        const resultado = await resposta.json();

        if (resultado.erro) {
            mensagem.textContent = resultado.erro;
            mensagem.style.color = "red";
        } else {
            // 1. Exibe a mensagem de sucesso
            mensagem.textContent = resultado.mensagem;
            mensagem.style.color = "green";
            
            // 2. Limpa o formulário
            document.getElementById("formCadastro").reset();

            // 3. Aguarda 2 segundos e redireciona o usuário para a página de login
            setTimeout(() => {
                window.location.href = "/usuarios/login";
            }, 2000); // 2000 milissegundos = 2 segundos
        }

    } catch (erro) {
        console.error("Erro:", erro);
        mensagem.textContent = erro.message || "Erro ao cadastrar usuário!";
        mensagem.style.color = "red";
    }
});