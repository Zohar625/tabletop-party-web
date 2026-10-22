# 270题扩充：习俗赛事与科学地理审阅

核实日期：2026-10-22。共40题，16题习俗赛事、24题科学地理。40题均为verified，0题未核实草稿；正文长度157–178字符。所有题目已实际联网阅读来源正文，每题的关键事实与阅读位置记录在JSON的sources.evidence中。共44条来源、44个不同URL。

本批只交付editorial暂存文件，未更新可玩登记、HTML或线上网站。最终接入、页面数量与运行检查由主代理统一处理。

## 候选与筛选

先选取脚趾摔跤、蚯蚓召唤、蜗牛赛跑、橙子大战、沙丁鱼葬礼、骑马捕虾、草绳桥更新、飞人等赛事习俗；科学选取会走路石头、血瀑、蓝火、鸣沙、海底瀑布、湖水喷气、冰塔、雪卷、火星日落等有具体动作与场面的现象。第二批加入生吃荨麻、激光辅助吹豌豆、踢胫骨、跨婴儿、鬼脸误颁冠军，以及海底卤水湖、火星蜘蛛、干冰雪、双重日出等。没有纳入未读到充分可靠正文的扔手机、靴子投掷等候选。

不以普通巡游、桑拿或泛称祭祀填充。各卡把过程、材料、条件和例外分散写在正文，保持长卡；未以免责声明、外部背景或生僻名称凑长度。

## 来源核实与编辑处理

- 蚯蚓召唤直接读主办方18项规则：水也列为刺激物禁用、只准振动、夜间鸟归巢后放生。
- 蜗牛赛读主办方Racing Background全文，保留白布双圈、浇水、13英寸和禁巨型蜗牛细节，不把历年成绩当永久现行纪录之外的规则。
- 脚趾摔跤读WTWF官方2025赛报与关于页。现行统一规则仍在完善，采用确实读到的脚趾锁扣、Toedium、大屏幕、酒馆传统细节，没有编写胜负程序。
- 飞人和草绳桥的UNESCO页遇验证码后，改读墨西哥文化部SIC、秘鲁MINCETUR旅游资源正文。骑马捕虾使用比利时联邦公共外交网站Focus on Belgium。
- 跨婴儿的地区旅游局页抓取失败，改读西班牙公共广播RTVE对本村庆典的原始报道；善恶驱逐只作为仪式象征。
- 血瀑首稿的干谷背景已替换为2017年Journal of Glaciology研究：富铁卤水遇氧沉淀、受压卤水裂隙通路、盐分和冻结潜热。仍将通路解释表述为研究模型。
- NOAA海底瀑布正文和图表的落差口径不一致，正文只保留页面一致支持的估计流量约每秒350万立方米。
- 鸣沙保留机制尚未完全理解的限定；湖水喷气不把1986事件写成熔岩喷发，也不把具体触发原因写死。
- 伊真蓝火不采用旅游页可疑湖泊面积与全球仅两处的绝对说法。忏悔者冰塔不加入本页未支持的词源故事。
- 干冰雪和火星蜘蛛分别是降水与季节性地表侵蚀过程；土卫六卡明确液态甲烷/乙烷，不写成水雨。土卫二地下海直通表面仍保留可能措辞。
- 鬼脸卡采用官方荣誉榜记录的1997年误颁乌龙；吹豌豆规则按2026官方更新，传统组与允许低功率激光的公开组分开描述。

## 去重与稳定ID

读过当前playtest题库、180待合入自然/器物各30题，以及旧五包450题名、别名和概念目录。另与本轮270自然/器物暂存文件比较。程序比较290条引用（包含已经合入活跃库的180阶段重复引用），本批id、conceptId、term及别名与其他引用均无冲突；人工再检查跨题的语义，未发现同概念拆题。

归档扩写复用3项：

| 词 | 沿用id | 沿用conceptId |
|---|---|---|
| 骑马捕虾 | wc-oostduinkerke-horse-shrimp | custom-oostduinkerke-horse-shrimp |
| 克斯瓦查卡桥更新 | wc-qeswachaka-renewal | custom-qeswachaka-renewal |
| 飞人仪式 | wc-voladores | custom-voladores |

鸣沙、冰头发已额外检索旧五包的中文、英文名称和别名，不存在同概念归档卡。旧归档正文未修改。

## 验证

使用项目技能validate_pack.py的validate函数，将暂存questions在内存中映射为当前outrageous-long-cards完整题包契约，结果0错误。没有为了验证增加第三个文件或改暂存根结构。

