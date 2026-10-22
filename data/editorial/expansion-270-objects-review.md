# 270题扩充：器物、奇特职业与制度审阅

核实日期：2026-10-22。最终40题，全部`verified`，草稿0。每题已实际联网打开并阅读可靠正文；42条来源引用、38个独立URL。主要来源为博物馆/馆藏、政府机构、大学及研究机构，三项伦敦拾荒职业直接阅读梅休《伦敦劳工与伦敦穷人》卷二原著（已属公版）。

此文件及同名JSON是待合并编辑批次，尚未接入可玩登记，不代表网页已发布。仅改这两个文件；未安装工具，未改原450归档或其他题包。

## 分批与验证

- Stage 1：10题；主代理已审，并独立读黄瓜、假牙、狗轮三篇。拔牙钥匙末句无依据声响已删除。
- Stage 2：累计20题，加入狗粪收集、下水道寻宝及怪器具。
- Stage 3：累计30题，加入交通工具、机械乐器及历史医疗器物。
- Stage 4：最终40题，加入真实间谍装置、石板抽签设备、囚犯遮脸帽等。奶酒壶候选的补充正文打不开，替换为已读CIA正文的虎粪传感器。
- 解释长度：158–191字符（含标点），平均175.15；全部在120–200范围内。正文不用统一免责声明填长度。
- 结构验证：使用项目技能`validate_pack.py`的`validate`函数，在内存为编辑批次补入正式包根元数据运行，返回`[]`。JSON可正常解析，40个ID和conceptId各自唯一，日期均为2026-10-22，来源均有evidence。
- 对照`data/playtest/*.json`活跃90、`expansion-180-nature/objects.json`待合入60、`data/packs/*.json`归档450检查term/ID/concept精确冲突，未发现；另已阅读全库词名并人工排除别名/用途近似。未复用任何归档概念，故无旧ID映射改动。
- 不跑整站测试来替代事实核验；此批尚未接入，最终合并后的组合抽取测试由主代理执行。

## 每题来源与边界

