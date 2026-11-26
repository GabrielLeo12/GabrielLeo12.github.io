/* Funções compartilhadas pelos dashboards do portfólio */
window.D = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = (v, d = 0) => (v == null || isNaN(v)) ? '–' : v.toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d}) + '%';
  const num = (v, d = 0) => (v == null || isNaN(v)) ? '–' : v.toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});
  // Botões de escolha única
  function seg(el, opts, val, on) {
    el.innerHTML = opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === val}">${esc(l)}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); on(b.dataset.v); };
  }
  function sel(el, opts, val, on) {
    el.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('');
    el.onchange = () => on(el.value);
  }
  // Linhas de barra. items: {lab, v, v2?, lo?, hi?, txt?, key?, on?, dim?, title?}
  function bars(el, items, {max = 100, click = false} = {}) {
    if (!items.length) { el.innerHTML = '<p class="empty">Nenhuma vaga com esses filtros.</p>'; return; }
    const w = v => Math.max(0, Math.min(100, (v / max) * 100));
    el.innerHTML = items.map(it => {
      const tag = click ? 'button type="button"' : 'div';
      const end = click ? 'button' : 'div';
      const dual = it.v2 != null;
      const ci = it.lo != null ? `<span class="ci" style="left:${w(it.lo)}%;width:${w(it.hi) - w(it.lo)}%"></span>` : '';
      return `<${tag} class="brow${it.on ? ' on' : ''}${it.dim ? ' dim' : ''}" ${it.key != null ? `data-k="${esc(it.key)}"` : ''} title="${esc(it.title || '')}">
        <span class="lab">${esc(it.lab)}</span>
        <span class="trk${dual ? ' dual' : ''}"><i style="width:${w(it.v)}%"></i>${dual ? `<i class="b2" style="width:${w(it.v2)}%"></i>` : ''}${ci}</span>
        <span class="val">${esc(it.txt ?? pct(it.v))}</span></${end}>`;
    }).join('');
  }
  async function load(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }
  function fail(el) { el.innerHTML = '<p class="empty">Não foi possível carregar os dados agora. Atualize a página para tentar de novo.</p>'; }
  return {esc, pct, num, seg, sel, bars, load, fail};
})();