另断言：40题、40个唯一conceptId、全部verified、来源字段完整、字数120–200区间、跨活跃及本轮其他暂存无id/概念/名字别名冲突，归档复用项id和conceptId成对一致。验证通过。该验证仅证明结构与精确去重；事实核验来自逐题读源，并不由校验器代替。

## 逐题证据索引

下表是实际阅读来源，具体证据段落见JSON。

| # | 词 | 来源 |
|---|---|---|
| 1 | 蚯蚓召唤赛 | [The Official Rules — Willaston World Worm Charming Championships](https://fwsawillaston.wixsite.com/wormcharming/the-rules) |
| 2 | 蜗牛赛跑 | [Snail Racing World Championships](https://snailracing.world/) |
| 3 | 橙子大战 | [Battle of the Oranges — Fondazione dello Storico Carnevale di Ivrea](https://storicocarnevaleivrea.it/en/chi-siamo/il-carnevale/battaglia-delle-arance/) |
| 4 | 沙丁鱼葬礼 | [Sardine Burial — Tenerife Tourism](https://www.webtenerife.co.uk/what-to-do/carnival/events/sardine-burial/) |
| 5 | 骑马捕虾 | [Shrimp fishing on horseback: a UNESCO World Heritage Site — Focus on Belgium](https://focusonbelgium.be/en/lifestyle/shrimp-fishing-horseback-unesco-world-heritage-site) |
| 6 | 会走路的石头 | [The Racetrack — Death Valley National Park](https://www.nps.gov/deva/planyourvisit/the-racetrack.htm) |
| 7 | 血瀑 | [An englacial hydrologic system of brine within a cold glacier: Blood Falls, McMurdo Dry Valleys, Antarctica — Journal of Glaciology](https://www.cambridge.org/core/journals/journal-of-glaciology/article/an-englacial-hydrologic-system-of-brine-within-a-cold-glacier-blood-falls-mcmurdo-dry-valleys-antarctica/B5C197906AD54619AEA26068AD92989A) |
| 8 | 海底瀑布 | [Where is Earth’s Largest Waterfall? — NOAA](https://oceanservice.noaa.gov/facts/largest-waterfall.html) |
| 9 | 火星蓝日落 | [Mastcam-Z’s First Martian Sunset — NASA](https://science.nasa.gov/resource/mastcam-zs-first-martian-sunset/) |
| 10 | 伊真蓝火 | [The Magic of Kawah Ijen: A Journey to Indonesia’s Blue Fire — Indonesia Ministry of Tourism](https://www.indonesia.travel/sg/en/travel-ideas/adventure/the-magic-of-kawah-ijen-a-journey-to-indonesias-blue-fire) |
| 11 | 鸣沙 | [Eureka Dunes — Death Valley National Park](https://www.nps.gov/deva/planyourvisit/eureka-dunes.htm) |
| 12 | 湖水喷气 | [Lake Nyos, Cameroon — NASA Earth Observatory](https://science.nasa.gov/earth/earth-observatory/lake-nyos-cameroon-86244/) |
| 13 | 忏悔者冰塔 | [Pluto’s Bladed Terrain — NASA Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap171005.html) |
| 14 | 天然雪卷 | [Snow rollers in Wiltshire — Royal Meteorological Society](https://www.rmets.org/news/snow-rollers-wiltshire) |
| 15 | 冰头发 | [What is frost and ice? — Met Office](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/frost-and-ice) |
| 16 | 踢胫骨赛 | [The Cotswold Olimpicks at Dover’s Hill — National Trust](https://www.nationaltrust.org.uk/visit/gloucestershire-cotswolds/dovers-hill/the-cotswold-olimpicks-at-dovers-hill) |
| 17 | 生吃荨麻赛 | [Unstung hero: steely-mouthed Brit wins the nettle-eating crown two years straight — Guinness World Records](https://www.guinnessworldrecords.com/news/2026/8/unstung-hero-steely-mouthed-brit-wins-the-nettle-eating-crown-two-years-straight) |
| 18 | 吹豌豆锦标赛 | [The World Peashooting Championship Rules](https://worldpeashoot.com/peashoot-rules/) |
| 19 | 打水漂世界赛 | [About — World Stone Skimming Championships](https://www.stoneskimming.com/about/) |
| 20 | 扔鸡蛋冠军赛 | [Egg Roulette and Egg Throwing Competition — Swaton Vintage Day](https://swatonvintageday.com/egg-throwing/) |
| 21 | 跨婴儿节 | [La fiesta de un pueblo de Burgos en la que saltan por encima de bebés — RTVE](https://www.rtve.es/play/noticias/20251026/fiesta-colacho-pueblo-burgos-saltan-bebes/16781145.shtml) |
| 22 | 番茄大战 | [La Tomatina tomato festival — Spain.info](https://www.spain.info/en/calendar/la-tomatina/) |
| 23 | 鬼脸世界赛 | [Egremont Crab Fair — Hall of Fame](https://egremontcrabfair.com/halloffame/index.html)；[Gurning Festival (Egremont Crab Fair) — Visit Lake District](https://www.visitlakedistrict.com/whats-on/challenge-events/gurning-festival-egremont-crab-fair) |
| 24 | 克斯瓦查卡桥更新 | [Puente Colgante De Q’Eswachaka — MINCETUR](https://consultasenlinea.mincetur.gob.pe/fichaInventario/index.aspx?cod_Ficha=935) |
| 25 | 飞人仪式 | [La ceremonia ritual de los Voladores — Secretaría de Cultura, México](https://sic.gob.mx/ficha.php?table=otra_declaratoria&table_id=18) |
| 26 | 脚趾摔跤 | [The 2025 World Toe Wrestling Championship — World Toe Wrestling Federation](https://www.wtwf.co.uk/news/2025-world-toe-wrestling-championship) |
| 27 | 水星双重日出 | [Mercury: Facts — NASA](https://science.nasa.gov/mercury/facts/) |
| 28 | 土星六边形风暴 | [Cassini Images Bizarre Hexagon on Saturn — NASA](https://science.nasa.gov/missions/cassini/cassini-images-bizarre-hexagon-on-saturn/) |
| 29 | 天然气下雨 | [NASA’s Cassini Reveals Surprises with Titan’s Lakes](https://www.nasa.gov/missions/cassini/nasas-cassini-reveals-surprises-with-titans-lakes/) |
| 30 | 土卫二虎纹喷泉 | [Cassini Spacecraft Reveals 101 Geysers and More on Icy Saturn Moon — NASA JPL](https://www.jpl.nasa.gov/news/cassini-spacecraft-reveals-101-geysers-and-more-on-icy-saturn-moon/) |
| 31 | 布罗肯幽灵 | [The Brocken Spectre — University of Alaska Fairbanks Geophysical Institute](https://www.gi.alaska.edu/alaska-science-forum/brocken-spectre)；[Optical effects: nature’s light show — Met Office](https://weather.metoffice.gov.uk/learn-about/weather/optical-effects) |
| 32 | 城市光柱 | [Light Pillars — MetService](https://about.metservice.com/learning/light-pillars)；[Light pillars — Atmospheric Optics](https://www.atoptics.org.uk/halo/lpil.htm) |
| 33 | 穿洞云 | [Fallstreak hole — Met Office](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/clouds/unusual-cloud-formations/fallstreak-hole) |
| 34 | 绿闪 | [Green Flash — WMO International Cloud Atlas](https://cloudatlas.wmo.int/en/green-flash.html) |
| 35 | 红色精灵 | [Sprites Over Château de Beynac — NASA](https://www.nasa.gov/image-article/sprites-over-chateau-de-beynac/)；[Goddard Glossary: Sprites — NASA](https://svs.gsfc.nasa.gov/vis/a010000/a014100/a014142/script_33611_00.html) |
| 36 | 海底咸水湖 | [The Deep Sea — Smithsonian Ocean](https://ocean.si.edu/ecosystems/deep-sea/deep-sea) |
| 37 | 海底黑烟囱 | [Hydrothermal vents — Woods Hole Oceanographic Institution](https://www.whoi.edu/ocean-learning-hub/ocean-topics/how-the-ocean-works/seafloor-below/hydrothermal-vents/) |
| 38 | 魔鬼水壶 | [Hydrologists solve mystery of Devil’s Kettle waterfall — Minnesota DNR](https://content.govdelivery.com/accounts/MNDNR/bulletins/18a428c) |
| 39 | 火星蜘蛛 | [Jamming with the ‘Spiders’ from Mars — NASA JPL](https://www.jpl.nasa.gov/images/pia22587-jamming-with-the-spiders-from-mars/) |
| 40 | 干冰降雪 | [NASA Observations Point to ‘Dry Ice’ Snowfall on Mars — NASA JPL](https://www.jpl.nasa.gov/news/nasa-observations-point-to-dry-ice-snowfall-on-mars/) |

待主代理统一接入；未提交、未发布、未安装工具。