| 题目 | 已读正文 | 编辑核查 |
|---|---|---|
| 泥滩拾荒人 | [Mudlarks: the murky world of London’s river scavengers](https://www.rmg.co.uk/stories/maritime-history/library-archive/mudlarks-murky-world-londons-river-scavengers) | 以十九世纪谋生职业为准，不混入现代持证考古爱好。 |
| 黄瓜矫直器 | [Cucumber Straightener - Garden Museum](https://www.gardenmuseum.org.uk/collection/cucumber-straightener/) | 果实生长早期套管，不写成熟黄瓜硬掰直。 |
| 尸体防盗笼 | [Beating the bodysnatchers - Wellcome Collection](https://wellcomecollection.org/stories/beating-the-bodysnatchers)；[Iron mortsafe base and lid - Science Museum Group](https://collection.sciencemuseumgroup.org.uk/objects/co77094/iron-mortsafe-base-and-lid) | 防盗尸而非防诈尸；220公斤只指SMG这件盖子。 |
| 滑铁卢假牙 | [Lower denture with human teeth, England, 1800-1870 - Science Museum Group](https://collection.sciencemuseumgroup.org.uk/objects/co102388/lower-denture-with-human-teeth-england-1800-1870) | 未说该特定馆藏人牙确定来自滑铁卢战场。 |
| 骂妇铁笼 | [Scold's Bridle Mask which partially covers face - Science Museum Group](https://collection.sciencemuseumgroup.org.uk/objects/co155218/scolds-bridle-scolds-bridle) | 不说仅用于女性；个别藏品来历不详未补故事。 |
| 拔牙钥匙 | [Tooth key with two claws, 1850 (c) - National Army Museum](https://collection.nam.ac.uk/detail.php?acc=1973-12-90-38) | 已按主代理审阅删掉无据的“开锁声”比喻。 |
| 烟囱童工 | [Chimney sweeps’ soot-stained past - London Museum](https://www.londonmuseum.org.uk/collections/london-stories/chimney-sweeps-soot-stained-past/) | 按博物馆说明写1875事件与执行，不扩大成所有地区统一终止。 |
| 复活人 | [The Sinister History of Mort Safes - West Highland Museum](https://www.westhighlandmuseum.org.uk/2021/03/07/the-sinister-history-of-mort-safes/) | 盗尸职业与护棺器具分别设题；核心在探听葬礼与夜盗。 |
| 狗力烤肉轮 | [Dog wheel 149377 - National Trust Collections](https://www.nationaltrustcollections.org.uk/object/149377) | 以National Trust酒馆实物为准，非把任何小狗都称转烤犬。 |
| 人发手链 | [Victorian Hair Jewellery - Florence Nightingale Museum](https://www.florence-nightingale.co.uk/victorian-hair-jewellery/) | 不说全是死者头发；南丁格尔手链明确来自在世家人纪念。 |
| 狗粪收集人 | [London Labour and the London Poor, Volume II - Henry Mayhew](https://www.gutenberg.org/files/60440/60440-h/60440-h.htm) | 原著叙述工艺和市场，不复述其不可靠的化学解释为现代结论。 |
| 下水道寻宝人 | [London Labour and the London Poor, Volume II - Henry Mayhew](https://www.gutenberg.org/files/60440/60440-h/60440-h.htm) | 未收录原著鼠群吃人等传说，不写下水道气体有益健康。 |
| 雪茄头拾荒人 | [London Labour and the London Poor, Volume II - Henry Mayhew](https://www.gutenberg.org/files/60440/60440-h/60440-h.htm) | 明确通常兼做其他拾荒，不虚称大量人单靠烟头谋生。 |
| 酒鬼木桶衣 | [Drunkard´s cloak, also known as ‘Spanish Coat’ - Bayerisches Nationalmuseum](https://www.bayerisches-nationalmuseum.de/en/collection/highlights/00040108) | 名为酒鬼衣，实际来源说多种轻罪，不限酗酒。 |
| 空转苦役轮 | [Victorian Punishment - Stonehaven Tolbooth Museum](https://www.stonehaventolbooth.co.uk/news-events/54-victorian-punishment.html) | 表盘计数与煤尘铁屑阻力均有馆方实物故事支持。 |
| 太阳报时炮 | [Sundial - Horizontal Cannon, circa 1850 - Museums Victoria](https://collections.museumsvictoria.com.au/items/413356)；[Cannon dial - Royal Museums Greenwich](https://www.rmg.co.uk/collections/objects/rmgc-object-10594) | 微型火炮自然报时；不提供火药配比或制作步骤。 |
| 下海更衣车 | [5 Ways to do Beach Fun like Queen Victoria - English Heritage](https://www.english-heritage.org.uk/visit/inspire-me/blog/blog-posts/five-ways-beach-fun-like-queen-victoria/) | 使用女王特定浴车细节，不泛化到所有浴车都有厕所。 |
| 轮内摩托车 | [McLean Monowheel – 1998 - Lane Motor Museum](https://www.lanemotormuseum.org/collection/motorcycles/item/mclean-monowheel-1998/) | 24/64公里为15/40mph近似换算，未称其大众商业成功。 |
| 三连迷酒杯 | [Fuddling cup - Dallas Museum of Art, Google Arts & Culture](https://artsandculture.google.com/asset/fuddling-cup/WwFNHLoey4tf3A?hl=en) | 三隔间孔道与指位谜题，不是现有漏水谜壶的空心把手结构。 |
| 自助灌肠针筒 | [Pewter enema syringe, London, England, 1822-1846 - Science Museum Group](https://collection.sciencemuseumgroup.org.uk/objects/co139767/pewter-enema-syringe-london-england-1822-1846) | 小帽便于携带是馆方推测，已在正文保留“推测”。 |
| 螺旋桨汽车 | [Helicron – 1932 - Lane Motor Museum](https://www.lanemotormuseum.org/collection/cars/item/helicron-1932/) | 区分原车与修复换装Citroën发动机；不说原厂就是该发动机。 |
| 行李箱摩托车 | [Valmobile Fold Away Scooter – 1950 - Lane Motor Museum](https://www.lanemotormuseum.org/collection/motorcycles/item/valmobile-fold-away-scooter-1950/) | 不采用馆藏页自己质疑的1950原型车身份；展开与销量写车型历史。 |
| 钉子小提琴 | [Nail Violin - The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/501564) | 只写所选半圆藏品的30根发声钉，不混用另一件圆形琴的针数。 |
| 火焰管风琴 | [Kastner's Pyrophone, 1873-1876 - Science Museum Group](https://collection.sciencemuseumgroup.org.uk/objects/co5867) | 馆藏实物和专属乐谱支持实际存在，不将专利当效果证明。 |
| 手杖小提琴 | [Cane Violin - The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/501560) | 馆方对制作人仅作归属，正文未硬指确定作者。 |
| 机械手指巨低音提琴 | [Octobasse - Musée de la musique, MIMO](https://mimo-international.com/MIMO/doc/IFD/OAI_CIMU_ALOES_0161700/octobasse) | 以巴黎馆藏E.409的3480mm与七机械指机构为准。 |
| 虎粪传感器 | [Natural Spies: Animals in Espionage - CIA](https://www.cia.gov/stories/story/natural-spies-animals-in-espionage/) | 视觉伪装与300米范围来自CIA，未捏造粪便气味或传输机制。 |
| 鸽子尾哨 | [Ko-Tze - The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/502252) | 忠字的归巢象征为馆方推测，正文明确。 |
| 金属驱病棒 | [Of the imagination, as a cause and as a cure of disorders of the body - Wellcome Collection](https://wellcomecollection.org/works/rxjv2n3y) | 金属磁性治疗是历史主张；木棒试验与主观反应不写成临床疗效。 |
| 催吐锑杯 | [Antimony cup with leather case, Europe, 1601-1700 - Science Museum Group](https://collection.sciencemuseumgroup.org.uk/objects/co128569/antimony-cup-with-leather-case-europe-1601-1700) | 历史体液观念与中毒反应分清，不写治愈疾病或剂量教程。 |
| 蜻蜓窃听机 | [Natural Spies: Animals in Espionage - CIA](https://www.cia.gov/stories/story/natural-spies-animals-in-espionage/) | 明确侧风问题导致未实用；参数按CIA记录，未称成功任务。 |
| 间谍鲶鱼 | [Natural Spies: Animals in Espionage - CIA](https://www.cia.gov/stories/story/natural-spies-animals-in-espionage/) | 采样行动是官方能力设想，未编造成功执行的秘密任务。 |
| 死鼠情报箱 | [TRIGON: Spies Passing in the Night - CIA](https://www.cia.gov/stories/story/trigon-spies-passing-in-the-night/) | 藏物容器与远程接头历史，不写动物训练或监听功能。 |
| 树桩窃听器 | [Tree Stump Listening Device - International Spy Museum](https://www.spymuseum.org/exhibition-experiences/about-the-collection/collection-highlights/tree-stump-listening-device/) | 只写太阳能和截收信号；未编造卫星转发细节。 |
| 空心五分硬币 | [Hollow Nickel/Rudolf Abel - FBI](https://www.fbi.gov/history/cases-and-criminals/hollow-nickel-rudolph-abel) | 实际案情1953发现、数年调查，不以电影桥段代事实。 |
| 温斯洛安婴糖浆 | [Mrs. Winslow’s Soothing Syrup - DEA Museum](https://museum.dea.gov/museum-collection/collection-spotlight/artifact/soothing-syrup) | 正文说曾含吗啡酒精，不把后期无阿片配方也混同。 |
| 喇叭小提琴 | [Stroh Violin - The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/503726) | 非电乐器，其喇叭为早期声学录音定向，不等同电子扩音。 |
| 石头抽签任官机 | [The Machine that Selected the Citizens of Athens - CNRS News](https://news.cnrs.fr/videos/the-machine-that-selected-the-citizens-of-athens) | 黑白块逐行选择采用CNRS复原例；明确完整原机未出土、机构有推测。 |
| 囚犯遮脸帽 | [Convicts: male convict at Pentonville Prison and female convict at Millbank Prison - London Museum](https://www.londonmuseum.org.uk/collections/v/object-798641/convicts-male-convict-at-pentonville-prison-and-female-convict-at-millbank-prison/) | 区分当时官方遮羞理由与同期作者的批评。 |
| 锁酒架 | [“Tantalus” Set - Corning Museum of Glass](https://glasscollection.cmog.org/objects/33822/tantalus) | 只写馆藏可见结构、锁环和雕刻，不补无来源神话词源。 |

## 去重与弃选说明

尸体防盗笼和复活人共享背景，但前者是家属保护新坟的租赁器具，后者是盗尸者侦察、挖掘与转售的职业；核心可猜用途不同。三连迷酒杯以多隔间和孔道切换为核心，与现有漏水谜壶并非同件器具。喇叭小提琴、钉子小提琴、手杖小提琴各自改变发声结构、发声材料或隐藏方式，不以小提琴别名拆卡。

未采用食罪人（未获得足够强的可读正文）、耳聋国王宝座（发现当代证据缺口）、假脸蜡妆火屏（避免常见伪史）、普通点灯/计算/摆瓶职业（反常细节不足）、永久药丸（可靠正文未落实）、奶酒壶（补充吸饮与凝乳细节正文连续打不开）。搜索结果和失败页面没有作为正式题事实依据。来源URL保留在JSON，不用伪造页码填充核查记录。

