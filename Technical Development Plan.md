# Between — Technical Development Plan V2

**Product:** Between — Tarot for Reflection  
**Platform:** Desktop-first Web App  
**Scope:** 3-hour Coding MVP  
**Language:** English UI  
**Version:** V2 — Full 78-Card Deck with Upright & Reversed Readings

## 1. Product Overview

Between 是一款以塔罗牌为媒介的轻量化自我探索 Web 产品，首版以电脑浏览器中的鼠标与键盘操作为主要使用方式。

用户通过自然语言提出问题，从完整的 78 张塔罗牌中自主选择 3 张。每张牌可能为正位（Upright）或逆位（Reversed）。系统结合牌面含义、正逆位、牌阵位置和用户问题主题提供解读，并支持用户记录反思、下一步行动及历史占卜。

### Core User Journey

**Ask → Shuffle → Draw → Reveal → Interpret → Reflect → Save**

核心功能：

- 用户输入自由文本问题，并可选择 Love / Career / Self / General 主题分类。
- 系统自动识别 Relationship / Career / Self / General 主题。
- 用户从完整的 78 张塔罗牌中选择 3 张。
- 每张牌独立随机决定正位或逆位。
- 翻牌后展示对应的图片方向和解读。
- 系统结合三张牌生成 Overall Reading。
- 用户可以选择最有共鸣的牌，记录情绪与反思。
- 结果可以保存至 Journal 并在之后查看。

## 2. Technical Stack

| Technology | Purpose |
|---|---|
| React + Vite + TypeScript | 前端应用与状态管理 |
| Tailwind CSS | 页面样式、桌面优先的自适应布局 |
| Lucide React | 图标 |
| CSS Transitions / Transforms | 卡牌选择、翻转与逆位旋转 |
| Local JSON / TypeScript | 78 张牌的元数据及正逆位含义 |
| localStorage | Journal 持久化 |
| Vercel | Demo 部署 |

**技术边界**

- 不需要后端、用户注册或在线数据库。
- 不依赖实时 LLM API。
- 主题识别和解读使用本地规则。
- 78 张牌共用一套图片和组件。
- 正逆位通过状态与 CSS 实现，不需要额外制作 78 张逆位图片。

## 3. Information Architecture

产品使用三个主要页面，通过顶部导航切换：

1. **Home** — 输入问题、开始占卜。
2. **Reading** — 抽牌、揭牌、解读和反思。
3. **Journal** — 查看与管理历史记录。

页头放置 Between Logo 与 Home / Reading / Journal 导航，并明确标识当前页面。

Reading 内部使用 `draw`、`result`、`reflection` 三个状态，避免引入复杂路由。

---

## 4. Page 1 — Home

### Purpose

让用户在桌面浏览器中快速提出问题并进入占卜，首页以居中的提问区域为视觉重点。

### Main UI Elements

**Header**

- Between Logo
- 简洁星象装饰

**Daily Message**

从预设文案中随机展示一句英文提示。

例如：

"Clarity begins with the questions we dare to ask."

Daily Message 卡片上边缘与主 Slogan 对齐。首页不显示 “Tarot for reflection” eyebrow 或重复的 supporting copy，只保留一个主 Slogan：

"Between the cards and you, clarity begins."

**Question Input**

- 标题："What's on your mind?"
- 多行输入框
- Placeholder："Ask about love, career, or anything on your mind..."
- 主按钮："Start Reading"

**Topic Categories**

输入框下方提供四个简洁分类：

- Love
- Career
- Self
- General

每个分类对应一句可编辑的默认问题。选择分类后将该问题填入输入框；用户可直接修改。

### Interaction Logic

1. 点击分类会选中该分类，并将对应的默认问题填入输入框；Start Reading 可直接使用该问题。
2. 再次点击已选分类会取消选择：若仍是原默认问题则清空输入框，若用户已经修改则保留修改后的文字。
3. 用户也可不选择分类而直接输入；此时系统根据问题文本自动识别主题。
4. 问题非空时，Start Reading 按钮启用。
5. 创建新的 Reading Session。
6. 跳转至 Reading → Draw。

不额外增加主题选择页面。

---

## 5. Page 2 — Reading

Reading 是产品的核心体验，包含三个状态。

### 5.1 State A — Shuffle & Draw

**Purpose**

