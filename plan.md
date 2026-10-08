# Dream Pulse — 梦境感官调查实施计划

## 目标与实现方式

这是一个无需登录的单页匿名调查应用。React 负责表单状态、结果刷新与响应式呈现；Express/tRPC 提供公开 API；Drizzle ORM 连接 Manus 托管 MySQL。每条提交以哈希后的访客 IP 为唯一键，选项数组、Other 原文与时间戳一起持久化，利用唯一约束和服务端校验阻止重复提交。

### 数据流

1. 页面加载时调用 `survey.getResults`，返回每个选项/子选项的整数计数、所有 Other 原文以及当前 IP 是否已经提交。
2. 用户可以多选 View、Sound、Smell、Taste、Touch 的子选项和 Other；选中 Other 后显示文本框。
3. 前端以空白分隔单词计算 Other 字数，超过 100 词或选中 Other 但没有内容时禁止提交；服务端重复执行校验。
4. 提交时 tRPC 服务端从 Express 请求头读取代理后的真实 IP，标准化后用 SHA-256 加服务端盐哈希，只保存 64 位十六进制摘要。先前端提示已提交不作为安全边界，数据库的 `ipHash` 唯一索引是最终约束。
5. 成功提交后重新拉取结果，显示最新计数和每一条 Other 原文气泡；重复 IP 返回明确的 `ALREADY_SUBMITTED` 错误并保留结果可见。

## 项目结构

- `client/src/App.tsx`：单页路由与应用壳。
- `client/src/pages/Home.tsx`：调查表、动态 Other 字段、提交状态和结果区。
- `client/src/index.css`：午夜蓝/薰衣草色梦境视觉系统、星尘背景、卡片与移动端断点。
- `drizzle/schema.ts`：`dream_submissions` 表与类型。
- `drizzle/0001_careless_juggernaut.sql`：可重复检查的增量迁移。
- `server/db.ts`：提交写入、IP 唯一检查与聚合读取。
- `server/routers.ts`：`survey.getResults`、`survey.submit` tRPC procedures。
- `public/manus-routes.json`：当前单页路由声明。
- `app.config.ts`：项目品牌标识元数据。

## 设计方向

- **Design Movement**：夜间编辑部（Nocturnal Editorial）——用杂志式大标题、柔和纸张卡片和微光渐变把匿名调查做得像一页梦境观察档案。
- **Core Principles**：克制的神秘感、清晰的阅读层级、触感式选择反馈、把数据变成可阅读的回声。
- **Color Philosophy**：深海靛蓝作为安静底色，雾紫和月光黄代表梦的模糊边缘，珊瑚橙只用于行动与错误提示，确保重点温暖但不吵闹。
- **Layout Paradigm**：不采用单一居中网格；桌面端以左侧纵向编号和问题叙事作为锚点，右侧分层卡片承载选择与结果，移动端折叠成连贯的纵向阅读流。
- **Signature Elements**：编号胶囊、细线星轨、带轻微漂浮感的 Other 文字气泡。
- **Interaction Philosophy**：选择像点亮感官标本，选中后有柔和光晕和颜色迁移；所有状态反馈就地出现，不依赖突兀弹窗。
- **Animation**：页面入场以轻微上移和淡入开始；选项 hover 仅上移 2px；选中状态用 180ms 的背景/边框过渡；结果气泡按短错峰顺序淡入；不使用持续晃动，尊重减少动态偏好。
- **Typography System**：标题使用 `Georgia` 斜体衬线，正文使用系统无衬线字体；英文问题保留杂志感，中文说明使用高可读性系统字体。层级：eyebrow 11px 大写字母、标题 clamp(2.8rem, 6vw, 5.8rem)、正文 16px、计数 30px。
- **Brand Essence**：一个让人匿名留下梦境感官证据、再看见集体回声的微型调查站；气质是安静、好奇、带一点诗意。
- **Brand Voice**：文案短、具体、像观察笔记。示例：“Select every sense that arrived with you.”、“A small archive of sleeping minds.”
- **Wordmark & Logo**：`D/P` 两个字母组成上下错位的月牙标记，旁边以小号大写字母排出 DREAM PULSE；不使用默认 Logo 图片。
- **Signature Brand Color**：`#B8A7FF` 月雾紫，用于选中状态和核心数据高光。

## 约束与材料

- 只使用当前模板已有依赖，不引入不必要的新包。
- 数据库迁移必须提交，生产容器通过现有 Dockerfile 构建并监听 `PORT`。
- `Other` 原文按用户输入原样保存与展示，不在服务端做聚合；仅做长度和危险输入的正常 React 转义。
- 仅公开成功/失败结果，不显示原始 IP；后端健康检查保持 `/api/health`。
- 所有浏览器 API 使用相对路径，避免在跨站 Preview iframe 中硬编码内部主机名。
