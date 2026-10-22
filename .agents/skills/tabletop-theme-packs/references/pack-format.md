# 独立题包JSON契约

供尚无题库实现的项目使用。已有应用的真实类型优先，新增内容应保持兼容。

根对象字段：schemaVersion为1，id使用稳定小写英文连字符标识；title、description、version为非空文本；questions为数组。题包文件按id命名。

每题字段：

| 字段 | 含义 |
|---|---|
| id | 稳定题卡ID，不因改写文本改变 |
| conceptId | 全库知识点标识，跨包和别名复用 |
| term | 展示词名 |
| aliases | 其他常见名称的字符串数组，可为空 |
| explanation | 完整真实解释，可长于10秒阅读量，无硬性字数限制 |
| packIds | 所属题包ID数组，包含当前题包 |
| difficulty | 1、2、3，编辑判断并由试玩修订 |
| status | verified或draft，后者禁止进入正式题池 |
| sources | 来源数组，正式题至少一项 |

来源字段为url（http或https）、title（实际读过页面标题）、checkedAt（YYYY-MM-DD核实日期）。填入日期是编辑声明，校验脚本不会证明实际访问。草稿可以没有来源，但应另存草稿文件，不能宣称已核实。

同包同一conceptId只出现一次。同一概念跨包出现时应复用相同id和一致的term/explanation；若需更新解释，同步所有引用而不是产生互相矛盾的版本。新增主题包优先使用中央题卡登记或引用，独立JSON仅作为便于迁移的数据交付形式。

题库历史以conceptId保存。开局统计的是组合后去重且未玩过的verified题量，不是题包数量的简单相加。不能通过换id规避已玩历史。