让用户从完整的 78 张牌中自主选择 3 张。

### Main UI Elements

**Header**

- Back Button
- 标题："Take a breath." / "Let one card find you."
- 用户原始问题

**Selected Card Slots**

全屏洗牌后，页面中央上方展示三个卡背牌位：

- Past
- Present
- Future

Past / Present / Future 仅显示在三个牌位下方，不在 Draw 页面标题上方重复展示。

三牌槽区域与上方标题、下方牌带之间的内部 Padding 均统一为 `16px`。

用户依次点击底部横向牌带中的卡背；选中的牌向上移动并进入对应位置。第三张落位后，底部牌带淡出，三张牌移动到左侧并翻开，右侧渐入解读。

**Tarot Deck**

- 初始播放约 2.3 秒的洗牌动画：18 张可见卡背分成三组，切开、交错并重新叠合，随后展开为 78 张卡背组成的横向牌带
- 牌带位于页面中间偏下方，相邻卡片互相压叠；Hover 时当前卡片上浮约 18px 并置顶，点击区域保持稳定
- 支持鼠标滚轮、触控板、拖拽及键盘左右键浏览完整牌组，但不显示横向滚动条或 “Scroll or drag to explore” 提示
- 以可聚焦按钮呈现卡牌，支持鼠标点击和键盘 Enter / Space 选牌
- 选牌进度："0 of 3 selected · Choose your past card"
- "Shuffle again" 按钮紧邻选牌进度右侧

### Card Selection Logic

1. 创建新 Reading 时，加载完整 78 张牌。
2. 系统随机打乱牌组。
3. 同时为每张牌随机指定正位或逆位，但暂不向用户显示。
4. 78 张牌以背面形式呈现。
5. 用户点击任意一张牌，将其加入已选区域。
6. 已选择的牌从可选牌组中移除或禁用。
7. 用户按顺序选择 3 张。
8. 选牌前可以重新洗牌；重新洗牌会清空当前选择。
9. 重新洗牌会重播洗牌动画并清空已选牌；单张牌飞行期间锁定下一次选择，防止重复选择或跳过牌位。
10. 选满 3 张后，牌带自动退出并进入三牌转场与解读，无需额外确认。

抽牌流程使用 shuffling → choosing → settling → interpreting 状态。渲染层在 Reading 已创建后直接展示 Result；页面切换和重新洗牌时取消旧计时器与动效，返回 Reading 时恢复到可继续操作的状态。

**重要规则**

- 每次 Reading 使用完整的 78 张牌。
- 每张牌最多被选择一次。
- 三张牌的选择顺序决定牌阵位置。
- 正逆位在洗牌阶段确定，揭牌时不能重新随机生成。
- 用户在抽牌阶段只能看到统一的卡背，不提前看到牌名或方向。

### Three-card Spread

| Position | Name | Meaning |
|---|---|---|
| Card 1 | Past | 影响当下的经历、模式或背景 |
| Card 2 | Present | 当前处境与核心状态 |
| Card 3 | Future | 正在形成、值得留意的发展方向 |

### 5.2 State B — Reveal & Interpretation

**Purpose**

揭示三张牌，并结合正逆位与问题主题完成解读。

### Main UI Elements

**Reading Header**

- 标题："Your Reading"
- 用户原始问题
- 主题标签：Love / Career / Self / General
- 不显示重复的 “Your reading · Past, present, possibility” eyebrow

**Three-card Spread**

每张牌展示：

- 正面图片
- 正位或逆位的实际方向
- 卡牌名称
- Upright / Reversed 标签
- 牌阵位置
- 2–3 个关键词

**Interpretation Panel**

点击任意一张牌，展开：

- Card Meaning
- Position Interpretation
- Contextual Interpretation

桌面宽屏下，三张牌的牌阵与 Interpretation Panel 左右并排展示；窗口变窄时按牌阵、解读的顺序堆叠。

**Overall Reading**

三张牌的整体总结。

Interpretation Panel 中当前牌位（Past / Present / Future）与 “Overall Reflection” 两个小标题统一使用金色强调文字。

三张结果牌使用三等分的 Fill Container 布局与统一等高 Frame，卡面沿用素材原始 `300:527` 比例、占满各自 Frame 的可用宽度并从顶部对齐；牌名长度不会改变单张卡片的外框高度。选牌槽、飞行动画与结果卡面使用同一比例，避免 Reveal 过程中出现上下留白。

