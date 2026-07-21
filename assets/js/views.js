/* =========================================================
 *  食安管理平台 · 业务视图层
 *  每个视图返回 { html(state), mount(root, state) }
 * ========================================================= */
(function () {
  const DB = window.DB, UI = window.UI;
  const H = DB.helpers;

  /* ---------- 运行时补充的业务集合（台账 / 巡查 / 菜谱） ---------- */
  DB.patrols = (function () {
    const arr = []; let i = 1;
    DB.canteens.forEach(c => {
      for (let d = 0; d < 5; d++) {
        const ok = Math.random() > 0.4;
        arr.push({
          id: 'PT' + i++, date: H.fmtDate(H.daysAgo(d)), canteen: c.id,
          area: H.pick(['烹饪区','仓储区','洗消间','留样间','备餐区','粗加工']),
          inspector: H.pick(DB.users.filter(u => u.canteen === c.id).map(u => u.name).concat(['张建国'])),
          score: ok ? H.rnd(85, 99) : H.rnd(60, 84),
          status: ok ? 'ok' : 'warn', reviewed: Math.random() > 0.5,
          issue: ok ? '无' : '地面油污未清理 / 餐具存放不规范'
        });
      }
    });
    return arr;
  })();
  DB.ledgers = [
    { id:'L1', date:H.fmtDate(H.daysAgo(0)), canteen:'C1', type:'餐具消毒', item:'热力消毒柜 120℃ 30min', operator:'王磊', result:'ok' },
    { id:'L2', date:H.fmtDate(H.daysAgo(0)), canteen:'C1', type:'环境消毒', item:'地面/台面含氯消毒液擦拭', operator:'李秀兰', result:'ok' },
    { id:'L3', date:H.fmtDate(H.daysAgo(1)), canteen:'C2', type:'餐具消毒', item:'蒸汽消毒 100℃ 15min', operator:'陈芳', result:'ok' },
    { id:'L4', date:H.fmtDate(H.daysAgo(2)), canteen:'C3', type:'晨检台账', item:'从业人员健康状态登记', operator:'赵强', result:'warn' },
  ];
  DB.recipes = [
    { id:'R1', date:H.fmtDate(H.daysAgo(0)), canteen:'C1', breakfast:'小米粥 / 馒头 / 煮蛋', lunch:'红烧肉 / 清蒸鲈鱼 / 蒜蓉西兰花 / 米饭', dinner:'番茄炒蛋 / 麻婆豆腐 / 紫菜蛋花汤' },
    { id:'R2', date:H.fmtDate(H.daysAgo(0)), canteen:'C2', breakfast:'豆浆 / 油条 / 茶叶蛋', lunch:'宫保鸡丁 / 白切鸡 / 酸辣土豆丝 / 米饭', dinner:'糖醋排骨 / 凉拌黄瓜 / 冬瓜排骨汤' },
    { id:'R3', date:H.fmtDate(H.daysAgo(1)), canteen:'C1', breakfast:'白粥 / 包子 / 咸菜', lunch:'小炒黄牛肉 / 麻婆豆腐 / 清炒时蔬 / 米饭', dinner:'红烧肉 / 番茄炒蛋 / 紫菜蛋花汤' },
  ];

  /* ---------- 通用工具 ---------- */
  function canteenFilter(val) {
    const opts = [{ v: 'ALL', t: '全部食堂' }].concat(DB.canteens.map(c => ({ v: c.id, t: c.name })));
    return `<select class="select" data-filter="canteen">${opts.map(o => `<option value="${o.v}" ${o.v === val ? 'selected' : ''}>${o.t}</option>`).join('')}</select>`;
  }
  const applyCanteen = (rows, v) => v === 'ALL' ? rows : rows.filter(r => r.canteen === v);
  const canteenName = DB.canteenName;

  /* =========================================================
   *  通用数据视图工厂（列表 + 筛选 + 新增/批量 + 行操作）
   * ========================================================= */
  function DataView(cfg) {
    function renderList(state, filters) {
      let rows = cfg.getRows(state, filters);
      if (filters.kw && cfg.searchFields) {
        rows = rows.filter(r => cfg.searchFields.some(k => String(r[k] || '').toLowerCase().includes(filters.kw)));
      }
      if (filters.extra) rows = cfg.extraFilter ? cfg.extraFilter(rows, filters.extra) : rows;
      const cols = cfg.columns.concat(cfg.actions ? [{
        title: '操作', key: '__act',
        render: (r) => `<div class="actions-cell">${cfg.actions.map(a => (a.show && !a.show(r)) ? '' :
          `<button class="btn btn-sm ${a.cls || 'btn-line'}" data-act="${a.action}" data-id="${r[cfg.rowKey]}">${a.icon || ''} ${a.label}</button>`).join('')}</div>`
      }] : []);
      return UI.table({ columns: cols, rows, empty: cfg.empty || '暂无数据' });
    }

    return {
      html(state) {
        const f = { canteen: App.state.canteenVal, kw: '', extra: cfg.extraOptions ? cfg.extraOptions[0].v : '' };
        const toolbar = `<div class="toolbar">
          ${cfg.hideCanteen ? '' : canteenFilter(f.canteen)}
          ${cfg.extraOptions ? `<select class="select" data-filter="extra">${cfg.extraOptions.map(o => `<option value="${o.v}">${o.t}</option>`).join('')}</select>` : ''}
          <input class="input" data-filter="kw" placeholder="搜索…" style="min-width:170px"/>
          <div class="spacer"></div>
          ${cfg.batchLabel ? `<button class="btn btn-soft" data-act="batch">${cfg.batchLabel}</button>` : ''}
          ${cfg.addLabel ? `<button class="btn btn-primary" data-act="add">＋ ${cfg.addLabel}</button>` : ''}
        </div>`;
        return `<div class="view-narrow">
          <div class="card">
            <div class="card-head"><h3>${UI.icon(cfg.icon || 'home')} ${cfg.title} ${cfg.sub ? `<span class="ch-sub">${cfg.sub}</span>` : ''}</h3></div>
            <div class="card-pad">
              ${toolbar}
              <div id="listArea">${renderList(state, f)}</div>
            </div>
          </div></div>`;
      },
      mount(root, state) {
        const listArea = UI.q('#listArea', root);
        const getFilters = () => ({
          canteen: UI.q('[data-filter="canteen"]', root) ? UI.q('[data-filter="canteen"]', root).value : 'ALL',
          kw: (UI.q('[data-filter="kw"]', root) ? UI.q('[data-filter="kw"]', root).value : '').trim().toLowerCase(),
          extra: UI.q('[data-filter="extra"]', root) ? UI.q('[data-filter="extra"]', root).value : ''
        });
        const draw = () => { listArea.innerHTML = renderList(state, getFilters()); };

        UI.qa('[data-filter]', root).forEach(el => {
          el.addEventListener('change', draw);
          if (el.dataset.filter === 'kw') el.addEventListener('input', draw);
        });

        root.addEventListener('click', async (e) => {
          const btn = e.target.closest('[data-act]'); if (!btn) return;
          const act = btn.dataset.act, id = btn.dataset.id;
          if (act === 'add') return openForm('add');
          if (act === 'batch') return openBatch();
          if (act === 'del') {
            if (await UI.confirm('确认删除该记录？此操作不可撤销。', { danger: true })) {
              cfg.onDelete(state, id); draw(); UI.toast('已删除记录');
            }
            return;
          }
          if (cfg.onAction) await cfg.onAction(state, act, id, draw);
        });

        function openForm(kind, preset) {
          const fields = cfg.addFields(state, preset);
          const body = `<form class="form-grid" id="frm">${fields.map(fl => `<div class="${fl.full ? 'full' : ''}"><div class="field"><label>${fl.label}</label>${fl.control}</div></div>`).join('')}</form>`;
          const m = UI.modal({
            title: (kind === 'add' ? '新增' : '编辑') + ' · ' + cfg.title,
            body, size: cfg.modalSize,
            footer: `<button class="btn btn-line" data-c="no">取消</button><button class="btn btn-primary" data-c="yes">保存</button>`
          });
          m.el.addEventListener('click', (e) => {
            if (e.target.dataset.c === 'yes') {
              const form = UI.q('#frm', m.el);
              const vals = {};
              UI.qa('[name]', form).forEach(inp => vals[inp.name] = inp.value);
              if (cfg.onAdd(state, vals, kind, id_preset(preset))) { m.close(); draw(); UI.toast('保存成功'); }
            }
            if (e.target.dataset.c === 'no') m.close();
          });
        }
        function id_preset(p){ return p ? p.id : null; }
        function openBatch() {
          const body = `<div class="field"><label>批量录入数量</label><input class="input" id="bc" type="number" value="5" min="1" max="50"/></div>
            <div class="hint">系统将依据食堂与岗位规则自动生成从业人员信息（含健康证），支持批量导入。</div>`;
          const m = UI.modal({ title: cfg.batchLabel, body, footer: `<button class="btn btn-line" data-c="no">取消</button><button class="btn btn-primary" data-c="yes">生成并录入</button>` });
          m.el.addEventListener('click', async (e) => {
            if (e.target.dataset.c === 'yes') {
              const n = Math.max(1, Math.min(50, +UI.q('#bc', m.el).value || 5));
              const cnt = cfg.onBatch(state, n); m.close(); draw(); UI.toast(`已批量录入 ${cnt} 条记录`);
            }
            if (e.target.dataset.c === 'no') m.close();
          });
        }
      }
    };
  }

  /* =========================================================
   *  1) 数据看板
   * ========================================================= */
  const dashboard = {
    html(state) {
      const s = DB.stats;
      const kpis = [
        { t:'接入食堂', v:s.canteens, ico:'🏪', c:'info', foot:'覆盖全部餐饮点位' },
        { t:'物联设备', v:s.devices, ico:'📡', c:'purple', foot:`在线 ${s.devicesOnline} · 异常 ${s.devicesAlarm}` },
        { t:'今日报警', v:s.alarmsToday, ico:'🚨', c:'danger', foot:`累计 ${s.alarmsTotal} 条 AI 识别` },
        { t:'留样总数', v:s.samples, ico:'🍱', c:'ok', foot:`过期 ${s.samplesExpired} 份` },
        { t:'从业人员', v:s.personnel, ico:'🧑‍🍳', c:'warn', foot:`健康证临期/过期 ${s.healthExpired} 人` },
        { t:'今日门禁', v:s.accessToday, ico:'🚪', c:'info', foot:'人脸识别 + 刷卡' },
      ];
      const kpiHtml = kpis.map(k => `<div class="kpi">
        <div class="k-top"><span class="k-ico" style="background:var(--${k.c}-soft);color:var(--${k.c})">${k.ico}</span>${k.t}</div>
        <div class="k-val">${k.v}</div>
        <div class="k-foot">${k.foot}</div></div>`).join('');

      const quick = {
        platform_admin: [['video','视频监控'],['alarm','异常识别'],['iot','物联设备'],['sample','留样管理'],['person','人员健康证'],['access','门禁管理']],
        canteen_admin: [['review_warn','预警审核'],['review_patrol','巡查审核'],['sample','留样管理'],['person','人员管理'],['check','晨午晚检'],['video','视频监控']],
        practitioner: [['sample','留样管理'],['ledger','台账填报'],['patrol','食安巡查'],['recipe','菜谱维护'],['check','晨午晚检'],['video','视频监控']],
        supervisor: [['data_overview','食安数据总览'],['video','视频监控'],['alarm','异常识别'],['iot','物联设备'],['sample','留样抽查'],['access','门禁记录']],
      }[state.role] || [['video','视频监控'],['alarm','异常识别']];
      const quickHtml = quick.map(([id,name]) => `<button class="btn btn-soft" data-go="${id}">${UI.icon(id==='data_overview'?'data':id)} ${name}</button>`).join('');

      const recent = DB.alarms.slice(0, 6).map(a => `<div class="alarm-item">
        <div class="ai-ico" style="background:var(--${a.level==='danger'?'danger':'warn'}-soft)">${a.icon}</div>
        <div class="ai-body"><div class="ai-title">${a.type} ${UI.statusBadge(a.handled?'handled':'open')}</div>
        <div class="ai-meta">${canteenName(a.canteen)} · ${a.camera} · ${a.time} · ${a.soundLight}</div></div></div>`).join('');

      return `<div class="view-narrow">
        <div class="kpis">${kpiHtml}</div>
        <div class="grid-2">
          <div class="card"><div class="card-head"><h3>📈 近 7 天食安趋势</h3><span class="ch-sub">报警 / 晨检 / 留样</span></div>
            <div class="card-pad"><div class="chart-box"><canvas id="trendChart"></canvas></div></div></div>
          <div class="card"><div class="card-head"><h3>🚨 实时报警动态</h3><div class="ch-actions"><button class="btn btn-line btn-sm" data-go="alarm">全部</button></div></div>
            <div class="card-pad">${recent}</div></div>
        </div>
        <div class="card mt"><div class="card-head"><h3>⚡ 快捷入口</h3><span class="ch-sub">${roleName(state.role)}工作台</span></div>
          <div class="card-pad"><div class="steps">${quickHtml}</div></div></div>
      </div>`;
    },
    mount(root) {
      const t = DB.trend;
      UI.chart('trendChart', 'line', {
        labels: t.map(x => x.date.slice(5)),
        datasets: [
          { label:'报警', data:t.map(x=>x.alarms), borderColor:'#e2483d', backgroundColor:'#e2483d22', tension:.35, fill:true },
          { label:'晨午晚检', data:t.map(x=>x.checks), borderColor:'#2f6bff', backgroundColor:'#2f6bff22', tension:.35, fill:true },
          { label:'留样', data:t.map(x=>x.samples), borderColor:'#1faa6b', backgroundColor:'#1faa6b22', tension:.35, fill:true },
        ]
      });
      root.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) App.go(g.dataset.go); });
    }
  };

  function roleName(r){ return ({platform_admin:'平台管理员',canteen_admin:'食堂管理员',practitioner:'从业人员',supervisor:'监管用户'})[r] || r; }

  /* =========================================================
   *  2) 视频监控（多路 / 轮播 / 回放 / 截图 / 水印）
   * ========================================================= */
  const Monitor = { layout:4, carousel:false, interval:10, watermark:true, order:null, timer:null, current:[], };
  const video = {
    html(state) {
      if (!Monitor.order) Monitor.order = DB.videos.map(v => v.id);
      const seg = [1,4,9,16].map(n => `<button data-layout="${n}" class="${Monitor.layout===n?'on':''}">${n} 路</button>`).join('');
      const bar = `<div class="monitor-bar">
        <div class="seg">${seg}</div>
        <div class="carousel-bar">
          <span>轮播</span><div class="switch ${Monitor.carousel?'on':''}" data-act="carousel"></div>
          <span class="muted">间隔</span><input class="input" id="iv" type="number" value="${Monitor.interval}" min="3" max="60" style="width:80px"/> 秒
        </div>
        <div class="carousel-bar"><span>水印</span><div class="switch ${Monitor.watermark?'on':''}" data-act="watermark"></div></div>
        <button class="btn btn-line btn-sm" data-act="order">⇅ 调整顺序</button>
        <button class="btn btn-line btn-sm" data-act="refresh">↻ 刷新</button>
        <div class="spacer"></div>
        <span class="muted" id="mc">共 ${DB.videos.length} 路通道</span>
      </div>`;
      return `<div class="view-narrow">${bar}<div class="video-grid" id="vg"></div></div>`;
    },
    mount(root, state) {
      const vg = UI.q('#vg', root);
      const cols = { 1:'1fr', 4:'1fr 1fr', 9:'1fr 1fr 1fr', 16:'1fr 1fr 1fr 1fr' }[Monitor.layout];
      const render = () => {
        let ids = Monitor.order.slice();
        if (Monitor.carousel && Monitor.current.length) ids = Monitor.current;
        const show = ids.slice(0, Monitor.layout);
        vg.style.gridTemplateColumns = cols;
        vg.innerHTML = show.map((id, i) => {
          const v = DB.videos.find(x => x.id === id); if (!v) return '';
          const seed = (parseInt(id.replace(/\D/g,''))||i);
          return `<div class="video-tile ${v.alarm?'alarm':''}" data-vid="${v.id}">
            ${UI.videoScene(v.scene, seed)}
            <div class="v-overlay">
              <div class="v-name">${v.online?'🟢':'⚪'} ${v.name}</div>
              <div class="live"><span class="pulse"></span>LIVE</div>
            </div>
            ${Monitor.watermark?`<div class="watermark">食安平台·${v.canteen}·${H.fmt(new Date())}</div>`:''}
            ${v.alarm?`<div class="v-overlay" style="top:auto;bottom:46px"><span class="badge b-danger">⚠ AI 报警</span></div>`:''}
            <div class="v-bottom">
              <button class="v-btn" data-act="playback" data-vid="${v.id}">⏯ 回放</button>
              <button class="v-btn" data-act="shot" data-vid="${v.id}">📷 截图</button>
              <button class="v-btn" data-act="full" data-vid="${v.id}">⛶ 全屏</button>
            </div>
          </div>`;
        }).join('');
      };
      render();

      const startCarousel = () => {
        stopCarousel();
        if (!Monitor.carousel) return;
        Monitor.timer = setInterval(() => {
          Monitor.current = Monitor.order.slice();
          Monitor.current.push(Monitor.current.shift());
          render();
        }, Monitor.interval * 1000);
      };
      const stopCarousel = () => { if (Monitor.timer) clearInterval(Monitor.timer); Monitor.timer = null; };
      if (Monitor.carousel) startCarousel();

      root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act],[data-layout]'); if (!el) return;
        if (el.dataset.layout) { Monitor.layout = +el.dataset.layout; UI.qa('[data-layout]', root).forEach(b=>b.classList.toggle('on', b===el)); render(); return; }
        const act = el.dataset.act;
        if (act === 'carousel') { Monitor.carousel = !Monitor.carousel; el.classList.toggle('on'); Monitor.carousel?startCarousel():stopCarousel(); UI.toast(Monitor.carousel?'轮播已开启':'轮播已关闭'); }
        if (act === 'watermark') { Monitor.watermark = !Monitor.watermark; el.classList.toggle('on'); render(); }
        if (act === 'refresh') { UI.toast('视频通道已刷新'); render(); }
        if (act === 'order') return openOrder(render);
        if (act === 'shot') { flash(); UI.toast('已截图并加水印保存至本地'); }
        if (act === 'full') { const t = el.dataset.vid; UI.toast('已进入全屏模式'); }
        if (act === 'playback') return openPlayback(el.dataset.vid);
      });
      const iv = UI.q('#iv', root); if (iv) iv.addEventListener('change', () => { Monitor.interval = Math.max(3, +iv.value||10); if (Monitor.carousel) startCarousel(); });

      function flash(){ const f=document.createElement('div'); f.style.cssText='position:fixed;inset:0;background:#fff;opacity:.85;z-index:300;pointer-events:none'; document.body.appendChild(f); setTimeout(()=>f.remove(),120); }
    }
  };

  function openOrder(render) {
    const m = UI.modal({ title:'调整视频播放顺序', size:'lg', body:'', footer:`<button class="btn btn-line" data-c="no">取消</button><button class="btn btn-primary" data-c="yes">保存顺序</button>` });
    const rebuild = () => {
      const rows = Monitor.order.map((id, i) => {
        const v = DB.videos.find(x => x.id === id);
        return `<div class="step">#${i + 1} ${v ? v.name : id}
          <button class="btn btn-sm btn-line" data-up="${id}">↑</button>
          <button class="btn btn-sm btn-line" data-down="${id}">↓</button></div>`;
      }).join('');
      UI.q('.modal-body', m.el).innerHTML = `<div class="steps" style="flex-direction:column">${rows}</div><div class="hint">调整后保存即生效，轮播将按此顺序循环切换。</div>`;
    };
    rebuild();
    m.el.addEventListener('click', (e) => {
      const up = e.target.dataset.up, down = e.target.dataset.down;
      if (up) { const i = Monitor.order.indexOf(up); if (i > 0) [Monitor.order[i-1], Monitor.order[i]] = [Monitor.order[i], Monitor.order[i-1]]; rebuild(); return; }
      if (down) { const i = Monitor.order.indexOf(down); if (i < Monitor.order.length - 1) [Monitor.order[i+1], Monitor.order[i]] = [Monitor.order[i], Monitor.order[i+1]]; rebuild(); return; }
      if (e.target.dataset.c === 'yes') { m.close(); render(); UI.toast('播放顺序已保存'); }
      if (e.target.dataset.c === 'no') m.close();
    });
  }

  function openPlayback(vid) {
    const v = DB.videos.find(x => x.id === vid);
    const speeds = [0.5,1,2,4,8,16];
    let start = 8*60, end = 20*60, cur = start, speed = 1, playing = false, timer = null;
    const min2str = (m) => `${H.pad(Math.floor(m/60)%24)}:${H.pad(m%60)}`;
    const body = `<div style="position:relative">
      <div class="video-tile" style="aspect-ratio:16/9;position:relative">${UI.videoScene(v.scene, parseInt(vid.replace(/\D/g,''))||1)}
        <div class="v-overlay"><div class="v-name">${v.name} · 回放</div></div>
        <div class="watermark" id="wm">食安平台·${v.canteen}·水印</div>
      </div>
      <div class="toolbar mt">
        <span>倍速</span><select class="select" id="spd">${speeds.map(s=>`<option value="${s}">${s}x</option>`).join('')}</select>
        <span>回放日期</span><input class="input" id="pdate" type="date" value="${H.fmtDate(new Date())}" style="width:160px"/>
        <span>起</span><input class="input" id="st" type="time" value="08:00" style="width:110px"/>
        <span>止</span><input class="input" id="et" type="time" value="20:00" style="width:110px"/>
      </div>
      <div class="timeline" id="tl"><div class="tl-fill" id="tlf"></div><div class="tl-now" id="tln"></div></div>
      <div class="toolbar">
        <button class="btn btn-primary" id="play">▶ 播放</button>
        <span id="ctime" class="muted">${min2str(cur)}</span>
        <div class="spacer"></div>
        <button class="btn btn-line" id="shot2">📷 截图</button>
        <button class="btn btn-line" id="dl">⬇ 片段下载</button>
        <label class="carousel-bar"><input type="checkbox" id="wmt" ${Monitor.watermark?'checked':''}/> 水印叠加</label>
      </div>
    </div>`;
    const m = UI.modal({ title:`回放 · ${v.name}`, body, size:'lg', footer:false });
    const tlf = UI.q('#tlf', m.el), tln = UI.q('#tln', m.el), ctime = UI.q('#ctime', m.el);
    const update = () => { const pct = (cur - start) / (end - start) * 100; tlf.style.width = pct + '%'; tln.style.left = pct + '%'; ctime.textContent = min2str(cur); };
    update();
    UI.q('#spd', m.el).addEventListener('change', e => speed = +e.target.value);
    UI.q('#st', m.el).addEventListener('change', e => { const [h,mm]=e.target.value.split(':').map(Number); start=h*60+mm; if(cur<start)cur=start; update(); });
    UI.q('#et', m.el).addEventListener('change', e => { const [h,mm]=e.target.value.split(':').map(Number); end=h*60+mm; update(); });
    UI.q('#wmt', m.el).addEventListener('change', e => UI.q('#wm', m.el).style.display = e.target.checked ? '' : 'none');
    UI.q('#tl', m.el).addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); cur = start + (e.clientX - r.left)/r.width*(end-start); update(); });
    UI.q('#play', m.el).addEventListener('click', e => {
      playing = !playing; e.target.textContent = playing ? '⏸ 暂停' : '▶ 播放';
      if (playing) timer = setInterval(() => { cur += speed; if (cur >= end) { cur = end; playing=false; e.target.textContent='▶ 播放'; clearInterval(timer);} update(); }, 200);
      else clearInterval(timer);
    });
    UI.q('#shot2', m.el).addEventListener('click', () => UI.toast('已截取当前帧并加水印保存'));
    UI.q('#dl', m.el).addEventListener('click', () => UI.toast('片段下载任务已加入队列'));
  }

  /* =========================================================
   *  3) 物联网设备管理
   * ========================================================= */
  const iot = {
    html(state) {
      const types = DB.iotTypes;
      const cards = types.map(t => {
        const devs = DB.iotDevices.filter(d => d.type === t.type);
        const online = devs.filter(d => d.online).length;
        const alarm = devs.filter(d => d.status !== 'ok').length;
        const avg = t.unit === '状态' ? '--' : (devs.reduce((s,d)=>s+(+d.value||0),0)/devs.length).toFixed(1);
        return `<div class="card"><div class="card-head"><h3>${t.icon} ${t.type}</h3><span class="ch-sub">${devs.length} 台 · 在线 ${online}</span></div>
          <div class="card-pad">
            <div class="kpi" style="box-shadow:none;border:none;padding:0">
              <div class="k-top">平均 ${t.unit==='状态'?'状态':('读数 '+t.unit)}</div>
              <div class="k-val">${avg}</div>
              <div class="k-foot">${alarm?`<span class="badge b-danger">${alarm} 台异常</span>`:`<span class="badge b-ok">全部正常</span>`}</div>
            </div>
            <div class="tag-row mt"><button class="btn btn-soft btn-sm" data-act="list" data-type="${t.type}">查看设备</button></div>
          </div></div>`;
      }).join('');
      return `<div class="view-narrow">
        <div class="toolbar"><h3 style="font-size:16px">📡 物联设备总览</h3><div class="spacer"></div>
          ${canteenFilter(App.state.canteenVal)}</div>
        <div class="grid-3" id="iotGrid">${cards}</div>
        <div id="iotList" class="mt"></div>
      </div>`;
    },
    mount(root, state) {
      UI.q('[data-filter="canteen"]', root)?.addEventListener('change', () => App.refresh());
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act="list"]'); if (!b) return;
        const type = b.dataset.type;
        const devs = applyCanteen(DB.iotDevices.filter(d => d.type === type), App.state.canteenVal);
        const html = devs.map(d => {
          const pct = d.unit==='状态' ? (d.value?100:0) : Math.min(100, (d.value - d.min)/(d.max-d.min)*100);
          const col = d.status==='ok'?'var(--ok)':d.status==='warn'?'var(--warn)':'var(--danger)';
          return `<div class="dev-card">
            <div class="dc-top"><div class="dev-ico" style="background:var(--brand-soft)">${d.icon}</div>
              <div><div style="font-weight:700">${d.name}</div><div class="muted" style="font-size:12px">${canteenName(d.canteen)}</div></div>
              <div style="margin-left:auto">${UI.statusBadge(d.online?(d.status):'danger')}</div></div>
            <div class="dev-val" style="color:${col}">${d.unit==='状态'?(d.value?'正常':'异常'):d.value+' '+d.unit}</div>
            <div class="gauge"><i style="width:${pct}%;background:${col}"></i></div>
            <div class="muted" style="font-size:12px;margin-top:8px">电量 ${d.battery}% · 更新 ${d.lastUpdate}</div>
            <div class="tag-row mt"><button class="btn btn-line btn-sm" data-act="manage" data-id="${d.id}">管理</button></div>
          </div>`;
        }).join('');
        UI.q('#iotList', root).innerHTML = `<div class="card"><div class="card-head"><h3>${type} · 设备明细</h3></div><div class="card-pad"><div class="grid-3">${html||'<div class="empty">暂无设备</div>'}</div></div></div>`;
      });
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act="manage"]'); if (!b) return;
        const d = DB.iotDevices.find(x => x.id === b.dataset.id);
        const body = `<div class="form-grid">
          ${UI.field('设备名称', UI.input('name', d.name), true)}
          ${UI.field('所属食堂', `<input class="input" value="${canteenName(d.canteen)}" disabled/>`)}
          ${UI.field('当前读数', `<input class="input" value="${d.value} ${d.unit}" disabled/>`)}
          ${UI.field('阈值下限', UI.input('min', d.min))}
          ${UI.field('阈值上限', UI.input('max', d.max))}
          ${UI.field('告警方式', UI.select('alm',[{v:'app',t:'App 推送'},{v:'sms',t:'短信'},{v:'sound',t:'现场声光'}],'sound'))}
        </div><div class="hint">阈值超限时平台将自动触发对应告警方式，并可联动现场声光提醒。</div>`;
        const m = UI.modal({ title:'设备管理 · ' + d.name, body, footer:`<button class="btn btn-line" data-c="no">关闭</button><button class="btn btn-primary" data-c="yes">保存阈值</button>` });
        m.el.addEventListener('click', (ev) => { if (ev.target.dataset.c==='yes'){ m.close(); UI.toast('设备阈值已更新'); } if (ev.target.dataset.c==='no') m.close(); });
      });
    }
  };

  /* =========================================================
   *  4) 异常行为识别报警
   * ========================================================= */
  const alarm = {
    html(state) {
      const byType = {};
      DB.alarmTypes.forEach(a => byType[a.type] = DB.alarms.filter(x=>x.type===a.type).length);
      const stats = DB.alarmTypes.map(a => `<div class="kpi" style="padding:14px"><div class="k-top">${a.icon} ${a.type}</div>
        <div class="k-val" style="font-size:22px">${byType[a.type]||0}</div></div>`).join('');
      const filters = `<div class="toolbar">
        ${canteenFilter(App.state.canteenVal)}
        <select class="select" data-filter="type"><option value="ALL">全部类型</option>${DB.alarmTypes.map(a=>`<option value="${a.type}">${a.type}</option>`).join('')}</select>
        <select class="select" data-filter="st"><option value="ALL">全部状态</option><option value="open">待处理</option><option value="handled">已处理</option></select>
        <input class="input" data-filter="kw" placeholder="搜索通道/处理人" style="min-width:160px"/>
      </div>`;
      return `<div class="view-narrow">
        <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${stats}</div>
        <div class="card"><div class="card-head"><h3>🚨 AI 异常行为识别报警</h3><span class="ch-sub">现场声光提醒 + 后台记录</span></div>
          <div class="card-pad">${filters}<div id="alarmList"></div></div></div>
      </div>`;
    },
    mount(root, state) {
      const list = UI.q('#alarmList', root);
      const draw = () => {
        const canteen = UI.q('[data-filter="canteen"]', root).value;
        const type = UI.q('[data-filter="type"]', root).value;
        const st = UI.q('[data-filter="st"]', root).value;
        const kw = UI.q('[data-filter="kw"]', root).value.toLowerCase();
        let rows = DB.alarms.filter(a =>
          (canteen==='ALL'||a.canteen===canteen) && (type==='ALL'||a.type===type) &&
          (st==='ALL'|| (st==='open'? !a.handled : a.handled)) &&
          (kw===''|| a.camera.toLowerCase().includes(kw) || a.handler.toLowerCase().includes(kw)));
        list.innerHTML = rows.length ? rows.map(a => `<div class="alarm-item">
          <div class="ai-ico" style="background:var(--${a.level==='danger'?'danger':'warn'}-soft)">${a.icon}</div>
          <div class="ai-body">
            <div class="ai-title">${a.type} ${UI.statusBadge(a.handled?'handled':'open')} ${a.handled?'':`<span class="badge b-danger">🔔 现场声光已触发</span>`}</div>
            <div class="ai-meta">${canteenName(a.canteen)} · ${a.camera} · ${a.time} · 处理人：${a.handler} · ${a.soundLight}</div>
            <div class="tag-row mt">
              ${a.handled?'':`<button class="btn btn-sm btn-primary" data-act="handle" data-id="${a.id}">标记已处理</button>`}
              <button class="btn btn-sm btn-line" data-act="detail" data-id="${a.id}">查看详情</button>
            </div>
          </div></div>`).join('') : '<div class="empty">暂无匹配报警</div>';
      };
      UI.qa('[data-filter]', root).forEach(el => { el.addEventListener('change', draw); el.addEventListener('input', draw); });
      draw();
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const a = DB.alarms.find(x => x.id === b.dataset.id);
        if (b.dataset.act === 'handle') { a.handled = true; a.handler = roleName(App.state.role); draw(); UI.toast('已标记为处理完成'); }
        if (b.dataset.act === 'detail') {
          UI.modal({ title:'报警详情 · ' + a.type, body:`<div class="form-grid">
            ${UI.field('报警类型', `<input class="input" value="${a.icon} ${a.type}" disabled/>`)}
            ${UI.field('风险等级', `<input class="input" value="${a.level==='danger'?'高危':'中危'}" disabled/>`)}
            ${UI.field('发生位置', `<input class="input" value="${canteenName(a.canteen)} / ${a.camera}" disabled/>`)}
            ${UI.field('发生时间', `<input class="input" value="${a.time}" disabled/>`)}
            ${UI.field('现场处置', `<input class="input" value="${a.soundLight}" disabled/>`, true)}
            ${UI.field('处理状态', `<input class="input" value="${a.handled?'已处理（'+a.handler+'）':'待处理'}" disabled/>`, true)}
          </div><div class="hint">平台已自动截取报警前后视频片段并叠加水印留存，可作为执法取证依据。</div>`, size:'lg', footer:`<button class="btn btn-primary" data-c="no">关闭</button>` ,
            onMount:(m)=>m.addEventListener('click',ev=>{if(ev.target.dataset.c==='no')m.remove();})});
        }
      });
    }
  };

  /* =========================================================
   *  5) 留样管理
   * ========================================================= */
  const sample = DataView({
    title:'留样管理', icon:'sample', sub:'食品留样维护 / 管理 / 展示', addLabel:'新增留样', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.samples, f.canteen),
    searchFields: ['dish','person','meal'],
    columns: [
      { title:'日期', key:'date' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'餐次', key:'meal' }, { title:'菜品', key:'dish' }, { title:'留样人', key:'person' },
      { title:'重量(g)', key:'weight' }, { title:'温度(℃)', key:'temp' },
      { title:'保留至', key:'retainUntil' },
      { title:'状态', key:'status', render:r=>UI.statusBadge(r.status) },
      { title:'留样影像', key:'photo', render:r=>`<span class="photo">${r.photo}</span>` },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.samples = DB.samples.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'留样日期', control:UI.input('date', H.fmtDate(new Date()), '') },
      { label:'食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'餐次', control:UI.select('meal',[{v:'早餐',t:'早餐'},{v:'午餐',t:'午餐'},{v:'晚餐',t:'晚餐'}]) },
      { label:'菜品名称', control:UI.input('dish','') },
      { label:'留样人', control:UI.input('person','') },
      { label:'重量(g)', control:UI.input('weight','150') },
      { label:'留样温度(℃)', control:UI.input('temp','4') },
    ],
    onAdd: (s, v) => {
      const d = new Date(v.date); const retain = new Date(d); retain.setDate(retain.getDate()+48);
      DB.samples.unshift({ id:'S'+Date.now(), date:v.date, canteen:v.canteen, meal:v.meal, dish:v.dish, person:v.person, weight:+v.weight, temp:+v.temp, retainUntil:H.fmtDate(retain), status: retain>new Date()?'ok':'expired', photo:'🍱' });
      return true;
    }
  });

  /* =========================================================
   *  6) 人员信息管理 + 健康证
   * ========================================================= */
  const person = DataView({
    title:'人员信息管理', icon:'person', sub:'基本信息 + 健康证（单/批量录入删除）', addLabel:'单个录入', batchLabel:'批量录入', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.personnel, f.canteen),
    searchFields: ['name','empNo','post','phone'],
    columns: [
      { title:'员工编号', key:'empNo' }, { title:'姓名', key:'name' },
      { title:'联系电话', key:'phone' }, { title:'所属岗位', key:'post' },
      { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'健康证', key:'healthStatus', render:r=>UI.statusBadge(r.healthStatus) },
      { title:'过期日期', key:'healthExpire' },
      { title:'人脸', key:'photo', render:r=>`<span class="photo">${r.photo}</span>` },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.personnel = DB.personnel.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'姓名', control:UI.input('name','') },
      { label:'员工编号', control:UI.input('empNo','自动生成') },
      { label:'联系电话', control:UI.input('phone','') },
      { label:'所属岗位', control:UI.select('post', DB.posts.map(p=>({v:p,t:p}))) },
      { label:'所属食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'健康证到期', control:UI.input('exp','2026-12-31') },
      { label:'人脸照片', control:`<input class="input" type="file" disabled placeholder="自动采集"/>`, full:true },
    ],
    onAdd: (s, v) => {
      const exp = v.exp || '2026-12-31'; const d = new Date(exp);
      DB.personnel.unshift({ id:'P'+Date.now(), empNo:'E'+H.pad(DB.personnel.length+1,4), name:v.name, phone:v.phone, post:v.post, canteen:v.canteen, healthStatus: d<new Date()?'expired':'ok', healthExpire:exp, photo:'👤' });
      return true;
    },
    onBatch: (s, n) => {
      const fn=['张','李','王','赵','陈','刘','杨'], gn=['伟','敏','静','涛','勇','艳','杰','娟'];
      for (let i=0;i<n;i++){ const exp=new Date(); exp.setDate(exp.getDate()+H.rnd(-20,400)); const d=exp;
        DB.personnel.unshift({ id:'P'+Date.now()+i, empNo:'E'+H.pad(DB.personnel.length+1,4), name:H.pick(fn)+H.pick(gn), phone:'13'+H.rnd(100000000,999999999), post:H.pick(DB.posts), canteen:App.state.canteenVal==='ALL'?'C1':App.state.canteenVal, healthStatus:d<new Date()?'expired':'ok', healthExpire:H.fmtDate(d), photo:'👤' }); }
      return n;
    }
  });

  /* =========================================================
   *  7) 晨午晚检
   * ========================================================= */
  const check = DataView({
    title:'晨午晚检', icon:'check', sub:'结合晨午晚检查设备采集数据', addLabel:'录入记录', rowKey:'id',
    extraOptions:[{v:'ALL',t:'全部检次'},{v:'晨检',t:'晨检'},{v:'午检',t:'午检'},{v:'晚检',t:'晚检'}],
    getRows: (s, f) => applyCanteen(DB.checks, f.canteen),
    extraFilter: (rows, v) => v==='ALL'?rows:rows.filter(r=>r.type===v),
    searchFields: ['person','device','items'],
    columns: [
      { title:'日期', key:'date' }, { title:'检次', key:'type' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'人员', key:'person' }, { title:'体温(℃)', key:'temp' }, { title:'采集设备', key:'device' },
      { title:'结果', key:'status', render:r=>UI.statusBadge(r.status) },
      { title:'明细', key:'items' },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.checks = DB.checks.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'日期', control:UI.input('date', H.fmtDate(new Date())) },
      { label:'检次', control:UI.select('type',[{v:'晨检',t:'晨检'},{v:'午检',t:'午检'},{v:'晚检',t:'晚检'}]) },
      { label:'食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'人员', control:UI.input('person','') },
      { label:'体温(℃)', control:UI.input('temp','36.5') },
      { label:'采集设备', control:UI.select('device',[{v:'晨检机-A1',t:'晨检机-A1'},{v:'晨检机-B2',t:'晨检机-B2'},{v:'手持终端-C3',t:'手持终端-C3'}]) },
      { label:'结果明细', control:UI.input('items','体温正常 / 手部清洁'), full:true },
    ],
    onAdd: (s, v) => {
      DB.checks.unshift({ id:'K'+Date.now(), date:v.date, type:v.type, canteen:v.canteen, person:v.person, temp:v.temp, status:'ok', items:v.items, device:v.device });
      return true;
    }
  });

  /* =========================================================
   *  8) 门禁管理
   * ========================================================= */
  const access = DataView({
    title:'门禁管理', icon:'access', sub:'联网单/批量录入删除', addLabel:'单个录入', batchLabel:'批量录入', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.access, f.canteen),
    searchFields: ['name','empNo','cardNo'],
    columns: [
      { title:'姓名', key:'name' }, { title:'员工编号', key:'empNo' }, { title:'卡号', key:'cardNo' },
      { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) }, { title:'时间', key:'time' },
      { title:'方式', key:'type' }, { title:'结果', key:'result', render:r=>UI.statusBadge(r.result) },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.access = DB.access.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'姓名', control:UI.input('name','') },
      { label:'员工编号', control:UI.input('empNo','') },
      { label:'卡号', control:UI.input('cardNo','') },
      { label:'食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'识别方式', control:UI.select('type',[{v:'刷卡',t:'刷卡'},{v:'人脸',t:'人脸'},{v:'二维码',t:'二维码'}]) },
    ],
    onAdd: (s, v) => { DB.access.unshift({ id:'AC'+Date.now(), name:v.name, empNo:v.empNo, cardNo:v.cardNo, canteen:v.canteen, time:H.fmt(new Date()), result:'ok', type:v.type }); return true; },
    onBatch: (s, n) => {
      for (let i=0;i<n;i++){ DB.access.unshift({ id:'AC'+Date.now()+i, name:H.pick(['张','李','王','赵'])+H.pick(['伟','敏','静','涛']), empNo:'E'+H.pad(DB.access.length+1,4), cardNo:'C'+H.rnd(100000,999999), canteen:App.state.canteenVal==='ALL'?'C1':App.state.canteenVal, time:H.fmt(new Date()), result:Math.random()>0.06?'ok':'fail', type:H.pick(['刷卡','人脸','二维码']) }); }
      return n;
    }
  });

  /* =========================================================
   *  台账填报
   * ========================================================= */
  const ledger = DataView({
    title:'台账填报', icon:'ledger', sub:'消毒 / 晨检等台账记录', addLabel:'新增台账', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.ledgers, f.canteen),
    searchFields: ['type','item','operator'],
    columns: [
      { title:'日期', key:'date' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'台账类型', key:'type' }, { title:'记录内容', key:'item' }, { title:'操作人', key:'operator' },
      { title:'结果', key:'result', render:r=>UI.statusBadge(r.result) },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.ledgers = DB.ledgers.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'日期', control:UI.input('date', H.fmtDate(new Date())) },
      { label:'食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'台账类型', control:UI.select('type',[{v:'餐具消毒',t:'餐具消毒'},{v:'环境消毒',t:'环境消毒'},{v:'晨检台账',t:'晨检台账'},{v:'留样台账',t:'留样台账'}]) },
      { label:'记录内容', control:UI.input('item',''), full:true },
      { label:'操作人', control:UI.input('operator','') },
      { label:'结果', control:UI.select('result',[{v:'ok',t:'合格'},{v:'warn',t:'待整改'}]) },
    ],
    onAdd: (s, v) => { DB.ledgers.unshift({ id:'L'+Date.now(), date:v.date, canteen:v.canteen, type:v.type, item:v.item, operator:v.operator, result:v.result }); return true; }
  });

  /* =========================================================
   *  食安巡查
   * ========================================================= */
  const patrol = DataView({
    title:'食安巡查', icon:'patrol', sub:'巡检 / 食安巡查记录', addLabel:'新增巡查', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.patrols, f.canteen),
    searchFields: ['area','inspector','issue'],
    columns: [
      { title:'日期', key:'date' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'巡查区域', key:'area' }, { title:'巡查员', key:'inspector' },
      { title:'评分', key:'score' }, { title:'状态', key:'status', render:r=>UI.statusBadge(r.status) },
      { title:'问题', key:'issue' },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.patrols = DB.patrols.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'日期', control:UI.input('date', H.fmtDate(new Date())) },
      { label:'食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'巡查区域', control:UI.select('area',['烹饪区','仓储区','洗消间','留样间','备餐区','粗加工'].map(a=>({v:a,t:a}))) },
      { label:'巡查员', control:UI.input('inspector','') },
      { label:'评分', control:UI.input('score','90') },
      { label:'问题描述', control:UI.input('issue','无'), full:true },
    ],
    onAdd: (s, v) => { DB.patrols.unshift({ id:'PT'+Date.now(), date:v.date, canteen:v.canteen, area:v.area, inspector:v.inspector, score:+v.score, status:+v.score>=85?'ok':'warn', reviewed:false, issue:v.issue }); return true; }
  });

  /* =========================================================
   *  菜谱信息维护
   * ========================================================= */
  const recipe = DataView({
    title:'菜谱信息维护', icon:'recipe', sub:'每日菜谱维护', addLabel:'新增菜谱', rowKey:'id', modalSize:'lg',
    getRows: (s, f) => applyCanteen(DB.recipes, f.canteen),
    searchFields: ['breakfast','lunch','dinner'],
    columns: [
      { title:'日期', key:'date' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'早餐', key:'breakfast' }, { title:'午餐', key:'lunch' }, { title:'晚餐', key:'dinner' },
    ],
    actions: [{ action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.recipes = DB.recipes.filter(x => x.id !== id); },
    addFields: (s) => [
      { label:'日期', control:UI.input('date', H.fmtDate(new Date())) },
      { label:'食堂', control:UI.select('canteen', DB.canteens.map(c=>({v:c.id,t:c.name})), App.state.canteenVal==='ALL'?'C1':App.state.canteenVal) },
      { label:'早餐', control:UI.input('breakfast',''), full:true },
      { label:'午餐', control:UI.input('lunch',''), full:true },
      { label:'晚餐', control:UI.input('dinner',''), full:true },
    ],
    onAdd: (s, v) => { DB.recipes.unshift({ id:'R'+Date.now(), date:v.date, canteen:v.canteen, breakfast:v.breakfast, lunch:v.lunch, dinner:v.dinner }); return true; }
  });

  /* =========================================================
   *  用户管理
   * ========================================================= */
  const users = DataView({
    title:'用户管理', icon:'users', sub:'平台 / 食堂用户', addLabel:'新增用户', rowKey:'id',
    getRows: (s, f) => f.canteen==='ALL'?DB.users:DB.users.filter(u=>u.canteen===f.canteen||u.canteen==='ALL'),
    searchFields: ['name','username','phone'],
    columns: [
      { title:'姓名', key:'name' }, { title:'账号', key:'username' },
      { title:'角色', key:'role', render:r=>(DB.roles.find(x=>x.id===r.role)||{}).name||r.role },
      { title:'食堂', key:'canteen', render:r=>r.canteen==='ALL'?'全部':canteenName(r.canteen) },
      { title:'联系电话', key:'phone' }, { title:'最近登录', key:'lastLogin' },
      { title:'状态', key:'status', render:r=>UI.statusBadge(r.status) },
    ],
    actions: [
      { action:'toggle', label:'启停', cls:'btn-line' },
      { action:'del', label:'删除', cls:'btn-line', icon:'🗑' },
    ],
    onDelete: (s, id) => { DB.users = DB.users.filter(x => x.id !== id); },
    onAction: (s, act, id, draw) => {
      const u = DB.users.find(x=>x.id===id); if(!u) return;
      if (act==='toggle'){ u.status = u.status==='ok'?'disabled':'ok'; draw(); UI.toast('用户状态已更新'); }
    },
    addFields: (s) => [
      { label:'姓名', control:UI.input('name','') },
      { label:'账号', control:UI.input('username','') },
      { label:'角色', control:UI.select('role', DB.roles.map(r=>({v:r.id,t:r.name})), 'R2') },
      { label:'所属食堂', control:UI.select('canteen', [{v:'ALL',t:'全部食堂'}].concat(DB.canteens.map(c=>({v:c.id,t:c.name}))), 'ALL') },
      { label:'联系电话', control:UI.input('phone','') },
    ],
    onAdd: (s, v) => { DB.users.unshift({ id:'U'+Date.now(), name:v.name, username:v.username, role:v.role, canteen:v.canteen, phone:v.phone, lastLogin:H.fmt(new Date()), status:'ok' }); return true; }
  });

  /* =========================================================
   *  角色管理
   * ========================================================= */
  const roles = DataView({
    title:'角色管理', icon:'roles', sub:'角色与职责分配（可自定义）', addLabel:'新增角色', rowKey:'id',
    getRows: (s, f) => DB.roles,
    searchFields: ['name','scope'],
    columns: [
      { title:'角色名称', key:'name' },
      { title:'作用域', key:'scope', render:r=>({platform:'平台级',canteen:'食堂级',supervise:'监管级'})[r.scope]||r.scope },
      { title:'权限点数', key:'perms', render:r=>`<span class="badge b-info">${r.perms.length} 项</span>` },
      { title:'成员数', key:'m', render:r=>DB.users.filter(u=>u.role===r.id).length+' 人' },
    ],
    actions: [{ action:'perm', label:'配置权限', cls:'btn-soft' }, { action:'del', label:'删除', cls:'btn-line', icon:'🗑' }],
    onDelete: (s, id) => { DB.roles = DB.roles.filter(x => x.id !== id); },
    onAction: (s, act, id) => {
      if (act!=='perm') return;
      const r = DB.roles.find(x=>x.id===id);
      const byMod = {}; DB.permissions.forEach(p => (byMod[p.module]=byMod[p.module]||[]).push(p));
      const body = Object.keys(byMod).map(mod => `<div class="full"><strong>${mod}</strong><div class="tag-row mt" style="margin-bottom:10px">
        ${byMod[mod].map(p=>`<label class="step" style="cursor:pointer"><input type="checkbox" data-perm="${p.id}" ${r.perms.includes(p.id)?'checked':''}/> ${p.name}</label>`).join('')}</div></div>`).join('');
      const m = UI.modal({ title:'配置权限 · ' + r.name, size:'lg', body:`<div class="form-grid">${body}</div><div class="hint">勾选权限点后保存，该角色成员将获得对应功能访问能力。</div>`,
        footer:`<button class="btn btn-line" data-c="no">取消</button><button class="btn btn-primary" data-c="yes">保存</button>` });
      m.el.addEventListener('click', (ev) => {
        if (ev.target.dataset.c==='yes'){ r.perms = UI.qa('[data-perm]', m.el).filter(c=>c.checked).map(c=>c.dataset.perm); m.close(); App.refresh(); UI.toast('角色权限已保存'); }
        if (ev.target.dataset.c==='no') m.close();
      });
    },
    addFields: (s) => [
      { label:'角色名称', control:UI.input('name','') },
      { label:'作用域', control:UI.select('scope',[{v:'canteen',t:'食堂级'},{v:'platform',t:'平台级'},{v:'supervise',t:'监管级'}]) },
    ],
    onAdd: (s, v) => { DB.roles.unshift({ id:'R'+Date.now(), name:v.name, scope:v.scope, perms:['p_dash'] }); return true; }
  });

  /* =========================================================
   *  权限管理
   * ========================================================= */
  const perm = DataView({
    title:'权限管理', icon:'perm', sub:'权限点配置', rowKey:'id',
    getRows: (s, f) => DB.permissions,
    searchFields: ['name','module','desc'],
    columns: [
      { title:'权限点', key:'name' }, { title:'所属模块', key:'module', render:r=>`<span class="badge b-purple">${r.module}</span>` },
      { title:'说明', key:'desc' },
      { title:'已授权角色', key:'roles', render:r=>DB.roles.filter(role=>role.perms.includes(r.id)).map(role=>`<span class="badge b-gray">${role.name}</span>`).join(' ') },
    ],
  });

  /* =========================================================
   *  参数设置 / 平台维护
   * ========================================================= */
  const sys = {
    html(state) {
      const body = `<div class="view-narrow grid-2">
        <div class="card"><div class="card-head"><h3>⚙️ 系统参数</h3></div><div class="card-pad">
          <div class="form-grid">
            ${UI.field('平台名称', UI.input('pname','食安管理平台'))}
            ${UI.field('留样保留时长(小时)', UI.input('retain','48'))}
            ${UI.field('报警声光提醒', UI.select('sl',[{v:'on',t:'开启'},{v:'off',t:'关闭'}],'on'))}
            ${UI.field('AI 识别灵敏度', UI.select('ai',[{v:'high',t:'高'},{v:'mid',t:'中'},{v:'low',t:'低'}],'mid'))}
            ${UI.field('数据留存周期(天)', UI.input('keep','365'))}
            ${UI.field('默认语言', UI.select('lang',[{v:'zh',t:'简体中文'},{v:'en',t:'English'}],'zh'))}
          </div>
          <div class="tag-row mt"><button class="btn btn-primary" data-act="save">保存参数</button></div>
        </div></div>
        <div class="card"><div class="card-head"><h3>🛠 平台维护</h3></div><div class="card-pad">
          <div class="steps" style="flex-direction:column">
            <div class="step">🧹 缓存清理 <button class="btn btn-line btn-sm" data-act="cache" style="margin-left:auto">执行</button></div>
            <div class="step">💾 数据备份 <button class="btn btn-line btn-sm" data-act="backup" style="margin-left:auto">立即备份</button></div>
            <div class="step">📜 操作日志 <button class="btn btn-line btn-sm" data-act="log" style="margin-left:auto">查看</button></div>
            <div class="step">🔄 系统重启 <button class="btn btn-line btn-sm" data-act="reboot" style="margin-left:auto">重启</button></div>
          </div>
          <div class="hint mt">维护操作将记录至操作审计日志，仅平台管理员可执行。</div>
        </div></div>
      </div>`;
      return body;
    },
    mount(root) {
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        const map = { save:'系统参数已保存', cache:'缓存清理完成', backup:'数据备份任务已创建', log:'操作日志已打开', reboot:'系统重启指令已下发' };
        UI.toast(map[a.dataset.act] || '操作完成');
      });
    }
  };

  /* =========================================================
   *  预警信息审核 / 巡查记录审核（食堂管理员）
   * ========================================================= */
  const review_warn = DataView({
    title:'预警信息审核', icon:'review', sub:'AI 报警与预警审批', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.alarms.filter(a=>!a.handled), f.canteen),
    searchFields: ['type','camera'],
    columns: [
      { title:'时间', key:'time' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'类型', key:'type', render:r=>`${r.icon} ${r.type}` }, { title:'通道', key:'camera' },
      { title:'等级', key:'level', render:r=>UI.statusBadge(r.level) }, { title:'现场处置', key:'soundLight' },
    ],
    actions: [
      { action:'pass', label:'通过', cls:'btn-primary' },
      { action:'reject', label:'驳回', cls:'btn-line' },
    ],
    onAction: (s, act, id, draw) => {
      const a = DB.alarms.find(x=>x.id===id); if(!a) return;
      if (act==='pass'){ a.handled=true; a.handler=roleName(App.state.role); draw(); UI.toast('预警已审核通过'); }
      if (act==='reject'){ a.handled=true; a.handler=roleName(App.state.role)+'(驳回)'; draw(); UI.toast('预警已驳回'); }
    }
  });
  const review_patrol = DataView({
    title:'巡查记录审核', icon:'review', sub:'食安巡查记录审批', rowKey:'id',
    getRows: (s, f) => applyCanteen(DB.patrols.filter(p=>!p.reviewed), f.canteen),
    searchFields: ['area','inspector','issue'],
    columns: [
      { title:'日期', key:'date' }, { title:'食堂', key:'canteen', render:r=>canteenName(r.canteen) },
      { title:'区域', key:'area' }, { title:'巡查员', key:'inspector' }, { title:'评分', key:'score' },
      { title:'问题', key:'issue' },
    ],
    actions: [
      { action:'pass', label:'通过', cls:'btn-primary' },
      { action:'reject', label:'驳回', cls:'btn-line' },
    ],
    onAction: (s, act, id, draw) => {
      const p = DB.patrols.find(x=>x.id===id); if(!p) return;
      p.reviewed = true; p.reviewNote = act==='pass'?'已通过':'已驳回';
      draw(); UI.toast(act==='pass'?'巡查记录已通过':'巡查记录已驳回');
    }
  });

  /* =========================================================
   *  食安数据总览（监管用户）
   * ========================================================= */
  const data_overview = {
    html(state) {
      const rows = DB.canteens.map(c => {
        const dev = DB.iotDevices.filter(d=>d.canteen===c.id);
        const alarm = DB.alarms.filter(a=>a.canteen===c.id && !a.handled).length;
        const health = DB.personnel.filter(p=>p.canteen===c.id && p.healthStatus==='expired').length;
        const score = Math.max(60, 98 - alarm*4 - health*3 - (c.status==='danger'?10:c.status==='warn'?5:0));
        return { ...c, dev:dev.length, alarm, health, score };
      });
      const tbl = UI.table({ columns:[
        { title:'食堂', key:'name' }, { title:'位置', key:'location' },
        { title:'物联设备', key:'dev' }, { title:'待处理报警', key:'alarm', render:r=>r.alarm?`<span class="badge b-danger">${r.alarm}</span>`:`<span class="badge b-ok">0</span>` },
        { title:'健康证异常', key:'health', render:r=>r.health?`<span class="badge b-warn">${r.health}</span>`:`<span class="badge b-ok">0</span>` },
        { title:'综合评分', key:'score', render:r=>`<strong style="color:${r.score>=90?'var(--ok)':r.score>=75?'var(--warn)':'var(--danger)'}">${r.score}</strong>` },
        { title:'状态', key:'status', render:r=>UI.statusBadge(r.status) },
      ], rows });
      const dist = DB.canteens.map(c => rows.find(r=>r.id===c.id).score);
      return `<div class="view-narrow">
        <div class="kpis">
          <div class="kpi"><div class="k-top">🏪 监管食堂</div><div class="k-val">${DB.canteens.length}</div></div>
          <div class="kpi"><div class="k-top">🚨 待处理报警</div><div class="k-val" style="color:var(--danger)">${DB.alarms.filter(a=>!a.handled).length}</div></div>
          <div class="kpi"><div class="k-top">🧑‍🍳 健康证异常</div><div class="k-val" style="color:var(--warn)">${DB.personnel.filter(p=>p.healthStatus==='expired').length}</div></div>
          <div class="kpi"><div class="k-top">📡 在线设备</div><div class="k-val" style="color:var(--ok)">${DB.iotDevices.filter(d=>d.online).length}</div></div>
        </div>
        <div class="grid-2">
          <div class="card"><div class="card-head"><h3>📊 各食堂综合评分</h3></div><div class="card-pad"><div class="chart-box"><canvas id="scoreChart"></canvas></div></div></div>
          <div class="card"><div class="card-head"><h3>🍱 留样合规率</h3></div><div class="card-pad"><div class="chart-box"><canvas id="sampleChart"></canvas></div></div></div>
        </div>
        <div class="card mt"><div class="card-head"><h3>🏪 食堂食安总览</h3><span class="ch-sub">跨食堂横向对比</span></div><div class="card-pad">${tbl}</div></div>
      </div>`;
    },
    mount(root) {
      const names = DB.canteens.map(c=>c.name.slice(0,6));
      const scores = DB.canteens.map(c => { const r=DB.alarms.filter(a=>a.canteen===c.id&&!a.handled).length; const h=DB.personnel.filter(p=>p.canteen===c.id&&p.healthStatus==='expired').length; return Math.max(60,98-r*4-h*3-(c.status==='danger'?10:c.status==='warn'?5:0)); });
      UI.chart('scoreChart','bar',{ labels:names, datasets:[{ label:'综合评分', data:scores, backgroundColor:'#2f6bff' }] }, { scales:{ y:{ min:50, max:100 } } });
      const ok = DB.samples.filter(s=>s.status==='ok').length, ex = DB.samples.filter(s=>s.status==='expired').length;
      UI.chart('sampleChart','doughnut',{ labels:['合规留样','过期留样'], datasets:[{ data:[ok,ex], backgroundColor:['#1faa6b','#e2483d'] }] });
    }
  };

  /* =========================================================
   *  业务管理（平台管理员：食堂 / 商户档案与状态维护）
   * ========================================================= */
  const business = DataView({
    title:'业务管理', icon:'biz', sub:'平台食堂 / 商户档案与状态维护', rowKey:'id', hideCanteen:true,
    getRows: (s, f) => DB.canteens,
    searchFields: ['id','name','manager','location'],
    columns: [
      { title:'编号', key:'id' },
      { title:'食堂 / 商户', key:'name' },
      { title:'负责人', key:'manager' },
      { title:'位置', key:'location' },
      { title:'状态', key:'status', render:r=>UI.statusBadge(r.status) },
    ],
    addLabel:'新增食堂',
    addFields:(s)=>[
      { label:'食堂名称', control:UI.input('name','', '如：第七食堂（员工餐厅）') },
      { label:'负责人', control:UI.input('manager','') },
      { label:'位置', control:UI.input('location','') },
      { label:'状态', control:UI.select('status',[{v:'ok',t:'正常'},{v:'warn',t:'预警'},{v:'danger',t:'异常'}],'ok') },
    ],
    onAdd:(s,vals)=>{
      if(!vals.name){ UI.toast('请填写食堂名称'); return false; }
      const nid = 'C'+(DB.canteens.length+1);
      DB.canteens.push({ id:nid, name:vals.name, manager:vals.manager||'—', location:vals.location||'—', status:vals.status||'ok' });
      return true;
    },
    actions:[
      { action:'edit', label:'编辑', cls:'btn-line' },
      { action:'toggle', label:'停用', cls:'btn-danger', show:r=>r.status!=='disabled' },
      { action:'toggle', label:'启用', cls:'btn-soft', show:r=>r.status==='disabled' },
    ],
    onAction:(s, act, id, draw)=>{
      const c = DB.canteens.find(x=>x.id===id); if(!c) return;
      if (act==='toggle'){
        c.status = c.status==='disabled' ? 'ok' : 'disabled';
        draw(); UI.toast(c.status==='disabled' ? '已停用该食堂' : '已恢复启用');
        return;
      }
      if (act==='edit'){
        const body = `<form class="form-grid" id="frmBiz">
          ${UI.field('食堂名称', UI.input('name', c.name))}
          ${UI.field('负责人', UI.input('manager', c.manager))}
          ${UI.field('位置', UI.input('location', c.location))}
          ${UI.field('状态', UI.select('status', [{v:'ok',t:'正常'},{v:'warn',t:'预警'},{v:'danger',t:'异常'},{v:'disabled',t:'已停用'}], c.status))}
        </form>`;
        const m = UI.modal({ title:'编辑食堂 · '+c.name, body, footer:`<button class="btn btn-line" data-c="no">取消</button><button class="btn btn-primary" data-c="yes">保存</button>` });
        m.el.addEventListener('click', (e)=>{
          if (e.target.dataset.c==='yes'){
            const f = UI.q('#frmBiz', m.el);
            c.name = UI.q('[name="name"]', f).value || c.name;
            c.manager = UI.q('[name="manager"]', f).value || c.manager;
            c.location = UI.q('[name="location"]', f).value || c.location;
            c.status = UI.q('[name="status"]', f).value;
            m.close(); draw(); UI.toast('已保存修改');
          }
          if (e.target.dataset.c==='no') m.close();
        });
      }
    }
  });

  /* ---------- 导出视图表 ---------- */
  window.Monitor = Monitor;
  window.Views = {
    dashboard, video, iot, alarm, sample, person, check, access, ledger, patrol, recipe,
    users, roles, perm, sys, review_warn, review_patrol, data_overview, business
  };
})();
