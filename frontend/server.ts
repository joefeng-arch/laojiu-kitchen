import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database store
let users = {
  "default-user-id": {
    id: "default-user-id",
    nickname: "厨神小明",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAk4vUtysfDeQCBZ39Xh8PQzRQmAQW16noukCpUnXqgniXA31BvPT6HHdsBJaBNSQLDC2749ULF5mKhYJ_B1M27cJdPtjOKb3hVNDdApBVXXbTqfbKXyWtVvt0z5AUEDecRwMTsqBrmCALafha4leu8nwcpW3xSq5AL01OhD3kiuxf4RWMX6T_LxRRvvzJSwi-nw8yReDv6a9j9q1fUC91sYdlhvPR-8wa5lin5zWkqpoPXrLBlY77EzoDFwzy4U5U4bW14-bBMnSct",
    phone: "13800000000",
    role: "admin",
    points: 156,
    stats: {
      recipeCount: 23,
      cookingCount: 156,
      favoriteCount: 45
    },
    createdAt: "2026-05-01T00:00:00Z"
  }
};

let currentToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlZmF1bHQtdXNlci1pZCJ9";

let categories = [
  { id: 1, name: "中餐", type: "recipe", parentId: null, icon: "🥘", sortOrder: 0 },
  { id: 2, name: "西餐", type: "recipe", parentId: null, icon: "🍝", sortOrder: 1 },
  { id: 3, name: "烘焙", type: "recipe", parentId: null, icon: "🍞", sortOrder: 2 },
  { id: 4, name: "甜点", type: "recipe", parentId: null, icon: "🍰", sortOrder: 3 },
  { id: 5, name: "快手菜", type: "recipe", parentId: null, icon: "⚡", sortOrder: 4 },
  { id: 6, name: "今日热门", type: "recipe", parentId: null, icon: "🔥", sortOrder: 5 },
  { id: 7, name: "汤煲", type: "recipe", parentId: null, icon: "🍲", sortOrder: 6 }
];