### Reveal Logic

1. 第三张牌选完后，底部牌带自动淡出。
2. 三张卡背从页面中央上方缓慢移动到左侧牌阵。
3. 三张牌依次翻转，显示正面；正位正常显示，逆位旋转 180°。等待最后一张翻牌完成后再进入下一阶段。
4. 右侧 Interpretation Panel 渐入，每张牌显示明确的 Upright / Reversed 标签。
5. 右侧解读完成渐入后，下方 Your Reflection Card 最后渐入。
6. 默认展开 Past 的解读，用户点击其他牌切换解读内容。
7. Overall Reading 展示在三张牌的详细解读之后。

**Navigation**

- Reflection Card 随 Result 自动显示在左侧三张牌下方，并保持当前牌面与右侧解读可见。
- 该次占卜在 Reveal 时自动保存至 Journal；不再提供 Reflect on This、Finish Reading 按钮或独立 Reflection 页面。

### 5.3 Result 内嵌 Reflection Card

**Purpose**

让用户参与解读，并把塔罗结果转化为个人思考。

### Main UI Elements

**Header**

只显示 "Your reflection" eyebrow，不显示额外的 “Hold onto what matters.” 标题。

**Mood Selection**

- Calm
- Hopeful
- Uncertain
- Anxious
- Other：点击后渐入自定义情绪输入框

四个预设 Mood 均可再次点击取消；选择预设 Mood 时关闭 Other 输入框。

**Reflection Textarea**

Placeholder："This card reminds me of a pattern I keep returning to…"

**Next Step**

标题：

"One small step I can take"

Placeholder："Have one honest conversation this week…"

**Buttons**

- "Save Reflection"
- "Skip"

### Interaction Logic

- Mood、Reflection Notes 与 Next Step 随 Result 自动显示在三牌下方的小卡片内，不切换页面。
- Mood（含自定义 Mood）、Reflection Notes 和 Next Step 均为可选；三项中任意一项有内容即可保存。
- Reveal 时自动保存完整占卜结果。
- Save Reflection 将当前 Reflection Notes、Next Step 与 Mood 作为首条不可编辑时间轴事件写入占卜档案。
- 保存成功后进入 Journal Detail。

---

## 6. Page 3 — Journal

### Purpose

保存和回顾用户的占卜结果。

### Journal List UI

每次揭牌时自动创建一条占卜档案；即使用户未填写 Reflection 或 Next Step，记录仍保留完整三牌与解读。

记录以单列时间流展示，每条展示：

- 左侧：抽牌日期与时间，其下为问题主题 Tag
- 中间：用户问题
- 三张卡牌缩略图
- 最右侧默认只显示反思记录数量或 “No notes yet”；Hover / Focus 当前行时状态向左让位，右侧渐显 “× Delete this reading”

### Journal Detail UI

详情不复用 Reading 页面，分为上下两个独立区块：

**Reading Summary Frame**：顶部只保留问题标题、右侧主题与 Delete Reading；返回入口使用箭头图标，移除重复的 Reading Archive 时间。Frame 内以 Drawn 时间开头，不显示 “Your three-card reading”。Overall Reading 横跨 Frame 最上方；其下方左侧展示三张卡牌，右侧为单张牌解读区。时间与 Overall 之间、Overall 与牌组之间不使用分隔线。进入详情时整个 Reading Frame 以轻微缩放、上浮与亮度渐变作为一张大卡片弹出，内部三牌再依次渐入；该入场只播放一次。单张解读默认收起，点击任意卡牌后在右侧显示对应解读，切换或展开 Notes 时不重新渲染或重播整组动画。下方 Reflection Timeline 左边缘与 Frame 内 Drawn 时间对齐；窄窗口下牌组与解读区纵向堆叠。

**Reflection Timeline**：按写入时间正序展示初始与后续 Reflection Notes。每条事件直接以写入日期时间作为主标题，不显示 “First reflection” 或 “Follow-up reflection” H3；其下展示 Reflection Notes、Next Step 与 Mood（如有）。已保存事件不可编辑或覆盖，空字段保持空白。无记录时显示空时间轴。

`Add a reflection` 用于首次新增；已有事件后显示 `Continue reflection`。两者均展开内嵌表单并创建新的时间轴事件。`Delete Reading` 删除整个占卜档案及其时间轴。

