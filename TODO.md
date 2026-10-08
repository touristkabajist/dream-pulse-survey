# Dream Pulse 交付待办

- [x] 页面醒目显示问题 **“What have you experienced in your dreams?”**，并在响应式布局中保持清晰可读。
- [x] 用户可以选择一个或多个选项：View（Without colour、With colour）、Sound、Smell、Taste、Touch（Wetness、Temperature、Roughness），并保留未来扩展子选项的数据结构。
- [x] 选择 Other 时显示文本输入框；输入限制为最多 100 个单词；提交前执行字数验证并显示清晰错误提示。
- [x] 页面提供 Submit 按钮；每位访客只能成功提交一次。
- [x] 使用 IP-based tracking 强制唯一性；只存储哈希后的 IP 地址；同一 IP 再次提交时阻止并显示清晰的重复提交消息。
- [x] 每条提交持久化保存已选选项、Custom Other 文本（若提供）、时间戳和哈希后的 IP 地址。
- [x] 对每个选项和子选项统计被选择次数，并以整数显示：View – Without colour、View – With colour、Sound、Smell、Taste、Touch – Wetness、Touch – Temperature、Touch – Roughness、Other。
- [x] 成功提交后显示所有用户提交的 Other 原文，每条作为显示精确文本的文字气泡/词云气泡，不计数、不聚合。
- [x] 提交成功后立即刷新结果，页面重新加载后仍能获取最新计数和 Other 原文。
- [x] 无需登录；页面响应式适配移动端和桌面端；整体界面干净、易读。
- [x] 提供健康检查和 `/manus-routes.json` 路由清单；保留托管数据库迁移、生产构建与容器入口。
