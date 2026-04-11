document.addEventListener("DOMContentLoaded", () => {

    // ─── Elementos ───────────────────────────────────────────
    const checkRecorrente  = document.getElementById("checkRecorrente");
    const recorrenciaBox   = document.getElementById("recorrencia-box");
    const selectFrequencia = document.getElementById("recFrequencia");
    const inputDataInicio  = document.getElementById("recDataInicio");
    const inputDataFim     = document.getElementById("recDataFim");
    const recPreview       = document.getElementById("recPreview");
    const recPreviewLista  = document.getElementById("recPreviewLista");
    const formDespesa      = document.getElementById("form-despesa");

    // ─── Toggle do bloco colapsável ──────────────────────────
    checkRecorrente.addEventListener("change", () => {
        if (checkRecorrente.checked) {
            recorrenciaBox.classList.remove("hidden");
            recorrenciaBox.classList.add("visible");
        } else {
            recorrenciaBox.classList.remove("visible");
            recorrenciaBox.classList.add("hidden");
            recPreview.classList.add("hidden");
        }
    });

    // ─── Gerador de datas futuras ─────────────────────────────
    const gerarProximasDatas = (frequencia, dataInicio, dataFim) => {
        const datas = [];
        let atual = new Date(dataInicio + "T00:00:00");
        const fim = dataFim ? new Date(dataFim + "T00:00:00") : null;
        const MAX = 120;

        for (let i = 0; i < MAX; i++) {
            const proxima = new Date(atual);

            if (frequencia === "semanal")      proxima.setDate(proxima.getDate() + 7);
            else if (frequencia === "mensal")  proxima.setMonth(proxima.getMonth() + 1);
            else if (frequencia === "anual")   proxima.setFullYear(proxima.getFullYear() + 1);

            if (fim && proxima > fim) break;
            datas.push(proxima.toISOString().split("T")[0]);
            atual = proxima;
        }

        return datas;
    };

    // ─── Preview das próximas ocorrências ────────────────────
    const atualizarPreview = () => {
        const frequencia = selectFrequencia.value;
        const dataInicio = inputDataInicio.value;
        const dataFim    = inputDataFim.value || null;

        if (!frequencia || !dataInicio) {
            recPreview.classList.add("hidden");
            return;
        }

        const datas     = gerarProximasDatas(frequencia, dataInicio, dataFim);
        const primeiras = datas.slice(0, 5);

        recPreviewLista.innerHTML = primeiras.map(d => {
            const [ano, mes, dia] = d.split("-");
            return `<li>${dia}/${mes}/${ano}</li>`;
        }).join("");

        const restante = datas.length - primeiras.length;
        if (restante > 0) {
            recPreviewLista.innerHTML += `<li class="rec-mais">+ ${restante} ocorrência(s)...</li>`;
        }

        recPreview.classList.remove("hidden");
    };

    selectFrequencia.addEventListener("change", atualizarPreview);
    inputDataInicio.addEventListener("change", atualizarPreview);
    inputDataFim.addEventListener("change", atualizarPreview);

    // ─── Hook no submit do form-despesa ──────────────────────
    formDespesa.addEventListener("submit", (e) => {
        if (!checkRecorrente.checked) {
            formDespesa.dataset.recorrenciaPendente = "";
            return;
        }

        const frequencia = selectFrequencia.value;
        const dataInicio = inputDataInicio.value;
        const dataFim    = inputDataFim.value || null;

        if (!frequencia || !dataInicio) {
            e.preventDefault();
            alert("Preencha a frequência e a data de início da recorrência.");
            return;
        }

        formDespesa.dataset.recorrenciaPendente = JSON.stringify({
            frequencia,
            data_inicio: dataInicio,
            data_fim:    dataFim
        });
    });

    // ─── Listener do evento disparado pelo despesas.js ───────
    document.addEventListener("despesaAtualizada", async () => {
        const pendente = formDespesa.dataset.recorrenciaPendente;
        if (!pendente) return;

        formDespesa.dataset.recorrenciaPendente = "";

        let payload;
        try { payload = JSON.parse(pendente); }
        catch { return; }

        // ✅ CORREÇÃO — a lista vem ordenada por data DESC (mais recente primeiro),
        // então despesas[0] é a despesa recém-salva, não despesas[despesas.length - 1].
        try {
            const resDespesas = await fetch("/despesas/");
            if (!resDespesas.ok) throw new Error("Erro ao buscar despesas.");
            const despesas = await resDespesas.json();
            if (!despesas.length) return;

            payload.despesa_id = despesas[0].id;

        } catch (err) {
            console.error("Recorrência: não foi possível obter o ID da despesa.", err);
            return;
        }

        // Envia a recorrência para o back-end
        try {
            const res = await fetch("/recorrencias/", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            });

            if (!res.ok) {
                const erro = await res.json();
                throw new Error(erro.erro || "Erro ao salvar recorrência.");
            }

            const labels = { semanal: "Semanal", mensal: "Mensal", anual: "Anual" };
            const proximas = gerarProximasDatas(payload.frequencia, payload.data_inicio, payload.data_fim);
            let mensagemToast = `🔁 Recorrência ${labels[payload.frequencia]} salva!`;
            if (proximas.length > 0) {
                const [ano, mes, dia] = proximas[0].split("-");
                mensagemToast += ` Próxima em ${dia}/${mes}/${ano}.`;
            }

            if (typeof window.mostrarToast === "function") {
                window.mostrarToast(mensagemToast, "sucesso");
            }

            document.dispatchEvent(new CustomEvent("recorrenciaSalva"));

        } catch (err) {
            console.error(err);
            if (typeof window.mostrarToast === "function") {
                window.mostrarToast("Erro ao salvar recorrência.", "erro");
            } else {
                alert(err.message);
            }
        }

        // Reseta o bloco de recorrência
        checkRecorrente.checked = false;
        recorrenciaBox.classList.remove("visible");
        recorrenciaBox.classList.add("hidden");
        recPreview.classList.add("hidden");
        selectFrequencia.value = "";
        inputDataInicio.value  = "";
        inputDataFim.value     = "";
    });

});