### Interaction Logic

- 记录按抽牌日期倒序排列。
- Reveal 时自动保存占卜档案；不依赖用户填写 Reflection。
- 点击记录进入详情。
- Hover / Focus 记录后点击最右侧 “× Delete this reading” 直接删除该 Reading，不触发打开详情；未交互时删除操作保持隐藏。
- 刷新页面后记录仍存在。
- Reflection 保存时创建第一条不可编辑的 Timeline Event。
- 后续反思以新 Timeline Event 追加，支持无限记录并保留各自时间。
- 旧版 Journal 中的 notes / next 自动迁移为第一条 Timeline Event。
- 空列表时显示 Start Reading 入口。

---

## 7. Navigation & State Logic

```text
App
│
├── Home
│   ├── Daily Message
│   ├── Question Input
│   └── Topic Categories
│          ↓ Start Reading
│
├── Reading
│   │
│   ├── Draw
│   │   ├── Shuffle 78 Cards
│   │   ├── Assign Upright / Reversed
│   │   ├── Select Card 1
│   │   ├── Select Card 2
│   │   └── Select Card 3
│   │          ↓ Reveal
│   │
│   ├── Result
│   │   ├── Reveal Card Orientations
│   │   ├── Individual Interpretations
│   │   ├── Overall Reading
│   │   └── Inline Reflection Card
│   │      ├── Mood / Reflection Notes / Next Step
│   │      ├── Save → Journal Detail
│   │      └── Skip → Journal Detail
│
└── Journal
    ├── Entry List
    └── Entry Detail
         └── Delete Entry
```

**Navigation Rules**

- Home 导航：返回首页。
- Reading 导航：如果存在进行中的占卜，恢复当前状态；否则展示开始新占卜入口。
- Journal 导航：展示历史记录。
- 从 Result 返回 Draw 时保留已选卡牌和方向，不重新随机生成。
- 新建 Reading 时清空上一次临时占卜。
- Journal 中已保存的记录不受新占卜影响。
- 动画中离开 Reading 时清理未完成的动画；已选满三张的结果只创建一次 Journal 记录，返回时可直接查看解读。

---

## 8. Tarot Assets & Dataset

### 8.1 Complete Tarot Deck

采用标准 78 张塔罗牌体系。

**Major Arcana — 22 Cards**

编号 0–21，包括 The Fool、The Magician、The High Priestess、The Lovers、Death、The World 等。

**Minor Arcana — 56 Cards**

四个花色：

- Cups：14 张
- Wands：14 张
- Swords：14 张
- Pentacles：14 张

每组包含 Ace、2–10、Page、Knight、Queen、King。

所有 78 张牌均支持正位和逆位。

### 8.2 Asset Folder Structure

图片统一放在 `public/assets/tarot/`。

```text
public/
└── assets/
    └── tarot/
        ├── back.webp
        │
        ├── major/
        │   ├── 00-the-fool.webp
        │   ├── 01-the-magician.webp
        │   ├── 02-the-high-priestess.webp
        │   ├── ...
        │   └── 21-the-world.webp
        │
        └── minor/
            ├── cups/
            │   ├── ace-of-cups.webp
            │   ├── two-of-cups.webp
            │   ├── ...
            │   └── king-of-cups.webp
            │
            ├── wands/
            │   └── 14 images
            │
            ├── swords/
            │   └── 14 images
            │
            └── pentacles/
                └── 14 images
```

**Assets Requirements**

- 78 张正面图片。
- 1 张统一背面图片。
- 正位和逆位共用图片。
- 图片宽高比统一为约 2:3。
- 使用统一文件命名规则。
- 优先采用 WebP。
- 仅加载当前需要显示的正面图片。
- 素材需要确认许可并保留必要的来源署名。

**视觉方向**

界面参考用户提供的黑白木刻塔罗风格：

- 黑色主背景。
- 深蓝色次级背景。
- 灰白色文字。
- 少量暖金色强调。
- 星象与几何符号装饰。
- 以简洁布局突出卡牌插画。

首版使用授权明确的经典 Rider–Waite–Smith 图片，图片存储在AI-Tarot\Cards-png，不要求全部 78 张重新绘制。

### 8.3 Card Data Structure

