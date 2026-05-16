/* ============================================================
   ASSADOS 2 RODAS — pedidoCrud.js
   Integração com API Java Spring Boot (localhost:8082)
   ============================================================ */

'use strict';

const API_URL = 'http://localhost:8082/api/pedidos';

const PedidoCrud = {

  // ── LISTAR (GET /api/pedidos) ───────────────────────────────
  async listar(texto = '', status = '') {
    const params = new URLSearchParams();
    if (texto)  params.append('texto', texto);
    if (status) params.append('status', status);

    const url = params.toString() ? `${API_URL}?${params}` : API_URL;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao listar pedidos');
    return await res.json();
  },

  // ── BUSCAR POR ID (GET /api/pedidos/{id}) ───────────────────
  async buscar(id) {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error(`Pedido #${id} não encontrado`);
    return await res.json();
  },

  // ── SALVAR (POST ou PUT) ────────────────────────────────────
  async salvar(pedido) {
    const isEdicao = pedido.id != null;
    const url    = isEdicao ? `${API_URL}/${pedido.id}` : API_URL;
    const method = isEdicao ? 'PUT' : 'POST';

    // Mapeia campos do JS para os campos do Java (acomp → acompanhamento, qtd → quantidade)
    const body = {
      cliente:        pedido.cliente,
      atendente:      pedido.atendente,
      prato:          pedido.prato,
      acompanhamento: pedido.acomp,
      quantidade:     pedido.qtd,
      observacoes:    pedido.obs || '',
      status:         pedido.status
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.erro || 'Erro ao salvar pedido');
    }
    return await res.json();
  },

  // ── EXCLUIR (DELETE /api/pedidos/{id}) ──────────────────────
  async excluir(id) {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Erro ao excluir pedido #${id}`);
  },

  // ── ATUALIZAR STATUS (PATCH /api/pedidos/{id}/status) ───────
  async atualizarStatus(id, novoStatus) {
    const res = await fetch(`${API_URL}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });
    if (!res.ok) throw new Error('Erro ao atualizar status');
    return await res.json();
  }
};