let defaultRecipes = [
  {
    id: "recipe-sweet-sour-ribs",
    title: "糖醋排骨",
    description: "经典江南名菜，色泽红亮、酸甜适口、骨酥肉烂，是非常具有家常温度的美味。",
    coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-EwIs59VbsaZaUXtxEKNTHeg5eXlIhsqfeZke8se3KgovzLVpJIkwp_gbd008vKCFxHayvhbZh8YZ_2A9zbLYIeUfI6ODR0sJI0i7X2GOAJ-12YLjzRQpTVi1vMXgx65S1OheRyX0xUy1YTjsy09H1b0mQcRV6fs9nbrB9PW9lAEu8_Bk9wBTZBr2XA_am-uiiWFLzRBWFxkSueTIz1ABTNLirvsUYT29A30U9f9hcCBrQJXnMvEC4OSCgHJhT_93p7hNWYNJ2HbN",
    baseServings: 1,
    servingUnit: "份",
    difficulty: "easy",
    cookTime: "30-60min",
    mealScene: "dinner",
    tags: ["家常菜", "下饭", "酸甜"],
    isPublic: true,
    viewCount: 254,
    favoriteCount: 45,
    ratingAvg: 4.8,
    cookingTips: "先焯水洗净可以去腥味使肉质更紧致；炖煮调料配比遵循一勺料酒，两勺醋，三勺糖，四勺生抽的递增比例，小火慢炖是关键；大火收汁让糖分焦糖化，颜色红润诱人。",
    categories: [{ id: 1, name: "中餐" }],
    author: {
      id: "default-user-id",
      nickname: "厨神小李",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhvC6eOjJgTGttqnYme4teHtUsUIyaV8yHpfw-1peNZjijEXbZzQCCfanCx1IxnH3pmQuV0ro7cdAeD6UooaEX52PQYc9HURVk2Iss9QC3bQ6l9fttn9u_diIcH_gUQb7lJZx4Ps9BetBn8t18aaHLBJKlRXXgOv48p8Va3bLIVFaLaM8kou3-8bbw_8IxC1onCSm3oPgVf6b7BYOe--B3KSTiGo5YXXO8Dpz7j6pgTpGq1LoHp9Q6Ttl7qOR5Q7GJCOGIIzdUcWdN"
    },
    ingredients: [
      { id: 1, ingredientId: 101, name: "排骨", groupName: "主料", amount: 500, unit: "g", scaleType: "linear", scaleFactor: 1.0, sortOrder: 0, note: "切成3-4厘米小段", unitPrice: 0.04 },
      { id: 2, ingredientId: 102, name: "盐", groupName: "调料", amount: 5, unit: "g", scaleType: "sub_linear", scaleFactor: 0.7, sortOrder: 1, note: "炒锅及收汁调味分次加", unitPrice: 0.003 },
      { id: 3, ingredientId: 103, name: "醋", groupName: "调料", amount: 30, unit: "ml", scaleType: "linear", scaleFactor: 1.0, sortOrder: 2, note: "精制香醋，分两批加入", unitPrice: 0.015 },
      { id: 4, ingredientId: 104, name: "老抽", groupName: "调料", amount: 15, unit: "ml", scaleType: "linear", scaleFactor: 1.0, sortOrder: 3, note: "上色调味", unitPrice: 0.03 }
    ],
    steps: [
      { id: 10, stepNumber: 1, description: "排骨冷水下锅添加少许料酒，大火烧开后焯水煮3分钟捞出沥干。", images: [], timerSeconds: 180, timerLabel: "焯排骨", timerType: "countdown" },
      { id: 11, stepNumber: 2, description: "热锅凉油，放入沥干水份的排骨，中小火煎至两面焦黄，约3分钟每面。", images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuBfuNgcvM449Adt0na-r-z8PGrjf1CjlTWT-vjhBxRv2hPkTrl3yoxJ9u0lCOWYIAFRsuIZeuw4M4r1BCcLTeK4tJWu0hcYjMQZbJPclaIFa-_3mxmmDlsdj2Nn4B4hSS7NP_3vpmBV1sJ2HOmI3vSl1mRYSPvE6lU61njIRqrIg_7J_UXodQGmEHdhKhKJIg82WymdcSxYEKhb11WBtUzPm_XNhiUS8S5Ysc0KIHXSoJUgrqgV4LNaocG115_6w5EzonwShZNmq2ln"], timerSeconds: 180, timerLabel: "煎至金黄", timerType: "countdown" },
      { id: 12, stepNumber: 3, description: "加入葱段、姜片、八角和冰糖炒出香味，烹入老抽上色，倒入滚热的水没过排骨中小火慢煮。", images: [], timerSeconds: 1200, timerLabel: "慢火焖烧", timerType: "countdown" },
      { id: 13, stepNumber: 4, description: "大火收汁，待汤汁变亮变浓稠时下入另一半香醋，翻炒均匀，撒上熟白芝麻和小葱碎即可出锅装盘。", images: [], timerSeconds: 120, timerLabel: "火候收汁", timerType: "countdown" }
    ],
    estimatedCost: 23.50,
    isFavorited: true,
    createdAt: "2026-05-25T11:00:00Z",
    updatedAt: "2026-05-25T12:00:00Z"
  },
  {
    id: "recipe-chongqing-noodles",
    title: "重庆小面",
    description: "色泽红亮、麻辣鲜香、面条劲道的重庆小面，是山城人民的灵魂早餐。",
    coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIjFjGfLt9OciJjofPSrPBovja4K0Q7P3PoLHiop3RuuU03VbhEpQ4wkjpVlsGYo-aHYoxwzCCtDj159Ntp6zkPGiNz1_8iCAhHjete7gIuT72v4YRUhI3mgBVQ5i-66eNkRPUihKnd5gNqlPef52AVb3hozn3mjI44xqsm5xZAGRmfNpVte9DwQ05-i4E_HzfhnqTbivFOf1QydY-bWQ133QIRlEM-UQZyaMLlcqUt9A8p5RzVi6hTb8Na9GN_KxBsOitkjTEBXRc",
    baseServings: 1,
    servingUnit: "碗",
    difficulty: "easy",
    cookTime: "15-30min",
    mealScene: "breakfast",
    tags: ["面食", "麻辣", "快捷"],
    isPublic: true,
    viewCount: 412,
    favoriteCount: 88,
    ratingAvg: 4.9,
    cookingTips: "红油必须是现拨的菜籽油辣子才够香。调料底料中可以加一勺芽菜和少许猪油增加复合香气。",
    categories: [{ id: 1, name: "中餐" }],
    author: {
      id: "default-user-id",
      nickname: "王奶奶秘籍",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJSNfvva9suAQ3aKUk8FG_C2D-QL8OkmG-DBchXIGy3uPdFBeqp0Dur9-FBoJuB1pue5xlHhTlkCuTgK9n-CD-PQKkj895kfgyyMeGCXB-pjaS-DSor82VDEQX8dEWZcG4L-vcLQA43_t1ZxUeCf7QHqd_FE3c9CCESRIv6OFV5cqbYIz0dihpcXcsXOUlp5wZIu1BrHOKHycg4HOaj70c08vPQ58w1FjF6kpv0361MzuG3VjV8p0L7Ox5womg6qwfQay7eyte2Fzh"
    },
    ingredients: [
      { id: 5, ingredientId: 105, name: "面条", groupName: "主料", amount: 100, unit: "g", scaleType: "linear", scaleFactor: 1.0, sortOrder: 0, note: "碱水面最佳", unitPrice: 0.005 },
      { id: 6, ingredientId: 106, name: "猪肉末", groupName: "主料", amount: 50, unit: "g", scaleType: "linear", scaleFactor: 1.0, sortOrder: 1, note: "三分肥七分瘦", unitPrice: 0.024 },
      { id: 7, ingredientId: 102, name: "盐", groupName: "调料", amount: 3, unit: "g", scaleType: "sub_linear", scaleFactor: 0.7, sortOrder: 2, note: "打底料用", unitPrice: 0.003 },
      { id: 8, ingredientId: 107, name: "花椒粉", groupName: "调料", amount: 2, unit: "g", scaleType: "sub_linear", scaleFactor: 0.6, sortOrder: 3, note: "现炒大红袍花椒磨粉最佳", unitPrice: 0.04 },
      { id: 9, ingredientId: 108, name: "酱油", groupName: "调料", amount: 15, unit: "ml", scaleType: "linear", scaleFactor: 1.0, sortOrder: 4, note: "生抽或特级酱油", unitPrice: 0.02 },
      { id: 10, ingredientId: 109, name: "八角", groupName: "固定用量", amount: 2, unit: "个", scaleType: "fixed", scaleFactor: 1.0, sortOrder: 5, note: "炖猪肉臊子用", unitPrice: 0.2 },
      { id: 11, ingredientId: 110, name: "姜", groupName: "固定用量", amount: 1, unit: "片", scaleType: "fixed", scaleFactor: 1.0, sortOrder: 6, note: "拍碎", unitPrice: 0.1 }
    ],
    steps: [
      { id: 20, stepNumber: 1, description: "小火爆香葱姜加入八角，投入猪肉末煸干水份，加入老抽调色，中火炒至酥香，制成臊子备用。", images: [], timerSeconds: 300, timerLabel: "煸炒臊子", timerType: "countdown" },
      { id: 21, stepNumber: 2, description: "碗中打入盐、酱油、花椒粉、辣椒红油、蒜泥、猪油、芽菜碎、花生碎及葱花制成面条底汤料。", images: [], timerSeconds: null, timerLabel: null, timerType: null },
      { id: 22, stepNumber: 3, description: "大火锅中烧开滚水，下入面条。先舀几勺滚水（或面汤）冲开碗中调料底。煮面约2-3分钟断生即可捞出装碗。", images: [], timerSeconds: 150, timerLabel: "面条开下", timerType: "countdown" },
      { id: 23, stepNumber: 4, description: "码上煸香的肉臊与洗净绰热的绿叶蔬菜，即可完美吃上面条！", images: [], timerSeconds: null, timerLabel: null, timerType: null }
    ],
    estimatedCost: 8.50,
    isFavorited: false,
    createdAt: "2026-05-24T09:00:00Z",
    updatedAt: "2026-05-24T10:00:00Z"
  },
  {
    id: "recipe-summer-salad",
    title: "五彩夏日沙拉",
    description: "清凉、低卡、缤纷营养。采用当季最新鲜多汁的樱桃生菜、黑橄榄与高品质菲达干酪，是夏日减脂时段的完美餐点。",
    coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB718Y26kJpkJARLhGXo3ZbIEJuyQCYLjPxd59gCC2SbZvN26WhDnD85kDUlUy3L7bKSCW8j2OXtBfg4BfM5mkUmW-jheZFqvBSf6bwL9swAhfQcxB1fN4pE0leYmIEdz5RuR2IUwhSsRFr9r4ZHzljjyvPh9SAzGk4-8lNWK_M8NBeFe54t-r0GYuaotvKTXB6JDkrfxtQTp7UNUeOlp78tT5RPbPTR1c0EM-1RiYXP-fwRBU-FJDb_HZqcHz8hhfPYFDDVioUhoOt",
    baseServings: 1,
    servingUnit: "份",
    difficulty: "easy",
    cookTime: "30min",
    mealScene: "lunch",
    tags: ["健康", "沙拉", "西餐"],
    isPublic: true,
    viewCount: 182,
    favoriteCount: 30,
    ratingAvg: 4.6,
    cookingTips: "生菜洗净后务必控干水份，否则会冲淡沙拉酱汁的质感；油醋汁推荐3份橄榄油配1份柠檬汁或红酒醋混合均匀拨洒。",
    categories: [{ id: 2, name: "西餐" }],
    author: {
      id: "default-user-id",
      nickname: "活力生活家",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbmt5KW_59XSkiFJUtT6vwXzdROnpOjSoTdlU0HPJ9tg-ThfLi7od29Mpitc8wBe7I_OWzgFcoo0SraZmuzRIvrzNit0Z-8FwDjvHpsHtZccSoAZsNgNnQj3OwxqYRq6UtxMG8cpKHMr0eMShXr5jUkGXXA2LyaKASir6WI8uThh-wtbDUwAaFlxEhGUjEFaBxeeTip5vAuZhUG8fpvqA0X_2fi-TvTJlSNUJcfeYqmypSpzzDeT4Bk8WjPOX_77ac1H0H6oOM0a8V"
    },
    ingredients: [
      { id: 12, ingredientId: 111, name: "混合生菜", groupName: "主料", amount: 150, unit: "g", scaleType: "linear", scaleFactor: 1.0, sortOrder: 0, note: "洗净拧干", unitPrice: 0.02 },
      { id: 13, ingredientId: 112, name: "樱桃番茄", groupName: "主料", amount: 80, unit: "g", scaleType: "linear", scaleFactor: 1.0, sortOrder: 1, note: "对半切开", unitPrice: 0.05 },
      { id: 14, ingredientId: 113, name: "菲达干酪", groupName: "主料", amount: 30, unit: "g", scaleType: "sub_linear", scaleFactor: 0.8, sortOrder: 2, note: "切成小立方体", unitPrice: 0.15 }
    ],
    steps: [
      { id: 30, stepNumber: 1, description: "生菜叶洗干净用脱水篮甩干，樱桃生小番茄对切，黄瓜切薄片备用。", images: [], timerSeconds: null, timerLabel: null, timerType: null },
      { id: 31, stepNumber: 2, description: "盘底码上生菜、小番茄、黑橄榄圈，撒上捏碎或切块的菲达起司块。", images: [], timerSeconds: null, timerLabel: null, timerType: null },
      { id: 32, stepNumber: 3, description: "调配柠檬油醋酱：橄榄油3汤匙、鲜柠檬汁1汤匙，盐、胡椒粉摇晃均匀后浇淋上去调拌起食。", images: [], timerSeconds: null, timerLabel: null, timerType: null }
    ],
    estimatedCost: 15.00,
    isFavorited: false,
    createdAt: "2026-05-23T10:00:00Z",
    updatedAt: "2020-05-23T11:00:00Z"
  },
  {
    id: "recipe-japanese-ramen",
    title: "招牌日式拉面",
    coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCyHPX9WCgFJqdQ6yqWVEMMDlDNH5ETx7xbq4LXIaidsN65ULGdiKRsWPX3YxRNAwpNOCRiIDSyh1dZAsor2eIt2jCJZdn2ECvx8KdKpHlLQ7UkFacIGm-pBZj4EAi2l63ChTob28elhPv44pwU02eNFs3HlYaSQsssD4afp7OYC6u_V8QmR7GddBqBKhiY9G5kI_xytOGiZYP2lZUPQhMtIMqa7mJ3yXVMpwMJuM0lcG21HWkC8m2H36e269MX1ycRHrvNEO7d2v-",
    cookTime: "45min",
    tags: ["西餐", "日式", "汤面"],
    difficulty: "medium",
    viewCount: 395,
    favoriteCount: 71,
    ratingAvg: 4.8,
    estimatedCost: 28.00,
    author: {
      id: "default-user-id",
      nickname: "晨间厨房",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5hXrKq_XYSjfdC09j4ZbQUlGG6v6PIJEkrYuSjD79rgdBZ6UowyoihLOeDn4Ik_xZf-Ueqmp-jOs8iTATJN-LVkBw0X4txJkKx8CAT0EI69IUcvq5UPCPsdqVxm8A_WXHgpGx8UnXaShkqf5dfUr27Lujb6VSpB2KFBVqZvsAgn78lBFbqWKHbG5ZMLKE12C8w14eJOwXWgYMtTfUyyfZNrVrYo0WzMRL9pAHD30T-4oijvuTUY45QrM7YTn4xOjweukTAL5hFQXG"
    },
    ingredients: [
      { id: 15, name: "拉面条", groupName: "主料", amount: 120, unit: "g", scaleType: "linear", scaleFactor: 1.0, sortOrder: 0, note: "新鲜拉面" },
      { id: 16, name: "豚骨浓汤", groupName: "主料", amount: 400, unit: "ml", scaleType: "linear", scaleFactor: 1.0, sortOrder: 1, note: "秘制极高汤" }
    ],
    steps: [
      { id: 40, stepNumber: 1, description: "加热煮沸事先熬好的浓厚豚骨汤底。", timerSeconds: 300, timerLabel: "热汤滚煮" },
      { id: 41, stepNumber: 2, description: "大滚水下面，煮至弹牙（约2分半）。将汤倒入碗中捞面进碗摆上叉烧、溏心蛋和海苔干片。", timerSeconds: 150, timerLabel: "面条焯面" }
    ]
  },
  {
    id: "recipe-blueberry-pancakes",
    title: "蓝莓松饼",
    coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNoMg4t2z1vqTblnIUp5K1H1e8l3IadsyGG-Hnd0IqENyY6bTKlqzWZCd-CrVYaIATsKFJ29OloNwE4nSSNIXzGoX4m3APvQi9pYQ_lzwdt9c1ELPXlRIZZRu9MBTGnTAS7vePGPtngB6j2CPk7tQfe8tYGUA8a2jGjqUKU9p9EeBuET_kuBwTDCTI9X6dre5DSNqUUIImH5LzbXmCuKy0p6ifUCNaEsEyRlcasJ_ZnTWGmMmf7BlVDZq28SEWTzqahEznWD1qdsU-",
    cookTime: "20min",
    tags: ["烘焙", "甜点", "快捷早餐"],
    difficulty: "easy",
    viewCount: 156,
    favoriteCount: 22,
    ratingAvg: 4.7,
    estimatedCost: 12.00,
    author: {
      id: "default-user-id",
      nickname: "甜点师阿杰",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBEFp1wgmD2445eC8CPM2tPoZo69DLVNadJexCTwH_BjsUYG1pWwAXz0lrvJVIVpfIOosjSeXntXxF5-S8wLRagwFqtZlX0AImfNnQSv8f-RCQWZkJNNsiL5oF7bs6XimD_ykVbGRtoKy5KYT3MPOlNSLsZhnI4Y12t1AFTFXT1KI5IXZrWGgfWEmQsCsthxVvF4kf4D3MsndXmK2mznaDaUK_vOenOSpZq85-rbCbbCAYzmNLOOTb8mx46l3_8XGo6MkPv9o8AXiWz"
    },
    ingredients: [
      { id: 17, name: "预拌粉", groupName: "主料", amount: 100, unit: "g", scaleType: "linear", scaleFactor: 1.0 },
      { id: 18, name: "新鲜蓝莓", groupName: "主料", amount: 30, unit: "g", scaleType: "linear", scaleFactor: 1.0 }
    ],
    steps: [
      { id: 50, stepNumber: 1, description: "松饼粉加入牛奶和鸡蛋，充分打至无干粉状态，稍微静置三分钟。" },
      { id: 51, stepNumber: 2, description: "平底锅小火刷植物油，舀入粉浆，表面撒上几颗鲜蓝莓，煎冒起众多气泡后翻面煎30秒煎透捞出。", timerSeconds: 120, timerLabel: "慢煎松饼" }
    ]
  },
  {
    id: "recipe-margherita-pizza",
    title: "意式玛格丽特",
    coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAteGO1d3FrHfxbMtmRCevdIBgRt-RF9oCLvGxFBd9TUda4ybJRnD7t5GWbKOVUvKKWSxEM3U6HGw_Bbzt1brVSlu4qXn-37RuzdJOGWngl_ckIZ9i214ea6cLJ82AQAgMWpnwfsUlYSQqKDPyVY6OUxTvrl69qo5kgoE_HOfwxAJ8FGJ_wC77c_UGfiyBWK5NSv7DgHz8Z0yLt3VY80UPUeXHeb0BWvtaC9uG11fseruVipzoW0k4jSXCdEqzHT5ZUOs8FxqRnw6FO",
    cookTime: "60min",
    tags: ["西餐", "烘焙", "经典披萨"],
    difficulty: "hard",
    viewCount: 681,
    favoriteCount: 120,
    ratingAvg: 4.8,
    estimatedCost: 22.00,
    author: {
      id: "default-user-id",
      nickname: "厨神小明",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAk4vUtysfDeQCBZ39Xh8PQzRQmAQW16noukCpUnXqgniXA31BvPT6HHdsBJaBNSQLDC2749ULF5mKhYJ_B1M27cJdPtjOKb3hVNDdApBVXXbTqfbKXyWtVvt0z5AUEDecRwMTsqBrmCALafha4leu8nwcpW3xSq5AL01OhD3kiuxf4RWMX6T_LxRRvvzJSwi-nw8yReDv6a9j9q1fUC91sYdlhvPR-8wa5lin5zWkqpoPXrLBlY77EzoDFwzy4U5U4bW14-bBMnSct"
    },
    ingredients: [
      { id: 19, name: "披萨饼底", groupName: "主料", amount: 1, unit: "个", scaleType: "linear", scaleFactor: 1.0 },
      { id: 20, name: "马苏里拉干酪", groupName: "主料", amount: 100, unit: "g", scaleType: "linear", scaleFactor: 1.0 }
    ],
    steps: [
      { id: 60, stepNumber: 1, description: "烤箱预热到230摄氏度。饼底铺满披萨红酱与撕开的马苏里拉奶酪，点缀几片新鲜罗勒叶。" },
      { id: 61, stepNumber: 2, description: "放入烤箱中层烘烤直到起司融化并形成漂亮的褐色焦斑（约10-12分钟）。", timerSeconds: 600, timerLabel: "烘烤披萨" }
    ]
  }
];

let recipes = [...defaultRecipes];

let recipeVersions = {
  "recipe-sweet-sour-ribs": [
    { version: 1, changeSummary: "初始版本，基础家常调味比例", createdAt: "2026-05-25T11:00:00Z" }
  ]
};

let userIngredients = [
  { id: "ui-1", ingredientId: 101, name: "五花肉", customName: null, unitPrice: 16.00, priceUnit: "斤", supplier: "永辉超市", lastPurchased: "2026-05-20", isFresh: true },
  { id: "ui-2", ingredientId: 111, name: "西兰花", customName: null, unitPrice: 5.50, priceUnit: "个", supplier: "社区团购", lastPurchased: "2026-05-21", isFresh: false },
  { id: "ui-3", ingredientId: 108, name: "生抽", customName: null, unitPrice: 0.02, priceUnit: "ml", supplier: "沃尔玛超市", lastPurchased: "2026-05-18", isFresh: false },
  { id: "ui-4", ingredientId: 104, name: "老抽", customName: null, unitPrice: 0.03, priceUnit: "ml", supplier: "物美大卖场", lastPurchased: "2026-05-18", isFresh: false },
  { id: "ui-5", ingredientId: 102, name: "盐", customName: null, unitPrice: 0.003, priceUnit: "g", supplier: "社区便利店", lastPurchased: "2026-05-10", isFresh: false }
];

let activeTimers = [
  { id: "timer-1", label: "面团发酵", totalSeconds: 1800, remainingSeconds: 1425, status: "running", type: "countdown", startedAt: new Date(Date.now() - 375 * 1000).toISOString() },
  { id: "timer-2", label: "烤箱预热", totalSeconds: 300, remainingSeconds: 300, status: "paused", type: "countdown", pausedAt: new Date().toISOString() },
  { id: "timer-3", label: "煮面倒计时", totalSeconds: 150, remainingSeconds: 30, status: "paused", type: "countdown", pausedAt: new Date().toISOString() },
  { id: "timer-4", label: "腌制排骨", totalSeconds: 600, remainingSeconds: 0, status: "completed", type: "countdown" }
];

let cookingHistory = [
  {
    id: "log-1",
    recipe: { id: "recipe-sweet-sour-ribs", title: "糖醋排骨", coverImageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-EwIs59VbsaZaUXtxEKNTHeg5eXlIhsqfeZke8se3KgovzLVpJIkwp_gbd008vKCFxHayvhbZh8YZ_2A9zbLYIeUfI6ODR0sJI0i7X2GOAJ-12YLjzRQpTVi1vMXgx65S1OheRyX0xUy1YTjsy09H1b0mQcRV6fs9nbrB9PW9lAEu8_Bk9wBTZBr2XA_am-uiiWFLzRBWFxkSueTIz1ABTNLirvsUYT29A30U9f9hcCBrQJXnMvEC4OSCgHJhT_93p7hNWYNJ2HbN" },
    targetServings: 2,
    multiplier: 2.0,
    servingUnit: "份",
    totalCost: 32.50,
    rating: 5,
    notes: "用料和火候刚刚好，排骨收汁浓郁，酸甜可口！",
    startedAt: "2026-05-24T18:00:00Z",
    completedAt: "2026-05-24T18:45:00Z"
  }
];

let favorites = [
  { recipeId: "recipe-sweet-sour-ribs", folder: "默认收藏夹", favoritedAt: "2026-05-24T12:00:00Z" }
];

// Helper to wrapping response
function wrapSuccess<T>(data: T, message: string = "success") {
  return {
    code: 200,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// 1. Auth Module
app.post("/api/auth/wx-login", (req, res) => {
  res.json(wrapSuccess({
    token: currentToken,
    user: {
      id: "default-user-id",
      nickname: "厨神小明",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAk4vUtysfDeQCBZ39Xh8PQzRQmAQW16noukCpUnXqgniXA31BvPT6HHdsBJaBNSQLDC2749ULF5mKhYJ_B1M27cJdPtjOKb3hVNDdApBVXXbTqfbKXyWtVvt0z5AUEDecRwMTsqBrmCALafha4leu8nwcpW3xSq5AL01OhD3kiuxf4RWMX6T_LxRRvvzJSwi-nw8yReDv6a9j9q1fUC91sYdlhvPR-8wa5lin5zWkqpoPXrLBlY77EzoDFwzy4U5U4bW14-bBMnSct",
      role: "admin",
      points: 156
    },
    isNewUser: false
  }));
});

app.get("/api/auth/profile", (req, res) => {
  res.json(wrapSuccess({
    id: "default-user-id",
    nickname: "厨神小明",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAk4vUtysfDeQCBZ39Xh8PQzRQmAQW16noukCpUnXqgniXA31BvPT6HHdsBJaBNSQLDC2749ULF5mKhYJ_B1M27cJdPtjOKb3hVNDdApBVXXbTqfbKXyWtVvt0z5AUEDecRwMTsqBrmCALafha4leu8nwcpW3xSq5AL01OhD3kiuxf4RWMX6T_LxRRvvzJSwi-nw8yReDv6a9j9q1fUC91sYdlhvPR-8wa5lin5zWkqpoPXrLBlY77EzoDFwzy4U5U4bW14-bBMnSct",
    phone: "13800000000",
    role: "admin",
    points: 156,
    stats: {
      recipeCount: recipes.length,
      cookingCount: cookingHistory.length + 155, // Add offset to match UI exactly (156)
      favoriteCount: favorites.length + 44
    },
    createdAt: "2026-05-01T00:00:00Z"
  }));
});

app.put("/api/auth/profile", (req, res) => {
  const { nickname, avatarUrl } = req.body;
  const user = users["default-user-id"];
  if (nickname) user.nickname = nickname;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  res.json(wrapSuccess(user));
});

// 2. Recipe Module
app.get("/api/recipes", (req, res) => {
  const { keyword, categoryId, isPublic } = req.query;
  let items = [...recipes];

  if (keyword) {
    const kw = String(keyword).toLowerCase();
    items = items.filter(r => 
      r.title.toLowerCase().includes(kw) || 
      (r.description && r.description.toLowerCase().includes(kw)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(kw)))
    );
  }

  // Categories match
  if (categoryId) {
    const cat = categories.find(c => c.id === parseInt(categoryId as string));
    if (cat) {
      items = items.filter(r => r.tags && r.tags.includes(cat.name));
    }
  }

  res.json({
    code: 200,
    message: "success",
    data: {
      items,
      total: items.length,
      page: 1,
      pageSize: 20,
      totalPages: 1
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/api/recipes/:id", (req, res) => {
  const id = req.params.id;
  const r = recipes.find(item => item.id === id);
  if (!r) {
    return res.status(404).json({ code: 404, message: "Recipe not found" });
  }
  const isFav = favorites.some(fav => fav.recipeId === id);
  res.json(wrapSuccess({
    ...r,
    isFavorited: isFav
  }));
});

app.post("/api/recipes", (req, res) => {
  const { title, description, coverImageUrl, baseServings, servingUnit, difficulty, cookTime, ingredients, steps, tags } = req.body;
  if (!title) {
    return res.status(400).json({ code: 400, message: "Title is required" });
  }

  const newId = "recipe-" + Date.now();
  const newRecipe = {
    id: newId,
    title,
    description: description || "",
    coverImageUrl: coverImageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    baseServings: Number(baseServings) || 1,
    servingUnit: servingUnit || "份",
    difficulty: difficulty || "easy",
    cookTime: cookTime || "15-30min",
    mealScene: "lunch",
    tags: tags || ["家常菜"],
    isPublic: true,
    viewCount: 1,
    favoriteCount: 0,
    ratingAvg: 5.0,
    cookingTips: "",
    categories: [{ id: 1, name: "中餐" }],
    author: {
      id: "default-user-id",
      nickname: "厨神小明",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAk4vUtysfDeQCBZ39Xh8PQzRQmAQW16noukCpUnXqgniXA31BvPT6HHdsBJaBNSQLDC2749ULF5mKhYJ_B1M27cJdPtjOKb3hVNDdApBVXXbTqfbKXyWtVvt0z5AUEDecRwMTsqBrmCALafha4leu8nwcpW3xSq5AL01OhD3kiuxf4RWMX6T_LxRRvvzJSwi-nw8yReDv6a9j9q1fUC91sYdlhvPR-8wa5lin5zWkqpoPXrLBlY77EzoDFwzy4U5U4bW14-bBMnSct"
    },
    ingredients: (ingredients || []).map((ing: any, idx: number) => ({
      id: idx + 100,
      ingredientId: ing.ingredientId || null,
      name: ing.name || ing.customName || "未知食材",
      groupName: ing.groupName || "主料",
      amount: ing.amount || 100,
      unit: ing.unit || "g",
      scaleType: ing.scaleType || "linear",
      scaleFactor: 1.0,
      sortOrder: idx,
      note: ing.note || null,
      unitPrice: 0.02
    })),
    steps: (steps || []).map((step: any, idx: number) => ({
      id: idx + 200,
      stepNumber: step.stepNumber || idx + 1,
      description: step.description || "",
      images: step.images || [],
      timerSeconds: step.timerSeconds || null,
      timerLabel: step.timerLabel || null,
      timerType: step.timerType || null
    })),
    estimatedCost: 10.00,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  recipes.push(newRecipe as any);
  recipeVersions[newId] = [{
    version: 1,
    changeSummary: "初始版本",
    createdAt: new Date().toISOString()
  }];

  res.json(wrapSuccess({
    id: newId,
    version: 1,
    createdAt: newRecipe.createdAt
  }));
});

app.put("/api/recipes/:id", (req, res) => {
  const id = req.params.id;
  const idx = recipes.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ code: 404, message: "Recipe not found" });
  }

  const original = recipes[idx];
  const { title, description, coverImageUrl, baseServings, servingUnit, difficulty, cookTime, ingredients, steps, tags } = req.body;

  const updatedVersion = (recipeVersions[id] ? recipeVersions[id].length : 1) + 1;

  const updatedRecipe = {
    ...original,
    title: title || original.title,
    description: description !== undefined ? description : original.description,
    coverImageUrl: coverImageUrl || original.coverImageUrl,
    baseServings: baseServings !== undefined ? Number(baseServings) : original.baseServings,
    servingUnit: servingUnit || original.servingUnit,
    difficulty: difficulty || original.difficulty,
    cookTime: cookTime || original.cookTime,
    tags: tags || original.tags,
    ingredients: ingredients ? ingredients.map((ing: any, k: number) => ({
      id: ing.id || k + 300,
      ingredientId: ing.ingredientId || null,
      name: ing.name || ing.customName || "食材",
      groupName: ing.groupName || "主料",
      amount: ing.amount || 100,
      unit: ing.unit || "g",
      scaleType: ing.scaleType || "linear",
      scaleFactor: 1.0,
      sortOrder: k,
      note: ing.note || null,
      unitPrice: ing.unitPrice || 0.02
    })) : original.ingredients,
    steps: steps ? steps.map((s: any, k: number) => ({
      id: s.id || k + 400,
      stepNumber: s.stepNumber || k + 1,
      description: s.description || "",
      images: s.images || [],
      timerSeconds: s.timerSeconds || null,
      timerLabel: s.timerLabel || null,
      timerType: s.timerType || null
    })) : original.steps,
    updatedAt: new Date().toISOString()
  };

  recipes[idx] = updatedRecipe as any;

  if (!recipeVersions[id]) {
    recipeVersions[id] = [];
  }
  recipeVersions[id].unshift({
    version: updatedVersion,
    changeSummary: "编辑菜谱更新",
    createdAt: new Date().toISOString()
  });

  res.json(wrapSuccess({
    id,
    version: updatedVersion,
    createdAt: updatedRecipe.updatedAt
  }));
});

app.delete("/api/recipes/:id", (req, res) => {
  const id = req.params.id;
  const idx = recipes.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ code: 404, message: "Recipe not found" });
  }
  recipes.splice(idx, 1);
  res.json(wrapSuccess({ id }, "Recipe deleted successfully"));
});

app.get("/api/recipes/:id/versions", (req, res) => {
  const id = req.params.id;
  const versions = recipeVersions[id] || [{ version: 1, changeSummary: "初始版本", createdAt: new Date().toISOString() }];
  res.json(wrapSuccess(versions));
});

app.post("/api/recipes/:id/versions/:version/rollback", (req, res) => {
  res.json(wrapSuccess({ success: true, version: req.params.version }, "Rollback complete"));
});

// 3. SOP Navigation Module
app.post("/api/cooking/start", (req, res) => {
  const { recipeId, targetServings } = req.body;
  const r = recipes.find(item => item.id === recipeId);
  if (!r) {
    return res.status(404).json({ code: 404, message: "Recipe not found" });
  }

  const multiplier = targetServings / r.baseServings;
  const scaledIngredients = (r.ingredients || []).map(ing => {
    let scaledAmount = ing.amount;
    if (ing.scaleType === "linear") {
      scaledAmount = Math.round(ing.amount * multiplier);
    } else if (ing.scaleType === "sub_linear") {
      // Non-linear sqrt scaling for intensity spices (e.g. salt, garlic, spices)
      scaledAmount = Number((ing.amount * Math.sqrt(multiplier)).toFixed(1));
    }
    const lineCost = Number((((ing as any).unitPrice || 0.02) * scaledAmount).toFixed(2));
    return {
      name: ing.name,
      originalAmount: ing.amount,
      scaledAmount,
      unit: ing.unit,
      scaleType: ing.scaleType,
      lineCost
    };
  });

  const totalCost = scaledIngredients.reduce((sum, ing) => sum + ing.lineCost, 0);

  res.json(wrapSuccess({
    cookingLogId: "log-" + Date.now(),
    multiplier,
    scaledIngredients,
    totalCost: Number(totalCost.toFixed(2)),
    costPerServing: Number((totalCost / targetServings).toFixed(2))
  }));
});

app.put("/api/cooking/:logId/complete", (req, res) => {
  const logId = req.params.logId;
  const { rating, notes } = req.body;
  const newLog = {
    id: logId,
    recipe: recipes[0], // default fallback to the first recipe
    targetServings: 2,
    multiplier: 2.0,
    servingUnit: "份",
    totalCost: 32.50,
    rating: Number(rating) || 5,
    notes: notes || "完美完成",
    startedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    completedAt: new Date().toISOString()
  };
  cookingHistory.unshift(newLog);
  res.json(wrapSuccess(newLog));
});

app.get("/api/cooking/history", (req, res) => {
  res.json({
    code: 200,
    message: "success",
    data: {
      items: cookingHistory,
      total: cookingHistory.length,
      page: 1,
      pageSize: 20,
      totalPages: 1
    },
    timestamp: new Date().toISOString()
  });
});

// 4. Timer Module API
app.get("/api/timers", (req, res) => {
  res.json(wrapSuccess(activeTimers));
});

app.post("/api/timers", (req, res) => {
  const { label, totalSeconds, type, recipeId, stepId } = req.body;
  const newTimer = {
    id: "timer-" + Date.now(),
    label: label || "快速倒计时",
    totalSeconds: Number(totalSeconds) || 300,
    remainingSeconds: Number(totalSeconds) || 300,
    status: "running",
    type: type || "countdown",
    startedAt: new Date().toISOString()
  };
  activeTimers.unshift(newTimer);
  res.json(wrapSuccess(newTimer));
});

app.put("/api/timers/:id/pause", (req, res) => {
  const id = req.params.id;
  const timer = activeTimers.find(t => t.id === id);
  if (timer) {
    timer.status = "paused";
    timer.pausedAt = new Date().toISOString();
  }
  res.json(wrapSuccess(timer));
});

app.put("/api/timers/:id/resume", (req, res) => {
  const id = req.params.id;
  const timer = activeTimers.find(t => t.id === id);
  if (timer) {
    timer.status = "running";
    timer.startedAt = new Date().toISOString();
  }
  res.json(wrapSuccess(timer));
});

app.delete("/api/timers/:id", (req, res) => {
  const id = req.params.id;
  const idx = activeTimers.findIndex(t => t.id === id);
  if (idx !== -1) {
    const deleted = activeTimers.splice(idx, 1);
    return res.json(wrapSuccess(deleted[0]));
  }
  res.status(404).json({ code: 404, message: "Timer not found" });
});

// 5. User Ingredients (Pantry)
app.get("/api/ingredients", (req, res) => {
  const kw = req.query.keyword ? String(req.query.keyword).toLowerCase() : "";
  const pool = [
    { id: 101, name: "排骨", categoryId: 3, categoryName: "肉禽", defaultUnit: "g", referencePrice: 0.04 },
    { id: 105, name: "面条", categoryId: 5, categoryName: "烘焙原料", defaultUnit: "g", referencePrice: 0.005 },
    { id: 106, name: "猪肉末", categoryId: 3, categoryName: "肉禽", defaultUnit: "g", referencePrice: 0.024 },
    { id: 111, name: "西兰花", categoryId: 2, categoryName: "蔬菜", defaultUnit: "个", referencePrice: 5.5 },
    { id: 108, name: "生抽", categoryId: 4, categoryName: "调味品", defaultUnit: "ml", referencePrice: 0.02 },
    { id: 104, name: "老抽", categoryId: 4, categoryName: "调味品", defaultUnit: "ml", referencePrice: 0.03 },
    { id: 102, name: "盐", categoryId: 4, categoryName: "调味品", defaultUnit: "g", referencePrice: 0.003 }
  ];

  const matched = pool.filter(i => i.name.toLowerCase().includes(kw));
  res.json(wrapSuccess({ items: matched }));
});

app.get("/api/user-ingredients", (req, res) => {
  res.json(wrapSuccess(userIngredients));
});

app.post("/api/user-ingredients", (req, res) => {
  const { ingredientId, customName, unitPrice, priceUnit, supplier } = req.body;
  const newIng = {
    id: "ui-" + Date.now(),
    ingredientId: ingredientId || null,
    name: customName || (ingredientId === 101 ? "排骨" : ingredientId === 105 ? "面条" : ingredientId === 106 ? "猪肉末" : ingredientId === 111 ? "西兰花" : "自定义食材"),
    customName: customName || null,
    unitPrice: Number(unitPrice) || 1.0,
    priceUnit: priceUnit || "g",
    supplier: supplier || "本地采购",
    lastPurchased: new Date().toISOString().split('T')[0],
    isFresh: true
  };
  userIngredients.unshift(newIng);
  res.json(wrapSuccess(newIng));
});

app.put("/api/user-ingredients/:id", (req, res) => {
  const id = req.params.id;
  const ing = userIngredients.find(item => item.id === id);
  if (ing) {
    const { unitPrice, priceUnit, supplier } = req.body;
    if (unitPrice !== undefined) ing.unitPrice = Number(unitPrice);
    if (priceUnit) ing.priceUnit = priceUnit;
    if (supplier) ing.supplier = supplier;
  }
  res.json(wrapSuccess(ing));
});

app.delete("/api/user-ingredients/:id", (req, res) => {
  const id = req.params.id;
  const idx = userIngredients.findIndex(item => item.id === id);
  if (idx !== -1) {
    const deleted = userIngredients.splice(idx, 1);
    return res.json(wrapSuccess(deleted[0]));
  }
  res.status(404).json({ code: 404, message: "Ingredient not found" });
});

// Categories & Favorites
app.get("/api/categories", (req, res) => {
  res.json(wrapSuccess(categories));
});

app.get("/api/favorites", (req, res) => {
  const items = favorites.map(fav => {
    const r = recipes.find(rec => rec.id === fav.recipeId);
    return {
      folder: fav.folder,
      favoritedAt: fav.favoritedAt,
      recipe: r || null
    };
  }).filter(item => item.recipe !== null);
  res.json(wrapSuccess(items));
});

app.post("/api/favorites", (req, res) => {
  const { recipeId, folder } = req.body;
  const exists = favorites.some(fav => fav.recipeId === recipeId);
  if (!exists) {
    favorites.push({
      recipeId,
      folder: folder || "默认收藏夹",
      favoritedAt: new Date().toISOString()
    });
  }
  res.json(wrapSuccess({ success: true, recipeId }));
});

app.delete("/api/favorites/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;
  const idx = favorites.findIndex(fav => fav.recipeId === recipeId);
  if (idx !== -1) {
    favorites.splice(idx, 1);
  }
  res.json(wrapSuccess({ success: true, recipeId }));
});

// Custom Image Upload Mock
app.post("/api/upload/image", (req, res) => {
  res.json(wrapSuccess({
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDLVlnn6JDVTW6HhMVqTwgLy89Rh3wrdWxJYM79-Q3bFQsPQpFRhRrH89HWaArSF2RZahvnFoyvdJdo9un7vN5uOeHL2YdzHcnMl62ckzZj07pWspatE_-O9D2Ifm2LYD53AUjmNAcUl5gIpS08ruRGyJ6gmSdxkyPApNi8LdrD79Uz6FzHffUVl0RyKBOY9J2_BXCyl7S_ark9svkvtbk9tkeOnF8vZQ0kvCE-jjBn7LW7shUqEkBU47kqKEDGRj7aT3Zik-EiNz0c",
    width: 600,
    height: 400
  }));
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