在 `src/data/tarotCards.ts` 中定义全部 78 张牌。

```ts
type CardMeaning = {
  keywords: string[];
  meaning: string;
  reflectionPrompt: string;
};

type TarotCard = {
  id: string;
  name: string;
  arcana: "major" | "minor";
  suit?: "cups" | "wands" | "swords" | "pentacles";
  image: string;

  upright: CardMeaning;
  reversed: CardMeaning;
};
```

**Example — The Fool**

```ts
const theFool: TarotCard = {
  id: "the-fool",
  name: "The Fool",
  arcana: "major",
  image: "/assets/tarot/major/00-the-fool.webp",

  upright: {
    keywords: [
      "New Beginnings",
      "Freedom",
      "Curiosity"
    ],
    meaning:
      "The Fool represents openness to new experiences and the courage to explore the unknown.",
    reflectionPrompt:
      "What new possibility are you ready to explore?"
  },

  reversed: {
    keywords: [
      "Hesitation",
      "Recklessness",
      "Uncertainty"
    ],
    meaning:
      "The Fool reversed may reflect hesitation, insufficient preparation, or acting without considering the consequences.",
    reflectionPrompt:
      "Are you holding back out of fear, or moving forward without enough preparation?"
  }
};
```

### Dataset Requirements

- 共 78 条卡牌记录。
- 每张牌具有唯一 ID。
- 每张牌对应一张正面图片。
- 每张牌包含 upright 和 reversed 两套含义。
- 总共需要 156 组简短的正逆位语义数据。
- 每组至少包含关键词、基础含义和反思提示。

这些内容可以提前批量生成并校对，不需要在运行时调用 AI。

---

## 9. Card Drawing & Orientation Engine

### 9.1 Drawn Card Structure

将卡牌本身的数据与一次抽牌产生的方向分开。

```ts
type DrawnCard = {
  cardId: string;
  isReversed: boolean;
};
```

同一张塔罗牌可以在不同的 Reading 中以不同方向出现。

### 9.2 Shuffle Logic

使用 Fisher–Yates 算法打乱 78 张牌。

```ts
function shuffleDeck<T>(deck: T[]): T[] {
  const result = [...deck];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] =
      [result[j], result[i]];
  }

  return result;
}
```

### 9.3 Assign Orientation

洗牌时为每张牌独立分配方向。

```ts
function prepareDeck(cards: TarotCard[]): DrawnCard[] {
  const shuffled = shuffleDeck(cards);

  return shuffled.map(card => ({
    cardId: card.id,
    isReversed: Math.random() < 0.5
  }));
}
```

**Orientation Rules**

- `false`：Upright（正位）
- `true`：Reversed（逆位）
- MVP 默认正位与逆位概率各为 50%。
- 每张牌独立决定方向。
- 一次占卜中可以出现 0–3 张逆位。
- 不强制至少出现一张逆位。
- 方向在洗牌时确定，不能在揭牌时重新抽取。

50% 是本产品采用的简化数字洗牌规则，并不是所有实体塔罗读牌方式的统一要求。

### 9.4 Card Selection

```ts
const [deck, setDeck] = useState<DrawnCard[]>([]);
const [selectedCards, setSelectedCards] =
  useState<DrawnCard[]>([]);
```

**Selection Rules**

- 从完整 78 张牌中选择。
- 最多选择 3 张。
- 同一张牌不能重复。
- 选牌顺序对应三个牌阵位置。
- 取消选择不改变其他牌的方向。
- 重新洗牌清空已选牌并重新生成方向。

### 9.5 Upright & Reversed Rendering

正逆位使用相同的图片路径。

```tsx
function CardFace({
  card,
  isReversed
}: {
  card: TarotCard;
  isReversed: boolean;
}) {
  return (
    <img
      src={card.image}
      alt={`${card.name} ${
        isReversed ? "Reversed" : "Upright"
      }`}
      className={
        isReversed ? "rotate-180" : ""
      }
    />
  );
}
```

**渲染要求**

- 抽牌阶段统一显示卡背。
- Reveal 阶段使用翻转动画展示正面。
- 逆位旋转仅应用于正面图片。
- 翻牌动画和逆位旋转分别放在不同的容器层，避免 CSS transform 冲突。
- 解读区域始终用文字标注 Upright / Reversed。

---

## 10. Reading Interpretation Engine

解读引擎使用：

