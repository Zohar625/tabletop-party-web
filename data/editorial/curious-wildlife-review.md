# 奇妙动植物题包编辑核查

核查日期：2026-10-22。本次交付独立数据，项目尚无应用可接入，未发布网站、未改玩法或中央登记。

- 90题：verified 90，draft 0；动物44题，植物46题。90个不同来源页面，逐题均已读取直接支持关键事实的正文，搜索摘要未用作正式证据。
- 来源：圣迭戈动物园及其植物园页面53题；北卡罗来纳州立大学Extension Gardener Plant Toolbox 37题。每题保存实际标题、URL、checkedAt、section及自撰证据摘要，未使用来源图片。
- 解释73至89个字符，默认读卡10秒，不要求读完。难度是编辑初判，尚未真人试玩。
- 稳定conceptId指向物种、属级类群或已有结构的语义，别名存aliases，不另算题。展示词使用真实物种、类群或既有结构名，行为与答案线索只保留在解释中；已删除自造的行为标题，未把旧标题转存为别名。
- 对照当前其他题包，结构校验未发现conceptId冲突，同词名交集检查为空；未把气象、水文或光学现象放入本包。

## 内容边界与风险

1. 来源支持的是明确的生物学事实，不替中文俗名建立唯一分类标准。易多义处以scientificName或scientificScope限定：观峰玉是Fouquieria columnaris，苹果猪笼草是Nepenthes ampullaria，小马岛猬是Echinops telfairi。棒叶虎尾兰页面重定向至Dracaena angolensis，记录最终网址。
2. 瓶子草相关分类已逐项核对：瓶子草属（Sarracenia）的来源是属级综述，讨论漏斗叶陷阱机制，不代表另一个具体物种；鹦鹉瓶子草明确为Sarracenia psittacina，讨论伏地叶及白色窗斑；眼镜蛇瓶子草为另一属的Darlingtonia californica；苹果猪笼草为Nepenthes ampullaria，讨论落叶供氮。未把同一物种的两个名称当两题，但属级机制与其种级形态属于嵌套范围，真人试玩及后续语义去重仍应留意。
3. 保留原文不确定性：喙头蜥顶眼的时段/季节作用、高鼻羚羊鼻腔功能采用可能或被认为；食火鸡头盔结构的功能明确未定。落羽杉的膝根只写形态，不把供氧假说当定论。
4. 机构正文也有过时或概括过宽的句子。本包未采用袋熊旧种群数、王莲属仅有两个种、刺豚鼠唯一能开坚果动物、针鼹史前未变等说法。捕鸟蛛、豪猪与积水凤梨按有关类群描述，不泛化全部种类。
5. 一品红与草茱萸都涉及苞片，前者聚焦彩色苞片扮演花瓣，后者聚焦四白苞、林下矮株与根茎蔓延；未来若设假花专题应继续语义去重。植物毒性只作识别事实，没有食用、医疗或毒物操作指导。
6. 试读Kew、SANBI许多页面时正文返回403，已弃用，没有用打不开的页面冒充verified。临近完成时检索入口也发生传输403，但90题支持正文此前均已读到。后续可以补充更多独立机构进行交叉复核，当前来源集中于两个机构是明确限制。
7. 90道未玩题可满足9人一圈81题；长期游玩后仍可能不足。未来应用须按conceptId合并去重并排除已玩历史，本次数据文件不实现抽题、历史或界面。

## 验证

使用项目技能脚本：

```powershell
& 'D:/App/MiniConda/python.exe' '.agents/skills/tabletop-theme-packs/scripts/validate_pack.py' 'data/packs/curious-wildlife.json' --existing-dir 'data/packs'
```

输出：VALID structure: verified=90, draft=0。结构验证不代替事实核实和语义审核。另查90个不同conceptId、90个不同题名、90个不同正文URL，核实日期均为2026-10-22。

## 逐题正文覆盖

定位是本次读取页的章节与辅助行号；网页更新后行号可能变化，以章节和摘要检索为准。每题完整来源标题另存JSON sources.title。

