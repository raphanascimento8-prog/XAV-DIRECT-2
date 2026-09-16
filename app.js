// CONFIG: cole sua URL e chave do Supabase aqui
const SB_URL = 'https://psmqzyzmargliajqzbcv.supabase.co';
const SB_ANON = 'sb_publishable_aPmhPveBgaDIjMC3bDjZ6g_Q4eLtc9o';
const sb = supabase.createClient(SB_URL, SB_ANON);

let entries = [];
let editId = null;

async function loadEntries() {
  const { data, error } = await sb.from('entries').select('*').order('category').order('name');
  if (error) { showToast('Erro ao carregar: ' + error.message); return; }
  entries = data || [];
  render(document.getElementById('search').value);
}

function setupRealtime() {
  sb.channel('entries-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => loadEntries())
    .subscribe((status) => {
      const dot = document.getElementById('statusDot');
      if (status === 'SUBSCRIBED') { dot.classList.remove('offline'); dot.title = 'Conectado — sync ativo'; }
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') { dot.classList.add('offline'); dot.title = 'Desconectado'; }
    });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function attr(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function render(filter) {
  const q = (filter || '').toLowerCase().trim();
  const container = document.getElementById('sections');
  const groups = {};
  entries.forEach(e => {
    const match = !q || e.name.toLowerCase().includes(q) || (e.description||'').toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.email||'').toLowerCase().includes(q);
    if (!match) return;
    if (!groups[e.category]) groups[e.category] = [];
    groups[e.category].push(e);
  });
  const cats = Object.keys(groups).sort();
  if (!cats.length) { container.innerHTML = ''; document.getElementById('empty').hidden = false; return; }
  document.getElementById('empty').hidden = true;
  container.innerHTML = cats.map(cat =>
    '<div class="section"><div class="section-label">' + esc(cat) + ' <span class="section-count">' + groups[cat].length + '</span></div><div class="section-cards">' + groups[cat].map(cardHtml).join('') + '</div></div>'
  ).join('');
  updateCatList();
}

function cardHtml(e) {
  const passLen = (e.pass||'').length || 8;
  let h = '<div class="card" data-id="' + e.id + '">';
  h += '<div class="card-header">';
  h += '<div class="card-icon ' + (e.color||'blue') + '">' + esc(e.icon) + '</div>';
  h += '<div><div class="card-title">' + esc(e.name) + '</div><div class="card-subtitle">' + esc(e.description) + '</div></div>';
  h += '<div class="card-header-right">';
  h += '<button class="btn-card-action" onclick="editEntry(\'' + e.id + '\')" title="Editar"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
  h += '<button class="btn-card-action delete" onclick="deleteEntry(\'' + e.id + '\')" title="Excluir"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
  h += '</div></div>';
  h += '<div class="card-fields">';
  h += '<div class="field"><span class="field-label">login</span><span class="field-value" data-val="' + attr(e.email) + '">' + esc(e.email) + '</span><button class="btn-copy" onclick="copyVal(this)">copiar</button></div>';
  h += '<div class="field"><span class="field-label">chave</span><span class="field-value masked" data-val="' + attr(e.pass) + '">' + '*'.repeat(passLen) + '</span>';
  h += '<button class="btn-toggle" onclick="toggleMask(this)"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
  h += '<button class="btn-copy" onclick="copyVal(this)">copiar</button></div></div>';
  h += '<div class="card-actions"><a class="btn-login" href="' + attr(e.url) + '" target="_blank" rel="noopener" onclick="autoCopy(this)">Acessar <svg viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a></div>';
  h += '</div>';
  return h;
}

function copyVal(btn) {
  const val = btn.closest('.field').querySelector('.field-value').dataset.val;
  navigator.clipboard.writeText(val).then(() => {
    btn.textContent = 'copiado'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'copiar'; btn.classList.remove('copied'); }, 1500);
  });
}
function toggleMask(btn) {
  const span = btn.closest('.field').querySelector('.field-value');
  if (span.classList.contains('masked')) {
    span.textContent = span.dataset.val; span.classList.remove('masked');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    span.textContent = '*'.repeat(span.dataset.val.length); span.classList.add('masked');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}
function autoCopy(btn) {
  const fields = btn.closest('.card').querySelectorAll('.field-value[data-val]');
  const val = fields.length > 1 ? fields[1].dataset.val : fields[0].dataset.val;
  navigator.clipboard.writeText(val).then(() => showToast('Chave copiada — cole no login'));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function openModal() {
  editId = null;
  document.getElementById('modalTitle').textContent = 'Novo Acesso';
  document.getElementById('btnSave').textContent = 'Salvar';
  ['fName','fDesc','fUrl','fEmail','fPass','fIcon','fCategory'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fColor').value = 'blue';
  document.getElementById('modal').classList.add('open');
  document.getElementById('fName').focus();
}
function editEntry(id) {
  const e = entries.find(x => x.id === id); if (!e) return;
  editId = id;
  document.getElementById('modalTitle').textContent = 'Editar Acesso';
  document.getElementById('btnSave').textContent = 'Atualizar';
  document.getElementById('fName').value = e.name;
  document.getElementById('fDesc').value = e.description || '';
  document.getElementById('fUrl').value = e.url || '';
  document.getElementById('fEmail').value = e.email || '';
  document.getElementById('fPass').value = e.pass || '';
  document.getElementById('fColor').value = e.color || 'blue';
  document.getElementById('fIcon').value = e.icon || '';
  document.getElementById('fCategory').value = e.category || '';
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }

async function saveEntry() {
  const name = document.getElementById('fName').value.trim();
  const category = document.getElementById('fCategory').value.trim();
  if (!name || !category) { showToast('Nome e categoria obrigatorios'); return; }
  const data = {
    name, category,
    description: document.getElementById('fDesc').value.trim(),
    url: document.getElementById('fUrl').value.trim(),
    email: document.getElementById('fEmail').value.trim(),
    pass: document.getElementById('fPass').value,
    color: document.getElementById('fColor').value,
    icon: document.getElementById('fIcon').value.trim() || name[0].toUpperCase()
  };
  if (editId) {
    const { error } = await sb.from('entries').update(data).eq('id', editId);
    if (error) { showToast('Erro: ' + error.message); return; }
    showToast('Acesso atualizado');
  } else {
    const { error } = await sb.from('entries').insert(data);
    if (error) { showToast('Erro: ' + error.message); return; }
    showToast('Acesso adicionado');
  }
  closeModal();
  await loadEntries();
}

async function deleteEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e || !confirm('Excluir "' + e.name + '"?')) return;
  const { error } = await sb.from('entries').delete().eq('id', id);
  if (error) { showToast('Erro: ' + error.message); return; }
  showToast('Acesso excluido');
  await loadEntries();
}

function updateCatList() {
  const cats = [...new Set(entries.map(e => e.category))].sort();
  document.getElementById('catList').innerHTML = cats.map(c => '<option value="' + esc(c) + '">').join('');
}

document.getElementById('search').addEventListener('input', e => render(e.target.value));
document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

loadEntries();
setupRealtime();
