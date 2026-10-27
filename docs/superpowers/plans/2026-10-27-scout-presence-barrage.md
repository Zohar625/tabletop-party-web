# SCOUT Presence and Barrage Implementation Plan

**Goal:** 在线玩家不因其他房客掉线被全局锁住，叠牌保持单行，新聊天自动弹幕。
**Architecture:** 移除房间和UI的全员在线动作门槛，保留引擎轮次权限。单行叠牌CSS保持最小数字宽度。独立弹幕组件消费已确认聊天，按序号去重，限制轨道和队列。
**Tech Stack:** React / TypeScript / CSS，现有加密MQTT房间。

- [x] tests/scout-room.test.ts：先复现房客离线锁住在线行动；覆盖朝向、演出、下一轮、恢复和不能替离线者操作。再修改room.ts与ScoutApp.tsx的全局门槛与提示。
- [x] tests/scout-hand.test.ts：单行保序回归；修改ui-model.ts、ScoutTable.tsx、scout.css，密叠卡保留数字、溢出滚动、插牌展开。
- [x] tests/scout-social.test.ts：新消息游标、过期/重放过滤、六条快捷语。实现Barrage.tsx、chat-model.ts与Chat.tsx中的开关，限制并发轨道，支持减少动态效果。
- [x] 全量测试、构建、手机浏览器实测，审查改动，发布及线上验收；记录真实网络测试结果。
