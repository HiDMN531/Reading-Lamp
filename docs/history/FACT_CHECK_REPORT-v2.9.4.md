# Reading Lamp 全2,000篇 事実確認レポート

確認日: 2026-09-14  
対象: `s001`〜`s2000`（2,000篇）

## 結果

| 確認区分 | 全体 | 既存 `s001–s1910` | 新規 `s1911–s2000` |
|---|---:|---:|---:|
| 公的機関・研究機関・専門資料との照合 | 583 | 556 | 27 |
| 古典原典との照合 | 192 | 183 | 9 |
| 外部事実なしの確認 | 1,225 | 1,171 | 54 |
| **合計** | **2,000** | **1,910** | **90** |

全篇を `factChecked: true`、`reviewedAt: "2026-09-14"` としました。篇別の判定、確認範囲、資料名、URL、注記は `fact_check_all_2000.csv` にあります。今回の追加分だけを確認する場合は `fact_check_s1911_s2000.csv` を使用できます。

## 実施方法

1. 全篇を、検証可能な外部事実、古典リテリング、明示的な創作・仮想事例に分類しました。
2. Nature / Science は主張の仕組み、因果の強さ、用語、例外、研究途上の不確実性を確認しました。
3. History は具体的な史実を資料群と照合しました。出典のない人物・事件を扱う100篇には、架空の歴史物語であることを本文冒頭に明記しました。
4. World affairs は制度・政策の一般説明を国際機関等の資料と照合しました。実在事例として特定できない91篇には、架空の政策例であることを明記しました。
5. Famous books は原則として Project Gutenberg の原典に対し、人物、出来事の順序、中心的な選択、結末、`sourceWork` を照合しました。Project Gutenbergにない作品は作品公式情報を使用しました。
6. Travel は実在地名を確認したうえで、登場人物と出来事が架空であり、特定の歴史・数値・医療・時事的断定が混入していないことを確認しました。
7. その他の創作は、実在人物、特定事件、数値、医療、史実、時事的主張が暗黙に混入していないかを確認しました。
8. 本文修整後に `wordCount`、語彙、文長、ID、題名、本文重複、メタデータを再検査しました。

## 修整した問題

重点確認により、既存分31篇を修整しました。うち30篇は事実・根拠・誤解防止に関する修整、1篇は確認中に発見した文法修整です。

主な変更:

- `s072`: 山の高い場所では時計が**速く**進むため、本文と矛盾していた題名を訂正。
- `s008` / `s113`: 出典のない渡り鳥調査を削除し、遺伝・経験・環境の関係を根拠のある一般説明へ変更。
- `s088`: 「サンゴが天気を予測する」という未確認の主張を、サンゴ骨格による過去の海洋環境記録へ置換。
- `s114` / `s129`: 実在を確認できない研究事例を削除し、クリーナーフィッシュの相利関係と食物網の検証方法へ置換。
- `s020`: 「深海の複雑な生物は存在しないと教科書が断定していた」という誤った研究史を訂正。
- `s034`: 菌根ネットワークを、木が意図的に助け合う通信網として断定しないよう修整。
- `s187`: キツツキの舌骨が脳のクッションになるという単純化と、「頭痛にならない」という検証不能な断定を削除。
- `s191`: ホウオウジャクの求愛用構造物は巣ではなく `bower` であるため題名を訂正。
- `s194`: 一個体の巨大菌類を「森全体を一つの生物にする」と表現しない題名へ変更。
- `s245`: クオラムセンシングを大陸規模の会話として扱わず、局所的な化学シグナルへ訂正。
- `s270`: 心筋再生の題名を、一般的な哺乳類ではなく実験で確認された新生仔マウスに限定。
- `s315` / `s663`: 伝染性のあくびを共感性の判定として扱わず、複数仮説と不確実性を明示。`s663` の壊れた語句も修復。
- `s314`: 成人の脳を固定的とする説明を削除し、言語間距離、経験、学習環境、年齢効果を分離。
- `s316` / `s318`: 本の匂いだけによる厳密な同定、顔認識能力の単一脳指標といった過剰な断定を削除。

全修整は `fact_check_all_2000.csv` の注記と `scripts/fact_check_existing_corpus.js` で追跡できます。

## 今回追加した90篇

- Nature / History / Science の27篇は、公的機関・研究機関・専門資料で主張の範囲と因果表現を照合しました。
- Famous books の9篇は、Project Gutenbergの原典で主要人物・出来事・結末を確認し、原文を転載せず多読用に再構成しました。
- Fantasy / Everyday life / Mystery / Travel / People の45篇は完全な創作として作成し、外部事実の混入がないことを確認しました。
- World affairs の9篇はすべて架空の政策例であることを本文内で明確にし、特定の国・自治体の実話と誤認されない構成にしました。
- 90篇すべてで、語数、語彙レベル、文法、構文、文長、ID、題名、本文重複、教材メタデータを再検査しました。

## 主な根拠資料

### 自然・科学

- [NOAA Ocean Service: Ocean Facts](https://oceanservice.noaa.gov/facts/)
- [NOAA NCEI: Coral paleoclimatology](https://www.ncei.noaa.gov/products/paleoclimatology/corals)
- [U.S. Geological Survey: Animal Migration](https://www.usgs.gov/programs/ecosystems/science/animal-migration)
- [U.S. National Park Service: Nature & Science](https://www.nps.gov/subjects/nnlandmarks/naturescience.htm)
- [NASA Science](https://science.nasa.gov/)
- [National Institutes of Health: Health Information](https://www.nih.gov/health-information)
- [NIST: Measurement Uncertainty](https://physics.nist.gov/cuu/Uncertainty/)
- [OpenStax Physics](https://openstax.org/details/books/physics)

### 歴史・社会制度

- [Library of Congress: Digital Collections](https://www.loc.gov/collections/)
- [U.S. National Archives: Research Our Records](https://www.archives.gov/research)
- [Smithsonian Learning Lab](https://learninglab.si.edu/)
- [The Metropolitan Museum of Art: Heilbrunn Timeline of Art History](https://www.metmuseum.org/toah/)
- [UNESCO: Education](https://www.unesco.org/en/education)
- [UNHCR: Refugee Data and Policy](https://www.unhcr.org/refugee-statistics/)
- [United Nations Environment Programme](https://www.unep.org/explore-topics)
- [World Bank: Urban Development](https://www.worldbank.org/en/topic/urbandevelopment)
- [OECD: Innovative Citizen Participation](https://www.oecd.org/en/topics/sub-issues/innovative-citizen-participation.html)

### 古典原典

- [Project Gutenberg](https://www.gutenberg.org/)
- [The Little Prince: official work information](https://www.lepetitprince.com/en/the-work/)

各篇に割り当てた具体的なURLはCSVに記録しています。

## 判定上の注意

- `factChecked: true` は、確認日時点の本文について、検証対象の分類、資料との照合、過剰な断定の除去を終えたことを示します。将来の研究更新まで保証するものではありません。
- 一般的な低リスク説明には、分野別の公的・専門的な資料群を使用しました。重要な数値、研究史、医療、安全、強い因果、意外性の高い主張には個別資料を割り当てました。
- 架空作品は「実在しない内容が真実である」という意味で合格させたのではありません。創作または仮想事例であることが明確で、外部事実として誤認される断定がないことを確認した区分です。
- 古典リテリングは短い再話です。原典のすべての細部を再現するものではなく、主要筋を損なう事実誤認がないことを確認しています。
