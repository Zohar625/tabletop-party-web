# 世界民俗题包编辑核查

核查日期：2026-10-22。题包版本：1.0.0。

## 交付与范围

- 90个独立概念，90题 verified，0题 draft；90个不同 UNESCO 非遗条目编号。
- 来源覆盖51个国家代码，涵盖欧洲、亚洲、非洲、美洲及大洋洲。一个多国项目仍只占一题。
- 解释长度77–89个字符（含标点），每题给出核心含义与具体细节。默认读卡10秒，不要求读完。
- 仅交付独立题包文件及本编辑记录。中央登记、网页接入、发布由主任务处理。
- 难度3是编辑初判；尚未通过真人试玩校准。少量较熟悉概念用于调节节奏。

## 实际来源读取方式

UNESCO 非遗主站 ich.unesco.org 的浏览器正文访问多次返回人机验证页，未以该验证页或搜索摘要充当事实依据。实际采用 UNESCO 官方 DataHub 的 ich001 数据集：先读取条目名称、国家与 description_en 正文，分五批逐项阅读约前1150个英文字符，解释只取其中得到支持的内容。

随后对90个选中条目逐个请求官方 API 的唯一记录链接，检查 total_count=1、ich_public_ref 与题卡一致、description_en 非空、国家字段存在。90次均成功。每题 sources.url 是这个实际请求过的记录链接，sources.title 使用记录的实际 title_en 加“UNESCO DataHub”来源标识；section 指明 description_en、countries 与条目编号，evidence 是简短中文事实定位。originalEntryUrl 保留 API 返回的非遗主站链接，供后续编辑查看，但不冒充已成功读取的主站正文。

