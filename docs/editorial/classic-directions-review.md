# 原版模式方向元数据审阅（2026-10-29）

范围：现有 outrageous-long-cards 1.3.0 的270条verified原创长卡。逐条阅读现有解释，新增独立方向与两个干扰方向；题目ID、conceptId、词名、长解释和来源保持原样。这里审阅的是概念分类，没有新增冷知识，也没有重新访问或重新核实原来源。

分类口径：方向描述词条本身，而不是解释中随便出现的东西。动物、植物和真菌分开；动物行为、身体结构、动物建造的结构与动物分泌物不冒充整个生物；已加工头骨、假人鱼与机械鲶鱼均按人工实物。自然地貌与物理现象另列，火星蜘蛛不是动物，红色精灵不是民俗角色，冰头发不是制造冰丝的真菌。

干扰方向逐条沿类型边界排除。例如动物用植物/真菌，人工器物用植物/动物，其余通常用人物职业/植物；没有使用历史、自然、科学等能同时描述多种对象的主题标签。生物行为题不使用物理或化学现象作为干扰项；历史药品不使用人造实物作为干扰项。

难度1显示一个正确方向；难度2显示三个互异方向且仅一项符合词条类型，正确位置按conceptId稳定轮换；难度3不显示方向。混合难度沿用原卡difficulty。方向不直接泄露长解释中的关键机制。

交付：轻量catalog只读登记；bank只有实际调用loadCards时才动态导入旧答案模块，房主负责调用。先过滤verified和所选packIds，再按conceptId去重。缺少方向或不支持的难度报错，不悄悄猜方向。

验证：node --experimental-strip-types --test tests/classic-bank.test.ts，6项通过；npx tsc --noEmit通过。测试检查270卡精确覆盖、四种难度、原文/来源不变、草稿过滤、题包选择、概念去重、错误情况、注入加载器及易错分类。自动检查不能证明语义分类正确，下面记录逐条的编辑判定。

| 类型                   | 数量 |
| ---------------------- | ---: |
| 一项科学实验           |    1 |
| 一种动物               |   70 |
| 一种动物产生的物质     |    1 |
| 一种动物建造的结构     |    1 |
| 一种动物身体结构       |    1 |
| 一种化学物质或物态     |    2 |
| 一种金属元素           |    1 |
| 一种历史药品           |    1 |
| 一种民俗角色           |    1 |
| 一种人类活动或方法     |   31 |
| 一种人物职业           |    9 |
| 一种人造实物           |   89 |
| 一种生物行为或生理变化 |    5 |
| 一种物理或化学现象     |   25 |
| 一种真菌               |    8 |
| 一种植物               |   16 |
| 一种自然地貌或景观     |    8 |

