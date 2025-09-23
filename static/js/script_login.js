document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");
    const mensagem = document.getElementById("mensagem");

    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault(); // Impede o envio tradicional do formulário

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value.trim();

        // Limpa mensagens de erro anteriores
        mensagem.textContent = "";
        mensagem.style.color = "";

        if (!email || !senha) {
            mensagem.textContent = "Por favor, preencha todos os campos.";
            mensagem.style.color = "red";
            return;
        }

        try {
            const response = await fetch("/usuarios/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, senha }),
            });

            const resultado = await response.json();
       if (response.ok) {
                // Se o login for bem-sucedido
                mensagem.textContent = resultado.mensagem;
                mensagem.style.color = "green";
                
                // Redireciona o usuário para a página principal após 1 segundo
                setTimeout(() => {
                    window.location.href = "/pagina_inicial"; // Altere se o nome da sua página principal for outro
                }, 1000);

            } else {
                // Se houver erro (ex: email ou senha incorretos)
                mensagem.textContent = resultado.erro || "Ocorreu um erro ao tentar fazer login.";
                mensagem.style.color = "red";
            }

        } catch (error) {
            console.error("Erro na requisição:", error);
            mensagem.textContent = "Não foi possível conectar ao servidor. Tente novamente mais tarde.";
            mensagem.style.color = "red";
        }
    });
});