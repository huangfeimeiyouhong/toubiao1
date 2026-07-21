/* =========================================================
 *  食安管理平台 · 应用主控（登录 / 路由 / 菜单）
 * ========================================================= */
const App = (function () {
  const DB = window.DB, UI = window.UI, Views = window.Views;

  const state = { role: null, roleName: '', account: '', canteenVal: 'ALL' };

  const LABELS = {
    dashboard:'数据看板', users:'用户管理', roles:'角色管理', perm:'权限管理', sys:'参数设置', business:'业务管理',
    video:'视频监控', iot:'物联网设备', alarm:'异常识别', sample:'留样管理', person:'人员信息',
    check:'晨午晚检', access:'门禁管理', ledger:'台账填报', patrol:'食安巡查', recipe:'菜谱维护',
    review_warn:'预警审核', review_patrol:'巡查审核', data_overview:'食安数据总览'
  };
  const ICONS = {
    dashboard:'dashboard', users:'users', roles:'roles', perm:'perm', sys:'sys', video:'video',
    iot:'iot', alarm:'alarm', sample:'sample', person:'person', check:'check', access:'access',
    ledger:'ledger', patrol:'patrol', recipe:'recipe', review_warn:'warn', review_patrol:'review', data_overview:'data', business:'biz'
  };

  const MENUS = {
    platform_admin: [
      { g:'控制台', items:['dashboard'] },
      { g:'业务管理', items:['business'] },
      { g:'系统管理', items:['users','roles','perm','sys'] },
      { g:'食安监管', items:['video','iot','alarm','sample','person','check','access'] },
      { g:'审核中心', items:['review_warn','review_patrol'] },
      { g:'业务填报', items:['ledger','patrol','recipe'] },
    ],
    canteen_admin: [
      { g:'工作台', items:['dashboard'] },
      { g:'本食堂管理', items:['users','roles','review_warn','review_patrol'] },
      { g:'食安监管', items:['video','sample','person','check','iot'] },
    ],
    practitioner: [
      { g:'我的工作台', items:['dashboard'] },
      { g:'我的工作', items:['sample','ledger','patrol','recipe'] },
      { g:'查看', items:['person','check','video'] },
    ],
    supervisor: [
      { g:'监管视图', items:['dashboard','data_overview'] },
      { g:'监管工具', items:['video','alarm','iot','sample','access'] },
    ],
  };

  const LOGIN_ROLES = [
    { key:'platform_admin', name:'平台管理员', desc:'参数设置 / 用户 / 角色 / 权限 / 业务及平台维护', icon:'🛡️', c:'var(--brand)', bg:'var(--brand-soft)' },
    { key:'canteen_admin', name:'食堂管理员', desc:'食堂用户 / 角色 / 预警审核 / 巡查记录审核', icon:'🏪', c:'var(--purple)', bg:'var(--purple-soft)' },
    { key:'practitioner', name:'从业人员', desc:'留样 / 台账 / 巡检 / 食安巡查 / 菜谱维护', icon:'🧑‍🍳', c:'var(--ok)', bg:'var(--ok-soft)' },
    { key:'supervisor', name:'监管用户', desc:'查看食安数据 / 视频监控', icon:'👮', c:'var(--warn)', bg:'var(--warn-soft)' },
  ];

  // 各身份默认账号（仅供演示环境使用，生产环境对接统一身份认证）
  const ACCOUNTS = {
    platform_admin: { u: 'zhangwl', p: 'Ptgl@8866' },
    canteen_admin:  { u: 'chenxf',  p: 'Stgl@2233' },
    practitioner:   { u: 'wujs',   p: 'Cyry@5577' },
    supervisor:     { u: 'sunwh',  p: 'Jgyh@1199' },
  };

  /* ---------- 登录 ---------- */
  function renderLogin() {
    const sel = UI.q('#loginRole');
    sel.innerHTML = '<option value="">请选择登录身份</option>' +
      LOGIN_ROLES.map(r => `<option value="${r.key}">${r.name}</option>`).join('');
    sel.addEventListener('change', () => prefillAccount(sel.value));

    const form = UI.q('#loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const role = UI.q('#loginRole').value;
      const user = UI.q('#loginUser').value.trim();
      const pwd = UI.q('#loginPwd').value;
      const err = UI.q('#loginErr');
      if (!role) { err.textContent = '请选择登录身份'; return; }
      if (!user) { err.textContent = '请输入账号'; UI.q('#loginUser').focus(); return; }
      if (!pwd) { err.textContent = '请输入密码'; UI.q('#loginPwd').focus(); return; }
      err.textContent = '';
      enterApp(role, user);
    });

    UI.q('#forgot').addEventListener('click', () => UI.toast('请联系系统管理员或拨打运维热线 400-xxx-xxxx 重置密码'));
    // 默认带入第一个身份的账号，便于直接登录
    sel.value = LOGIN_ROLES[0].key;
    prefillAccount(sel.value);
  }

  function prefillAccount(role) {
    const a = ACCOUNTS[role]; if (!a) return;
    UI.q('#loginUser').value = a.u;
    UI.q('#loginPwd').value = a.p;
  }

  function enterApp(role, account) {
    state.role = role;
    state.roleName = LOGIN_ROLES.find(r => r.key === role).name;
    state.account = account;
    state.canteenVal = 'ALL';
    UI.q('#login').classList.add('hidden');
    UI.q('#app').classList.remove('hidden');
    UI.q('#sideUserName').textContent = account;
    UI.q('#sideUserRole').textContent = state.roleName;
    UI.q('#sideAvatar').textContent = (account || state.roleName).slice(0, 1).toUpperCase();
    buildMenu();
    updateAlertCount();
    go('dashboard');
  }

  function buildMenu() {
    const menu = UI.q('#sideMenu');
    const items = MENUS[state.role] || [];
    menu.innerHTML = items.map(group => `<div class="menu-group">${group.g}</div>` +
      group.items.map(id => `<div class="menu-item" data-view="${id}">
        <span class="mi-icon">${UI.icon(ICONS[id])}</span><span class="mi-text">${LABELS[id]}</span></div>`).join('')
    ).join('');
    menu.addEventListener('click', (e) => {
      const it = e.target.closest('[data-view]'); if (!it) return;
      go(it.dataset.view);
    });
  }

  /* ---------- 路由 ---------- */
  function go(viewId) {
    const allowed = (MENUS[state.role] || []).flatMap(g => g.items);
    if (!Views[viewId] || !allowed.includes(viewId)) viewId = 'dashboard';
    location.hash = '#/' + viewId;
    render(viewId);
  }

  let currentView = null;
  function render(viewId) {
    UI.destroyCharts();
    if (window.Monitor && window.Monitor.timer) { clearInterval(window.Monitor.timer); window.Monitor.timer = null; }
    const view = Views[viewId];
    // 关键：#view 是常驻元素，每次渲染前用克隆节点替换自身，丢弃上一视图累积的事件监听
    const old = UI.q('#view');
    const root = old.cloneNode(false);
    old.replaceWith(root);
    root.innerHTML = view.html(state);
    UI.q('#crumb').textContent = LABELS[viewId] || '';
    UI.qa('.menu-item').forEach(m => m.classList.toggle('active', m.dataset.view === viewId));
    if (view.mount) view.mount(root, state);
    root.scrollTop = 0;
    currentView = viewId;
  }

  function onHash() {
    if (!state.role) return;
    const id = location.hash.replace('#/', '') || 'dashboard';
    if (id === currentView) return;
    render(id);
  }

  /* ---------- 顶栏动作 ---------- */
  function updateAlertCount() {
    const n = DB.alarms.filter(a => !a.handled).length;
    UI.q('#alertCount').textContent = n;
  }

  function bindTop() {
    UI.q('#menuToggle').addEventListener('click', () => {
      const sb = document.querySelector('.sidebar');
      if (window.innerWidth <= 760) sb.classList.toggle('open'); else sb.classList.toggle('collapsed');
    });
    UI.q('#btnAlert').addEventListener('click', () => go('alarm'));
    UI.q('#btnLogout').addEventListener('click', async () => {
      if (await UI.confirm('确认退出当前账号？')) {
        state.role = null; UI.q('#app').classList.add('hidden'); UI.q('#login').classList.remove('hidden');
      }
    });
    UI.q('#btnTheme').addEventListener('click', () => {
      document.body.classList.toggle('dark');
      UI.toast(document.body.classList.contains('dark') ? '已切换深色模式' : '已切换浅色模式');
    });
    const gs = UI.q('#globalSearch');
    gs.addEventListener('keydown', (e) => { if (e.key === 'Enter') openSearch(gs.value.trim()); });
  }

  function openSearch(kw) {
    if (!kw) { UI.toast('请输入搜索关键词'); return; }
    kw = kw.toLowerCase();
    const match = (v) => String(v || '').toLowerCase().includes(kw);
    const P = DB.personnel.filter(p => match(p.name) || match(p.empNo)).slice(0, 6).map(p => ({ t:`👤 ${p.name} · ${p.post} · ${DB.canteenName(p.canteen)}`, go:'person' }));
    const D = DB.iotDevices.filter(d => match(d.name) || match(d.type)).slice(0, 6).map(d => ({ t:`📡 ${d.name}`, go:'iot' }));
    const U = DB.users.filter(u => match(u.name) || match(u.username)).slice(0, 6).map(u => ({ t:`👥 ${u.name} · ${u.username}`, go:'users' }));
    const A = DB.alarms.filter(a => match(a.type) || match(a.camera)).slice(0, 6).map(a => ({ t:`🚨 ${a.type} · ${a.camera}`, go:'alarm' }));
    const all = [].concat(P, D, U, A);
    const body = all.length ? `<div class="steps" style="flex-direction:column">${all.map(r => `<div class="step" data-go="${r.go}" style="cursor:pointer;width:100%">${r.t}</div>`).join('')}</div>` : '<div class="empty">未找到匹配结果</div>';
    const m = UI.modal({ title:'全局搜索 · “' + kw + '”', size:'lg', body, footer:false });
    m.el.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) { m.close(); go(g.dataset.go); } });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    renderLogin();
    bindTop();
    window.addEventListener('hashchange', onHash);
  }

  return { state, go, refresh: () => render((location.hash.replace('#/', '')) || 'dashboard'), boot };
})();
if (typeof window !== 'undefined') window.App = App;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot());
else App.boot();