/* Dashboard de vagas (dados por vaga): filtros, ranking de skills, recorte × referência, detalhe da skill com vagas reais */
D.vagas = function (cfg) {
  const $ = id => document.getElementById(id);
  const {esc, pct, num} = D;
  const C = cfg.cols;            // índices das colunas
  let data = null, sel = null, verTodas = false, mostrar = 8;
  const st = {};
  cfg.filters.forEach(f => st[f.key] = f.def ?? 'Todos');
  if (cfg.main) st[cfg.main.key] = cfg.main.def;
  st.cat = 'Todas';
  if (cfg.main) st.cmp = cfg.main.cmpDef ?? '';

  const lab = (f, v) => (f.labels && f.labels[v]) || v;
  const passa = (r, ignorar) => cfg.filters.every(f => f.key === ignorar || st[f.key] === 'Todos' || String(r[f.col]) === st[f.key]);
  const recorte = () => data.vagas.filter(r => passa(r) && (!cfg.main || r[cfg.main.col] === st[cfg.main.key]));
  const referencia = () => {
    if (cfg.main) return st.cmp ? data.vagas.filter(r => passa(r) && r[cfg.main.col] === st.cmp) : null;
    return cfg.filters.some(f => st[f.key] !== 'Todos') ? data.vagas : null;
  };
  const refNome = () => cfg.main ? (cfg.main.nomes[st.cmp] || st.cmp) : 'todas as vagas';
  const recNome = () => cfg.main ? cfg.main.nomes[st[cfg.main.key]] : 'recorte';
  const pctSkill = (vs, i) => vs.length ? vs.reduce((a, r) => a + (r[C.bits][i] === '1'), 0) / vs.length * 100 : 0;

  function montarFiltros() {
    const box = $(cfg.ids.filters);
    let html = '';
    if (cfg.main) html += `<div class="fg"><span>${esc(cfg.main.label)}</span><div class="seg" id="vf-main"></div></div>
      <div class="fg"><span>Comparar com</span><select class="dsel" id="vf-cmp"></select></div>`;
    cfg.filters.forEach(f => html += `<div class="fg"><span>${esc(f.label)}</span>${f.kind === 'sel' ? `<select class="dsel" id="vf-${f.key}"></select>` : `<div class="seg" id="vf-${f.key}"></div>`}</div>`);
    html += `<div class="fg"><span>&nbsp;</span><button type="button" class="dbtn" id="vf-limpar">Limpar filtros</button></div>`;
    box.innerHTML = html;
    if (cfg.main) {
      D.seg($('vf-main'), cfg.main.values.map(v => [v, cfg.main.curto[v]]), st[cfg.main.key], v => { st[cfg.main.key] = v; if (st.cmp === v) st.cmp = ''; opcoesCmp(); draw(); });
      opcoesCmp();
    }
    cfg.filters.forEach(f => {
      const cont = {};
      data.vagas.forEach(r => cont[r[f.col]] = (cont[r[f.col]] || 0) + 1);
      let vals = f.order ? f.order.filter(v => cont[v]) : Object.keys(cont).sort((a, b) => cont[b] - cont[a]);
      const opts = [['Todos', f.all || 'Todos'], ...vals.map(v => [String(v), f.kind === 'sel' ? `${lab(f, v)} (${cont[v]})` : lab(f, v)])];
      (f.kind === 'sel' ? D.sel : D.seg)($('vf-' + f.key), opts, st[f.key], v => { st[f.key] = v; draw(); });
    });
    $('vf-limpar').onclick = () => { cfg.filters.forEach(f => st[f.key] = 'Todos'); montarFiltros(); draw(); };
  }
  function opcoesCmp() {
    const outros = cfg.main.values.filter(v => v !== st[cfg.main.key]);
    D.sel($('vf-cmp'), [['', 'Nenhum'], ...outros.map(v => [v, cfg.main.nomes[v]])], st.cmp, v => { st.cmp = v; draw(); });
  }

  function tiles(vs) {
    const emp = new Set(vs.map(r => r[C.empresa])).size;
    const rem = vs.filter(cfg.remoto).length;
    const media = vs.length ? vs.reduce((a, r) => a + [...r[C.bits]].filter(x => x === '1').length, 0) / vs.length : 0;
    $(cfg.ids.tiles).innerHTML = [[num(vs.length), cfg.main ? `vagas de ${cfg.main.nomes[st[cfg.main.key]]}` : 'vagas neste recorte'],
      [num(emp), 'empresas diferentes'], [pct(vs.length ? rem / vs.length * 100 : 0), 'das vagas são remotas'],
      [num(media, 1), 'skills pedidas por vaga, em média']]
      .map(([b, s]) => `<div class="tile"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');
  }

  function ranking(vs, ref) {
    const cats = ['Todas', ...new Set(data.skills.map(s => s.cat))];
    D.seg($(cfg.ids.cats), cats.map(c => [c, c]), st.cat, v => { st.cat = v; verTodas = false; draw(); });
    $(cfg.ids.rankLeg).innerHTML = ref ? `<span><i style="background:var(--c)"></i>${esc(recNome() === 'recorte' ? 'Este recorte' : recNome())}</span><span><i style="background:var(--muted);opacity:.55"></i>${esc(refNome().replace(/^./, c => c.toUpperCase()))}</span>` : '';
    let it = data.skills.map((s, i) => ({i, s, v: pctSkill(vs, i), v2: ref ? pctSkill(ref, i) : null}))
      .filter(x => st.cat === 'Todas' || x.s.cat === st.cat).sort((a, b) => b.v - a.v);
    const total = it.length;
    if (!verTodas) it = it.slice(0, 15);
    const max = Math.max(10, ...it.map(x => Math.max(x.v, x.v2 || 0)));
    D.bars($(cfg.ids.rank), vs.length ? it.map(x => ({lab: x.s.nome, key: x.i, v: x.v, v2: x.v2, on: sel === x.i,
      txt: x.v2 != null ? `${pct(x.v)} · ${pct(x.v2)}` : pct(x.v),
      title: `${x.s.nome}: ${Math.round(x.v * vs.length / 100)} de ${vs.length} vagas · clique para ver as vagas`})) : [], {max: Math.ceil(max / 10) * 10, click: true});
    $(cfg.ids.mais).hidden = total <= 15;
    $(cfg.ids.mais).textContent = verTodas ? 'Mostrar só as 15 primeiras' : `Mostrar todas as ${total} skills`;
  }

  function lacunas(vs, ref) {
    const box = $(cfg.ids.gap); if (!box) return;
    const card = box.closest('.dcard');
    if (!ref || !cfg.main) { card.hidden = true; return; }
    card.hidden = false;
    $(cfg.ids.gapSub).textContent = `Skills que ${cfg.main.nomes[st.cmp]} pede bem mais que ${cfg.main.nomes[st[cfg.main.key]]} (diferença em pontos percentuais)`;
    const it = data.skills.map((s, i) => ({s, i, d: pctSkill(ref, i) - pctSkill(vs, i), a: pctSkill(vs, i), b: pctSkill(ref, i)}))
      .filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 8);
    D.bars(box, it.map(x => ({lab: x.s.nome, key: x.i, v: x.d, txt: `+${num(x.d)} p.p.`, title: `${pct(x.a)} → ${pct(x.b)}`})), {max: Math.max(10, Math.ceil((it[0]?.d || 10) / 10) * 10), click: true});
  }

  function distribuicao(vs) {
    const f = cfg.dist; const cont = {};
    vs.forEach(r => cont[r[f.col]] = (cont[r[f.col]] || 0) + 1);
    const vals = (f.order || Object.keys(cont)).filter(v => cont[v]);
    D.bars($(cfg.ids.dist), vals.map(v => ({lab: v, v: cont[v] / vs.length * 100, txt: `${pct(cont[v] / vs.length * 100)}`, title: `${cont[v]} vagas`})), {max: 100});
  }

  function estados(vs) {
    const f = cfg.filters.find(x => x.key === 'uf');
    const cont = {};
    data.vagas.filter(r => passa(r, 'uf') && (!cfg.main || r[cfg.main.col] === st[cfg.main.key])).forEach(r => cont[r[f.col]] = (cont[r[f.col]] || 0) + 1);
    const top = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = top.length ? top[0][1] : 1;
    D.bars($(cfg.ids.uf), top.map(([u, n]) => ({lab: u, key: u, v: n / max * 100, txt: num(n), on: st.uf === u, title: `${n} vagas · clique para filtrar`})), {max: 100, click: true});
  }

  function detalhe(vs) {
    const box = $(cfg.ids.det);
    if (sel == null) { box.innerHTML = '<p class="empty">Clique em uma skill do ranking para ver quais outras skills aparecem junto e a lista de vagas que pedem essa skill.</p>'; return; }
    const sk = data.skills[sel];
    const com = vs.filter(r => r[C.bits][sel] === '1');
    if (!com.length) { box.innerHTML = `<p class="empty">Nenhuma vaga deste recorte pede ${esc(sk.nome)}.</p>`; return; }
    const co = data.skills.map((s, i) => ({s, i, v: pctSkill(com, i)})).filter(x => x.i !== sel).sort((a, b) => b.v - a.v).slice(0, 8);
    const lista = com.slice().sort((a, b) => String(b[C.data]).localeCompare(String(a[C.data])));
    box.innerHTML = `<h4>${esc(sk.nome)}: ${num(com.length)} vagas (${pct(com.length / vs.length * 100)} do recorte)</h4>
      <p class="sub">Quem pede ${esc(sk.nome)} costuma pedir também:</p><div class="bars" id="vd-co"></div>
      <div class="jobs-head"><h4>Vagas que pedem ${esc(sk.nome)}</h4><span class="sub" style="margin:0">mais recentes primeiro · os links abrem a vaga no Indeed</span></div>
      <div class="jobs"><ul>${lista.slice(0, mostrar).map(r => `<li><a href="${esc(r[C.link])}" target="_blank" rel="noopener">${esc(r[C.titulo])}</a><span class="dt">${esc(String(r[C.data]).split('-').reverse().join('/'))}</span><span class="meta2">${esc(r[C.empresa])} · ${esc(r[C.local])}${cfg.extra ? ' · ' + esc(cfg.extra(r)) : ''}</span></li>`).join('')}</ul></div>
      ${lista.length > mostrar ? `<button type="button" class="dbtn" id="vd-mais" style="margin-top:12px">Mostrar mais vagas (${lista.length - mostrar} restantes)</button>` : ''}`;
    D.bars($('vd-co'), co.map(x => ({lab: x.s.nome, key: x.i, v: x.v})), {max: 100, click: true});
    $('vd-co').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { sel = +b.dataset.k; mostrar = 8; draw(); } };
    if ($('vd-mais')) $('vd-mais').onclick = () => { mostrar += 20; detalhe(vs); };
  }

  function draw() {
    const vs = recorte(), ref = referencia();
    tiles(vs); ranking(vs, ref); lacunas(vs, ref); if (cfg.dist) distribuicao(vs); estados(vs); detalhe(vs);
  }

  $(cfg.ids.rank).onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; sel = +b.dataset.k; mostrar = 8; draw(); $(cfg.ids.det).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest'}); };
  if ($(cfg.ids.gap)) $(cfg.ids.gap).onclick = $(cfg.ids.rank).onclick;
  $(cfg.ids.uf).onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; st.uf = st.uf === b.dataset.k ? 'Todos' : b.dataset.k; $('vf-uf').value = st.uf; draw(); };
  $(cfg.ids.mais).onclick = () => { verTodas = !verTodas; draw(); };
  D.load(cfg.url).then(j => { data = j; sel = cfg.selDef != null ? data.skills.findIndex(s => s.nome === cfg.selDef) : null; montarFiltros(); draw(); }).catch(e => { console.error(e); D.fail($(cfg.ids.root)); });
};
