// /static/js/despesas2.js
// Complementa despesas.js adicionando: editar, excluir.
// Também recalcula total quando necessário.

/* global fetch */

(function () {
  const q = (sel, ctx = document) => ctx.querySelector(sel);
  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const toNumber = (v) => Number(String(v).replace(",", ".")) || 0;
  const formatBRL = (v) =>
    toNumber(v).toFixed(2).replace(".", ",");

  const tabela = q("#tabela-despesas");
  if (!tabela) return;

  const tbody = tabela.querySelector("tbody");
  const thead = tabela.querySelector("thead tr");
  const tfoot = tabela.querySelector("tfoot tr");

  // ------------------ Criar coluna AÇÕES ------------------
  function ensureActionsColumn() {
    if (!thead.querySelector(".col-acoes")) {
      const th = document.createElement("th");
      th.className = "col-acoes";
      th.textContent = "Ações";
      thead.appendChild(th);
    }

    if (!tfoot.querySelector(".col-acoes-foot")) {
      const td = document.createElement("td");
      td.className = "col-acoes-foot";
      tfoot.appendChild(td);
    }
  }
  ensureActionsColumn();

  // ------------------ Painel de edição ------------------
  let editPanel = q("#form-edicao-global");
  if (!editPanel) {
    editPanel = document.createElement("div");
    editPanel.id = "form-edicao-global";
    editPanel.style.display = "none";

    editPanel.innerHTML = `
      <div class="edicao-card">
        <h3>Editar Despesa</h3>

        <label>Categoria
          <select id="editar-categoria">
            <option value="alimentacao">Alimentação</option>
            <option value="transporte">Transporte</option>
            <option value="lazer">Lazer</option>
            <option value="moradia">Moradia</option>
            <option value="outros">Outros</option>
          </select>
        </label>

        <label>Valor (R$)
          <input type="number" step="0.01" id="editar-valor">
        </label>

        <label>Descrição
          <input type="text" id="editar-descricao">
        </label>

        <label>Data
          <input type="date" id="editar-data">
        </label>

        <div class="edicao-acoes">
          <button id="salvar-edicao">Salvar</button>
          <button id="cancelar-edicao">Cancelar</button>
        </div>
      </div>
    `;

    editPanel.style.position = "fixed";
    editPanel.style.right = "24px";
    editPanel.style.top = "110px";
    editPanel.style.zIndex = 1000;
    editPanel.style.background = "#fff";
    editPanel.style.padding = "12px";
    editPanel.style.borderRadius = "8px";
    editPanel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";

    document.body.appendChild(editPanel);
  }

  let currentEditingRow = null;
  let currentEditingId = null;

  async function findItemIdFromRow(tr) {
    try {
      const res = await fetch("/despesas/");
      if (!res.ok) return null;
      const list = await res.json();

      const tds = tr.querySelectorAll("td");
      const categoria = tds[0]?.innerText.trim();
      const descricao = tds[1]?.innerText.trim();
      const valor = tds[2]?.innerText.replace("R$", "").replace(",", ".").trim();
      const dataText = tds[3]?.innerText.trim();

      const [d, m, a] = dataText.split("/");
      const dataIso = `${a}-${m}-${d}`;

      return list.find(
        (item) =>
          item.categoria === categoria &&
          item.descricao === descricao &&
          Math.abs(Number(item.valor) - Number(valor)) < 0.01 &&
          item.data.startsWith(dataIso)
      )?.id;
    } catch {
      return null;
    }
  }

  // ------------------ Botões da linha ------------------
  function addActionCell(tr) {
    if (tr.querySelector(".acao-cell")) return;

    const td = document.createElement("td");
    td.className = "acao-cell";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-acao editar";
    btnEdit.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/1160/1160515.png">`;

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-acao excluir";
    btnDelete.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/1345/1345874.png">`;

    td.appendChild(btnEdit);
    td.appendChild(btnDelete);
    tr.appendChild(td);

    btnEdit.onclick = () => openEditPanel(tr);
    btnDelete.onclick = () => handleDelete(tr);
  }

  // MutationObserver para quando novas linhas aparecerem
  new MutationObserver((mut) => {
    mut.forEach((m) =>
      m.addedNodes.forEach((node) => {
        if (node.tagName === "TR") addActionCell(node);
      })
    );
  }).observe(tbody, { childList: true });

  // ------------------ Excluir ------------------
  async function handleDelete(tr) {
    if (!confirm("Deseja excluir esta despesa?")) return;

    const id = await findItemIdFromRow(tr);

    if (id) {
      try {
        await fetch(`/despesas/${id}`, { method: "DELETE" });
        tr.remove();
        recalcTotal();
        return;
      } catch {
        // falhou → removemos localmente mesmo assim
      }
    }

    tr.remove();
    recalcTotal();
  }

  // ------------------ Editar ------------------
  function openEditPanel(tr) {
    currentEditingRow = tr;

    const tds = tr.querySelectorAll("td");

    q("#editar-categoria").value = tds[0].innerText.trim();
    q("#editar-descricao").value = tds[1].innerText.trim();

    const val = tds[2].innerText.replace("R$", "").trim().replace(",", ".");
    q("#editar-valor").value = Number(val);

    const [d, m, a] = tds[3].innerText.trim().split("/");
    q("#editar-data").value = `${a}-${m}-${d}`;

    editPanel.style.display = "block";

    findItemIdFromRow(tr).then((id) => (currentEditingId = id));
  }

  q("#cancelar-edicao").onclick = () => {
    editPanel.style.display = "none";
    currentEditingRow = null;
  };

  q("#salvar-edicao").onclick = async () => {
    if (!currentEditingRow) return;

    const categoria = q("#editar-categoria").value;
    const descricao = q("#editar-descricao").value;
    const valor = q("#editar-valor").value;
    const data = q("#editar-data").value;

    if (currentEditingId) {
      try {
        await fetch(`/despesas/${currentEditingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoria, descricao, valor, data }),
        });
        location.reload();
        return;
      } catch {}
    }

    // aplicar localmente
    const tds = currentEditingRow.querySelectorAll("td");

    tds[0].innerText = categoria;
    tds[1].innerText = descricao;
    tds[2].innerText = `R$ ${formatBRL(valor)}`;

    const [y, m, d] = data.split("-");
    tds[3].innerText = `${d}/${m}/${y}`;

    editPanel.style.display = "none";
    recalcTotal();
  };

  // ------------------ Recalcular total ------------------
  function recalcTotal() {
    let total = 0;
    qa("tbody tr").forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      const val = tds[2]?.innerText.replace("R$", "").replace(",", ".").trim();
      total += Number(val) || 0;
    });

    const totalCell = q("#valorTotalTabela");
    if (totalCell) {
      totalCell.innerHTML = `<strong>R$ ${formatBRL(total)}</strong>`;
    }
  }

  // inicial
  qa("tbody tr").forEach(addActionCell);
  setTimeout(recalcTotal, 200);
})();
