/* =========================================================
 *  通用 UI 组件库
 * ========================================================= */
const UI = (function () {
  // 菜单 / 功能图标（emoji 轻量方案，无需外部依赖）
  const ICONS = {
    dashboard:'📊', users:'👥', roles:'🛡️', perm:'🔐', sys:'⚙️',
    video:'🎥', iot:'📡', alarm:'🚨', sample:'🍱', ledger:'📒',
    patrol:'🚶', recipe:'🍳', person:'🧑‍🍳', check:'🌡️', access:'🚪',
    review:'✅', data:'📈', canteen:'🏪', warn:'⚠️', home:'🏠'
  };
  const icon = (k) => ICONS[k] || '•';

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Toast ----------
  function toast(msg, type = 'ok') {
    const root = q('#toastRoot');
    const t = document.createElement('div');
    const sym = type === 'ok' ? '✅' : type === 'err' ? '⛔' : 'ℹ️';
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${sym}</span><span>${msg}</span>`;
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-10px)'; }, 2200);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- Modal ----------
  function modal({ title, body, size, footer, onMount }) {
    const root = q('#modalRoot');
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `
      <div class="modal ${size === 'lg' ? 'lg' : ''}">
        <div class="modal-head">${title}<span class="x">×</span></div>
        <div class="modal-body">${body}</div>
        ${footer !== false ? `<div class="modal-foot">${footer || ''}</div>` : ''}
      </div>`;
    root.appendChild(mask);
    const close = () => mask.remove();
    mask.addEventListener('click', (e) => { if (e.target === mask || e.target.classList.contains('x')) close(); });
    if (onMount) onMount(mask, close);
    return { close, el: mask };
  }

  function confirm(message, { okText = '确定', danger = false } = {}) {
    return new Promise((resolve) => {
      const m = modal({
        title: '操作确认',
        body: `<p style="font-size:14px;line-height:1.7">${message}</p>`,
        footer: `<button class="btn btn-line" data-c="no">取消</button>
                 <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-c="yes">${okText}</button>`
      });
      m.el.addEventListener('click', (e) => {
        const c = e.target.dataset.c;
        if (c === 'yes') { m.close(); resolve(true); }
        if (c === 'no') { m.close(); resolve(false); }
      });
    });
  }

  // ---------- Badge ----------
  function badge(text, type = 'info') {
    const map = { ok:'b-ok', warn:'b-warn', danger:'b-danger', info:'b-info', purple:'b-purple', gray:'b-gray' };
    return `<span class="badge ${map[type] || 'b-info'}">${text}</span>`;
  }
  function statusBadge(status) {
    const m = {
      ok: ['正常','ok'], warn: ['预警','warn'], danger: ['异常','danger'],
      disabled: ['已停用','gray'], expired: ['已过期','danger'],
      handled: ['已处理','ok'], open: ['待处理','warn'], fail: ['失败','danger']
    };
    const [t, c] = m[status] || [status, 'gray'];
    return badge(`<span class="dot ${c}"></span>${t}`, c);
  }

  // ---------- Table ----------
  function table({ columns, rows, empty = '暂无数据', rowKey = 'id' }) {
    if (!rows.length) return `<div class="empty">${empty}</div>`;
    const head = columns.map(c => `<th>${c.title}</th>`).join('');
    const body = rows.map(r => {
      const tds = columns.map(c => {
        let v;
        if (c.render) v = c.render(r);
        else v = r[c.key];
        const sub = c.sub ? `<div class="cell-sub">${c.sub(r)}</div>` : '';
        return `<td>${v}${sub}</td>`;
      }).join('');
      return `<tr data-id="${r[rowKey]}">${tds}</tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  // ---------- Chart ----------
  const charts = {};
  function chart(canvasId, type, data, options = {}) {
    const cv = document.getElementById(canvasId);
    if (!cv || !window.Chart) return;
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(cv, {
      type,
      data,
      options: Object.assign({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: type === 'line' || type === 'bar' ? true : false, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }, options)
    });
  }
  function destroyCharts() { Object.values(charts).forEach(c => c.destroy()); for (const k in charts) delete charts[k]; }

  // ---------- 表单字段 ----------
  function field(label, control, full = false) {
    return `<div class="${full ? 'full' : ''}"><div class="field"><label>${label}</label>${control}</div></div>`;
  }
  const input = (name, val = '', ph = '') => `<input class="input" name="${name}" value="${val}" placeholder="${ph}" />`;
  const select = (name, opts, val = '') => {
    const os = opts.map(o => `<option value="${o.v}" ${o.v === val ? 'selected' : ''}>${o.t}</option>`).join('');
    return `<select class="select" name="${name}">${os}</select>`;
  };

  // ---------- 视频场景渲染 ----------
  function videoScene(scene, seed = 0) {
    const scenes = {
      '收餐区': ['#243b55','#141e30'],
      '烹饪区': ['#3a1c1c','#1a0d0d'],
      '仓储区': ['#1f3d2b','#0e1f16'],
      '留样间': ['#2b2b40','#14141f'],
      '洗消间': ['#173a4a','#0c1f28'],
      '出入口': ['#3a3320','#1a160c'],
      '备餐区': ['#28334d','#131a2b'],
      '粗加工': ['#33301f','#191710'],
    };
    const [c1, c2] = scenes[scene] || ['#243b55','#141e30'];
    const people = ['🧑‍🍳','🧑','👩‍🍳','🧑‍🔧'];
    const p = people[seed % people.length];
    return `<svg class="scene" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="160" height="90" fill="url(#g${seed})"/>
      <rect y="62" width="160" height="28" fill="rgba(0,0,0,.35)"/>
      <rect x="10" y="20" width="40" height="30" rx="3" fill="rgba(255,255,255,.08)"/>
      <rect x="60" y="16" width="50" height="34" rx="3" fill="rgba(255,255,255,.06)"/>
      <rect x="120" y="22" width="30" height="28" rx="3" fill="rgba(255,255,255,.08)"/>
      <text x="${20 + (seed*13)%120}" y="74" font-size="22">${p}</text>
      <circle cx="${130 - (seed*7)%90}" cy="40" r="6" fill="rgba(255,220,120,.5)"/>
    </svg>`;
  }

  return { icon, q, qa, toast, modal, confirm, badge, statusBadge, table, chart, destroyCharts, field, input, select, videoScene };
})();
if (typeof window !== 'undefined') window.UI = UI;
