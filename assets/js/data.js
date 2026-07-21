/* =========================================================
 *  食安管理平台 · 业务数据层
 *  内置全量业务数据，覆盖各角色终端与设备/报警/人员等模块
 * ========================================================= */
(function (global) {
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[rnd(0, arr.length - 1)];
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const daysAgo = (d) => { const t = new Date(); t.setDate(t.getDate() - d); return t; };
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  const fmtDate = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  // ---------- 食堂 ----------
  const canteens = [
    { id: 'C1', name: '第一食堂（员工餐厅）', manager: '张建国', location: 'A 栋 1F', status: 'ok' },
    { id: 'C2', name: '第二食堂（风味餐厅）', manager: '李秀兰', location: 'B 栋 2F', status: 'ok' },
    { id: 'C3', name: '第三食堂（清真餐厅）', manager: '王磊', location: 'C 栋 1F', status: 'warn' },
    { id: 'C4', name: '教工食堂', manager: '陈芳', location: 'D 栋 3F', status: 'ok' },
    { id: 'C5', name: '夜宵食堂', manager: '赵强', location: 'E 栋 B1', status: 'danger' },
    { id: 'C6', name: '会展中心临时食堂', manager: '孙倩', location: 'F 栋 1F', status: 'ok' },
  ];
  const canteenName = (id) => (canteens.find(c => c.id === id) || {}).name || id;

  // ---------- 权限点 ----------
  const permissions = [
    { id: 'p_dash', module: '控制台', name: '数据看板', desc: '查看食安综合数据看板' },
    { id: 'p_user', module: '用户', name: '用户管理', desc: '查看/新增/禁用平台用户' },
    { id: 'p_role', module: '用户', name: '角色管理', desc: '维护角色与职责分配' },
    { id: 'p_perm', module: '用户', name: '权限管理', desc: '配置权限点与角色授权' },
    { id: 'p_sys', module: '系统', name: '参数设置', desc: '系统参数与平台维护' },
    { id: 'p_video', module: '监管', name: '视频监控', desc: '实时/回放视频查看' },
    { id: 'p_iot', module: '监管', name: '物联设备', desc: 'IoT 设备查看与管理' },
    { id: 'p_alarm', module: '监管', name: '异常识别', desc: 'AI 异常行为报警查看' },
    { id: 'p_sample', module: '业务', name: '留样管理', desc: '食品留样维护与展示' },
    { id: 'p_ledger', module: '业务', name: '台账填报', desc: '消毒/晨检等台账填报' },
    { id: 'p_patrol', module: '业务', name: '食安巡查', desc: '巡检与食安巡查记录' },
    { id: 'p_recipe', module: '业务', name: '菜谱维护', desc: '菜谱信息维护' },
    { id: 'p_person', module: '业务', name: '人员管理', desc: '从业人员信息与健康证' },
    { id: 'p_check', module: '业务', name: '晨午晚检', desc: '晨午晚检查设备数据' },
    { id: 'p_access', module: '业务', name: '门禁管理', desc: '门禁卡录入与记录' },
    { id: 'p_review_warn', module: '审核', name: '预警审核', desc: '预警信息审批' },
    { id: 'p_review_patrol', module: '审核', name: '巡查审核', desc: '巡查记录审批' },
  ];

  // ---------- 角色（仅保留登录页下拉选择的 4 类身份） ----------
  const roles = [
    { id: 'R0', name: '平台管理员', scope: 'platform', perms: permissions.map(p => p.id) },
    { id: 'R2', name: '食堂管理员', scope: 'canteen', perms: ['p_dash','p_user','p_role','p_video','p_sample','p_person','p_check','p_iot','p_review_warn','p_review_patrol'] },
    { id: 'R5', name: '从业人员', scope: 'canteen', perms: ['p_dash','p_recipe','p_ledger'] },
    { id: 'R6', name: '监管用户', scope: 'supervise', perms: ['p_dash','p_video','p_iot','p_alarm','p_sample','p_person','p_access'] },
  ];

  // ---------- 用户 ----------
  const firstNames = ['张','李','王','赵','陈','刘','杨','黄','周','吴','徐','孙','马','朱','胡','林','郭','何','高','罗'];
  const givenNames = ['建国','秀兰','磊','强','芳','倩','伟','敏','静','涛','勇','艳','杰','娟','涛','明','霞','平','刚','丽'];
  const users = [];
  let uid = 1;
  const rolePool = ['R2','R5','R6'];
  canteens.forEach((c) => {
    const n = rnd(3, 5);
    for (let i = 0; i < n; i++) {
      const name = pick(firstNames) + pick(givenNames);
      users.push({
        id: 'U' + uid++, name, username: 'user' + uid, role: pick(rolePool),
        canteen: c.id, phone: '13' + rnd(100000000, 999999999),
        lastLogin: fmt(daysAgo(rnd(0, 9))), status: Math.random() > .12 ? 'ok' : 'disabled'
      });
    }
  });
  // 平台管理员
  users.unshift({ id: 'U0', name: '系统管理员', username: 'admin', role: 'R0', canteen: 'ALL', phone: '13800000000', lastLogin: fmt(daysAgo(0)), status: 'ok' });

  // ---------- 物联网设备 ----------
  const iotTypes = [
    { type: '离地靠墙传感', icon: '📏', unit: 'cm', min: 0, max: 30, good: [3, 12], canteen: true },
    { type: '温湿度传感器', icon: '🌡️', unit: '℃', min: -5, max: 40, good: [0, 8], canteen: true },
    { type: '挡鼠板检测', icon: '🪤', unit: '状态', min: 0, max: 1, good: [1, 1], canteen: true },
    { type: '消毒柜传感器', icon: '🧼', unit: '℃', min: 60, max: 130, good: [100, 125], canteen: true },
    { type: '冰箱温度', icon: '❄️', unit: '℃', min: -25, max: 10, good: [-18, -2], canteen: true },
    { type: '油烟浓度', icon: '💨', unit: 'mg/m³', min: 0, max: 8, good: [0, 2], canteen: true },
  ];
  const iotDevices = [];
  let did = 1;
  canteens.forEach((c) => {
    iotTypes.forEach((t) => {
      const count = rnd(2, 4);
      for (let i = 0; i < count; i++) {
        let value, status = 'ok';
        if (t.unit === '状态') { value = Math.random() > .1 ? 1 : 0; status = value ? 'ok' : 'danger'; }
        else {
          value = +(t.min + Math.random() * (t.max - t.min)).toFixed(1);
          if (value < t.good[0] || value > t.good[1]) status = Math.random() > .5 ? 'warn' : 'danger';
        }
        iotDevices.push({
          id: 'D' + did++, name: `${canteenName(c.id).slice(0,4)}·${t.type}#${i+1}`,
          type: t.type, icon: t.icon, unit: t.unit, canteen: c.id,
          value, status, online: Math.random() > .05,
          lastUpdate: fmt(daysAgo(0)), battery: rnd(40, 100)
        });
      }
    });
  });

  // ---------- 异常行为报警 ----------
  const alarmTypes = [
    { type: '未正确着装', icon: '🥼', level: 'warn' },
    { type: '抽烟', icon: '🚬', level: 'danger' },
    { type: '垃圾桶未盖', icon: '🗑️', level: 'warn' },
    { type: '有老鼠', icon: '🐭', level: 'danger' },
    { type: '玩手机', icon: '📱', level: 'warn' },
    { type: '未戴口罩', icon: '😷', level: 'warn' },
    { type: '陌生人闯入', icon: '🚷', level: 'danger' },
  ];
  const alarms = [];
  let aid = 1;
  for (let i = 0; i < 46; i++) {
    const at = pick(alarmTypes);
    const c = pick(canteens);
    const handled = Math.random() > .4;
    alarms.push({
      id: 'A' + aid++, time: fmt(daysAgo(rnd(0, 14))), canteen: c.id,
      camera: `${c.id}-CAM-${rnd(1,8)}`, type: at.type, icon: at.icon, level: at.level,
      handled, handler: handled ? pick(['张建国','李秀兰','王磊','陈芳']) : '--',
      soundLight: Math.random() > .3 ? '已触发声光提醒' : '设备离线未触发'
    });
  }
  alarms.sort((a, b) => b.time.localeCompare(a.time));

  // ---------- 留样 ----------
  const dishes = ['红烧肉','清蒸鲈鱼','宫保鸡丁','番茄炒蛋','麻婆豆腐','白切鸡','糖醋排骨','蒜蓉西兰花','紫菜蛋花汤','米饭','馒头','小炒黄牛肉','凉拌黄瓜','酸辣土豆丝','冬瓜排骨汤'];
  const samples = [];
  let sid = 1;
  canteens.forEach((c) => {
    const n = rnd(5, 9);
    for (let i = 0; i < n; i++) {
      const d = daysAgo(rnd(0, 12));
      const retain = new Date(d); retain.setDate(retain.getDate() + 48);
      samples.push({
        id: 'S' + sid++, date: fmtDate(d), canteen: c.id, meal: pick(['早餐','午餐','晚餐']),
        dish: pick(dishes), person: pick(users.filter(u=>u.canteen===c.id).map(u=>u.name).concat(['张建国'])),
        weight: rnd(120, 200), temp: rnd(2, 6), retainUntil: fmtDate(retain),
        status: retain > new Date() ? 'ok' : 'expired', photo: '🍱'
      });
    }
  });

  // ---------- 人员 / 健康证 ----------
  const posts = ['厨师','面点师','洗消工','配菜员','食品安全员','留样员','仓管','服务员'];
  const personnel = [];
  let pid = 1;
  canteens.forEach((c) => {
    const n = rnd(6, 11);
    for (let i = 0; i < n; i++) {
      const name = pick(firstNames) + pick(givenNames);
      const exp = daysAgo(rnd(-30, 400));
      const expired = exp < new Date();
      personnel.push({
        id: 'P' + pid, empNo: 'E' + pad(pid, 4), name, phone: '13' + rnd(100000000, 999999999),
        post: pick(posts), canteen: c.id,
        healthStatus: expired ? 'expired' : (Math.random() > .9 ? 'warn' : 'ok'),
        healthExpire: fmtDate(exp), photo: '👤'
      });
      pid++;
    }
  });

  // ---------- 晨午晚检 ----------
  const checkTypes = ['晨检','午检','晚检'];
  const checks = [];
  let cid = 1;
  canteens.forEach((c) => {
    for (let d = 0; d < 6; d++) {
      checkTypes.forEach((ct) => {
        const ok = Math.random() > .18;
        checks.push({
          id: 'K' + cid++, date: fmtDate(daysAgo(d)), type: ct, canteen: c.id,
          person: pick(personnel.filter(p=>p.canteen===c.id).map(p=>p.name)),
          temp: (36 + Math.random() * 1.2).toFixed(1),
          status: ok ? 'ok' : 'warn',
          items: ok ? '体温正常 / 手部清洁 / 穿戴规范' : '手部卫生待改进',
          device: pick(['晨检机-A1','晨检机-B2','手持终端-C3'])
        });
      });
    }
  });

  // ---------- 门禁 ----------
  const access = [];
  let acd = 1;
  personnel.slice(0, 40).forEach((p) => {
    const n = rnd(1, 3);
    for (let i = 0; i < n; i++) {
      access.push({
        id: 'AC' + acd++, name: p.name, empNo: p.empNo, cardNo: 'C' + rnd(100000, 999999),
        canteen: p.canteen, time: fmt(daysAgo(rnd(0, 10))),
        result: Math.random() > .06 ? 'ok' : 'fail', type: pick(['刷卡','人脸','二维码'])
      });
      acd++;
    }
  });

  // ---------- 视频通道 ----------
  const videoScenes = ['收餐区','烹饪区','仓储区','留样间','洗消间','出入口','备餐区','粗加工'];
  const videos = [];
  canteens.forEach((c) => {
    videoScenes.slice(0, rnd(4, 7)).forEach((sc, i) => {
      videos.push({
        id: `${c.id}-CAM-${i+1}`, name: `${canteenName(c.id).slice(0,4)}·${sc}`,
        canteen: c.id, scene: sc, online: Math.random() > .1,
        alarm: Math.random() > .8
      });
    });
  });

  // ---------- 汇总统计 ----------
  const stats = {
    canteens: canteens.length,
    devices: iotDevices.length,
    devicesOnline: iotDevices.filter(d => d.online).length,
    devicesAlarm: iotDevices.filter(d => d.status !== 'ok').length,
    alarmsToday: alarms.filter(a => a.time.startsWith(fmtDate(new Date()))).length || rnd(3, 9),
    alarmsTotal: alarms.length,
    samples: samples.length,
    samplesExpired: samples.filter(s => s.status === 'expired').length,
    personnel: personnel.length,
    healthExpired: personnel.filter(p => p.healthStatus === 'expired').length,
    accessToday: rnd(120, 260),
  };

  // 近 7 天报警趋势
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    trend.push({ date: fmtDate(d), alarms: rnd(2, 11), checks: rnd(8, 16), samples: rnd(6, 14) });
  }

  global.DB = {
    canteens, canteenName, permissions, roles, users, iotDevices, iotTypes,
    alarms, alarmTypes, samples, dishes, personnel, posts, checks, checkTypes,
    access, videos, videoScenes, stats, trend,
    helpers: { rnd, pick, pad, fmt, fmtDate, daysAgo }
  };
})(window);
