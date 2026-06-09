// /static/js/relatorio.js
// Função pura de relatório — CSV e JSON da tabela filtrada.

/* global document */

(function () {
  const q = (s, ctx = document) => ctx.querySelector(s);
  const tabela = q("#tabela-despesas");
  if (!tabela) return;

  const tbody = tabela.querySelector("tbody");

  function getVisibleRows() {
    return Array.from(tbody.querySelectorAll("tr"));
  }

  function toCSV() {
    const rows = getVisibleRows();
    const csv = [];
    csv.push(["Categoria", "Descricao", "Valor", "Data"]);

    rows.forEach((r) => {
      const tds = r.querySelectorAll("td");
      csv.push([
        tds[0]?.innerText.trim(),
        tds[1]?.innerText.trim(),
        tds[2]?.innerText.replace("R$", "").trim(),
        tds[3]?.innerText.trim(),
      ]);
    });

    return csv.map((l) => l.map((c) => `"${c}"`).join(",")).join("\n");
  }

  function toJSON() {
    const rows = getVisibleRows();
    return JSON.stringify(
      rows.map((r) => {
        const tds = r.querySelectorAll("td");
        return {
          categoria: tds[0]?.innerText.trim(),
          descricao: tds[1]?.innerText.trim(),
          valor: Number(tds[2]?.innerText.replace("R$", "").replace(",", ".")),
          data: tds[3]?.innerText.trim(),
        };
      }),
      null,
      2
    );
  }

  function createButtons() {
    if (q("#btn-gerar-relatorio")) return;

    const container =
      q(".filtro-container") || tabela.parentElement;

    const div = document.createElement("div");
    div.className = "gerar-relatorio-wrap";

    div.innerHTML = `
      <button id="btn-gerar-relatorio" class="btn-primary small">
        Gerar Relatório
      </button>

      <div id="relatorio-opcoes" style="display:none;">
        <button id="relatorio-csv" class="btn-outline small">CSV</button>
        <button id="relatorio-json" class="btn-outline small">JSON</button>
      </div>
    `;

    container.appendChild(div);

    q("#btn-gerar-relatorio").onclick = () => {
      const box = q("#relatorio-opcoes");
      box.style.display = box.style.display === "none" ? "block" : "none";
    };

    q("#relatorio-csv").onclick = () => {
      const blob = new Blob([toCSV()], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "relatorio_despesas.csv";
      a.click();
    };

    q("#relatorio-json").onclick = () => {
      const blob = new Blob([toJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "relatorio_despesas.json";
      a.click();
    };
  }

  createButtons();
})();
