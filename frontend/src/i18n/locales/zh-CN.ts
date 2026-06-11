/**
 * 中文简体文案
 *
 * 命名规范：
 *   {页面}.{区域}.{元素}
 *   例如：home.hero.title / discover.search.placeholder
 *
 * 插值语法：
 *   "已选 {{count}} 个"  →  t('home.manage.selected', { count: 3 })
 *
 * 添加 en-US 时，复制此文件为 en-US.ts 并翻译 value 部分即可。
 */
const zhCN = {
  // ═══════════════════════════════════════════════════════════
  //  App (底部导航 + 全局)
  // ═══════════════════════════════════════════════════════════
  app: {
    name: '老舅厨房',
    nameEn: "Uncle Joe's Kitchen",
    loading: '登录中…',
    nav: {
      home: '首页',
      discover: '发现',
      timers: '计时器',
      pantry: '食材库',
      profile: '我的',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  通用
  // ═══════════════════════════════════════════════════════════
  common: {
    cancel: '取消',
    save: '保存',
    saving: '保存中…',
    delete: '删除',
    confirm: '确认',
    back: '返回',
    retry: '点击重试',
    search: '搜索',
    all: '全部',
    loading: '加载中…',
    noData: '无数据',
    loadFailed: '加载失败',
    saveFailed: '保存失败，请重试',
    deleteFailed: '删除失败',
    operationFailed: '操作失败',
    uncategorized: '未分类',
    yuan: '¥',
    serving: '份',
    difficulty: {
      easy: '容易',
      medium: '中等',
      hard: '极难',
    },
    difficultyLabel: {
      easy: '容易做',
      medium: '中等难度',
      hard: '高难度',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  HomeView
  // ═══════════════════════════════════════════════════════════
  home: {
    hero: {
      greeting: 'Hi, 厨神',
      subtitle: '今天想做什么好吃的？',
    },
    search: {
      placeholder: '搜索我的菜谱...',
    },
    tabs: {
      mine: '我创建的',
      favorites: '我收藏的',
    },
    category: {
      systemCategory: '系统分类',
      myCategory: '我创建的分类',
    },
    manage: {
      button: '管理',
      title: '批量管理',
      selected: '已选 {{count}}',
      confirmDelete: '确认删除选中的 {{count}} 个菜谱？只能删自己作者的；其他会被忽略。',
      deleteResult: '已删除 {{deleted}} 个菜谱',
      deleteResultPartial: '已删除 {{deleted}} 个菜谱（其中 {{skipped}} 个非你创建，已跳过）',
    },
    empty: {
      title: '没找到相关的美味菜谱',
      subtitle: '可以试试更换关键词，或者创建一个！',
    },
    cost: '约¥{{cost}}',
    fab: {
      manual: '手动创建菜谱',
      aiImport: '智能导入',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  RecipeImportView
  // ═══════════════════════════════════════════════════════════
  import: {
    title: '智能导入菜谱',
    inputPlaceholder: '粘贴从小红书、抖音、微博等复制的菜谱文本...',
    paste: '粘贴',
    analyze: '开始识别',
    analyzing: 'AI 正在分析菜谱...',
    tooShort: '内容太少，请粘贴完整的菜谱（至少20字）',
    lowConfidence: '部分内容可能识别不准确，请检查后保存',
    failed: '未能识别菜谱内容，请尝试粘贴更详细的菜谱文本',
    originalText: '原文',
    originalCollapsed: '查看原文',
    originalExpanded: '收起原文',
    confirm: '确认并创建菜谱',
    reanalyze: '重新识别',
    parsedTitle: '识别结果',
    ingredients: '食材',
    steps: '步骤',
    difficulty: '难度',
    servings: '份量',
    time: '时间',
    edit: '编辑',
    confidenceHigh: '识别可信度：高',
    confidenceMedium: '识别可信度：中（请检查标注处）',
    confidenceLow: '识别可信度：低（建议仔细核对）',
    rateLimited: '调用过于频繁，请稍后再试',
  },

  // ═══════════════════════════════════════════════════════════
  //  DiscoverView
  // ═══════════════════════════════════════════════════════════
  discover: {
    title: '发现美味',
    search: {
      placeholder: '搜索公开菜谱...',
    },
    empty: '暂无公开菜谱',
    featured: '官方推荐',
    favorite: '收藏',
  },

  // ═══════════════════════════════════════════════════════════
  //  PantryView
  // ═══════════════════════════════════════════════════════════
  pantry: {
    title: '我的食材库',
    goShoppingList: '采购清单',
    search: {
      placeholder: '搜索食材...',
    },
    storage: {
      room_temp: '常温',
      refrigerated: '冷藏',
      frozen: '冷冻',
    },
    date: {
      today: '今天',
      yesterday: '昨天',
      daysAgo: '{{days}} 天前',
      weeksAgo: '{{weeks}} 周前',
    },
    expiry: {
      none: '未设保质期',
      expired: '已过期 {{days}} 天',
      expiresToday: '今天到期',
      daysLeft: '还剩 {{days}} 天',
      until: '保质至 {{date}}',
    },
    fresh: '新鲜',
    exhausted: '已耗尽',
    exhaustedSection: '已耗尽（{{count}}项）',
    supplier: '供应商: {{name}}',
    supplierDefault: '永辉超市',
    lastPurchased: '最后购买: {{date}}',
    stock: '库存: {{display}}',
    empty: '食材库中暂无匹配项',
    confirmRemove: '确定删除此食材？所有采购记录将丢失，此操作不可恢复！',
    quickPrices: {
      title: '常用调料价格',
      soySauce: '生抽',
      darkSoySauce: '老抽',
      salt: '盐',
    },
    addModal: {
      title: '新增入库食材',
      nameLabel: '食材名称',
      namePlaceholder: '例如：鲜五花肉、西红柿',
      linkedHint: '已关联公共食材',
      categoryLabel: '食材分类',
      amountLabel: '购买数量',
      unitLabel: '单位',
      costLabel: '总花费 ¥',
      supplierLabel: '推荐供应商',
      supplierPlaceholder: '例如：永辉生鲜店、盒马生鲜',
      expiryLabel: '保质期 (到期日)',
      storageLabel: '储存方式',
      submit: '确认食材入库',
      stockConversion: '换算库存：{{from}} {{fromUnit}} ≈ {{to}} {{toUnit}}',
      autoPrice: '自动单价：¥{{price}}/{{unit}}',
      unitNotSupported: '单位 "{{unit}}" 暂不支持自动换算。\n请改用：g / kg / 斤 / 两 / ml / L / 勺 / 杯 / 个 / 片 / 根 等。',
      alertEnterAmount: '请输入购买数量',
      alertEnterCost: '请输入总花费',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  CreateRecipeView
  // ═══════════════════════════════════════════════════════════
  create: {
    title: '创建菜谱',
    titleEdit: '编辑菜谱',
    cover: {
      add: '添加封面照片',
      change: '点击更换',
      uploading: '上传中…',
    },
    name: {
      label: '菜谱名称',
      placeholder: '例如：番茄炒蛋',
      required: '请填写菜谱名称！',
    },
    story: {
      label: '菜谱故事',
      placeholder: '分享这道菜背后的精彩故事...',
    },
    category: {
      label: '菜谱分类（可多选）',
      myCategory: '我自建的分类',
      systemCategory: '系统分类',
      newPlaceholder: '新建分类，如「我的最爱」',
      newButton: '新建',
      createFailed: '创建分类失败',
    },
    visibility: {
      public: '公开到发现页',
      private: '仅自己可见',
      publicDesc: '其他用户可以在发现页看到这道菜谱',
      privateDesc: '只有你自己能看到，可以随时改为公开',
    },
    meta: {
      difficulty: '难度: {{level}}',
      cookTime: '时长: {{time}}',
    },
    servings: {
      label: '基准份量',
      units: {
        serving: '份',
        perPerson: '人份',
        gram: '克',
        bowl: '碗',
      },
    },
    ingredients: {
      title: '食材清单',
      addMain: '加主料',
      addSeasoning: '加调料',
      namePlaceholder: '输入食材名（可搜索）',
      linkedHint: '已关联食材库',
      amountPlaceholder: '用量',
      unitPlaceholder: '单位',
      scaleLinear: '等比',
      scaleSubLinear: '亚线性',
      scaleFixed: '固定',
      myPantry: '我的食材库',
      publicLibrary: '公共食材库',
      noMatch: '没有匹配的食材，直接输入即可作为自定义食材',
      searching: '搜索中…',
    },
    steps: {
      title: '制作步骤',
      add: '添加步骤',
      step: '第 {{number}} 步',
      descPlaceholder: '详细描述这个步骤的操作细节，如：热油锅，放入葱蒜爆香...',
      timerLabel: '需要倒计时计时器',
      timerUnit: '单位: 秒',
      tagLabel: '标记计时标签',
      tagPlaceholder: '例如: 慢炖',
    },
    advanced: {
      title: '高级设置 (标签、场景)',
      tagsLabel: '自定标签 (逗号分隔)',
      tagsPlaceholder: '如: 中餐, 快手, 经典',
    },
    submit: {
      publish: '发布菜谱',
      saveEdit: '保存修改',
      draft: '保存为草稿',
      incomplete: '这道菜谱还缺少{{missing}}，发布后用户无法进入烹饪模式。\n是否改为"保存为草稿"？\n（确认=存草稿；取消=回去补全）',
      fewIngredients: '这道菜只有 1 种食材，确认要发布吗？建议补充调料和辅料让菜谱更完整。',
      missingIngredients: '用料',
      missingSteps: '步骤',
      failedCreate: '创建菜谱失败',
      failedEdit: '保存修改失败',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  RecipeDetailView
  // ═══════════════════════════════════════════════════════════
  detail: {
    loading: '正在装载美味菜谱...',
    addToMealPlan: '加入餐单',
    mealPlanDate: '日期',
    mealPlanMeal: '餐次',
    mealPlanServings: '份数',
    mealPlanConfirm: '确认加入',
    mealPlanAdded: '已加入餐单',
    mealPlanAddFailed: '添加失败',
    error: {
      title: '加载失败',
      notFound: '无法找到该菜谱',
    },
    menu: {
      edit: '编辑菜谱',
      delete: '删除菜谱',
      confirmDelete: '确认删除菜谱「{{title}}」？该操作不可恢复',
    },
    portions: {
      title: '份量调节',
      display: '{{count}} 份',
      base: '基准: {{base}}份 → 当前:',
      current: '{{count}}份 ({{multiplier}}x)',
    },
    units: {
      gml: '克/毫升',
      jinliang: '斤/两',
      ozlb: 'oz/lb',
      nonLinearHint: '含非线性换算',
    },
    groups: {
      main: '主料',
      seasoning: '调料',
      other: '其他',
      fixed: '固定用量',
      fixedLabel: '固定',
      subLinear: '亚线性',
    },
    cost: {
      title: '预估成本',
      total: '本次预估: ¥{{cost}}',
      perServing: '单份成本: ¥{{cost}}',
    },
    steps: {
      show: '查看步骤',
      hide: '收起步骤',
    },
    incomplete: {
      noIngredients: '没有用料',
      noSteps: '没有步骤',
      warning: '这道菜谱还不完整',
      canEdit: '点击右上角 ⋯ → 编辑菜谱来补全。',
      cannotCook: '暂时无法进入烹饪模式。',
      confirmEdit: '菜谱还不完整，是否现在去补全？',
      alertIncomplete: '菜谱还不完整，请先补全用料和步骤。',
    },
    cooking: {
      start: '开始烹饪 (SOP模式)',
      goComplete: '去补全菜谱',
      incomplete: '菜谱不完整',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  SopView
  // ═══════════════════════════════════════════════════════════
  sop: {
    loading: '正在开火就绪中...',
    stepProgress: '步骤 {{current}}/{{total}}',
    stepLabel: '步骤 {{number}}',
    noTimer: '本步骤无需精确定时',
    activeTimers: '{{count}} 个计时中',
    prevStep: '上一步',
    nextStep: '下一步',
    finish: '完成烹饪',
    exit: '退出厨房模式',
    timerLabel: '{{title}}步骤{{step}}',
    timerDone: '叮！{{title}}的第 {{step}} 步计时已完成！',
    timerRunning: '计时中',
    timerStart: '开始计时',
    allDone: '恭喜！您已成功完成全部烹饪步骤，大功告成！',
    logFailed: '记录烹饪失败',
    shortage: {
      title: '部分食材库存不足',
      desc: '下面这些食材按菜谱需要的量算，扣不全。可以继续烹饪（有多少扣多少），也可以先去补货。',
      notInPantry: '食材库没有',
      noStock: '未填库存',
      unitMismatch: '单位不匹配',
      goShop: '去补货',
      continueCooking: '继续烹饪',
      need: '需要',
      stockIs: '，库存',
      deficit: '（差 {{amount}}{{unit}}）',
      noStockDetail: '，食材库里这一项还没填数量',
      unmatchedDetail: '，食材库里还没有这个食材',
    },
    receipt: {
      title: '烹饪完成！',
      deducted: '已根据菜谱用量从食材库自动扣减。',
      noDeduction: '本次没有食材被自动扣减——可能因为菜谱里的食材尚未关联到你的食材库。',
      totalCost: '总成本',
      unmatched: '未关联库存（未扣减）',
      unitMismatch: '（单位不匹配）',
      noStockNote: '（库存为空）',
      undo: '撤销扣减 ({{seconds}}s)',
      undone: '已撤销',
      undoExpired: '撤销已过期',
      done: '完成',
      tipBefore: '小贴士：在编辑菜谱时，点击食材名右侧的',
      tipAfter: '可从「我的食材库」选择食材，下次烹饪即可自动扣减库存并核算成本。',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  TimerView
  // ═══════════════════════════════════════════════════════════
  timer: {
    title: '我的计时器',
    paused: '已暂停',
    completed: '已完成',
    restart: '再来一次',
    empty: '所有计时器都会在这里显示',
    custom: {
      title: '自定义计时器',
      create: '新建计时器',
      nameLabel: '计时器名称',
      namePlaceholder: '例如：慢炖牛肉',
      durationLabel: '持续时间',
      hours: '时',
      minutes: '分',
      seconds: '秒',
      start: '开始计时',
      defaultLabel: '慢炖牛肉',
      alertZeroDuration: '请指定大于零的倒计时时间！',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  ProfileView
  // ═══════════════════════════════════════════════════════════
  profile: {
    loading: '正在载入厨神档案...',
    edit: {
      title: '编辑资料',
      avatarHint: '点击更换头像',
      avatarUploadFailed: '头像上传失败: {{error}}',
      nicknameLabel: '昵称',
      nicknamePlaceholder: '输入你的昵称',
      nicknameRequired: '昵称不能为空',
      saveFailed: '保存失败: {{error}}',
      userId: '用户 ID',
      role: '角色',
      roleAdmin: '管理员',
      roleUser: '普通用户',
      registeredAt: '注册时间',
    },
    about: {
      title: '关于我们',
      version: '版本 {{version}}',
      description: '老舅厨房是一款智能家庭烹饪助手，帮助您管理菜谱、食材库存、烹饪计时和成本核算，让每一餐都精打细算、美味加倍。',
      privacy: '隐私政策',
      terms: '用户协议',
      contactHint: '如有问题或建议，请联系我们',
    },
    stats: {
      recipes: '菜谱',
      cooking: '烹饪',
      favorites: '收藏',
    },
    bento: {
      pantry: '食材库管理',
      cost: '成本统计',
      history: '烹饪历史',
      historyCollapse: '收起历史',
      favorites: '我的收藏',
    },
    history: {
      title: '最近烹饪记录',
      empty: '暂无烹饪记录',
      meta: '{{date}} · 制作 {{servings}}{{unit}}',
    },
    autoDeduct: {
      title: '烹饪后自动扣库存',
      desc: '开启后，完成烹饪会按菜谱用量从食材库扣减。30 秒内可撤销。',
    },
    menu: {
      myRecipes: '我的菜谱',
      mealPlan: '餐单规划',
      shoppingList: '采购清单',
      admin: '后台管理中心',
      notifications: '消息通知',
      share: '推荐给好友',
      feedback: '意见反馈',
      help: '帮助中心',
      replayOnboarding: '重新查看引导',
      about: '关于我们',
    },
    share: {
      title: '老舅厨房 — 智能家庭烹饪助手',
      text: '推荐一个超好用的烹饪 App，菜谱管理、食材库存、成本核算一站搞定！',
      wxHint: '请点击右上角 ⋯ 按钮，选择「转发给朋友」即可分享',
      copied: '链接已复制到剪贴板，快去分享给好友吧！',
      copyFailed: '请手动复制链接分享给好友',
    },
    featureComingSoon: '功能「{{name}}」开发中，敬请期待',
  },

  // ═══════════════════════════════════════════════════════════
  //  Share / Poster
  // ═══════════════════════════════════════════════════════════
  share: {
    shareRecipe: '分享菜谱',
    generating: '正在生成分享海报…',
    saveImage: '保存图片',
    close: '关闭',
    longPressHint: '长按图片保存到相册',
    error: {
      generateFailed: '生成分享码失败',
      canvasFailed: '海报生成失败，请重试',
      saveFailed: '保存失败',
    },
    poster: {
      ingredientsTitle: '精选用料',
      moreIngredients: '还有 {{count}} 种食材…',
      scanToView: '扫码查看完整做法',
      brandName: '老舅厨房',
      brandSlogan: '家的味道，用心烹饪',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  MyRecipesView
  // ═══════════════════════════════════════════════════════════
  myRecipes: {
    title: '我的菜谱',
    manage: '批量管理',
    selectAll: '全选',
    deselectAll: '取消全选',
    deleteCount: '删除 ({{count}})',
    confirmDelete: '确认删除选中的 {{count}} 个菜谱？此操作不可恢复。',
    deleteResult: '已删除 {{count}} 个菜谱',
    empty: {
      title: '你还没创建过菜谱',
      subtitle: '回到首页点 + 号开始创建吧',
    },
    status: {
      published: '已发布',
      draft: '草稿',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  ShoppingListView (采购清单)
  // ═══════════════════════════════════════════════════════════
  shoppingList: {
    title: '采购清单',
    subtitle: '选择菜谱并生成采购清单',
    selectRecipes: '选择菜谱',
    searchPlaceholder: '搜索菜谱…',
    noRecipesFound: '没有找到菜谱',
    selectedCount: '已选 {{count}} 道菜',
    servings: '{{count}} 份',
    generate: '生成清单',
    generating: '生成中…',
    result: '采购清单',
    totalCost: '预估总费用',
    costUnknown: '部分食材无价格',
    sourceRecipes: '来源菜谱',
    groupOther: '其他',
    inStock: '已有库存',
    need: '需要',
    stock: '库存',
    deficit: '还需',
    purchased: '已购',
    addItem: '手动添加',
    addItemPlaceholder: '食材名称',
    addItemAmount: '数量',
    addItemUnit: '单位',
    empty: '暂无采购项',
    goMealPlan: '去规划本周餐单 →',
    back: '返回',
    reset: '重新选择',
    shareText: '分享文本',
    copied: '已复制到剪贴板',
    copyFailed: '复制失败',
    error: {
      generateFailed: '生成采购清单失败',
      loadRecipesFailed: '加载菜谱列表失败',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  MealPlanView (餐单规划)
  // ═══════════════════════════════════════════════════════════
  mealPlan: {
    title: '本周餐单',
    subtitle: '规划每日三餐',
    thisWeek: '本周',
    prevWeek: '上一周',
    nextWeek: '下一周',
    weekLabel: '{{month}}月{{startDay}}日 - {{endMonth}}月{{endDay}}日',
    days: {
      mon: '周一',
      tue: '周二',
      wed: '周三',
      thu: '周四',
      fri: '周五',
      sat: '周六',
      sun: '周日',
    },
    meals: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐',
    },
    addRecipe: '添加菜谱',
    selectRecipe: '选择菜谱',
    searchPlaceholder: '搜索菜谱…',
    noRecipes: '没有找到菜谱',
    servings: '{{count}} 份',
    confirmDelete: '确认移除「{{title}}」？',
    empty: '暂无安排，点击 + 添加菜谱',
    toShoppingList: '生成本周采购清单',
    generating: '生成中…',
    noPlans: '本周暂无餐单安排',
    error: {
      addFailed: '添加失败',
      deleteFailed: '删除失败',
      loadFailed: '加载餐单失败',
      shoppingListFailed: '生成采购清单失败',
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  Onboarding (新用户引导)
  // ═══════════════════════════════════════════════════════════
  onboarding: {
    skip: '跳过',
    next: '下一步',
    start: '立即开始',
    pages: {
      welcome: {
        title: '欢迎来到老舅厨房',
        desc: '您的智能家庭烹饪助手。管理菜谱、精准换算用量、一键生成采购清单，让每一餐都轻松搞定。',
      },
      recipes: {
        title: '记录专属菜谱',
        desc: '随时记录家传菜谱或灵感菜品。食材、用量、步骤一应俱全，再也不怕忘记配方。',
      },
      scaling: {
        title: '智能动态换算',
        desc: '做 2 人份还是 8 人份？主料等比放大，调料智能亚线性换算，不会越做越咸。',
      },
      sop: {
        title: 'SOP 厨房模式',
        desc: '一步一步跟着做，每步自带计时器。烹饪完成自动扣库存、记成本，新手也能做出大厨味。',
      },
      mealPlan: {
        title: '餐单规划 & 采购闭环',
        desc: '提前规划一周三餐，一键生成采购清单。从计划到买菜到做饭，全流程无缝衔接。',
      },
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  Feature Hints (场景化轻提示)
  // ═══════════════════════════════════════════════════════════
  hints: {
    createRecipe: '调料推荐使用"亚线性"换算类型，做多人份时不会越调越咸哦',
    sopMode: '每一步都可以启动独立计时器，到时间会自动提醒',
    shoppingList: '选择多道菜谱可以自动合并相同食材，减少重复购买',
    mealPlan: '安排好一周餐单后，点底部按钮一键生成采购清单',
    pantry: '食材入库后，烹饪完成会自动扣减库存，帮你追踪消耗',
  },

  // ═══════════════════════════════════════════════════════════
  //  Help Center (帮助中心)
  // ═══════════════════════════════════════════════════════════
  help: {
    title: '帮助中心',
    heroTitle: '需要帮助？',
    heroDesc: '这里汇总了所有功能的使用指南，点击展开查看详情。',
    sections: {
      quickstart: {
        title: '快速上手',
        content: '1. 注册/登录后进入首页\n2. 点击右下角 + 创建你的第一道菜谱\n3. 添加食材和步骤，保存后即可使用\n4. 在菜谱详情页点击"开始做菜"进入 SOP 模式\n5. 做完后查看用料成本和库存变化',
      },
      recipes: {
        title: '菜谱管理',
        content: '创建菜谱时可以设置：\n\n- 基础份数（如"2人份"）\n- 食材分组（主料/辅料/调味料）\n- 每种食材的换算类型\n- 步骤描述和计时器\n\n菜谱支持草稿/发布状态切换，发布后可在"发现"页被其他用户看到。',
      },
      scaling: {
        title: '动态换算说明',
        content: '三种换算类型：\n\n- 线性(linear)：等比缩放，适用于主料和液体\n- 亚线性(sub_linear)：增幅递减，适用于调味料\n  例：2份→4份，盐不是翻倍而是×1.6\n- 固定(fixed)：不变，适用于蒜瓣、姜片等少量点缀\n\n换算因子默认0.7，可在食材设置中调整。',
      },
      sop: {
        title: 'SOP 厨房模式',
        content: '进入 SOP 模式后：\n\n1. 左右滑动或点击箭头切换步骤\n2. 有计时器的步骤会显示"开始计时"按钮\n3. 计时器可在后台运行，到时间会震动提醒\n4. 最后一步完成后展示用料和成本汇总\n5. 如果开启了"自动扣库存"，完成后会自动扣减食材库',
      },
      mealplan: {
        title: '餐单规划 & 采购清单',
        content: '餐单规划：\n- 按周查看，每天分早/午/晚三餐\n- 点击 + 为每餐添加菜谱\n- 支持上/下周切换\n\n采购清单：\n- 可从餐单一键生成\n- 也可手动选择多道菜谱生成\n- 自动合并相同食材、换算单位\n- 对比食材库库存，标记已有和缺口\n- 勾选已购项目追踪采购进度',
      },
      pantry: {
        title: '食材库与成本核算',
        content: '食材库管理：\n- 添加食材并设置单价和库存\n- 支持保质期和储存方式标记\n- 按分类筛选查看\n\n成本核算：\n- 每次烹饪自动计算用料成本\n- 成本 = 用量 × 单价（优先用您的采购价）\n- 烹饪历史记录每次成本供对比',
      },
      faq: {
        title: '常见问题',
        content: 'Q: 换算后调料太多怎么办？\nA: 将调味料的换算类型改为"亚线性"，或调低换算因子\n\nQ: 怎么分享菜谱给朋友？\nA: 在菜谱详情页点击分享按钮，生成海报或小程序码\n\nQ: 库存扣错了怎么办？\nA: 完成烹饪后 30 秒内可在弹窗中点击"撤销"\n\nQ: 能导入别人的菜谱吗？\nA: 扫描好友分享的小程序码即可查看并收藏',
      },
    },
  },
};

export default zhCN;
