# GitHub Pages 试玩发布

## 最新题库更新：270题

活跃包1.3.0，源码提交 `e5fb3fd`，默认仍为4人、读卡5秒。本地23项检查、结构校验、构建及本地单文件语法检查通过；[GitHub部署39781917074](https://github.com/Zohar625/tabletop-party-web/actions/runs/39781917074)成功。上线后首页、JS、CSS实际HTTP返回200，脚本 `index-D28ETWPi.js` 中270个词均可检出。新词需刷新页面并重新开桌后进入题池，旧存档与历史不清空。

以下为最初90题发布的历史记录。

用户已授权将当前单手机版本发布到 GitHub，并希望后续把超级井字棋并入同一桌游大厅。本次不增加联机功能，不修改超级井字棋的现有仓库或入口。

- 试玩：https://zohar625.github.io/tabletop-party-web/
- 源码：https://github.com/Zohar625/tabletop-party-web
- 分支：`feat/offline-party-web`
- 已部署代码：`da40c5e`
- 成功部署记录：https://github.com/Zohar625/tabletop-party-web/actions/runs/39741266230
- GitHub 构建运行12项 Node 测试、11项 Python 测试及 TypeScript/Vite 构建，全部通过。
- 发布后实际 HTTP 检查：首页、JavaScript、CSS 均返回200。
- 手机界面与真实点击、后台及刷新行为仍待浏览器实测，不能将发布成功等同于手机体验验收。

Vite 使用相对资源路径，兼容 GitHub Pages 子目录与本地单文件打包。后续向该分支推送代码会自动检查并发布；只改 Markdown 不触发部署，也可以手动运行工作流。工作流限制依赖安装时间，使用官方 npm 下载地址并关闭安装时的审计请求；前两次安装长时间未推进，已取消，第三次安装、检查及部署完成。

当前仍是90题长卡、默认读卡5秒、默认4人、单手机传阅。网址与本地文件属于不同浏览器来源，旧本地进度及历史不会自动迁移到网址。后续合并超级井字棋时，使用共同大厅选择游戏，保留各游戏独立状态与旧入口。