**Card Meaning + Orientation + Spread Position + Question Topic**

正逆位不仅影响图片方向，也必须影响实际解读内容。

### 10.1 Question Topic Detection

使用关键词识别问题主题。

| Topic | Example Keywords |
|---|---|
| Love / Relationship | love, relationship, partner, crush, dating, breakup, friend |
| Career | job, career, work, interview, promotion, study |
| Self | myself, growth, change, confidence, happiness |
| General | 无法明确分类的问题 |

**Logic**

1. 输入转小写。
2. 匹配主题关键词。
3. 根据匹配分数确定主题。
4. 无明确结果时使用 General。
5. 保留用户原始问题用于展示。

不宣称关键词匹配已经完整理解用户的问题语义。

### 10.2 Upright vs. Reversed Meaning

**Upright**

通常侧重卡牌的直接象征、外在表现、可用资源或正在发展的主题。

**Reversed**

可能侧重：

- Blockage：某种倾向受到阻碍。
- Internalization：某种主题更多发生在内心。
- Imbalance：某种倾向过度或不足。
- Reconsideration：需要重新审视的方向。

**重要原则**

逆位不等于负面结果，也不是简单地把正位解释反过来。

必须优先使用该牌预设的 `reversed.meaning`，不能只给正位解读加一句 "This is reversed."

### 10.3 Individual Card Interpretation

每张牌的解读包含三层。

**Layer 1 — Card & Orientation Meaning**

根据 `isReversed` 选择对应牌义。

```ts
const meaning = drawnCard.isReversed
  ? card.reversed
  : card.upright;
```

**Layer 2 — Spread Position**

根据牌阵位置确定解释方向：

| Position | Interpretation |
|---|---|
| Past | 哪些经历或模式可能影响了当前处境 |
| Present | 当前值得注意的状态与选择 |
| Future | 可能形成的方向，以及现在的选择如何影响它 |

新占卜保存对应牌位和解读快照；旧 Journal 条目仍按原来的 Present / Hidden Influence / Guidance 牌位展示。

**Layer 3 — Question Topic**

根据用户问题所属主题补充情境。

例如：

- Love：关系、沟通、边界、情感需求。
- Career：机会、准备、目标、决策。
- Self：成长、信念、情绪、个人选择。
- General：开放式自我反思。

### 10.4 Interpretation Example

**User Question**

"Should I change my job?"

**Drawn Card**

The Fool — Reversed

**Position**

Future

**Interpretation**

"The Fool reversed may point to hesitation or a lack of preparation when facing a new beginning. In the Future position, consider how gathering more information now could influence the possibilities ahead."

**Reflection Prompt**

"What information would help you feel more confident about your next career decision?"

这个解读同时使用：

- The Fool 的象征。
- Reversed 的具体含义。
- Future 的位置。
- Career 的问题主题。

### 10.5 Overall Reading

三张牌的总体解读需要考虑：

1. 三张牌各自的正逆位含义。
2. 三个位置之间的关系。
3. 用户的问题主题。
4. 是否存在重复出现的象征关键词。

**MVP Generation Strategy**

使用预设模板组织三张牌的核心主题。

结构：

- Past：可能影响当下的经历与模式。
- Present：当前值得关注的因素。
- Future：可能形成的发展方向与当下选择。
- Closing Reflection：结合问题主题提出开放式思考问题。

示例：

"Your reading points to a desire for change, alongside some uncertainty about what comes next. The cards invite you to examine what may be holding you back and what preparation could help you move forward with greater clarity."

**解读规则**

- 不把逆位简单定义为坏事。
- 不宣称未来事件一定发生。
- 不断言他人的真实想法。
- 不直接替用户作出重大决定。
- 使用 "may"、"could"、"suggests" 等非确定性表达。
- 保持语言具体、简洁，避免机械重复。

### 10.6 Reflection & Next Step

用户选择最有共鸣的牌后：

1. 根据正逆位读取对应 `reflectionPrompt`。
2. 展示问题。
3. 允许用户记录想法。
4. 根据主题提供一个可编辑的 Next Step 建议。

例如 Career：

"Identify one piece of information you need before making your next decision."

用户可以修改建议，也可以完全跳过。

---

## 11. Data Structure & Persistence

### Reading Session

