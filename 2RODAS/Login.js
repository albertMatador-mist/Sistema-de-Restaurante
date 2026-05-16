'use strict';

const API_URL = 'https://spring-boot-production-e4cd.up.railway.app/api/auth';

let modoAtual = 'login'; // 'login' ou 'cadastro'

// ── ALTERNAR entre login e cadastro ──────────────────────────
function alternarModo() {
  modoAtual = modoAtual === 'login' ? 'cadastro' : 'login';

  const camposExtra = document.getElementById('cadastro-campos');
  const btnAcao     = document.getElementById('btn-acao');
  const linkToggle  = document.getElementById('link-toggle');

  if (modoAtual === 'cadastro') {
    camposExtra.classList.add('visivel');
    btnAcao.textContent = 'Cadastrar';
    linkToggle.innerHTML = 'Já tem conta? <a href="#" onclick="alternarModo()">Entrar</a>';
  } else {
    camposExtra.classList.remove('visivel');
    btnAcao.textContent = 'Entrar';
    linkToggle.innerHTML = 'Não tem conta? <a href="#" onclick="alternarModo()">Cadastrar</a>';
  }
}

// ── EXECUTAR ação (login ou cadastro) ────────────────────────
async function executarAcao() {
  if (modoAtual === 'login') {
    await fazerLogin();
  } else {
    await fazerCadastro();
  }
}

// ── LOGIN ─────────────────────────────────────────────────────
async function fazerLogin() {
  const email = document.getElementById('input-email').value.trim();
  const senha = document.getElementById('input-senha').value;

  if (!email) { toast('Informe o email!', 'error'); return; }
  if (!senha)  { toast('Informe a senha!', 'error'); return; }

  try {
    const res = await fetch(`${API_AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.erro || 'Erro ao fazer login', 'error');
      return;
    }

    // Salva usuário na sessionStorage
    sessionStorage.setItem('usuario', JSON.stringify(data));

    toast('Login realizado! Redirecionando...', 'success');

    // Redireciona para o sistema após 1 segundo
    setTimeout(() => {
      window.location.href = '2rodas.html';
    }, 1000);

  } catch (err) {
    toast('Erro de conexão com o servidor!', 'error');
  }
}

// ── CADASTRO ──────────────────────────────────────────────────
async function fazerCadastro() {
  const email  = document.getElementById('input-email').value.trim();
  const senha  = document.getElementById('input-senha').value;
  const nome   = document.getElementById('input-nome').value.trim();
  const perfil = document.getElementById('input-perfil').value;

  if (!nome)  { toast('Informe o nome!', 'error');  return; }
  if (!email) { toast('Informe o email!', 'error'); return; }
  if (!senha || senha.length < 6) {
    toast('A senha deve ter no mínimo 6 caracteres!', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_AUTH}/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, perfil })
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.erro || 'Erro ao cadastrar', 'error');
      return;
    }

    toast('Cadastro realizado! Faça o login.', 'success');
    alternarModo(); // volta para tela de login

  } catch (err) {
    toast('Erro de conexão com o servidor!', 'error');
  }
}

async function esqueceuSenha() {
  const email = document.getElementById('input-email').value.trim();
  if (!email) { toast('Digite seu email primeiro!', 'error'); return; }
  try {
    const res = await fetch('http://localhost:8082/api/auth/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.erro, 'error'); return; }
    toast('Nova senha enviada para o seu email!', 'success');
  } catch { toast('Erro de conexão!', 'error'); }
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

// ── Enter para confirmar ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') executarAcao();
});

// ── Verifica se já está logado ────────────────────────────────
(function init() {
  const usuario = sessionStorage.getItem('usuario');
  if (usuario) {
    window.location.href = '2rodas.html';
  }
  async function esqueceuSenha() {
  const email = document.getElementById('input-email').value.trim();
  if (!email) { toast('Digite seu email primeiro!', 'error'); return; }
  try {
    const res = await fetch('http://localhost:8082/api/auth/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.erro, 'error'); return; }
    toast('Nova senha enviada para o seu email!', 'success');
  } catch {
    toast('Erro de conexão!', 'error');
  }
}
})();