| 序号 | 词名 | conceptId | 来源 | 定位与自撰证据摘要 |
| --- | --- | --- | --- | --- |
| 1 | 墨西哥钝口螈 | wildlife-axolotl | [正文](https://animals.sandiegozoo.org/animals/axolotl) | ABOUT，L45–46；成年保留外鳃、尾和体鳍；有肺但终生水栖。 |
| 2 | 霍加狓 | wildlife-okapi | [正文](https://animals.sandiegozoo.org/animals/okapi) | ABOUT，L45–48；长颈鹿近亲；卷握舌取嫩叶；短颈短腿适于森林。 |
| 3 | 熊狸 | wildlife-binturong | [正文](https://animals.sandiegozoo.org/animals/binturong) | ABOUT，L46–50；爆米花气味；末段尾巴可卷握；幼仔可全靠尾支撑。 |
| 4 | 马岛獴 | wildlife-fossa | [正文](https://animals.sandiegozoo.org/animals/fossa) | ABOUT及HABITAT AND DIET，L45–52；长尾平衡，踝关节灵活，可头朝下下树。 |
| 5 | 小马岛猬 | wildlife-lesser-hedgehog-tenrec | [正文](https://animals.sandiegozoo.org/animals/tenrec) | ABOUT，L45–49；Echinops telfairi；刺球防御；可单脚或单趾悬挂。 |
| 6 | 针鼹 | wildlife-echidna | [正文](https://animals.sandiegozoo.org/animals/echidna) | ABOUT，L44–48；哺乳动物而产卵；后脚向后，长趾爪梳刺；前脚挖土。 |
| 7 | 鸭嘴兽 | wildlife-platypus | [正文](https://animals.sandiegozoo.org/animals/platypus) | ABOUT，L47–51；软喙约40000电感受器；水下眼耳闭合，探测生物电。 |
| 8 | 裸鼹鼠 | wildlife-naked-mole-rat | [正文](https://animals.sandiegozoo.org/animals/naked-mole-rat) | ABOUT，L48–50；群体有繁殖女王，多代同居；成员分工挖洞护幼等。 |
| 9 | 蝠耳狐 | wildlife-bat-eared-fox | [正文](https://animals.sandiegozoo.org/animals/bat-eared-fox) | ABOUT及HABITAT AND DIET，L46–58；大耳散热及听觉；分布和白蚁吻合；会用旧白蚁丘。 |
| 10 | 耳廓狐 | wildlife-fennec-fox | [正文](https://animals.sandiegozoo.org/animals/fennec-fox) | ABOUT及HABITAT AND DIET，L45–50；大耳听地下猎物及散热；足底毛隔热；白天藏洞。 |
| 11 | 蜜熊 | wildlife-kinkajou | [正文](https://animals.sandiegozoo.org/animals/kinkajou) | ABOUT，L45–48；浣熊科；卷尾悬挂后沿尾爬回；尾可睡时抱住。 |
| 12 | 长鼻浣熊 | wildlife-coati | [正文](https://animals.sandiegozoo.org/animals/coati) | ABOUT，L45–47；长灵活鼻与前爪觅食；长尾平衡，地面常直立。 |
| 13 | 狐獴 | wildlife-meerkat | [正文](https://animals.sandiegozoo.org/animals/meerkat) | ABOUT，L46–50；洞穴平均15出入口，有寝室和厕所；群体定期换洞。 |
| 14 | 蹄兔 | wildlife-rock-hyrax | [正文](https://animals.sandiegozoo.org/animals/rock-hyrax) | ABOUT，L47–51；与象共享祖先；门齿小獠牙；梳毛爪与背部气味腺。 |
| 15 | 袋獾 | wildlife-tasmanian-devil | [正文](https://animals.sandiegozoo.org/animals/tasmanian-devil) | ABOUT，L44–51；张口多表恐惧不确定；进食尖叫建立地位，仪式化威吓。 |
| 16 | 短尾矮袋鼠 | wildlife-quokka | [正文](https://animals.sandiegozoo.org/animals/quokka) | ABOUT，L45–48；笑容来自面肌与门齿；能爬约1.5米高取食。 |
| 17 | 蛇鹫 | wildlife-secretary-bird | [正文](https://animals.sandiegozoo.org/animals/secretary-bird) | ABOUT及HABITAT AND DIET，L46–54；猛禽而常地面行猎；能飞，树上夜栖及筑巢。 |
| 18 | 鹭鹤 | wildlife-kagu | [正文](https://animals.sandiegozoo.org/animals/kagu) | ABOUT，L44–47；亲鸟展翅装伤转移捕食者；翅助跨石平衡。 |
| 19 | 几维鸟 | wildlife-kiwi | [正文](https://animals.sandiegozoo.org/animals/kiwi) | ABOUT及HABITAT AND DIET，L51–59；嘴端鼻孔与发达嗅觉；喷嚏清泥；洞栖，须状羽。 |
| 20 | 食火鸡 | wildlife-cassowary | [正文](https://animals.sandiegozoo.org/animals/cassowary) | ABOUT，L47–49；盔有海绵样内材和角蛋白外层；功能尚无定论。 |
| 21 | 盔犀鸟 | wildlife-helmeted-hornbill | [正文](https://animals.sandiegozoo.org/animals/hornbill) | ABOUT，L44–48；婆罗洲盔犀鸟的致密象牙状盔约占体重10%，因雕刻被猎。 |
| 22 | 穴鸮 | wildlife-burrowing-owl | [正文](https://animals.sandiegozoo.org/animals/burrowing-owl) | ABOUT及HABITAT AND DIET，L45–51；地下旧洞筑巢；嘶鸣模拟响尾蛇声音。 |
| 23 | 茶色蟆口鸱 | wildlife-tawny-frogmouth | [正文](https://animals.sandiegozoo.org/animals/tawny-frogmouth) | ABOUT，L44–48；静止伪装树皮，闭眼嘴朝上；近敌时张黄色大嘴。 |
| 24 | 蜂虎 | wildlife-bee-eater | [正文](https://animals.sandiegozoo.org/animals/bee-eater) | ABOUT，L45–46；捕蜂后敲晕，摩擦尾部去刺排毒。 |
| 25 | 喙头蜥 | wildlife-tuatara | [正文](https://animals.sandiegozoo.org/animals/tuatara) | ABOUT，L45–47；头顶第三眼有视网膜晶状体；感光非成像，可能计时。 |
| 26 | 科莫多巨蜥 | wildlife-komodo-dragon | [正文](https://animals.sandiegozoo.org/animals/komodo-dragon) | FAMILY LIFE，L57–59；雌蜥挖诱饵巢室；可用营冢鸟丘；幼体爬树避险。 |
| 27 | 希拉毒蜥 | wildlife-gila-monster | [正文](https://animals.sandiegozoo.org/animals/gila-monster) | ABOUT，L44–47；下颌毒腺、牙沟导毒；不吐毒气或舌蜇。 |
| 28 | 变色龙 | wildlife-chameleon | [正文](https://animals.sandiegozoo.org/animals/chameleon) | ABOUT，L45–46；五趾分2/3两组，前后脚分组相反；卷尾帮助抓枝。 |
| 29 | 鹿豚 | wildlife-babirusa | [正文](https://animals.sandiegozoo.org/animals/babirusa) | ABOUT，L45–48；上犬齿转向穿出鼻皮、向额弯；终生继续长。 |
| 30 | 刺豚鼠 | wildlife-agouti | [正文](https://animals.sandiegozoo.org/animals/agouti) | ABOUT，L44–47；门齿可破巴西坚果硬壳；釉质排列强化；门齿持续长。 |
| 31 | 粉红犰狳 | wildlife-pink-fairy-armadillo | [正文](https://animals.sandiegozoo.org/animals/armadillo) | ABOUT，L46–50；pink fairy armadillo约8厘米，多毛而甲较少。 |
| 32 | 射水鱼 | wildlife-banded-archer-fish | [正文](https://animals.sandiegozoo.org/animals/banded-archer-fish) | ABOUT，L44–49；水柱击落水上昆虫；一口水可多射，亦跃出追食。 |
| 33 | 高鼻羚羊 | wildlife-saiga | [正文](https://animals.sandiegozoo.org/animals/saiga) | ABOUT，L50–53；大鼻复杂内骨和黏膜；可能暖冷空气及滤夏尘。 |
| 34 | 山羚 | wildlife-klipspringer | [正文](https://animals.sandiegozoo.org/animals/klipspringer) | ABOUT，L48–51；岩石群栖息；小蹄似踮脚，毛中空粗硬隔热。 |
| 35 | 水豚 | wildlife-capybara | [正文](https://animals.sandiegozoo.org/animals/capybara) | ABOUT，L46–48；能潜水约5分钟避敌；部分蹼兼顾水陆；食水草。 |
| 36 | 豪猪 | wildlife-porcupine | [正文](https://animals.sandiegozoo.org/animals/porcupine) | ABOUT，L44–47；旧大陆豪猪尾根中空刺可响，竖刺及倒冲防卫。 |
| 37 | 袋熊 | wildlife-wombat | [正文](https://animals.sandiegozoo.org/animals/wombat) | HABITAT AND DIET及FAMILY LIFE，L52、59；育袋朝后防挖土入袋；厚后躯堵洞。 |
| 38 | 竹节虫 | wildlife-stick-insect | [正文](https://animals.sandiegozoo.org/animals/stick-insect) | HABITAT AND DIET，L46–48；摇摆步态模拟风中枝条；部分有地衣样突起。 |
| 39 | 蜣螂 | wildlife-dung-beetle | [正文](https://animals.sandiegozoo.org/animals/dung-beetle) | FAMILY LIFE，L49–51；滚球、隧道、粪居三类；埋粪球用于食物或产卵。 |
| 40 | 捕鸟蛛 | wildlife-tarantula | [正文](https://animals.sandiegozoo.org/animals/tarantula) | ABOUT及HABITAT AND DIET，L45–49；部分捕鸟蛛踢倒钩刺激毛；丝作住处蜕皮垫非捕食网。 |
| 41 | 蝎栉 | wildlife-scorpion | [正文](https://animals.sandiegozoo.org/animals/scorpion) | ABOUT，L43–46；腹面梳状pectines用于感觉；雄蝎寻雌、幼蝎认母。 |
| 42 | 叉角羚 | wildlife-pronghorn | [正文](https://animals.sandiegozoo.org/animals/pronghorn) | ABOUT，L47–49；骨芯外角蛋白鞘；角鞘年脱落；雄角向前分叉。 |
| 43 | 大食蚁兽 | wildlife-giant-anteater | [正文](https://animals.sandiegozoo.org/animals/giant-anteater) | ABOUT，L47–51；卷爪以拳步保持爪锋利；长尾可作毯或遮阳。 |
| 44 | 二趾树懒 | wildlife-two-toed-sloth | [正文](https://animals.sandiegozoo.org/animals/two-toed-sloth) | ABOUT，L46–51；腹中分毛向背生长利排雨；毛沟含藻雨季泛绿。 |
| 45 | 观峰玉 | wildlife-boojum-tree | [正文](https://animals.sandiegozoo.org/plants/boojum-tree) | OVERVIEW及GROWTH PATTERN，L49–60；储水干、短刺枝；旱落叶雨后萌叶；干粗底尖顶。 |
| 46 | 奥科蒂洛 | wildlife-ocotillo | [正文](https://animals.sandiegozoo.org/plants/ocotillo) | OVERVIEW及CHARACTERISTICS，L48–57；旱落叶，可一雨季数次萌落；花可在落叶后保留。 |
| 47 | 吊瓜树 | wildlife-sausage-tree | [正文](https://animals.sandiegozoo.org/plants/sausage-tree) | Overview及Characteristics，L46–53；Kigelia africana；香肠形重果；长垂柄花供蝙蝠等访花。 |
| 48 | 加那利龙血树 | wildlife-dragon-tree | [正文](https://animals.sandiegozoo.org/plants/dragon-tree) | OVERVIEW及CHARACTERISTICS，L48–53；Dracaena draco；红树脂；叶痕鳞状干，叶簇集水。 |
| 49 | 捕蝇草 | wildlife-venus-flytrap | [正文](https://animals.sandiegozoo.org/plants/venus-flytrap) | OVERVIEW，L48–51；叶陷阱，触毛20秒内碰2次闭合，并追踪触发次数。 |
| 50 | 茅膏菜 | wildlife-sundew | [正文](https://animals.sandiegozoo.org/plants/sundew) | OVERVIEW，L48–50；黏滴捕虫、卷叶及分泌酶；无营养物可被拒绝释放。 |
| 51 | 积水凤梨 | wildlife-tank-bromeliad | [正文](https://animals.sandiegozoo.org/plants/bromeliad) | OVERVIEW，L47–49；多种凤梨莲座蓄水，吸引昆虫和吃虫小蛙。 |
| 52 | 瓶子草属 | wildlife-american-pitcher-plant | [正文](https://animals.sandiegozoo.org/plants/american-pitcher-plant) | OVERVIEW及CHARACTERISTICS，L49–54；漏斗叶陷阱；下向毛防出；底液消化获氮磷。 |
| 53 | 苹果猪笼草 | wildlife-nepenthes-ampullaria | [正文](https://animals.sandiegozoo.org/plants/tropical-pitcher-plant) | OVERVIEW，L46–50；N. ampullaria开放宽口瓶接落叶获氮，缺常见鲜色甜香。 |
| 54 | 生石花 | wildlife-lithops | [正文](https://plants.ces.ncsu.edu/plants/lithops/) | Description，L14–16；一对厚叶、年换叶；顶有透光窗；裂隙出花。 |
| 55 | 旅人蕉 | wildlife-ravenala-madagascariensis | [正文](https://plants.ces.ncsu.edu/plants/ravenala-madagascariensis/) | Description，L11–16；幼干地下，扇叶地生；长大干露、留叶痕；叶基储水。 |
| 56 | 鹿角蕨 | wildlife-platycerium-bifurcatum | [正文](https://plants.ces.ncsu.edu/plants/platycerium-bifurcatum/) | Description，L17–20；盾叶接落叶盖根；鹿角叶光合产孢；附生非寄生。 |
| 57 | 松萝铁兰 | wildlife-tillandsia-usneoides | [正文](https://plants.ces.ncsu.edu/plants/tillandsia-usneoides/) | Description，L15–18；成株无根，灰鳞吸水养分；凤梨科附生，可碎段繁殖。 |
| 58 | 魔芋 | wildlife-amorphophallus-konjac | [正文](https://plants.ces.ncsu.edu/plants/amorphophallus-konjac/) | Description，L17–22；一片巨大叶及花茎；花序升温发腐肉味引蝇传粉。 |
| 59 | 巨花马兜铃 | wildlife-aristolochia-gigantea | [正文](https://plants.ces.ncsu.edu/plants/aristolochia-gigantea/) | Description，L19–22；巨幅紫红浅脉花，强味引蝇；对管藤凤蝶幼虫有毒。 |
| 60 | 紫叶酢浆草 | wildlife-oxalis-triangularis | [正文](https://plants.ces.ncsu.edu/plants/oxalis-triangularis/) | Description，L21–24；小叶夜合；鳞叶状根茎储水养分，鳞叶可繁殖。 |
| 61 | 狸藻 | wildlife-utricularia | [正文](https://plants.ces.ncsu.edu/plants/utricularia/) | Description，L12–16；囊门触毛触发迅速吸猎物闭门；无真根。 |
| 62 | 捕虫堇 | wildlife-pinguicula | [正文](https://plants.ces.ncsu.edu/plants/pinguicula/) | Description，L10–12；油润叶面黏捕消化小虫，静态粘纸式陷阱。 |
| 63 | 眼镜蛇瓶子草 | wildlife-darlingtonia-californica | [正文](https://plants.ces.ncsu.edu/plants/darlingtonia-californica/) | Description，L14–16；管叶罩下入口诱虫；下指毛防逃；微生物分解供养。 |
| 64 | 叙利亚马利筋 | wildlife-asclepias-syriaca | [正文](https://plants.ces.ncsu.edu/plants/asclepias-syriaca/) | Description及Quick ID Hints，L18–27；茎叶伤流乳汁；毛簇种风散；帝王蝶幼虫宿主与花蜜源。 |
| 65 | 爱之蔓 | wildlife-ceropegia-woodii | [正文](https://plants.ces.ncsu.edu/plants/ceropegia-woodii/) | Description，L20–23；藤上气生块茎接土生根；管花可困虫而非食虫。 |
| 66 | 球兰 | wildlife-hoya-carnosa | [正文](https://plants.ces.ncsu.edu/plants/hoya-carnosa/) | Description，L20–24；多年重复从同一花梗开花；厚叶，附生藤本。 |
| 67 | 斑点凤仙花 | wildlife-impatiens-capensis | [正文](https://plants.ces.ncsu.edu/plants/impatiens-capensis/) | Description，L27–31；成熟蒴果弹裂散种；叶面聚亮水珠，Jewelweed名由来。 |
| 68 | 北美金缕梅 | wildlife-hamamelis-virginiana | [正文](https://plants.ces.ncsu.edu/plants/hamamelis-virginiana/) | Description及Fruit/Flowers，L19–21、129、149；可花果同存；秋冬黄条状皱瓣；蒴果成熟木质化。 |
| 69 | 一品红 | wildlife-euphorbia-pulcherrima | [正文](https://plants.ces.ncsu.edu/plants/euphorbia-pulcherrima/) | Description及Flowers，L26、125；显眼彩色为苞片，中央小黄花；苞片有多种园艺色。 |
| 70 | 加拿大草茱萸 | wildlife-cornus-canadensis | [正文](https://plants.ces.ncsu.edu/plants/cornus-canadensis/) | Description，L18–22；低矮根茎地被；4白苞围花簇；晚夏红果至秋。 |
| 71 | 鹦鹉瓶子草 | wildlife-sarracenia-psittacina | [正文](https://plants.ces.ncsu.edu/plants/sarracenia-psittacina/) | Description，L17–20；捕虫叶伏地；气球罩有白窗斑；可耐季节洪淹。 |
| 72 | 紫茉莉 | wildlife-mirabilis-jalapa | [正文](https://plants.ces.ncsu.edu/plants/mirabilis-jalapa/) | Description及Flowers，L16、101；花午后傍晚开、芳香，引蜂鸟蛾；花有多色条纹。 |
| 73 | 月见草 | wildlife-oenothera-biennis | [正文](https://plants.ces.ncsu.edu/plants/oenothera-biennis/) | Description及Wildlife Value，L12、49；二年生，首年莲座次年花；柠檬香引夜蛾，晨蜂传粉。 |
| 74 | 刺瓜 | wildlife-cucumis-anguria | [正文](https://plants.ces.ncsu.edu/plants/cucumis-anguria/) | Description及Fruit，L22、117；Cucumis anguria；果皮毛刺疣，属于瓠果；蔓攀爬。 |
| 75 | 宽叶落地生根 | wildlife-kalanchoe-daigremontiana | [正文](https://plants.ces.ncsu.edu/plants/kalanchoe-daigremontiana/) | Description，L20；叶缘长带叶根小苗，成熟自然落下；Mother of Thousands。 |
| 76 | 银杏 | wildlife-ginkgo-biloba | [正文](https://plants.ces.ncsu.edu/plants/ginkgo-biloba/) | Description，L13–16；雌树肉质种子外层臭，园艺常选嫁接雄株。 |
| 77 | 落羽杉 | wildlife-taxodium-distichum | [正文](https://plants.ces.ncsu.edu/plants/taxodium-distichum/) | Description及Bark，L20、216；水中常有瘤状锥状根膝突水面；基干膨大。 |
| 78 | 亚马孙王莲 | wildlife-victoria-amazonica | [正文](https://plants.ces.ncsu.edu/plants/victoria-amazonica/) | Description，L19；初夜香花引甲虫，白天闭留虫，转雄后次夜释放携粉虫。 |
| 79 | 肉色西番莲 | wildlife-passiflora-incarnata | [正文](https://plants.ces.ncsu.edu/plants/passiflora-incarnata/) | Description及Fruit，L16、127；P. incarnata卵形韧皮果成熟黄，压碎会pop。 |
| 80 | 三叶天南星 | wildlife-arisaema-triphyllum | [正文](https://plants.ces.ncsu.edu/plants/arisaema-triphyllum/) | Description及Flowers，L30–31、150；棒花序如Jack与pulpit佛焰苞；基部小花，后结红果。 |
| 81 | 石蒜 | wildlife-lycoris-radiata | [正文](https://plants.ces.ncsu.edu/plants/lycoris-radiata/) | Quick ID Hints，L29–30；8–9月裸葶花；10月出叶越冬春枯。 |
| 82 | 鹤望兰 | wildlife-strelitzia-reginae | [正文](https://plants.ces.ncsu.edu/plants/strelitzia-reginae/) | Flowers，L110；两蓝瓣合箭状，鸟站取蜜时展开，把粉涂脚。 |
| 83 | 棉铃 | wildlife-gossypium-hirsutum | [正文](https://plants.ces.ncsu.edu/plants/gossypium-hirsutum/) | Description及Fruit，L14、76；棉铃为含种与长短纤维蒴果；有营养枝及结果枝。 |
| 84 | 祈祷草 | wildlife-maranta-leuconeura | [正文](https://plants.ces.ncsu.edu/plants/maranta-leuconeura/) | Description，L21–23；昼叶平夜竖合掌；新叶卷筒，鱼骨状红脉。 |
| 85 | 美洲臭菘 | wildlife-symplocarpus-foetidus | [正文](https://plants.ces.ncsu.edu/plants/symplocarpus-foetidus/) | Description，L17–19；花先叶出、化学产热融雪；腐肉样气味引传粉虫。 |
| 86 | 龙海芋 | wildlife-dracunculus-vulgaris | [正文](https://plants.ces.ncsu.edu/plants/dracunculus-vulgaris/) | Description，L19–22；臭味引蝇甲虫、暂时难离直到传粉后；红橙果引鸟。 |
| 87 | 蓖麻 | wildlife-ricinus-communis | [正文](https://plants.ces.ncsu.edu/plants/ricinus-communis/) | Description及Quick ID Hints，L18–23、36；属名Ricinus意为蜱，斑纹种似饱蜱；刺果，种有毒。 |
| 88 | 异株荨麻 | wildlife-urtica-dioica | [正文](https://plants.ces.ncsu.edu/plants/urtica-dioica/) | Description、Flowers及Poisonous to Humans，L13、107、157；叶茎蜇毛致灼痒；根茎种子扩张群落；风媒花。 |
| 89 | 棒叶虎尾兰 | wildlife-dracaena-angolensis | [正文](https://plants.ces.ncsu.edu/plants/dracaena-angolensis/) | Description，L22–24；圆柱叶；商品编辫为生根叶插，新株后从基部长出。 |
| 90 | 加拿大紫荆 | wildlife-cercis-canadensis | [正文](https://plants.ces.ncsu.edu/plants/cercis-canadensis/) | Description及图注，L19–22、70；先花后叶；页面图注展示干生花；荚像梭，属名由来。 |
