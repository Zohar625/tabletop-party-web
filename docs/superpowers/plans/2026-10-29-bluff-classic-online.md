# 瞎掰王原版联机 Implementation Plan

**Goal:** 独立原版模式支持3–9人各自手机联机；保留旧单机变体。
**Architecture:** 固定类型契约，规则、房间协议、题库适配分文件隔离，最后整合UI与大厅。无新增依赖。

## Global constraints
遵循docs/superpowers/specs/2026-10-29-bluff-classic-online-design.md；不内置语音、不复制商业题库；保持已有游戏和存档兼容。仅修改自己负责的文件，不在并行任务中提交他人改动。

### Task 1: Engine
文件src/games/bluff-classic/engine.ts、tests/classic-engine.test.ts。类型契约见types.ts。先测试再实现：3–9人三角色、原版轮数、初始3分、难度计分/质疑、私有投影、9秒固定截止、并发确认可重放安全、换题不换身份/不重复、完整局与幂等拒绝。导出createClassic(players,cards,settings,seed,now)、reduceClassic(state,actorId,action,now)、classicView(state,viewerId,now)。主机为players[0]；confirmRole是每人动作，beginRead/finishRead/next仅主机，skip/challenge/guess仅想想。读卡前skip保持身份与确认状态；finishRead必须到截止。使用不可变状态、种子确定性，不读浏览器API。

### Task 2: Room
文件src/games/bluff-classic/room.ts、tests/classic-room.test.ts、scripts/verify-classic-online.ts。固定Snapshot见types.ts。复用dinner/crypto.ts和mqtt.ts，可参考scout/room.ts成熟的鉴权、回执、陈旧实例保护和永久退出；不要重构既有游戏。命名空间tabletop-bluff-classic，存储tabletop.bluff.classic.room.v1。最多9人，至少3人且全员在线准备开局。房主configure(settings)仅开局前或完局后，startGame/rematch惰性调用bank.loadCards(settings)（测试通过RoomOptions.loadCards注入）。保留同轮并发confirmRole，读卡截止由主机pulse推进；publish调用classicView(state,id,now)避免过时读卡答案。非房主无权控阶段和配置；明确退出始终可用，旧控制器不能覆盖/删除新身份。文本聊天沿用认证作者、120字、50条、900ms间隔、不改游戏版本、独立序号单调合并。RoomOptions支持code/store/transport/now/tickMs/loadCards。导出ClassicRoom和工厂createRoom(name,options?)、joinRoom(name,code,pin?,options?)、restoreRoom(options?)、hasSavedRoom(options?)、roomLink(code,pin)；方法subscribe/getSnapshot/connect/stop/ready/configure/startGame/act/rematch/kick/leave/forceLeave；客户端时钟clockOffsetMs用于读卡遮挡。

### Task 3: Topic bank
文件src/games/bluff-classic/bank.ts、catalog.ts、data/classic-directions.json、tests/classic-bank.test.ts、docs/editorial/classic-directions-review.md。不改既有270条题目正文。逐条结合解释指定正确概念类型方向，确保覆盖全部现有卡，记录审阅。loadCards(settings)返回ClassicCard[]：指定难度时统一生成该级提示/分值，混合时使用既有difficulty；一级一个正确类型提示，二级三个方向中恰好一个正确，三级无提示。不得给生物配“器具”等错误真方向，避免错误提示同样可成立；可用明确互斥概念类型。只有房主惰性导入bank，catalog仅轻量元数据，不携带解释。export classicPacks:{id,title,count}[]供UI使用。按conceptId去重，草稿过滤，校验全部ID/方向/提示数。现有主题技能仅限项目，保持其词库不动。

### Task 4: UI and integration
文件ClassicApp.tsx、classic.css、main.tsx、bluff-classic/index.html、vite.classic.config.ts；修改大厅App.tsx、games/registry.ts、package.json build和离线包校验（仅增加新入口）。主机/成员短码房间、分享、准备、设置、状态、恢复/永久退出；阶段roles/reading/discussion/results/finished对应独立界面，private.me.role/answer不提前显示；9秒读卡到期本地遮挡。清楚区分原版“找老实人”和单机变体“找瞎掰人”。教程、确认质疑/猜人、全员角色揭晓和分数例子、同分排名。面对面/外部语音提示、文本聊天。手机优先原创卡面与轻动画，尊重减少动画。写有意义SSR/UI状态测试，不用静态字符串测试代替规则/交互。

### Task 5: Verify and publish
完整规则/协议/题库/隐私测试、TypeScript、六入口构建和离线大厅链接；独立审查及修复复核；浏览器两来源3人（可通过独立本地客户端）和手机布局/完整轮次/隐私；真实MQTT脚本验证。完成后发布GitHub Pages并核对线上HTML/JS/CSS。记录限制、不宣称未完成的验证。