示例：[官方记录00073：Vanuatu sand drawings](https://data.unesco.org/api/explore/v2.1/catalog/datasets/ich001/records?where=ich_public_ref%3D73&limit=1)。每题采用独立记录URL，并各自简短转述，没有把90题建立在单页概述上。措辞均为自行整理，未复制商业题卡，也未长篇转录来源。

## 选题与语义去重

没有把别名、同项目的角色或子活动拆成多题。克罗地亚三种花边合并为“克罗地亚花边制作”；吉尔吉斯两类毡毯合并一题；瓦伦西亚与穆尔西亚的灌溉者法庭也合并一题。来源条目号作为审计锚点，稳定 conceptId 用 custom- 前缀，不因将来调整译名或解释而更换。

下列相近项目已人工区分：
- 法尔斯地毯侧重该地区无预画底稿的编织与家庭分工；阿塞拜疆地毯是另一地区的有绒/无绒技艺及割毯庆祝。两者为独立传统，未把泛称“地毯”再做一题。
- 格鲁吉亚复调、保加利亚老奶奶复调、克罗地亚颤音等分别有明确地域、发声组织及社区传承，解释避免只写“某国的歌唱”。
- 班什、赫利内茨科、伊姆斯特和佩尔尼克的假面节庆有不同社区、角色与流程，不把“面具节”泛称另做一题。
- 那达慕与马头琴音乐是不同层次的独立知识点；未把那达慕中提到的长调、呼麦再拆成新题。
- 与现有“中国古代职业”包无同义概念；工具结构校验会再次扫描当时的全部题包。跨包复用为0。

## 事实边界与风险

- 所有地域按官方记录界定，不暗示一个国家的所有人都采用某习俗。
- 维姆布扎、埃苏瓦、尤鲁帕里等描述传统仪式与信仰，不把疗愈观念写成已证实医学效果。涉及神灵、传说及许愿时保留“信仰”“神话”“民间信念”等限定。
- 不断言不确定的起源。卡卢什未采用来源中的古代起源推测，戈里亚尼女王巡游未编造仪式起源。
- 来源00153提及2022年将阿特的Ducasse部分移出相关非遗项目；本题只描述比法多地仍存在的巨人龙巡游，并未把阿特或某一组件说成现仍列名项目。
- 数据库正文是传统实践的概括，不用历史申报时的参与人数充当2026年实时统计；解释主动避开多数易过时人数和年度日程。
- 一些中文音译并无唯一通行写法，未来可调整 term 或补充 aliases；UNESCO编号及 conceptId 应保持稳定。
- 所有题目前均只有一个权威记录来源，具备第一方支持，但未做第二独立来源交叉核对；难度和中文译名仍建议通过真人试玩校准。

## 验证

使用 D:/App/MiniConda/python.exe 运行：

```powershell
& 'D:/App/MiniConda/python.exe' '.agents/skills/tabletop-theme-packs/scripts/validate_pack.py' 'data/packs/world-customs.json' --existing-dir 'data/packs'
```

结果：VALID structure: verified=90, draft=0。另查90个 id、conceptId、UNESCO编号和 sources.url 均唯一；来源日期全部为2026-10-22，解释均在60–100字符范围。结构校验不替代事实核查，事实依据是上述实际读取的官方记录。

## 逐题审计索引

完整来源URL、英文条目标题和证据字段保存在题包中；下表把中文题名与官方条目号一一对齐。

| 序号 | 词名 | UNESCO编号 | conceptId |
|---|---|---|---|
| 1 | 维拉梅利亚圣灵兄弟会 | 00006 | custom-villa-mella-congos |
| 2 | 格鲁吉亚复调歌唱 | 00008 | custom-georgian-polyphony |
| 3 | 立陶宛十字架雕制 | 00013 | custom-lithuanian-cross-crafting |
| 4 | 杰马夫纳广场文化 | 00014 | custom-jemaa-el-fna |
| 5 | 博伊孙文化空间 | 00019 | custom-boysun-cultural-space |
| 6 | 宗庙祭礼 | 00016 | custom-jongmyo-jerye |
| 7 | 班什狂欢节 | 00033 | custom-binche-carnival |
| 8 | 梅达赫说书 | 00037 | custom-meddah |
| 9 | 伊拉克木卡姆 | 00076 | custom-iraqi-maqam |
| 10 | 蒙古马头琴音乐 | 00068 | custom-morin-khuur |
| 11 | 瓦努阿图沙画 | 00073 | custom-vanuatu-sand-drawing |
| 12 | 波罗的海歌舞庆典 | 00087 | custom-baltic-song-dance |
| 13 | 比斯特里察老奶奶 | 00095 | custom-bistritsa-babi |
| 14 | 富雅拉长笛 | 00099 | custom-fujara |
| 15 | 梅夫莱维塞玛仪式 | 00100 | custom-mevlevi-sema |
| 16 | 斯贝克通大皮影 | 00108 | custom-sbek-thom |
| 17 | 江陵端午祭 | 00114 | custom-gangneung-danoje |
| 18 | 飞人仪式 | 00175 | custom-voladores |
| 19 | 乔皮廷比拉 | 00133 | custom-chopi-timbila |
| 20 | 奥隆克史诗 | 00145 | custom-olonkho |
| 21 | 巨人和龙游行 | 00153 | custom-processional-giants-dragons |
| 22 | 贝尔加帕图姆节 | 00156 | custom-patum-berga |
| 23 | 维姆布扎疗愈舞 | 00158 | custom-vimbuza |
| 24 | 达兰根叙事歌 | 00159 | custom-darangen |
| 25 | 卡卢什仪式 | 00090 | custom-calus |
| 26 | 灌溉者法庭 | 00171 | custom-irrigators-tribunals |
| 27 | 多依纳 | 00192 | custom-doina |
| 28 | 北宁官贺民歌 | 00183 | custom-quan-ho |
| 29 | 男寺党游戏 | 00184 | custom-namsadang-nori |
| 30 | 灵山斋 | 00186 | custom-yeongsanjae |
| 31 | 羌羌水越来 | 00188 | custom-ganggangsullae |
| 32 | 伊杰莱假面舞 | 00194 | custom-ijele |
| 33 | 扎戈列木玩具制作 | 00233 | custom-hrvatsko-zagorje-toys |
| 34 | 戈里亚尼女王巡游 | 00235 | custom-gorjani-queens |
| 35 | 克罗地亚花边制作 | 00245 | custom-croatian-lacemaking |
| 36 | 莱夫卡拉花边 | 00255 | custom-lefkaritika |
| 37 | 波帕扬圣周巡游 | 00259 | custom-popayan-processions |
| 38 | 豪特姆冬季牲畜市集 | 00403 | custom-houtem-jaarmarkt |
| 39 | 题目立 | 00276 | custom-daimokutate |
| 40 | 拉迪夫 | 00279 | custom-radif |
| 41 | 楚尔音乐 | 00312 | custom-tsuur |
| 42 | 奥伊卡涅颤音唱法 | 00320 | custom-ojkanje |
| 43 | 穆迪耶图 | 00345 | custom-mudiyettu |
| 44 | 贝恰拉茨 | 00358 | custom-becarac |
| 45 | 卡斯特尔人塔 | 00364 | custom-castells |
| 46 | 巴拉舞 | 00372 | custom-al-barah |
| 47 | 法尔斯地毯编织 | 00382 | custom-fars-carpet-weaving |
| 48 | 克什凯克仪式餐 | 00388 | custom-keskek |
| 49 | 阿塞拜疆地毯编织 | 00389 | custom-azerbaijani-carpet-weaving |
| 50 | 瓦科纳达 | 00390 | custom-huaconada |
| 51 | 埃希特纳赫跳跃巡游 | 00392 | custom-echternach-hopping |
| 52 | 那达慕 | 00395 | custom-naadam |
| 53 | 赫利内茨科面具巡游 | 00397 | custom-hlinecko-shrovetide |
| 54 | 帕拉奇科斯 | 00399 | custom-parachicos |
| 55 | 鲁汶同龄组仪式 | 00404 | custom-leuven-age-sets |
| 56 | 组踊 | 00405 | custom-kumiodori |
| 57 | 结城紬 | 00406 | custom-yuki-tsumugi |
| 58 | 佐陀神能 | 00412 | custom-sada-shin-noh |
| 59 | 那智田乐 | 00413 | custom-nachi-dengaku |
| 60 | 瓦尤劝解人制度 | 00435 | custom-wayuu-palabrero |
| 61 | 跆跟 | 00452 | custom-taekkyeon |
| 62 | 韩山苎麻织造 | 00453 | custom-hansan-mosi |
| 63 | 科雷杜加智慧仪式 | 00520 | custom-koredugaw |
| 64 | 雅奥夸 | 00521 | custom-yaokwa |
| 65 | 埃苏瓦祈祷歌 | 00531 | custom-esuwa |
| 66 | 科伊尤里蒂朝圣 | 00567 | custom-qoylluriti-pilgrimage |
| 67 | 尤鲁帕里美洲豹萨满 | 00574 | custom-yurupari-jaguar-shamans |
| 68 | 克斯瓦查卡桥更新 | 00594 | custom-qeswachaka-renewal |
| 69 | 马乔刺绣 | 00633 | custom-matyo-embroidery |
| 70 | 委内瑞拉跳舞魔鬼 | 00639 | custom-venezuela-dancing-devils |
| 71 | 基布多圣帕乔节 | 00640 | custom-san-pacho-quibdo |
| 72 | 梅西尔马居努节 | 00642 | custom-mesir-macunu |
| 73 | 托基亚草帽编织 | 00729 | custom-toquilla-hat-weaving |
| 74 | 斯布阿朝圣 | 00667 | custom-sbua |
| 75 | 桑布尔与默兹间行军 | 00670 | custom-entre-sambre-meuse-marches |
| 76 | 奥斯特敦刻尔克骑马捕虾 | 00673 | custom-oostduinkerke-horse-shrimp |
| 77 | 吉尔吉斯毡毯制作 | 00693 | custom-kyrgyz-felt-carpets |
| 78 | 舍门劳芬 | 00726 | custom-schemenlaufen |
| 79 | 苏罗瓦民俗节 | 00968 | custom-surova-pernik |
| 80 | 塔格鲁达吟诵诗 | 00744 | custom-al-taghrooda |
| 81 | 塔泰拉铜器制作 | 00845 | custom-thathera-utensils |
| 82 | 科尔多瓦庭院节 | 00846 | custom-cordova-patios |
| 83 | 奎弗里陶罐酿酒 | 00870 | custom-qvevri-winemaking |
| 84 | 阿尔贡古捕鱼节 | 00901 | custom-argungu-fishing-festival |
| 85 | 沃鲁烟熏桑拿 | 00951 | custom-voromaa-smoke-sauna |
| 86 | 布隆迪王鼓仪式舞 | 00989 | custom-burundi-royal-drum |
| 87 | 斯拉瓦 | 01010 | custom-slava |
| 88 | 孟加拉吉祥巡游 | 01091 | custom-mangal-shobhajatra |
| 89 | 莫莫埃里亚 | 01184 | custom-momoeria |
| 90 | 科尔索花果巡游 | 01707 | custom-dutch-corso |
