// /static/js/despesas2.js
// Complementa despesas.js adicionando: editar, excluir, recalcular total.
//
// ARQUITETURA:
//   - O ID de cada despesa é lido de tr.dataset.id (gravado pelo despesas.js).
//   - Nenhuma dedução de ID por comparação de texto ou fetch adicional.
//   - DELETE e PATCH só são executados se o ID estiver disponível.
//   - A coluna "ações" é adicionada via JS e é estável a qualquer reordenação.

/* global fetch */

(function () {
  // ─── Utilitários ────────────────────────────────────────────────────────────
  const q   = (sel, ctx = document) => ctx.querySelector(sel);
  const qa  = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const toNumber  = (v) => Number(String(v).replace(",", ".")) || 0;
  const formatBRL = (v) => toNumber(v).toFixed(2).replace(".", ",");

  // ─── Referências da tabela ──────────────────────────────────────────────────
  const tabela = q("#tabela-despesas");
  if (!tabela) return;

  const tbody = tabela.querySelector("tbody");
  const thead = tabela.querySelector("thead tr");
  const tfoot = tabela.querySelector("tfoot tr");

  // Mapeamento de colunas por data-col — independente da ordem física.
  // O despesas.js deve gravar o atributo data-col em cada <td>.
  // Ex: <td data-col="categoria">alimentacao</td>
  // Isso torna o código imune a qualquer reordenação futura de colunas.
  const getCol = (tr, colName) =>
    tr.querySelector(`td[data-col="${colName}"]`)?.innerText.trim() ?? "";


  // ─── Coluna AÇÕES ────────────────────────────────────────────────────────────
  function ensureActionsColumn() {
    if (!thead.querySelector(".col-acoes")) {
      const th = document.createElement("th");
      th.className = "col-acoes";
      th.textContent = "Ações";
      thead.appendChild(th);
    }
    if (tfoot && !tfoot.querySelector(".col-acoes-foot")) {
      const td = document.createElement("td");
      td.className = "col-acoes-foot";
      tfoot.appendChild(td);
    }
  }
  ensureActionsColumn();


  // ─── Painel de edição ────────────────────────────────────────────────────────
  let editPanel = q("#form-edicao-global");
  if (!editPanel) {
    editPanel = document.createElement("div");
    editPanel.id = "form-edicao-global";
    editPanel.style.cssText = `
      display:none; position:fixed; right:24px; top:110px; z-index:1000;
      background:#fff; padding:16px; border-radius:8px;
      box-shadow:0 6px 18px rgba(0,0,0,0.15); min-width:260px;
    `;
    editPanel.innerHTML = `
      <div class="edicao-card">
        <h3 style="margin:0 0 12px">Editar Despesa</h3>

        <label>Categoria
          <select id="editar-categoria">
            <option value="alimentacao">Alimentação</option>
            <option value="transporte">Transporte</option>
            <option value="lazer">Lazer</option>
            <option value="moradia">Moradia</option>
            <option value="outros">Outros</option>
          </select>
        </label>

        <label>Tipo
          <select id="editar-tipo">
            <option value="fixa">Fixa</option>
            <option value="variavel">Variável</option>
          </select>
        </label>

        <label>Descrição
          <input type="text" id="editar-descricao">
        </label>

        <label>Valor (R$)
          <input type="number" step="0.01" id="editar-valor">
        </label>

        <label>Data
          <input type="date" id="editar-data">
        </label>

        <div class="edicao-acoes" style="margin-top:12px; display:flex; gap:8px;">
          <button id="salvar-edicao">Salvar</button>
          <button id="cancelar-edicao">Cancelar</button>
        </div>

        <p id="edicao-erro" style="color:red; margin:8px 0 0; display:none;"></p>
      </div>
    `;
    document.body.appendChild(editPanel);
  }

  let currentEditingRow = null;
  let currentEditingId  = null;


  // ─── Adicionar célula de ações na linha ──────────────────────────────────────
  function addActionCell(tr) {
    if (tr.querySelector(".acao-cell")) return;

    const td = document.createElement("td");
    td.className = "acao-cell";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-acao editar";
    btnEdit.title = "Editar";
    btnEdit.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/1160/1160515.png" width="18">`;

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-acao excluir";
    btnDelete.title = "Excluir";
    btnDelete.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/1345/1345874.png" width="18">`;

    td.appendChild(btnEdit);
    td.appendChild(btnDelete);
    tr.appendChild(td);

    btnEdit.addEventListener("click", () => openEditPanel(tr));
    btnDelete.addEventListener("click", () => handleDelete(tr));
  }


  // ─── MutationObserver: aplica ações em novas linhas automaticamente ──────────
  new MutationObserver((mutations) => {
    mutations.forEach((m) =>
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.tagName === "TR") {
          addActionCell(node);
        }
      })
    );
    recalcTotal();
  }).observe(tbody, { childList: true });


  // ─── EXCLUIR ─────────────────────────────────────────────────────────────────
  async function handleDelete(tr) {
    // ✅ ID lido diretamente do atributo data-id da linha.
    // Nunca deduzido por comparação de texto.
    const id = tr.dataset.id;

    if (!id) {
      console.error("[despesas2] tr sem data-id. Verifique o despesas.js.");
      alert("Erro interno: ID da despesa não encontrado. Recarregue a página.");
      return;
    }

    if (!confirm("Deseja excluir esta despesa?")) return;

    try {
      const res = await fetch(`/despesas/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }

      // Só remove visualmente após confirmação do backend.
      tr.remove();
      recalcTotal();

    } catch (err) {
      console.error("[despesas2] Erro ao excluir:", err);
      alert(`Não foi possível excluir a despesa: ${err.message}`);
      // ⚠️ Linha NÃO é removida se o backend falhar.
    }
  }


  // ─── EDITAR — abrir painel ────────────────────────────────────────────────────
  function openEditPanel(tr) {
    // ✅ ID lido diretamente do atributo data-id da linha.
    const id = tr.dataset.id;

    if (!id) {
      console.error("[despesas2] tr sem data-id. Verifique o despesas.js.");
      alert("Erro interno: ID da despesa não encontrado. Recarregue a página.");
      return;
    }

    currentEditingRow = tr;
    currentEditingId  = id;

    // Lê valores usando data-col — imune à ordem física das colunas.
    q("#editar-categoria").value = getCol(tr, "categoria");
    q("#editar-tipo").value      = getCol(tr, "tipo");
    q("#editar-descricao").value = getCol(tr, "descricao");

    const valorRaw = getCol(tr, "valor")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    q("#editar-valor").value = Number(valorRaw) || "";

    // Converte dd/mm/aaaa → aaaa-mm-dd para o input[type=date]
    const dataTexto = getCol(tr, "data");
    const [d, m, a] = dataTexto.split("/");
    q("#editar-data").value = (a && m && d) ? `${a}-${m}-${d}` : "";

    // Limpa erro anterior
    const erroEl = q("#edicao-erro");
    erroEl.style.display = "none";
    erroEl.textContent = "";

    editPanel.style.display = "block";
  }


  // ─── EDITAR — cancelar ───────────────────────────────────────────────────────
  q("#cancelar-edicao").addEventListener("click", () => {
    editPanel.style.display = "none";
    currentEditingRow = null;
    currentEditingId  = null;
  });


  // ─── EDITAR — salvar ─────────────────────────────────────────────────────────
  q("#salvar-edicao").addEventListener("click", async () => {
    if (!currentEditingRow || !currentEditingId) return;

    const categoria = q("#editar-categoria").value;
    const tipo      = q("#editar-tipo").value;
    const descricao = q("#editar-descricao").value.trim();
    const valor     = parseFloat(q("#editar-valor").value);
    const data      = q("#editar-data").value;

    // Validação básica
    if (!descricao || isNaN(valor) || !data) {
      const erroEl = q("#edicao-erro");
      erroEl.textContent = "Preencha todos os campos corretamente.";
      erroEl.style.display = "block";
      return;
    }

    const payload = { categoria, tipo, descricao, valor, data };

    try {
      const res = await fetch(`/despesas/${currentEditingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }

      // ✅ Atualiza a linha visualmente via data-col — sem reload.
      const tr = currentEditingRow;

      const set = (col, val) => {
        const td = tr.querySelector(`td[data-col="${col}"]`);
        if (td) td.innerText = val;
      };

      set("categoria", categoria);
      set("tipo",      tipo);
      set("descricao", descricao);
      set("valor",     `R$ ${formatBRL(valor)}`);

      const [y, mo, dy] = data.split("-");
      set("data", `${dy}/${mo}/${y}`);

      editPanel.style.display = "none";
      currentEditingRow = null;
      currentEditingId  = null;
      recalcTotal();

    } catch (err) {
      console.error("[despesas2] Erro ao editar:", err);
      const erroEl = q("#edicao-erro");
      erroEl.textContent = `Erro ao salvar: ${err.message}`;
      erroEl.style.display = "block";
    }
  });


  // ─── Recalcular total ────────────────────────────────────────────────────────
  function recalcTotal() {
    let total = 0;

    qa("tbody tr", tabela).forEach((tr) => {
      const td = tr.querySelector(`td[data-col="valor"]`);
      if (!td) return;
      const val = td.innerText
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();
      total += Number(val) || 0;
    });

    const totalCell = q("#valorTotalTabela");
    if (totalCell) {
      totalCell.innerHTML = `<strong>R$ ${formatBRL(total)}</strong>`;
    }
  }


  // ─── Inicialização ───────────────────────────────────────────────────────────
  qa("tbody tr", tabela).forEach(addActionCell);
  setTimeout(recalcTotal, 200);

})();