```ts
type ReadingSession = {
  id: string;
  createdAt: string;

  question: string;
  topic: "love" | "career" | "self" | "general";

  cards: DrawnCard[];

  interpretations: string[];
  overallMessage: string;

  selectedCardId?: string;
  mood?: string;
  reflection?: string;
  nextStep?: string;
};
```

**注意**

`cards` 必须保存 `cardId` 和 `isReversed`，不能只保存卡牌名称，否则 Journal 无法正确还原逆位。

### React State

主要状态：

- `activeTab`
- `readingStep`
- `question`
- `detectedTopic`
- `deck`
- `selectedCards`
- `currentReading`
- `journalEntries`
- `selectedJournalId`

### localStorage

Storage Key：

`between_journal_v2`

保存内容：

- 用户问题与主题。
- 三张牌的 ID 和方向。
- 每张牌的解读文本。
- Overall Reading。
- 用户的 Reflection 与 Next Step。

保存解读文本可以保证未来调整模板后，历史记录仍然展示当时看到的内容。

---

## 12. UI & Visual Design

### Visual Style

**Keywords:** Mysterious, Minimal, Reflective, Editorial

| Element | Style |
|---|---|
| Main Background | Near Black `#090A0F` |
| Secondary Background | Deep Navy `#141B2E` |
| Accent | Warm Gold `#D6B77A` |
| Primary Text | Off White `#F4F1E9` |
| Secondary Text | Muted Gray `#A5A8B5` |
| Card Background | Dark with subtle borders |
| Typography | Serif Headings + Sans-serif Body |

### Design Tokens

Typography 只使用五个字号 Token：

- `--type-xs: 12px`
- `--type-sm: 14px`
- `--type-body: 16px`
- `--type-heading: 24px`
- `--type-display: clamp(40px, 5vw, 72px)`

阴影只使用两个 Token：

- `--shadow-card`：普通卡片、浮层与飞牌
- `--shadow-glow`：选中、Hover 与金色强调状态

### Layout

- Desktop-first，以电脑浏览器为首版主要使用环境。
- 主内容最大宽度约 1200px，水平居中并保留两侧留白；表单和长文本控制行宽。
- 优先适配 1280px、1440px 与 1920px 宽的桌面浏览器窗口，窗口缩小时自然换行或堆叠。
- 页头放置 Logo、Home / Reading / Journal 顶部导航与产品理念短句 “Read the cards. Reflect inward. Move with intention.”；当前 Tab 不使用背景块、光晕或底边线，文字变为 Gold 与 Cream 混合的橙白色，并在文字右侧显示金色 `✦`。
- Home 只保留一个主 Slogan；Daily Message 与其顶部对齐，问题输入卡片稍向下留出呼吸空间，并以四个可取消选择、可填充默认问题的主题分类代替快捷长句。背景直接渲染透明资源 `assets/home-tarot-linework.png`，使用暖色 Filter 与从左上到右下增强的渐变 Mask；左侧文字区保持低透明度，右下角月亮与星象线稿更明显。
- Draw 页面占满顶部导航下的内容区域，标题、三牌槽和横向牌带使用 `auto auto auto` 组成紧凑内容组并整体居中，不再用 `1fr` 将上下空间拉散；牌带支持滚动、拖拽和键盘浏览。
- Result 页面左侧为三张卡牌，右侧为详细解读，整体总结位于详细解读之后。
- Reflection 不再使用独立页面；表单作为小卡片内嵌在 Result 左侧三张牌下方。
- Journal 使用单列记录流、顶部 Overall Panel、左侧三牌、右侧点击切换的单牌解读区，以及下方反思时间轴。
- 导航、卡牌和表单支持鼠标与键盘操作，提供清晰的 hover、focus 与选中状态。

### Essential Animations

只保留必要动效：

1. 多组卡背切开、交错和叠合，形成明确的洗牌过程。
2. Hover 卡牌轻微上浮；点击后从实际位置飞至对应牌位。
3. 三张选完后牌带退出、牌阵平移至左侧，再逐张翻开；翻牌完成后右侧解读渐入，最后下方 Your Reflection Card 渐入。
4. 翻牌容器与正面图片的逆位旋转分开，互不覆盖。
5. 用户开启减少动态效果时缩短动效，流程仍可正常完成。

不实现复杂 3D 洗牌、粒子效果或长时间动画。

---

## 13. Project Structure