| 序号 | 原conceptId                                        | 词名               | 正确方向               | 两个干扰方向            |
| ---: | -------------------------------------------------- | ------------------ | ---------------------- | ----------------------- |
|    1 | ornamental-hermit                                  | 花园隐士           | 一种人物职业           | 一种植物 / 一种人造实物 |
|    2 | groom-of-stool                                     | 便器侍从           | 一种人物职业           | 一种植物 / 一种人造实物 |
|    3 | knocker-upper                                      | 敲窗人             | 一种人物职业           | 一种植物 / 一种人造实物 |
|    4 | tobacco-resuscitator                               | 烟草复苏器         | 一种人造实物           | 一种植物 / 一种动物     |
|    5 | safety-coffin                                      | 安全棺             | 一种人造实物           | 一种植物 / 一种动物     |
|    6 | moustache-cup                                      | 护须杯             | 一种人造实物           | 一种植物 / 一种动物     |
|    7 | lovers-eye                                         | 恋人之眼           | 一种人造实物           | 一种植物 / 一种动物     |
|    8 | pearlfish-sea-cucumber                             | 隐鱼               | 一种动物               | 一种植物 / 一种真菌     |
|    9 | ceratothoa-tongue-parasite                         | 食舌等足虫         | 一种动物               | 一种植物 / 一种真菌     |
|   10 | hagfish-knot                                       | 盲鳗               | 一种动物               | 一种植物 / 一种真菌     |
|   11 | snapping-shrimp                                    | 鼓虾               | 一种动物               | 一种植物 / 一种真菌     |
|   12 | sea-slug-extreme-autotomy                          | 海天牛的极端自切   | 一种生物行为或生理变化 | 一种人物职业 / 一种植物 |
|   13 | ophiocordyceps-unilateralis                        | 偏侧蛇虫草         | 一种真菌               | 一种植物 / 一种动物     |
|   14 | colobopsis-autothysis                              | 爆炸蚁             | 一种动物               | 一种植物 / 一种真菌     |
|   15 | whale-earplug                                      | 鲸耳塞             | 一种动物产生的物质     | 一种人物职业 / 一种植物 |
|   16 | prince-ruperts-drop                                | 鲁珀特之泪         | 一种人造实物           | 一种植物 / 一种动物     |
|   17 | leidenfrost-effect                                 | 莱顿弗罗斯特效应   | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   18 | pitch-drop-experiment                              | 沥青滴落实验       | 一项科学实验           | 一种人物职业 / 一种植物 |
|   19 | eukonkanto                                         | 尤孔坎托           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   20 | coopers-hill-cheese-rolling                        | 滚奶酪赛           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   21 | outrageous-objects-portable-baby-cage              | 窗外挂婴笼         | 一种人造实物           | 一种植物 / 一种动物     |
|   22 | outrageous-objects-nose-shaping-frame              | 整鼻面罩           | 一种人造实物           | 一种植物 / 一种动物     |
|   23 | outrageous-objects-water-walking-shoes             | 水上步行鞋         | 一种人造实物           | 一种植物 / 一种动物     |
|   24 | outrageous-objects-automatic-hat-saluter           | 自动脱帽致意器     | 一种人造实物           | 一种植物 / 一种动物     |
|   25 | outrageous-objects-time-alarm-tipping-bed          | 翻床闹钟           | 一种人造实物           | 一种植物 / 一种动物     |
|   26 | outrageous-objects-self-kicking-amusement          | 自己踢自己机       | 一种人造实物           | 一种植物 / 一种动物     |
|   27 | outrageous-objects-puzzle-jug                      | 漏水谜壶           | 一种人造实物           | 一种植物 / 一种动物     |
|   28 | outrageous-objects-bourdalou-chamber-pot           | 女士便壶           | 一种人造实物           | 一种植物 / 一种动物     |
|   29 | outrageous-objects-shoe-fitting-fluoroscope        | X光试鞋机          | 一种人造实物           | 一种植物 / 一种动物     |
|   30 | outrageous-objects-chandelier-perm-machine         | 吊灯式烫发机       | 一种人造实物           | 一种植物 / 一种动物     |
|   31 | outrageous-objects-vigorzone-electric-belt         | 电疗胸带           | 一种人造实物           | 一种植物 / 一种动物     |
|   32 | outrageous-objects-revigator-radioactive-water-jar | 镭矿活力水罐       | 一种人造实物           | 一种植物 / 一种动物     |
|   33 | outrageous-objects-violet-ray-apparatus            | 紫光电疗箱         | 一种人造实物           | 一种植物 / 一种动物     |
|   34 | outrageous-objects-macaura-blood-circulator        | 血液循环手摇机     | 一种人造实物           | 一种植物 / 一种动物     |
|   35 | outrageous-objects-phrenological-skull-head        | 性格分区头骨       | 一种人造实物           | 一种植物 / 一种动物     |
|   36 | outrageous-objects-beerbrella                      | 啤酒遮阳伞         | 一种人造实物           | 一种植物 / 一种动物     |
|   37 | outrageous-objects-three-section-combover          | 三向遮秃梳法       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   38 | outrageous-objects-rocking-bathtub                 | 摇晃浴缸           | 一种人造实物           | 一种植物 / 一种动物     |
|   39 | outrageous-objects-fan-and-uv-spoon                | 风扇消毒汤匙       | 一种人造实物           | 一种植物 / 一种动物     |
|   40 | outrageous-objects-high-five-simulator             | 独自击掌机         | 一种人造实物           | 一种植物 / 一种动物     |
|   41 | outrageous-objects-pat-on-back-apparatus           | 自我拍背鼓励器     | 一种人造实物           | 一种植物 / 一种动物     |
|   42 | outrageous-objects-motorized-ice-cream-cone        | 电动冰淇淋托       | 一种人造实物           | 一种植物 / 一种动物     |
|   43 | outrageous-objects-anti-eating-face-mask           | 防进食面罩         | 一种人造实物           | 一种植物 / 一种动物     |
|   44 | outrageous-objects-wearable-table                  | 穿在身上的桌子     | 一种人造实物           | 一种植物 / 一种动物     |
|   45 | nature-vampire-squid                               | 吸血鬼乌贼         | 一种动物               | 一种植物 / 一种真菌     |
|   46 | nature-osedax                                      | 食骨蠕虫           | 一种动物               | 一种植物 / 一种真菌     |
|   47 | nature-barreleye                                   | 大鳍后肛鱼         | 一种动物               | 一种植物 / 一种真菌     |
|   48 | nature-bloody-belly-comb-jelly                     | 血腹栉水母         | 一种动物               | 一种植物 / 一种真菌     |
|   49 | nature-nudibranch-stolen-stings                    | 盗刺海蛞蝓         | 一种动物               | 一种植物 / 一种真菌     |
|   50 | nature-nepenthes-lowii                             | 劳氏猪笼草         | 一种植物               | 一种动物 / 一种人物职业 |
|   51 | nature-nepenthes-hemsleyana                        | 赫姆斯利猪笼草     | 一种植物               | 一种动物 / 一种人物职业 |
|   52 | nature-velvet-worm                                 | 天鹅绒虫           | 一种动物               | 一种植物 / 一种真菌     |
|   53 | nature-coconut-octopus                             | 椰子章鱼           | 一种动物               | 一种植物 / 一种真菌     |
|   54 | nature-sacculina                                   | 蟹奴               | 一种动物               | 一种植物 / 一种真菌     |
|   55 | nature-texas-horned-lizard                         | 得州角蜥           | 一种动物               | 一种植物 / 一种真菌     |
|   56 | wildlife-wombat                                    | 袋熊               | 一种动物               | 一种植物 / 一种真菌     |
|   57 | nature-bombardier-beetle                           | 射弹步甲           | 一种动物               | 一种植物 / 一种真菌     |
|   58 | nature-bolas-spider                                | 华丽投索蛛         | 一种动物               | 一种植物 / 一种真菌     |
|   59 | nature-hammer-orchid                               | 锤兰               | 一种植物               | 一种动物 / 一种人物职业 |
|   60 | nature-surinam-toad                                | 负子蟾             | 一种动物               | 一种植物 / 一种真菌     |
|   61 | nature-anglerfish-sexual-parasitism                | 深海鮟鱇的融合婚姻 | 一种生物行为或生理变化 | 一种人物职业 / 一种植物 |
|   62 | nature-diving-bell-spider                          | 水蛛的潜水钟       | 一种动物建造的结构     | 一种人物职业 / 一种植物 |
|   63 | nature-immortal-jellyfish                          | 灯塔水母的返老还童 | 一种生物行为或生理变化 | 一种人物职业 / 一种植物 |
|   64 | nature-squirting-cucumber                          | 喷瓜               | 一种植物               | 一种动物 / 一种人物职业 |
|   65 | nature-icefish                                     | 南极白血冰鱼       | 一种动物               | 一种植物 / 一种真菌     |
|   66 | nature-wood-frog                                   | 林蛙的冬季停机     | 一种生物行为或生理变化 | 一种人物职业 / 一种植物 |
|   67 | nature-sea-spider                                  | 海蜘蛛的腿肠       | 一种动物身体结构       | 一种人物职业 / 一种植物 |
|   68 | nature-rafflesia-arnoldii                          | 阿诺德大王花       | 一种植物               | 一种动物 / 一种人物职业 |
|   69 | outrageous-customs-namahage                        | 生剥鬼             | 一种民俗角色           | 一种人物职业 / 一种植物 |
|   70 | outrageous-customs-scissors-dance                  | 剪刀舞             | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   71 | custom-echternach-hopping                          | 埃希特纳赫跳跃巡游 | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   72 | custom-mesir-macunu                                | 梅西尔马居努节     | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   73 | outrageous-customs-air-guitar                      | 空气吉他大赛       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   74 | outrageous-customs-bog-snorkelling                 | 泥沼浮潜赛         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   75 | outrageous-customs-pancake-race                    | 煎饼赛跑           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   76 | outrageous-customs-woolsack-race                   | 扛羊毛袋赛跑       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   77 | outrageous-customs-conker-championship             | 马栗对打赛         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   78 | outrageous-customs-gravy-wrestling                 | 肉汁摔跤           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   79 | outrageous-customs-kirkpinar-oil-wrestling         | 涂油摔跤节         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|   80 | outrageous-science-oobleck                         | 淀粉水跑步         | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   81 | outrageous-science-supercooled-water               | 过冷水             | 一种化学物质或物态     | 一种人物职业 / 一种植物 |
|   82 | outrageous-science-hot-ice                         | 热冰               | 一种化学物质或物态     | 一种人物职业 / 一种植物 |
|   83 | outrageous-science-magnetic-liquid-oxygen          | 磁铁留住液氧       | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   84 | outrageous-science-superfluid-helium               | 爬墙的超流氦       | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   85 | outrageous-science-ferrofluid                      | 磁流体尖刺         | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   86 | outrageous-science-triboluminescence               | 碎糖闪光           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   87 | outrageous-science-gallium-melting                 | 手心熔化的镓       | 一种金属元素           | 一种人物职业 / 一种植物 |
|   88 | outrageous-science-boiling-freezing                | 沸腾着结冰         | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   89 | outrageous-science-bz-reaction                     | 自己变色的药水     | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   90 | outrageous-science-acoustic-levitation             | 声音托住水滴       | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|   91 | nature-sea-pig                                     | 海猪               | 一种动物               | 一种植物 / 一种真菌     |
|   92 | nature-angler-siphonophore                         | 钓鱼管水母         | 一种动物               | 一种植物 / 一种真菌     |
|   93 | nature-decorator-crab                              | 装饰蟹             | 一种动物               | 一种植物 / 一种真菌     |
|   94 | nature-peacock-mantis-shrimp                       | 雀尾螳螂虾         | 一种动物               | 一种植物 / 一种真菌     |
|   95 | nature-hoatzin                                     | 麝雉               | 一种动物               | 一种植物 / 一种真菌     |
|   96 | nature-harp-sponge                                 | 竖琴海绵           | 一种动物               | 一种植物 / 一种真菌     |
|   97 | nature-bomber-worm                                 | 炸弹蠕虫           | 一种动物               | 一种植物 / 一种真菌     |
|   98 | nature-pigbutt-worm                                | 猪屁股蠕虫         | 一种动物               | 一种植物 / 一种真菌     |
|   99 | nature-barrel-amphipod                             | 海樽虾             | 一种动物               | 一种植物 / 一种真菌     |
|  100 | nature-strawberry-squid                            | 草莓鱿鱼           | 一种动物               | 一种植物 / 一种真菌     |
|  101 | nature-giant-tubeworm                              | 巨型管虫           | 一种动物               | 一种植物 / 一种真菌     |
|  102 | nature-predatory-tunicate                          | 捕食海鞘           | 一种动物               | 一种植物 / 一种真菌     |
|  103 | nature-satin-bowerbird                             | 缎蓝园丁鸟         | 一种动物               | 一种植物 / 一种真菌     |
|  104 | nature-hydnora-africana                            | 非洲白鹭花         | 一种植物               | 一种动物 / 一种人物职业 |
|  105 | nature-fiveangled-dodder                           | 五角菟丝子         | 一种植物               | 一种动物 / 一种人物职业 |
|  106 | nature-fulmar                                      | 暴雪鹱             | 一种动物               | 一种植物 / 一种真菌     |
|  107 | nature-loggerhead-shrike                           | 呆头伯劳           | 一种动物               | 一种植物 / 一种真菌     |
|  108 | nature-emerald-cockroach-wasp                      | 绿宝石蟑螂蜂       | 一种动物               | 一种植物 / 一种真菌     |
|  109 | nature-antlion                                     | 蚁狮               | 一种动物               | 一种植物 / 一种真菌     |
|  110 | nature-welwitschia                                 | 百岁兰             | 一种植物               | 一种动物 / 一种人物职业 |
|  111 | nature-dracula-orchid                              | 德古拉兰           | 一种植物               | 一种动物 / 一种人物职业 |
|  112 | nature-artillery-fungus                            | 炮弹菌             | 一种真菌               | 一种植物 / 一种动物     |
|  113 | nature-massospora-cicadina                         | 蝉团孢霉           | 一种真菌               | 一种植物 / 一种动物     |
|  114 | nature-tardigrade                                  | 水熊虫             | 一种动物               | 一种植物 / 一种真菌     |
|  115 | nature-stinkhorn                                   | 鬼笔               | 一种真菌               | 一种植物 / 一种动物     |
|  116 | nature-aye-aye                                     | 指猴               | 一种动物               | 一种植物 / 一种真菌     |
|  117 | nature-star-nosed-mole                             | 星鼻鼹             | 一种动物               | 一种植物 / 一种真菌     |
|  118 | nature-vampire-bat                                 | 吸血蝠             | 一种动物               | 一种植物 / 一种真菌     |
|  119 | nature-fleischmann-glassfrog                       | 弗氏玻璃蛙         | 一种动物               | 一种植物 / 一种真菌     |
|  120 | nature-darwin-frog                                 | 达尔文蛙           | 一种动物               | 一种植物 / 一种真菌     |
|  121 | outrageous-objects-pigeon-camera                   | 鸽子相机           | 一种人造实物           | 一种植物 / 一种动物     |
|  122 | outrageous-objects-bontems-songbird                | 发条笼中鸟         | 一种人造实物           | 一种植物 / 一种动物     |
|  123 | outrageous-objects-tipus-tiger                     | 提普之虎           | 一种人造实物           | 一种植物 / 一种动物     |
|  124 | outrageous-objects-clockwork-monk                  | 发条修士           | 一种人造实物           | 一种植物 / 一种动物     |
|  125 | outrageous-objects-chopines                        | 乔平高底鞋         | 一种人造实物           | 一种植物 / 一种动物     |
|  126 | outrageous-objects-flea-trap-pendant               | 跳蚤诱捕项坠       | 一种人造实物           | 一种植物 / 一种动物     |
|  127 | outrageous-objects-spring-scarificator             | 弹簧放血盒         | 一种人造实物           | 一种植物 / 一种动物     |
|  128 | outrageous-objects-wooden-iron-lung                | 木制铁肺           | 一种人造实物           | 一种植物 / 一种动物     |
|  129 | outrageous-objects-animal-ear-protectors           | 动物护耳筒         | 一种人造实物           | 一种植物 / 一种动物     |
|  130 | outrageous-objects-banana-protective-device        | 香蕉护甲盒         | 一种人造实物           | 一种植物 / 一种动物     |
|  131 | outrageous-objects-glass-armonica                  | 玻璃琴             | 一种人造实物           | 一种植物 / 一种动物     |
|  132 | outrageous-objects-bleeding-crash-dummy            | 流血的碰撞假人     | 一种人造实物           | 一种植物 / 一种动物     |
|  133 | outrageous-objects-stitched-merman                 | 拼接人鱼标本       | 一种人造实物           | 一种植物 / 一种动物     |
|  134 | outrageous-objects-pharmacy-leech-jar              | 水蛭药罐           | 一种人造实物           | 一种植物 / 一种动物     |
|  135 | outrageous-objects-kissing-shield                  | 接吻隔离盾         | 一种人造实物           | 一种植物 / 一种动物     |
|  136 | outrageous-objects-helmet-pillow                   | 头盔枕             | 一种人造实物           | 一种植物 / 一种动物     |
|  137 | outrageous-objects-sideways-swing-patent           | 横着荡的秋千       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  138 | outrageous-objects-automatic-petting-hand          | 自动撸宠机械手     | 一种人造实物           | 一种植物 / 一种动物     |
|  139 | outrageous-objects-laser-cat-exercise-patent       | 激光逗猫法         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  140 | outrageous-objects-chicken-eye-protectors          | 鸡用护目镜         | 一种人造实物           | 一种植物 / 一种动物     |
|  141 | outrageous-objects-edison-talking-doll             | 爱迪生说话娃娃     | 一种人造实物           | 一种植物 / 一种动物     |
|  142 | outrageous-objects-elektro-smoking-robot           | 会抽烟的机器人     | 一种人造实物           | 一种植物 / 一种动物     |
|  143 | outrageous-objects-heron-holy-water-dispenser      | 投币圣水机         | 一种人造实物           | 一种植物 / 一种动物     |
|  144 | outrageous-objects-galalith-chessmen               | 牛奶塑料棋子       | 一种人造实物           | 一种植物 / 一种动物     |
|  145 | outrageous-objects-motorized-pasta-fork            | 电动卷面叉         | 一种人造实物           | 一种植物 / 一种动物     |
|  146 | outrageous-objects-vacuum-hair-cutter              | 吸尘理发器         | 一种人造实物           | 一种植物 / 一种动物     |
|  147 | outrageous-objects-ankle-shoe-umbrella             | 鞋子雨伞           | 一种人造实物           | 一种植物 / 一种动物     |
|  148 | outrageous-objects-bird-diaper                     | 鸟用尿布           | 一种人造实物           | 一种植物 / 一种动物     |
|  149 | outrageous-objects-ramelli-bookwheel               | 书籍摩天轮         | 一种人造实物           | 一种植物 / 一种动物     |
|  150 | outrageous-objects-helium-sunshade                 | 氦气遮阳篷         | 一种人造实物           | 一种植物 / 一种动物     |
|  151 | nature-abyssal-comb-jelly                          | 深渊瓜水母         | 一种动物               | 一种植物 / 一种真菌     |
|  152 | nature-balloon-worm                                | 气球蠕虫           | 一种动物               | 一种植物 / 一种真菌     |
|  153 | nature-basket-star                                 | 筐蛇尾             | 一种动物               | 一种植物 / 一种真菌     |
|  154 | nature-green-elf-cup                               | 绿杯菌             | 一种真菌               | 一种植物 / 一种动物     |
|  155 | nature-bigfin-squid                                | 大鳍鱿             | 一种动物               | 一种植物 / 一种真菌     |
|  156 | nature-crystal-amphipod                            | 水晶端足虫         | 一种动物               | 一种植物 / 一种真菌     |
|  157 | nature-deep-sea-crown-jelly                        | 冠水母             | 一种动物               | 一种植物 / 一种真菌     |
|  158 | nature-giant-phantom-jelly                         | 巨型幻影水母       | 一种动物               | 一种植物 / 一种真菌     |
|  159 | nature-glass-squid                                 | 玻璃鱿             | 一种动物               | 一种植物 / 一种真菌     |
|  160 | nature-gossamer-worm                               | 薄纱蠕虫           | 一种动物               | 一种植物 / 一种真菌     |
|  161 | nature-midwater-octopus                            | 透明中层章鱼       | 一种动物               | 一种植物 / 一种真菌     |
|  162 | nature-mystery-mollusc                             | 兜帽海蛞蝓         | 一种动物               | 一种植物 / 一种真菌     |
|  163 | nature-octopus-squid                               | 八腕鱿             | 一种动物               | 一种植物 / 一种真菌     |
|  164 | nature-pearl-octopus                               | 珍珠章鱼           | 一种动物               | 一种植物 / 一种真菌     |
|  165 | nature-pompeii-worm                                | 庞贝虫             | 一种动物               | 一种植物 / 一种真菌     |
|  166 | nature-warty-deep-sea-octopus                      | 深海疣章鱼         | 一种动物               | 一种植物 / 一种真菌     |
|  167 | nature-seven-arm-octopus                           | 七腕章鱼           | 一种动物               | 一种植物 / 一种真菌     |
|  168 | nature-silky-jelly                                 | 丝绸水母           | 一种动物               | 一种植物 / 一种真菌     |
|  169 | nature-whalefish                                   | 鲸口鱼             | 一种动物               | 一种植物 / 一种真菌     |
|  170 | nature-whiptail-gulper-eel                         | 鞭尾吞噬鳗         | 一种动物               | 一种植物 / 一种真菌     |
|  171 | nature-redhead-larvacean                           | 红头住囊虫         | 一种动物               | 一种植物 / 一种真菌     |
|  172 | nature-pom-pom-anemone                             | 绒球海葵           | 一种动物               | 一种植物 / 一种真菌     |
|  173 | nature-psychedelic-jelly                           | 迷幻水母           | 一种动物               | 一种植物 / 一种真菌     |
|  174 | nature-acorn-worm                                  | 橡果虫             | 一种动物               | 一种植物 / 一种真菌     |
|  175 | wildlife-binturong                                 | 熊狸               | 一种动物               | 一种植物 / 一种真菌     |
|  176 | wildlife-echidna                                   | 针鼹               | 一种动物               | 一种植物 / 一种真菌     |
|  177 | wildlife-platypus                                  | 鸭嘴兽             | 一种动物               | 一种植物 / 一种真菌     |
|  178 | wildlife-banded-archer-fish                        | 射水鱼             | 一种动物               | 一种植物 / 一种真菌     |
|  179 | wildlife-dung-beetle                               | 蜣螂               | 一种动物               | 一种植物 / 一种真菌     |
|  180 | wildlife-venus-flytrap                             | 捕蝇草             | 一种植物               | 一种动物 / 一种人物职业 |
|  181 | wildlife-utricularia                               | 狸藻               | 一种植物               | 一种动物 / 一种人物职业 |
|  182 | wildlife-cornus-canadensis                         | 加拿大草茱萸       | 一种植物               | 一种动物 / 一种人物职业 |
|  183 | wildlife-kalanchoe-daigremontiana                  | 宽叶落地生根       | 一种植物               | 一种动物 / 一种人物职业 |
|  184 | wildlife-victoria-amazonica                        | 亚马孙王莲         | 一种植物               | 一种动物 / 一种人物职业 |
|  185 | wildlife-arisaema-triphyllum                       | 三叶天南星         | 一种植物               | 一种动物 / 一种人物职业 |
|  186 | wildlife-symplocarpus-foetidus                     | 美洲臭菘           | 一种植物               | 一种动物 / 一种人物职业 |
|  187 | nature-birds-nest-fungi                            | 鸟巢菌             | 一种真菌               | 一种植物 / 一种动物     |
|  188 | nature-cedar-apple-rust                            | 苹果桧锈菌         | 一种真菌               | 一种植物 / 一种动物     |
|  189 | nature-shaggy-mane                                 | 毛头鬼伞           | 一种真菌               | 一种植物 / 一种动物     |
|  190 | nature-oyster-mushroom-predation                   | 平菇的捕虫餐       | 一种生物行为或生理变化 | 一种人物职业 / 一种植物 |
|  191 | objects-mudlark                                    | 泥滩拾荒人         | 一种人物职业           | 一种植物 / 一种人造实物 |
|  192 | objects-cucumber-straightener                      | 黄瓜矫直器         | 一种人造实物           | 一种植物 / 一种动物     |
|  193 | objects-mortsafe                                   | 尸体防盗笼         | 一种人造实物           | 一种植物 / 一种动物     |
|  194 | objects-waterloo-teeth                             | 滑铁卢假牙         | 一种人造实物           | 一种植物 / 一种动物     |
|  195 | objects-scolds-bridle                              | 骂妇铁笼           | 一种人造实物           | 一种植物 / 一种动物     |
|  196 | objects-dental-key                                 | 拔牙钥匙           | 一种人造实物           | 一种植物 / 一种动物     |
|  197 | objects-climbing-boys                              | 烟囱童工           | 一种人物职业           | 一种植物 / 一种人造实物 |
|  198 | objects-resurrection-men                           | 复活人             | 一种人物职业           | 一种植物 / 一种人造实物 |
|  199 | objects-turnspit-dog-wheel                         | 狗力烤肉轮         | 一种人造实物           | 一种植物 / 一种动物     |
|  200 | objects-human-hair-jewellery                       | 人发手链           | 一种人造实物           | 一种植物 / 一种动物     |
|  201 | objects-pure-finder                                | 狗粪收集人         | 一种人物职业           | 一种植物 / 一种人造实物 |
|  202 | objects-sewer-hunter                               | 下水道寻宝人       | 一种人物职业           | 一种植物 / 一种人造实物 |
|  203 | objects-cigar-end-finder                           | 雪茄头拾荒人       | 一种人物职业           | 一种植物 / 一种人造实物 |
|  204 | objects-drunkards-cloak                            | 酒鬼木桶衣         | 一种人造实物           | 一种植物 / 一种动物     |
|  205 | objects-punishment-crank                           | 空转苦役轮         | 一种人造实物           | 一种植物 / 一种动物     |
|  206 | objects-sundial-cannon                             | 太阳报时炮         | 一种人造实物           | 一种植物 / 一种动物     |
|  207 | objects-bathing-machine                            | 下海更衣车         | 一种人造实物           | 一种植物 / 一种动物     |
|  208 | objects-monowheel                                  | 轮内摩托车         | 一种人造实物           | 一种植物 / 一种动物     |
|  209 | objects-fuddling-cup                               | 三连迷酒杯         | 一种人造实物           | 一种植物 / 一种动物     |
|  210 | objects-self-enema-syringe                         | 自助灌肠针筒       | 一种人造实物           | 一种植物 / 一种动物     |
|  211 | objects-helicron                                   | 螺旋桨汽车         | 一种人造实物           | 一种植物 / 一种动物     |
|  212 | objects-valmobile                                  | 行李箱摩托车       | 一种人造实物           | 一种植物 / 一种动物     |
|  213 | objects-nail-violin                                | 钉子小提琴         | 一种人造实物           | 一种植物 / 一种动物     |
|  214 | objects-pyrophone                                  | 火焰管风琴         | 一种人造实物           | 一种植物 / 一种动物     |
|  215 | objects-cane-violin                                | 手杖小提琴         | 一种人造实物           | 一种植物 / 一种动物     |
|  216 | objects-octobass                                   | 机械手指巨低音提琴 | 一种人造实物           | 一种植物 / 一种动物     |
|  217 | objects-tiger-dropping-sensor                      | 虎粪传感器         | 一种人造实物           | 一种植物 / 一种动物     |
|  218 | objects-pigeon-whistle                             | 鸽子尾哨           | 一种人造实物           | 一种植物 / 一种动物     |
|  219 | objects-perkins-tractors                           | 金属驱病棒         | 一种人造实物           | 一种植物 / 一种动物     |
|  220 | objects-antimony-cup                               | 催吐锑杯           | 一种人造实物           | 一种植物 / 一种动物     |
|  221 | objects-insectothopter                             | 蜻蜓窃听机         | 一种人造实物           | 一种植物 / 一种动物     |
|  222 | objects-robot-catfish                              | 间谍鲶鱼           | 一种人造实物           | 一种植物 / 一种动物     |
|  223 | objects-dead-drop-rat                              | 死鼠情报箱         | 一种人造实物           | 一种植物 / 一种动物     |
|  224 | objects-tree-stump-bug                             | 树桩窃听器         | 一种人造实物           | 一种植物 / 一种动物     |
|  225 | objects-hollow-nickel                              | 空心五分硬币       | 一种人造实物           | 一种植物 / 一种动物     |
|  226 | objects-winslow-soothing-syrup                     | 温斯洛安婴糖浆     | 一种历史药品           | 一种人物职业 / 一种植物 |
|  227 | objects-stroh-violin                               | 喇叭小提琴         | 一种人造实物           | 一种植物 / 一种动物     |
|  228 | objects-kleroterion                                | 石头抽签任官机     | 一种人造实物           | 一种植物 / 一种动物     |
|  229 | objects-prison-face-cap                            | 囚犯遮脸帽         | 一种人造实物           | 一种植物 / 一种动物     |
|  230 | objects-tantalus                                   | 锁酒架             | 一种人造实物           | 一种植物 / 一种动物     |
|  231 | outrageous-customs-worm-charming                   | 蚯蚓召唤赛         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  232 | outrageous-customs-snail-racing                    | 蜗牛赛跑           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  233 | outrageous-customs-orange-battle                   | 橙子大战           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  234 | outrageous-customs-sardine-burial                  | 沙丁鱼葬礼         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  235 | custom-oostduinkerke-horse-shrimp                  | 骑马捕虾           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  236 | outrageous-science-sailing-stones                  | 会走路的石头       | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  237 | outrageous-science-blood-falls                     | 血瀑               | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  238 | outrageous-science-underwater-waterfall            | 海底瀑布           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  239 | outrageous-science-mars-blue-sunset                | 火星蓝日落         | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  240 | outrageous-science-ijen-blue-fire                  | 伊真蓝火           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  241 | outrageous-science-singing-sand                    | 鸣沙               | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  242 | outrageous-science-lake-nyos                       | 湖水喷气           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  243 | outrageous-science-penitentes                      | 忏悔者冰塔         | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  244 | outrageous-science-snow-rollers                    | 天然雪卷           | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  245 | outrageous-science-hair-ice                        | 冰头发             | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  246 | outrageous-customs-shin-kicking                    | 踢胫骨赛           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  247 | outrageous-customs-nettle-eating                   | 生吃荨麻赛         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  248 | outrageous-customs-peashooting                     | 吹豌豆锦标赛       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  249 | outrageous-customs-stone-skimming                  | 打水漂世界赛       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  250 | outrageous-customs-egg-throwing                    | 扔鸡蛋冠军赛       | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  251 | outrageous-customs-el-colacho                      | 跨婴儿节           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  252 | outrageous-customs-tomatina                        | 番茄大战           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  253 | outrageous-customs-gurning                         | 鬼脸世界赛         | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  254 | custom-qeswachaka-renewal                          | 克斯瓦查卡桥更新   | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  255 | custom-voladores                                   | 飞人仪式           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  256 | outrageous-customs-toe-wrestling                   | 脚趾摔跤           | 一种人类活动或方法     | 一种人物职业 / 一种植物 |
|  257 | outrageous-science-mercury-double-sunrise          | 水星双重日出       | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  258 | outrageous-science-saturn-hexagon                  | 土星六边形风暴     | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  259 | outrageous-science-titan-methane-rain              | 天然气下雨         | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  260 | outrageous-science-enceladus-geysers               | 土卫二虎纹喷泉     | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  261 | outrageous-science-brocken-spectre                 | 布罗肯幽灵         | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  262 | outrageous-science-light-pillars                   | 城市光柱           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  263 | outrageous-science-fallstreak-hole                 | 穿洞云             | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  264 | outrageous-science-green-flash                     | 绿闪               | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  265 | outrageous-science-red-sprites                     | 红色精灵           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
|  266 | outrageous-science-brine-lakes                     | 海底咸水湖         | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  267 | outrageous-science-black-smokers                   | 海底黑烟囱         | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  268 | outrageous-science-devils-kettle                   | 魔鬼水壶           | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  269 | outrageous-science-mars-spiders                    | 火星蜘蛛           | 一种自然地貌或景观     | 一种人物职业 / 一种植物 |
|  270 | outrageous-science-dry-ice-snow                    | 干冰降雪           | 一种物理或化学现象     | 一种人物职业 / 一种植物 |
