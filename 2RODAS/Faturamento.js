'use strict';

const API_FAT = 'http://localhost:8082/api/faturamento';
let grafico = null;

// ── SESSÃO ────────────────────────────────────────────────────
(function init() {
  const u = sessionStorage.getItem('usuario');
  if (!u) { window.location.href = 'Login.html'; return; }

  const dados = JSON.parse(u);
  const el = document.getElementById('usuario-nome');
  if (el) el.textContent = '👤 ' + dados.nome;

  // Seleciona mês e ano atual
  document.getElementById('filtro-mes').value = new Date().getMonth() + 1;
  document.getElementById('filtro-ano').value = new Date().getFullYear();

  carregarAtendentes();
})();

function sair() {
  sessionStorage.removeItem('usuario');
  window.location.href = 'Login.html';
}

// ── CARREGAR ATENDENTES no select ─────────────────────────────
async function carregarAtendentes() {
  try {
    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();
    const res = await fetch(`${API_FAT}?mes=${mes}&ano=${ano}`);
    if (!res.ok) return;
    const data = await res.json();
    const sel = document.getElementById('filtro-atendente');
    (data.atendentes || []).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      sel.appendChild(opt);
    });
  } catch (_) {}
}

// ── BUSCAR FATURAMENTO ────────────────────────────────────────
async function buscarFaturamento() {
  const atendente = document.getElementById('filtro-atendente').value;
  const dia       = document.getElementById('filtro-dia').value || 0;
  const mes       = document.getElementById('filtro-mes').value;
  const ano       = document.getElementById('filtro-ano').value;

  const btn = document.getElementById('btn-buscar');
  btn.innerHTML = '<span class="spinner"></span> Buscando...';
  btn.disabled = true;

  const params = new URLSearchParams();
  if (atendente)  params.append('atendente', atendente);
  if (dia > 0)    params.append('dia', dia);
  params.append('mes', mes);
  params.append('ano', ano);

  try {
    const res = await fetch(`${API_FAT}?${params}`);
    if (!res.ok) throw new Error('Erro na API');
    const data = await res.json();
    renderDados(data);
  } catch (err) {
    toast('Erro ao buscar faturamento: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Buscar Faturamento';
    btn.disabled = false;
  }
}

// ── RENDERIZAR DADOS ──────────────────────────────────────────
function renderDados(data) {
  const pedidos      = data.pedidos || [];
  const total        = data.totalGeral || 0;
  const porAtendente = data.porAtendente || {};
  const qtd          = pedidos.length;
  const media        = qtd > 0 ? total / qtd : 0;

  // Esconde estado inicial
  document.getElementById('estado-inicial').style.display = 'none';

  // Cards resumo
  document.getElementById('cards-resumo').style.display = 'grid';
  document.getElementById('card-total').textContent = formatarMoeda(total);
  document.getElementById('card-qtd').textContent   = qtd;
  document.getElementById('card-media').textContent = formatarMoeda(media);

  // Gráfico
  renderGrafico(porAtendente);

  // Cards por atendente
  const nomes = Object.keys(porAtendente);
  const grid  = document.getElementById('atendentes-grid');
  grid.innerHTML = '';

  if (nomes.length > 0) {
    document.getElementById('secao-atendentes').style.display = 'block';
    nomes.forEach(nome => {
      const initials = nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
      grid.innerHTML += `
        <div class="card-atendente">
          <div class="avatar">${initials}</div>
          <div>
            <div class="nome">${escapeHtml(nome)}</div>
            <div class="valor">${formatarMoeda(porAtendente[nome])}</div>
          </div>
        </div>`;
    });
  } else {
    document.getElementById('secao-atendentes').style.display = 'none';
  }

  // Tabela de pedidos
  document.getElementById('secao-tabela').style.display = 'block';
  document.getElementById('badge-count').textContent = qtd + ' pedido' + (qtd !== 1 ? 's' : '');

  const tbody = document.getElementById('tbody-fat');
  const vazio = document.getElementById('tabela-vazia');

  if (pedidos.length === 0) {
    tbody.innerHTML = '';
    vazio.style.display = 'block';
  } else {
    vazio.style.display = 'none';
    tbody.innerHTML = pedidos.map(p => `
      <tr>
        <td><span style="color:rgba(240,235,227,.4);font-size:.78rem">#${String(p.id).padStart(3, '0')}</span></td>
        <td><strong>${escapeHtml(p.cliente)}</strong></td>
        <td>${escapeHtml(p.atendente)}</td>
        <td>
          <div class="prato-cell">
            ${pratoIcon(p.prato)} ${escapeHtml(p.prato)}
          </div>
        </td>
        <td>${escapeHtml(p.acompanhamento || '—')}</td>
        <td style="text-align:center">${Number(p.quantidade).toFixed(1)}</td>
        <td class="valor-cell">${formatarMoeda(p.valor)}</td>
        <td style="color:rgba(240,235,227,.4);font-size:.8rem">${formatarData(p.dataPedido)}</td>
      </tr>
    `).join('');
  }

  toast('Faturamento carregado!', 'success');
}

// ── GRÁFICO ───────────────────────────────────────────────────
function renderGrafico(porAtendente) {
  const nomes  = Object.keys(porAtendente);
  const valores = Object.values(porAtendente);
  const section = document.getElementById('chart-section');

  if (nomes.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  if (grafico) { grafico.destroy(); grafico = null; }

  const cores = ['#d62828','#f3a712','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];

  grafico = new Chart(document.getElementById('grafico-atendentes'), {
    type: 'bar',
    data: {
      labels: nomes,
      datasets: [{
        label: 'Faturamento (R$)',
        data: valores,
        backgroundColor: nomes.map((_, i) => cores[i % cores.length] + 'cc'),
        borderColor:     nomes.map((_, i) => cores[i % cores.length]),
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' R$ ' + ctx.parsed.y.toFixed(2).replace('.', ',')
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af', font: { family: 'Lato' } },
          grid:  { color: 'rgba(255,255,255,.05)' }
        },
        y: {
          ticks: {
            color: '#9ca3af',
            callback: v => 'R$ ' + v.toFixed(0)
          },
          grid: { color: 'rgba(255,255,255,.05)' }
        }
      }
    }
  });
}

// ── HELPERS ───────────────────────────────────────────────────
function formatarMoeda(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function pratoIcon(p) {
  if (p && p.includes('Frango')) return '🍗';
  if (p && p.includes('Suína'))  return '🐷';
  if (p && p.includes('Bovina')) return '🥩';
  return '🍽️';
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

// ── ENTER para buscar ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') buscarFaturamento();
});