```text
between/
├── public/
│   └── assets/
│       └── tarot/
│           ├── back.webp
│           ├── major/          # 22 images
│           └── minor/
│               ├── cups/       # 14 images
│               ├── wands/      # 14 images
│               ├── swords/     # 14 images
│               └── pentacles/  # 14 images
│
├── src/
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── TopNav.tsx
│   │   ├── QuestionInput.tsx
│   │   ├── TarotCard.tsx
│   │   ├── TarotDeck.tsx
│   │   ├── SelectedCards.tsx
│   │   ├── CardSpread.tsx
│   │   ├── ReadingInterpretation.tsx
│   │   ├── ReflectionForm.tsx
│   │   └── JournalEntryCard.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Reading.tsx
│   │   └── Journal.tsx
│   │
│   ├── data/
│   │   ├── tarotCards.ts
│   │   ├── readingTemplates.ts
│   │   └── dailyMessages.ts
│   │
│   ├── utils/
│   │   ├── detectTopic.ts
│   │   ├── shuffleDeck.ts
│   │   ├── generateReading.ts
│   │   └── storage.ts
│   │
│   └── types/
│       └── reading.ts
│
└── package.json
```

---

## 14. MVP Scope

### Must Have

- 完整 78 张牌的数据与图片。
- 每张牌的正位和逆位含义。
- 完整 78 张牌的随机洗牌。
- 用户自主选择三张不重复的牌。
- 正逆位随机分配并保持一致。
- 正逆位视觉呈现。
- 基于卡牌、方向、位置和主题的解读。
- Overall Reading。
- Reflection。
- Journal 保存、查看与删除。
- 桌面 Web 布局与不同窗口宽度下的自适应展示。
- 鼠标与键盘可完成提问、选牌、解读、反思及保存流程。

### Simplifications

- 正逆位概率默认各 50%。
- 不使用实时 LLM API。
- 不实现 78 × 2 × 3 × 4 套独立长篇解读。
- 使用 156 组基础牌义配合位置和主题模板。
- 不需要用户注册。
- 不支持跨设备同步。
- 不实现复杂的洗牌动画。
- 不提供其他塔罗牌阵。

### Out of Scope

- AI Chatbot。
- Astrology Birth Chart。
- Relationship Compatibility。
- Paid Readings。
- Social Features。
- Push Notifications。
- 长期个性化推荐。

---

## 15. Functional Acceptance Criteria

- [ ] 78 张塔罗牌全部存在且 ID 唯一。
- [ ] 78 张正面图片均能正确加载。
- [ ] 所有牌均具有 Upright 和 Reversed 含义。
- [ ] 用户可以从完整 78 张牌中选择 3 张。
- [ ] 不会重复选择同一张牌。
- [ ] 重新洗牌能够重置卡组和方向。
- [ ] 选牌后、揭牌前，正逆位不会泄露。
- [ ] 揭牌后正位与逆位方向正确。
- [ ] 翻牌动画与逆位旋转不冲突。
- [ ] 正逆位使用不同的关键词和解读。
- [ ] 三张牌的位置会影响解读。
- [ ] 问题主题会影响解读内容。
- [ ] 用户可以选择最有共鸣的卡牌。
- [ ] Reflection Prompt 与卡牌正逆位对应。
- [ ] Journal 正确保存卡牌 ID、方向和解读。
- [ ] 刷新页面后历史记录仍然存在。
- [ ] Journal 可以查看和删除记录。
- [ ] 桌面浏览器中可通过滚轮、触控板、拖拽或键盘浏览完整牌组；视觉上不显示滚动条。
- [ ] 顶部导航可正常切换 Home、Reading 与 Journal。
- [ ] 1280px、1440px 与 1920px 宽的桌面窗口布局清晰，无页面级横向溢出。
- [ ] 键盘可完成导航、选牌、表单填写与保存，焦点状态清晰可见。
- [ ] Demo 可以通过公开链接访问。

**Final Deliverable**

一个面向桌面浏览器、基于完整 78 张塔罗牌、支持正逆位解读的可运行 Web Demo，具有完整的 Ask → Draw → Interpret → Reflect → Save 用户旅程。

产品重点不只是随机生成塔罗结果，而是通过问题情境、正逆位含义和用户主动反思，将占卜转化为一次具有个人意义的探索体验。
