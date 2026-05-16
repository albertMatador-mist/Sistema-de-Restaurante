/* ============================================================
   ASSADOS 2 RODAS — 2rodas.js
   Interface integrada com API Java Spring Boot
   ============================================================ */

'use strict';

// Verifica se está logado
(function verificarLogin() {
  const usuario = sessionStorage.getItem('usuario');
  if (!usuario) {
    window.location.href = 'Login.html';
    return;
  }
  const dados = JSON.parse(usuario);
  const el = document.getElementById('usuario-nome');
  if (el) el.textContent = '👤 ' + dados.nome;
})();

// Função de sair
function sair() {
  sessionStorage.removeItem('usuario');
  window.location.href = 'Login.html';
}

let editandoId  = null;
let deletandoId = null;

// ── RENDER TABELA ─────────────────────────────────────────────
async function renderTabela() {
  const texto  = document.getElementById('filtro-texto').value.toLowerCase();
  const status = document.getElementById('filtro-status').value;

  const tbody    = document.getElementById('tbody');
  const msgVazio = document.getElementById('msg-vazio');

  try {
    const pedidos = await PedidoCrud.listar(texto, status);

    if (!pedidos.length) {
      tbody.innerHTML = '';
      msgVazio.classList.remove('hidden');
      return;
    }
    msgVazio.classList.add('hidden');

    // Java retorna "acompanhamento" e "quantidade" — mapeamos para o HTML
    tbody.innerHTML = pedidos.map(p => `
      <tr data-id="${p.id}">
        <td><span class="id-badge">#${String(p.id).padStart(3,'0')}</span></td>
        <td><strong>${escapeHtml(p.cliente)}</strong></td>
        <td>${escapeHtml(p.atendente)}</td>
        <td>${pratoIcon(p.prato)} ${escapeHtml(p.prato)}</td>
        <td>${acompIcon(p.acompanhamento)} ${escapeHtml(p.acompanhamento || '—')}</td>
        <td style="text-align:center; font-weight:700;">${Number(p.quantidade).toFixed(1)} kg</td>
        <td style="color: rgba(255,255,255,.55); font-size:.82rem;">${escapeHtml(p.observacoes || '—')}</td>
        <td><span class="status ${statusClass(p.status)}">${p.status}</span></td>
        <td>
          <div class="acoes">
            <button class="btn-icon btn-edit" title="Editar"  onclick="abrirModalEditar(${p.id})">✏️</button>
            <button class="btn-icon btn-del"  title="Excluir" onclick="abrirDel(${p.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    toast('Erro ao carregar pedidos: ' + err.message, 'error');
  }
}

// ── HELPERS ──────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function pratoIcon(p) {
  if (p.includes('Frango')) return '🍗';
  if (p.includes('Suína'))  return '🐷';
  if (p.includes('Bovina')) return '🥩';
  return '🍽️';
}
function acompIcon(a) {
  if (a === 'Salada de Batata') return '🥗';
  if (a === 'Maionese')         return '🫙';
  return '';
}
function statusClass(s) {
  if (s === 'Preparando') return 'status-em-preparo';
  if (s === 'Pronto')     return 'status-pronto';
  if (s === 'Retirado')   return 'status-entregue';
  return '';
}

// ── MODAL PRINCIPAL ───────────────────────────────────────────
function abrirModal() {
  editandoId = null;
  document.getElementById('modal-titulo').textContent = '+ Registrar Pedido';
  limparForm();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('form-cliente').focus();
}

async function abrirModalEditar(id) {
  try {
    const pedido = await PedidoCrud.buscar(id);
    editandoId = id;
    document.getElementById('modal-titulo').textContent = `✏️ Editar Pedido #${String(id).padStart(3,'0')}`;

    document.getElementById('form-id').value        = pedido.id;
    document.getElementById('form-cliente').value   = pedido.cliente;
    document.getElementById('form-atendente').value = pedido.atendente;
    document.getElementById('form-prato').value     = pedido.prato;
    document.getElementById('form-acomp').value     = pedido.acompanhamento || 'Nenhum';
    document.getElementById('form-qtd').value       = pedido.quantidade;
    document.getElementById('form-obs').value       = pedido.observacoes || '';
    document.getElementById('form-status').value    = pedido.status;

    document.getElementById('modal-overlay').classList.remove('hidden');
  } catch (err) {
    toast('Erro ao buscar pedido: ' + err.message, 'error');
  }
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  limparForm();
  editandoId = null;
}

function fecharModalOverlay(event) {
  if (event.target === document.getElementById('modal-overlay')) fecharModal();
}

function limparForm() {
  ['form-id','form-cliente','form-atendente','form-obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('form-prato').value  = '';
  document.getElementById('form-acomp').value  = 'Nenhum';
  document.getElementById('form-qtd').value    = '1';
  document.getElementById('form-status').value = 'Preparando';
}

// ── SALVAR (INSERT / UPDATE) ──────────────────────────────────
async function salvarPedido() {
  const cliente   = document.getElementById('form-cliente').value.trim();
  const atendente = document.getElementById('form-atendente').value.trim();
  const prato     = document.getElementById('form-prato').value;
  const acomp     = document.getElementById('form-acomp').value;
  const qtd       = parseFloat(document.getElementById('form-qtd').value.replace(',', '.'));
  const obs       = document.getElementById('form-obs').value.trim();
  const status    = document.getElementById('form-status').value;

  if (!cliente)          { toast('Informe o nome do cliente!', 'error');   document.getElementById('form-cliente').focus();   return; }
  if (!atendente)        { toast('Informe o nome do atendente!', 'error'); document.getElementById('form-atendente').focus(); return; }
  if (!prato)            { toast('Selecione um prato!', 'error');          document.getElementById('form-prato').focus();     return; }
  if (!qtd || qtd <= 0)  { toast('Informe uma quantidade válida!', 'error'); return; }

  const pedido = {
    id: editandoId,   // null = POST, número = PUT
    cliente, atendente, prato,
    acomp, qtd, obs, status
  };

  try {
    await PedidoCrud.salvar(pedido);
    toast(editandoId
      ? `Pedido #${String(editandoId).padStart(3,'0')} atualizado!`
      : 'Pedido registrado com sucesso!', 'success');
    fecharModal();
    renderTabela();
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
  }
}

// ── DELETE ────────────────────────────────────────────────────
async function abrirDel(id) {
  try {
    const pedido = await PedidoCrud.buscar(id);
    deletandoId = id;
    document.getElementById('del-desc').textContent =
      `#${String(id).padStart(3,'0')} — ${pedido.prato} (Cliente: ${pedido.cliente})`;
    document.getElementById('modal-del-overlay').classList.remove('hidden');
  } catch (err) {
    toast('Erro ao buscar pedido: ' + err.message, 'error');
  }
}

function fecharDel() {
  document.getElementById('modal-del-overlay').classList.add('hidden');
  deletandoId = null;
}

function fecharDelOverlay(event) {
  if (event.target === document.getElementById('modal-del-overlay')) fecharDel();
}

async function confirmarDelete() {
  if (deletandoId === null) return;
  try {
    await PedidoCrud.excluir(deletandoId);
    toast('Pedido excluído.', 'success');
    fecharDel();
    renderTabela();
  } catch (err) {
    toast('Erro ao excluir: ' + err.message, 'error');
  }
}

// ── TOAST ─────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${tipo}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ── TECLA ESC / CTRL+N ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { fecharModal(); fecharDel(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    abrirModal();
  }
});

function filtroRapido(status) {
  // Atualiza o select de status
  document.getElementById('filtro-status').value = status;

  // Atualiza botão ativo
  document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('ativo'));
  event.target.classList.add('ativo');

  renderTabela();
}

// ── INIT ──────────────────────────────────────────────────────
(async function init() {
  await renderTabela();
})();