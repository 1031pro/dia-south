(function() {
    const root = (typeof window !== 'undefined') ? window : globalThis;
    if (typeof root.__MEISHIKI_DEBUG__ === 'undefined') {
        // ここを true/false で切替（true: ログON, false: ログOFF）
        root.__MEISHIKI_DEBUG__ = false;
    }
    const __originalConsoleLog = console.log.bind(console);
    console.log = function(...args) {
        if (root.__MEISHIKI_DEBUG__) {
            __originalConsoleLog(...args);
        }
    };
})();

class Meishiki {
    constructor(birthdate, birthtime, sex) {
        // 生年月日を正確に設定（時刻は00:00:00に統一）
        // 入力は年月日をDate.UTCで生成したDate。暦日の取得・比較もUTCで統一する
        this.birthdate = new Date(Date.UTC(birthdate.getUTCFullYear(), birthdate.getUTCMonth(), birthdate.getUTCDate(), 0, 0, 0, 0));
        this.birthtime = birthtime ? new Date(birthtime) : null;
        this.sex = parseInt(sex);
        this.meishiki = {};
        this.std_num = 2; // 日干を基準とする
    }

    // 天中殺（空亡）区分（10区分）
    static tenchusatsuList = ['辰巳', '寅卯', '子丑', '戌亥', '申酉', '午未'];

    isSetsuiri(month) {
        // 指定月と生月の大小を先に判定し、同月のときのみ日で比較する（最小限の修正）
        const birthYear = this.birthdate.getUTCFullYear();
        const birthMonth = this.birthdate.getUTCMonth() + 1;
        const birthDay = this.birthdate.getUTCDate();

        if (birthMonth > month) return 0;   // その月の節入りはすでに過ぎている
        if (birthMonth < month) return -1;  // その月の節入りはまだ来ていない

        // 同月の場合のみ節入り日と比較（時刻は従来どおり不使用）
        for (const s of kanshiData.setsuiri) {
            if (s[0] === birthYear && s[1] === month) {
                const setsuiriDay = s[2];
                return birthDay >= setsuiriDay ? 0 : -1;
            }
        }
        throw new Error('節入りを判定できませんでした。');
    }

    findYearKanshi() {
        const year = this.birthdate.getUTCFullYear();
        
        try {
            // 参考情報: 2月節入り日時と生月・生日（プロセス把握のための最小限ログ）
            const birthMonth = this.birthdate.getUTCMonth() + 1;
            const birthDay = this.birthdate.getUTCDate();
            let febSetsuiri = null;
            for (const s of kanshiData.setsuiri) {
                if (s[0] === year && s[1] === 2) { febSetsuiri = s; break; }
            }
            if (febSetsuiri) {
                const hh = String(febSetsuiri[3]).padStart(2, '0');
                const mm = String(febSetsuiri[3]).padStart(2, '0');
                // 年干計算の冗長ログは非表示
            }
            
            // 年干計算のための節入り判定を修正
            // 生年月日が2月節入り前か後かを判定する
            let setsuiriResult;
            if (febSetsuiri) {
                // 2月節入り日と生年月日を比較
                if (birthMonth < 2) {
                    // 1月生まれの場合は、2月節入り前なので前年として扱う
                    setsuiriResult = -1;
                } else if (birthMonth === 2) {
                    // 2月生まれの場合は、2月節入り日と比較
                    setsuiriResult = birthDay >= febSetsuiri[2] ? 0 : -1;
                } else {
                    // 3月以降生まれの場合は、2月節入りは過ぎている
                    setsuiriResult = 0;
                }
            } else {
                // 2月節入りデータが見つからない場合は従来の方法を使用
                setsuiriResult = this.isSetsuiri(2);
            }
            
            // 冗長ログ非表示: 節入り判定結果
            
            let sixty_kanshi_idx = ((year - 3) % 60 - 1 + setsuiriResult) % 60;
            // 冗長ログ非表示: 計算式表示
            
            // 負の値になった場合は正の値に変換
            if (sixty_kanshi_idx < 0) {
                sixty_kanshi_idx += 60;
                // 冗長ログ非表示: 補正表示
            }
            
            const [y_kan, y_shi] = kanshiData.sixty_kanshi[sixty_kanshi_idx];
            // 冗長ログ非表示: 六十干支インデックス
            
            return [y_kan, y_shi];
        } catch (e) {
            // エラー詳細ログは非表示
            throw new Error('年干支の計算で例外が送出されました。');
        }
    }

    findMonthKanshi(y_kan) {
        // 生年月日の月を取得
        const birthMonth = this.birthdate.getUTCMonth() + 1;
        const birthDay = this.birthdate.getUTCDate();
        
        // 節入り判定：生年月日が節入り前か後かを判定
        let actualMonth = birthMonth;
        let actualYearKan = y_kan; // 使用する年干（デフォルトは渡された年干）
        
        // 節入りデータから該当する月の節入り日時を検索
        let setsuiriFound = false;
        
        for (const s of kanshiData.setsuiri) {
            if (s[0] === this.birthdate.getUTCFullYear() && s[1] === birthMonth) {
                setsuiriFound = true;
                // 節入り日を取得（時刻は使用しない）
                const setsuiriDay = s[2];
                
                // 生年月日が節入り前の場合、前月の干支を使用
                // 節入り当日は、節入り後として扱う
                if (birthDay < setsuiriDay) {
                    actualMonth = birthMonth - 1;
                    // 1月の場合は前年12月として扱う
                    if (actualMonth === 0) {
                        actualMonth = 12;
                        // 1月節入り前の場合は前年の年干を使用する必要がある
                        // 前年の年干を計算
                        const prevYear = this.birthdate.getUTCFullYear() - 1;
                        let prevYearSetsuiriResult = 0; // 前年なので2月節入りは必ず過ぎている
                        let prevYearSixtyKanshiIdx = ((prevYear - 3) % 60 - 1 + prevYearSetsuiriResult) % 60;
                        if (prevYearSixtyKanshiIdx < 0) {
                            prevYearSixtyKanshiIdx += 60;
                        }
                        const [prevYKan, prevYShi] = kanshiData.sixty_kanshi[prevYearSixtyKanshiIdx];
                        actualYearKan = prevYKan;
                        
                        // 月干支計算のデバッグログ削除
                    }
                } else {
                    // 節入り当日または節入り後：現在の月を使用
                    actualMonth = birthMonth;
                }
                break;
            }
        }
        
        // 節入りデータが見つからない場合、現在の月として扱う
        if (!setsuiriFound) {
            actualMonth = birthMonth;
        }
        
        // 月干支計算のデバッグログ削除
        
        // 月干支テーブルから該当する月の干支を取得
        const monthIndex = actualMonth - 1;
        
        const monthKanshi = kanshiData.month_kanshi[actualYearKan][monthIndex];
        
        return [monthKanshi[0], monthKanshi[1]];
    }

    findDayKanshi() {
        // 基準日（1926年1月1日）- UTCで統一
        const baseDate = new Date(Date.UTC(1926, 0, 1, 0, 0, 0, 0)); // 月は0始まり
        
        // 生年月日を正確に設定（UTCで統一）
        const targetDate = new Date(this.birthdate);
        
        // タイムスタンプで日数差を計算（繰り上げに修正）
        let elapsedDays = Math.ceil((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 日干支の計算
        const day_idx = ((elapsedDays % 60) + 60) % 60;
        
        // 補正値26を加える（修正版）
        const adjusted_idx = (((day_idx + 26) % 60) + 60) % 60;
        console.debug(`member/findDayKanshi: elapsedDays=${elapsedDays}, day_idx=${day_idx}, adjusted_idx=${adjusted_idx}`);
        if (typeof kanshiData === 'undefined' || !kanshiData || !Array.isArray(kanshiData.sixty_kanshi)) {
            console.error('member/findDayKanshi: kanshiData または kanshiData.sixty_kanshi が未定義');
            return [-1, -1];
        }
        const entry = kanshiData.sixty_kanshi[adjusted_idx];
        if (!entry || entry.length < 2) {
            console.error(`member/findDayKanshi: sixty_kanshi未定義 or 不正 index=${adjusted_idx}`);
            return [-1, -1];
        }
        const [d_kan, d_shi] = entry;
        

        
        return [d_kan, d_shi];
    }

    findZokan(shi) {
        // Python版と同じロジック（最小修正: 前月/前年の節入りを正しく参照）
        const birthYear = this.birthdate.getUTCFullYear();
        const birthMonth = this.birthdate.getUTCMonth() + 1;
        const p = this.isSetsuiri(birthMonth);
        let targetYear = birthYear;
        let targetMonth = birthMonth + p; // pは0または-1

        if (targetMonth <= 0) {
            targetYear = birthYear - 1;
            targetMonth = 12;
        }

        let setsuiri = null;
        for (const s of kanshiData.setsuiri) {
            if (s[0] === targetYear && s[1] === targetMonth) {
                setsuiri = new Date(Date.UTC(s[0], s[1] - 1, s[2], s[3], s[4]));
                break;
            }
        }
        
        if (!setsuiri) {
            return -1;
        }
        
        // 空配列の場合（子、卯、酉）：1つの区間
        if (!kanshiData.zokan_time[shi] || kanshiData.zokan_time[shi].length === 0) {
            const result = kanshiData.zokan[shi][0];
            return result;
        }
        
        // 2つの区間がある地支（午、亥）
        if (kanshiData.zokan_time[shi].length === 2) {
            const delta_ms = (kanshiData.zokan_time[shi][0] * 24) * 60 * 60 * 1000;
            const setsuiri_delta = new Date(setsuiri.getTime() + delta_ms);
            
            // 日付のみで比較するため、時刻を00:00:00に設定
            const birthdate_only = new Date(Date.UTC(this.birthdate.getUTCFullYear(), this.birthdate.getUTCMonth(), this.birthdate.getUTCDate()));
            const setsuiri_delta_only = new Date(Date.UTC(setsuiri_delta.getUTCFullYear(), setsuiri_delta.getUTCMonth(), setsuiri_delta.getUTCDate()));
            
            if (setsuiri_delta_only > birthdate_only) {
                const result = kanshiData.zokan[shi][0];
                return result;
            } else {
                const result = kanshiData.zokan[shi][1];
                return result;
            }
        }
        
        // 3つの区間がある地支（丑、寅、辰、巳、未、申、戌）
        if (kanshiData.zokan_time[shi].length === 3) {
            const delta1_ms = (kanshiData.zokan_time[shi][0] * 24) * 60 * 60 * 1000;
            const delta2_ms = (kanshiData.zokan_time[shi][1] * 24) * 60 * 60 * 1000;
            const setsuiri_delta1 = new Date(setsuiri.getTime() + delta1_ms);
            const setsuiri_delta2 = new Date(setsuiri.getTime() + delta2_ms);
            
            // 日付のみで比較するため、時刻を00:00:00に設定
            const birthdate_only = new Date(Date.UTC(this.birthdate.getUTCFullYear(), this.birthdate.getUTCMonth(), this.birthdate.getUTCDate()));
            const setsuiri_delta1_only = new Date(Date.UTC(setsuiri_delta1.getUTCFullYear(), setsuiri_delta1.getUTCMonth(), setsuiri_delta1.getUTCDate()));
            const setsuiri_delta2_only = new Date(Date.UTC(setsuiri_delta2.getUTCFullYear(), setsuiri_delta2.getUTCMonth(), setsuiri_delta2.getUTCDate()));
            
            let zokan;
            if (setsuiri_delta1_only > birthdate_only) {
                zokan = kanshiData.zokan[shi][0];
            // 第2境界の当日は次の蔵干へ切り替える（従来の日本時間での結果を維持）。
            } else if (setsuiri_delta1_only <= birthdate_only && birthdate_only < setsuiri_delta2_only) {
                zokan = kanshiData.zokan[shi][1];
            } else {
                zokan = kanshiData.zokan[shi][2];
            }
            
            return zokan;
        }
        
        // その他の場合（念のため）
        const result = kanshiData.zokan[shi][0];
        return result;
    }

    findTsuhen(s_kan, kan_) {
        try {
            if (kan_ === -1) {
                return -1;
            }
            
            const tsuhenIndex = kanshiData.kan_tsuhen[s_kan].indexOf(kan_);
            
            return tsuhenIndex;
        } catch (e) {
            console.error('通変星計算でエラーが発生:', e);
            return -1;
        }
    }

    findTwelveFortune(kan, shi_) {
        try {
            if (shi_ === -1) {
                return -1;
            }
            
            const fortuneIndex = kanshiData.twelve_table[kan][shi_];
            
            return fortuneIndex;
        } catch (e) {
            console.error('十二運計算でエラーが発生:', e);
            return -1;
        }
    }

    buildMeishiki() {
        try {
            // 天干・地支を得る
            const [y_kan, y_shi] = this.findYearKanshi();
            const [m_kan, m_shi] = this.findMonthKanshi(y_kan);
            const [d_kan, d_shi] = this.findDayKanshi();

            // 天干・地支の配列を作成（日柱、月柱、年柱の順）
            const tenkan = [d_kan, m_kan, y_kan];
            const chishi = [d_shi, m_shi, y_shi];

            // 蔵干を得る
            const d_zkan = this.findZokan(d_shi);
            let m_zkan = this.findZokan(m_shi);
            let y_zkan = this.findZokan(y_shi);
            
            // 月柱蔵干は共通ロジックの結果をそのまま採用（上書きしない）

            const zokan = [d_zkan, m_zkan, y_zkan];

            // 通変星を計算（日干を基準）
            const tsuhen = [
                this.findTsuhen(d_kan, d_kan),  // 日柱
                this.findTsuhen(d_kan, m_kan),  // 月柱
                this.findTsuhen(d_kan, y_kan)   // 年柱
            ];

            // 蔵干通変星を計算（日干を基準）
            const zokan_tsuhen = [
                this.findTsuhen(d_kan, d_zkan),  // 日柱
                this.findTsuhen(d_kan, m_zkan),  // 月柱
                this.findTsuhen(d_kan, y_zkan)   // 年柱
            ];

            // 十二運を計算（日干を基準）
            const junni = [
                this.findTwelveFortune(d_kan, d_shi),  // 日柱
                this.findTwelveFortune(d_kan, m_shi),  // 月柱
                this.findTwelveFortune(d_kan, y_shi)   // 年柱
            ];

            // 命式に情報を追加
            this.meishiki = {
                tenkan: tenkan,
                chishi: chishi,
                zokan: zokan,
                tsuhen: tsuhen,
                zokan_tsuhen: zokan_tsuhen,
                junni: junni,
                nitchu_tenkan: d_kan,
                getchu_chishi: m_shi,
                getchu_zokan: m_zkan,
                _built: true  // 構築完了フラグを追加
            };
            


            return this.meishiki;
        } catch (e) {
            console.error('命式構築でエラーが発生:', e);
            throw e;
        }
    }

    displayMeishiki() {
        try {
            // ①命式のタイトルを表示
            const meishikiTitle = document.getElementById('meishikiTitle');
            if (meishikiTitle) {
                meishikiTitle.style.display = 'block';
            }
            
            // 命式が既に構築されているかチェック
            if (!this.meishiki.tenkan || !this.meishiki.chishi || !this.meishiki.zokan || !this.meishiki._built) {
                this.buildMeishiki();
            }
            
            // 天干・地支の色マップ
            const chishiColorMap = {
                '寅': '#00823B', '卯': '#92D050', '午': '#FF5050', '巳': '#D20000',
                '辰': '#FFC000', '戌': '#FFC000', '丑': '#FFFF00', '未': '#FFFF00',
                '申': '#7030A0', '酉': '#E642C3', '子': '#390EF2', '亥': '#00B0F0'
            };
            const tenkanColorMap = {
                '甲': '#00823B', '乙': '#92D050', '丙': '#FF5050', '丁': '#D20000',
                '戊': '#FFC000', '己': '#FFFF00', '庚': '#7030A0', '辛': '#E642C3',
                '壬': '#390EF2', '癸': '#00B0F0'
            };

            // 見やすい文字色マップ（黒・グレー除外）
            const readableColorMap = {
                '寅': '#FFFFFF', '卯': '#FFFFFF', '午': '#FFFFFF', '巳': '#FFFFFF',
                '辰': '#0000FF', '戌': '#0000FF', '丑': '#0000FF', '未': '#0000FF',
                '申': '#0000FF', '酉': '#0000FF', '子': '#FFFFFF', '亥': '#FFFFFF',
                '甲': '#FFFFFF', '乙': '#FFFFFF', '丙': '#FFFFFF', '丁': '#FFFFFF',
                '戊': '#0000FF', '己': '#0000FF', '庚': '#0000FF', '辛': '#0000FF',
                '壬': '#FFFFFF', '癸': '#FFFFFF'
            };
            // 補色マップ（一時的適用）
            const complementaryColorMap = {
                '寅': '#FF0000', '卯': '#FF0000', '午': '#00FFFF', '巳': '#00FFFF',
                '辰': '#FF00FF', '戌': '#FF00FF', '丑': '#000000', '未': '#000000',
                '申': '#FFFF00', '酉': '#FFFF00', '子': '#FF8000', '亥': '#FF8000',
                '甲': '#FF0000', '乙': '#FF0000', '丙': '#00FFFF', '丁': '#00FFFF',
                '戊': '#FF00FF', '己': '#000000', '庚': '#FFFF00', '辛': '#FFFF00',
                '壬': '#FF8000', '癸': '#FF8000'
            };

            // 天干の文字色マップ
            const tenkanTextColorMap = {
                '甲': '#AFFFEA', '乙': '#E7FEC2', '丙': '#FFC6B9', '丁': '#FFA7A7',
                '戊': '#FBE875', '己': '#FFFFCC', '庚': '#DECDEF', '辛': '#FFF3FF',
                '壬': '#B7E2FF', '癸': '#EFFBFF'
            };

                    // 基本情報の表示
        const basicInfo = document.getElementById('basicInfo');
        basicInfo.innerHTML = `
            <p>生年月日: ${this.birthdate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
            <p>性別: ${this.sex === 1 ? '男性' : this.sex === 2 ? '女性' : '不明'}</p>
        `;

            // 命式表の表示
            const meishikiTable = document.getElementById('meishikiTable');
            
            // 天干行 - 五行に基づいてクラスを適用
            const tenkanRow = document.getElementById('tenkanRow');
            const tenkanGogyoClasses = [
                this.getGogyoClass(kanshiData.gogyo_kan[this.meishiki.tenkan[0]]), // 日柱
                this.getGogyoClass(kanshiData.gogyo_kan[this.meishiki.tenkan[1]]), // 月柱  
                this.getGogyoClass(kanshiData.gogyo_kan[this.meishiki.tenkan[2]])  // 年柱
            ];
            tenkanRow.innerHTML = `<th class="row-header-1">天干</th>
    <td class="${tenkanGogyoClasses[0]}">${formatKanWithGogyo(this.meishiki.tenkan[0])}</td>
    <td class="${tenkanGogyoClasses[1]}">${formatKanWithGogyo(this.meishiki.tenkan[1])}</td>
    <td class="${tenkanGogyoClasses[2]}">${formatKanWithGogyo(this.meishiki.tenkan[2])}</td>`;

            // 地支行 - 五行に基づいてクラスを適用
            const chishiRow = document.getElementById('chishiRow');
            const chishiGogyoClasses = [
                this.getGogyoClass(kanshiData.gogyo_shi[this.meishiki.chishi[0]]), // 日柱
                this.getGogyoClass(kanshiData.gogyo_shi[this.meishiki.chishi[1]]), // 月柱
                this.getGogyoClass(kanshiData.gogyo_shi[this.meishiki.chishi[2]])  // 年柱
            ];
            chishiRow.innerHTML = `<th class="row-header-2">地支</th>
    <td class="${chishiGogyoClasses[0]}">${formatShiWithGogyo(this.meishiki.chishi[0])}</td>
    <td class="${chishiGogyoClasses[1]}">${formatShiWithGogyo(this.meishiki.chishi[1])}</td>
    <td class="${chishiGogyoClasses[2]}">${formatShiWithGogyo(this.meishiki.chishi[2])}</td>`;

            // 干支番号行（地支の下に移動）
            const kanshiNumRow = document.getElementById('kanshiNumRow');
            const kanshiNumbers = [
                getKanshiNumber(this.meishiki.tenkan[0], this.meishiki.chishi[0]),
                getKanshiNumber(this.meishiki.tenkan[1], this.meishiki.chishi[1]),
                getKanshiNumber(this.meishiki.tenkan[2], this.meishiki.chishi[2])
            ];
            kanshiNumRow.innerHTML = `
                <th class="row-header-3">干支番</th>
                <td>${kanshiNumbers[0]}</td>
                <td>${kanshiNumbers[1]}</td>
                <td>${kanshiNumbers[2]}</td>
            `;

            // 蔵干行
            const zokanRow = document.getElementById('zokanRow');
            const zokanValues = [
                this.meishiki.zokan[0] !== -1 ? kanshiData.kan[this.meishiki.zokan[0]] : '',
                this.meishiki.zokan[1] !== -1 ? kanshiData.kan[this.meishiki.zokan[1]] : '',
                this.meishiki.zokan[2] !== -1 ? kanshiData.kan[this.meishiki.zokan[2]] : ''
            ];
            zokanRow.innerHTML = `
                <th class="row-header-4">蔵干</th>
                <td>${zokanValues[0]}</td>
                <td>${zokanValues[1]}</td>
                <td>${zokanValues[2]}</td>
            `;

            // 通変星行
            const tsuhenRow = document.getElementById('tsuhenRow');
            const tsuhenValues = [
                '',
                this.meishiki.tsuhen[1] !== -1 ? kanshiData.tsuhen[this.meishiki.tsuhen[1]] : '',
                this.meishiki.tsuhen[2] !== -1 ? kanshiData.tsuhen[this.meishiki.tsuhen[2]] : ''
            ];
            tsuhenRow.innerHTML = `
                <th class="row-header-5">通変星</th>
                <td>${tsuhenValues[0]}</td>
                <td>${tsuhenValues[1]}</td>
                <td>${tsuhenValues[2]}</td>
            `;

            // 蔵干通変星行
            const zokanTsuhenRow = document.getElementById('zokanTsuhenRow');
            const zokanTsuhenValues = [
                this.meishiki.zokan_tsuhen[0] !== -1 ? kanshiData.tsuhen[this.meishiki.zokan_tsuhen[0]] : '',
                this.meishiki.zokan_tsuhen[1] !== -1 ? kanshiData.tsuhen[this.meishiki.zokan_tsuhen[1]] : '',
                this.meishiki.zokan_tsuhen[2] !== -1 ? kanshiData.tsuhen[this.meishiki.zokan_tsuhen[2]] : ''
            ];
            zokanTsuhenRow.innerHTML = `
                <th class="row-header-6">通変星</th>
                <td>${zokanTsuhenValues[0]}</td>
                <td>${zokanTsuhenValues[1]}</td>
                <td>${zokanTsuhenValues[2]}</td>
            `;

            // 十二運行
            const junniRow = document.getElementById('junniRow');
            const junniValues = [
                this.meishiki.junni[0] !== -1 ? kanshiData.twelve_fortune[this.meishiki.junni[0]] : '',
                this.meishiki.junni[1] !== -1 ? kanshiData.twelve_fortune[this.meishiki.junni[1]] : '',
                this.meishiki.junni[2] !== -1 ? kanshiData.twelve_fortune[this.meishiki.junni[2]] : ''
            ];
            junniRow.innerHTML = `
                <th class="row-header-7">十二運</th>
                <td>${junniValues[0]}</td>
                <td>${junniValues[1]}</td>
                <td>${junniValues[2]}</td>
            `;

            // ③ソシアルメーターは独立した処理で表示

            // 日柱天中殺の表示
        
            let tenchusatsuRow = document.getElementById('tenchusatsuRow');
            if (!tenchusatsuRow) {
                tenchusatsuRow = document.createElement('tr');
                tenchusatsuRow.id = 'tenchusatsuRow';
                tenchusatsuRow.innerHTML = `<th class="row-header-8">天中殺</th><td colspan="3"></td>`;
                meishikiTable.appendChild(tenchusatsuRow);
                // 天中殺行を新規作成
            } else {
                tenchusatsuRow.innerHTML = `<th class="row-header-8">天中殺</th><td colspan="3"></td>`;
                // 天中殺行を更新
            }
            const nitchuNum = getKanshiNumber(this.meishiki.tenkan[0], this.meishiki.chishi[0]);
            let tcs1 = '';
            if (nitchuNum) {
                const idx = Math.floor((nitchuNum - 1) / 10);
                tcs1 = Meishiki.tenchusatsuList[idx];
                // 日柱干支番号と天中殺の計算
            }
            tenchusatsuRow.children[1].colSpan = 3;
            tenchusatsuRow.children[1].textContent = tcs1 ? tcs1 + '天中殺' : '';
            // 天中殺行の作成完了

            // 命式表示完了

        } catch (e) {
            console.error('命式表示でエラーが発生:', e);
            throw e;
        }
    }

    // 五行インデックスからCSSクラス名を取得
    getGogyoClass(gogyoIndex) {
        const gogyoClasses = ['wood-cell', 'fire-cell', 'earth-cell', 'metal-cell', 'water-cell'];
        return gogyoClasses[gogyoIndex] || '';
    }

    // 大運テーブルを生成
    generateUnseiTable() {
        const table = document.createElement('table');
        table.className = 'unsei-table';
        
        // ヘッダー行
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['年齢', '干支', '通変星', '十二運'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // テーブル本体
        const tbody = document.createElement('tbody');
        this.unsei.forEach((unsei, index) => {
            const row = document.createElement('tr');
            
            // 大運セル（順行/逆行の情報を含む）
            const unseiCell = document.createElement('td');
            const direction = this.isGyakko ? '逆行' : '順行';
            unseiCell.textContent = `大運 ${direction}${index + 1}年`;
            row.appendChild(unseiCell);
            
            // 年齢範囲セル
            const ageCell = document.createElement('td');
            const startAge = index * 10;
            const endAge = (index + 1) * 10;
            ageCell.textContent = `${startAge}歳～${endAge}歳`;
            row.appendChild(ageCell);
            
            // 十干セル
            const jikkanCell = document.createElement('td');
            jikkanCell.textContent = unsei.jikkan;
            row.appendChild(jikkanCell);
            
            // 十二支セル
            const junishiCell = document.createElement('td');
            junishiCell.textContent = unsei.junishi;
            row.appendChild(junishiCell);
            
            // 蔵干セル
            const zokanCell = document.createElement('td');
            zokanCell.textContent = unsei.zokan.join(' ');
            row.appendChild(zokanCell);
            
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        return table;
    }
}

// 大運テーブルを描画する関数
function displayDaiunTable(meishiki, birthdate, sex) {
    const unsei = new Unsei(meishiki, birthdate, sex);
    unsei.appendDaiun();
    
    // 大運テーブルのコンテナを取得
    const daiunContainer = document.getElementById('daiunTable');
    daiunContainer.innerHTML = ''; // 既存の内容をクリア
    
    // テーブルタイトルを作成
    const title = document.createElement('h3');
    const direction = unsei.isGyakko ? '逆行' : '順行';
    title.textContent = `②人生プログラム（${direction}）`;
    daiunContainer.appendChild(title);
    
    // テーブルを作成
    const table = document.createElement('table');
    table.className = 'unsei-table';
    
    // ヘッダー行を作成
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['年齢', '干支', '通変星', '十二運'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // テーブル本体を作成
    const tbody = document.createElement('tbody');
    for (const du of unsei.daiun) {
        // 最初の数字（開始年齢）が100を超えたら以降は表示しない
        if (du.ageStart > 100) break;
        const row = document.createElement('tr');
        // 年齢範囲セル
        const ageCell = document.createElement('td');
        ageCell.textContent = `${du.ageStart}歳～${du.ageEnd}歳`;
        row.appendChild(ageCell);
        // 干支セル（十干＋地支）
        const kanshiCell = document.createElement('td');
        const kanshiText = `${kanshiData.kan[du.kan]}${kanshiData.shi[du.shi]}`;
        kanshiCell.textContent = kanshiText;
        row.appendChild(kanshiCell);
        // 通変星セル
        const tsuhenCell = document.createElement('td');
        tsuhenCell.textContent = du.tsuhen !== -1 ? kanshiData.tsuhen[du.tsuhen] : '';
        row.appendChild(tsuhenCell);
        // 十二運セル
        const fortuneCell = document.createElement('td');
        fortuneCell.textContent = du.t_fortune !== -1 ? kanshiData.twelve_fortune[du.t_fortune] : '';
        row.appendChild(fortuneCell);
        tbody.appendChild(row);
        // この行が100歳を超える範囲（ageEnd > 100）の場合、次の行は表示不要
        if (du.ageEnd > 100) break;
    }
    table.appendChild(tbody);
    
    // テーブルをコンテナに追加
    daiunContainer.appendChild(table);
    
    // 通変星分布の円グラフは命式表示時に描画済み
}

// calculateMeishiki から大運テーブルも描画
function calculateMeishiki() {
    console.log('calculateMeishiki関数が開始されました');
    // 命式計算開始
    
    const birthYear = document.getElementById('birth_year').value;
    const birthMonth = document.getElementById('birth_month').value;
    const birthDay = document.getElementById('birth_day').value;
    const sex = document.querySelector('input[name="sex"]:checked').value;

    // 入力値の取得

    if (!birthYear || !birthMonth || !birthDay) {
        console.error('生年月日の入力が不完全です');
        alert('生年月日を入力してください。');
        return;
    }

    // 日付＋時刻を統合
    // 日付文字列から年・月・日を抽出して、時刻を00:00:00に固定
    const year = parseInt(birthYear);
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);
    let birthDateTime = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // 月は0始まり、時刻は00:00:00.000
    
    // 日付解析結果

    // Meishikiクラスのインスタンスを作成
    const meishiki = new Meishiki(birthDateTime, null, sex);
    
    // 命式の表示を実行（構築も含む）
    console.log('meishiki.displayMeishiki()を実行します');
    meishiki.displayMeishiki();
    console.log('meishiki.displayMeishiki()が完了しました');
    
    // 大運テーブルの表示を実行
    console.log('displayDaiunTableを実行します');
    displayDaiunTable(meishiki, new Date(birthDateTime), parseInt(sex));
    console.log('displayDaiunTableが完了しました');
    
    // ③ソシアルメーターの表示を実行
    console.log('③ソシアルメーターの描画を開始します');
    try {
        drawTsuhenChart(meishiki);
        console.log('③ソシアルメーターの描画が完了しました');
    } catch (error) {
        console.error('ソシアルメーターの描画でエラーが発生しました:', error);
    }
    
    // ④ライフエリアマップの表示を実行
    console.log('④ライフエリアマップの描画を開始します');
    try {
        drawKanshiTriangle(meishiki);
        console.log('④ライフエリアマップの描画が完了しました');
    } catch (error) {
        console.error('ライフエリアマップの描画でエラーが発生しました:', error);
    }
    
    // 命式計算完了
    console.log('calculateMeishiki関数の実行が完了しました');
}

// 五行の相生相克情報を取得する関数
function getGogyoRelation(kanIndex) {
    const gogyoIndex = kanshiData.gogyo_kan[kanIndex];
    const gogyo = kanshiData.gogyo[gogyoIndex];
    const relation = kanshiData.gogyo_relation[`+${gogyo}`] || kanshiData.gogyo_relation[`-${gogyo}`];
    return relation ? `（${relation}）` : '';
}

// 蔵干セルの表示フォーマット関数
function formatZokanCell(kanIndex) {
    const kan = kanshiData.kan[kanIndex];
    const num = kanIndex;
    const gogyoIndex = kanshiData.gogyo_kan[kanIndex];
    const gogyo = kanshiData.gogyo[gogyoIndex];
    // ±判定（木・火・土・金・水の順で0,1=+、2=+、3=+、4=+、ただし陰干は-）
    // 甲乙(+木), 丙丁(+火), 戊己(+土), 庚辛(+金), 壬癸(+水)
    // 陰干（偶数index）は-、陽干（奇数index）は+
    const sign = (kanIndex % 2 === 0) ? '+' : '-';
    return `${kan}（${num}）／${sign}${gogyo}`;
}

// 干名＋五行表示用関数
function formatKanWithGogyo(kanIndex) {
    if (kanIndex === -1) return '';
    const kan = kanshiData.kan[kanIndex];
    const gogyoIndex = kanshiData.gogyo_kan[kanIndex];
    const gogyo = kanshiData.gogyo[gogyoIndex];
    const sign = (kanIndex % 2 === 0) ? '+' : '-';
    return `${kan}<br>（${sign}${gogyo}）`;
}

// 通変星分布の円グラフを描画する関数
function drawTsuhenChart(meishiki) {
    // canvas要素が存在しない場合はスキップ
    const canvas = document.getElementById('tsuhenChart');
    if (!canvas) {
        return;
    }

    // 既存のチャートを破棄
    const existingChart = Chart.getChart('tsuhenChart');
    if (existingChart) {
        existingChart.destroy();
    }

    // デバイスピクセル比に合わせてキャンバスの実サイズを調整（ボケ防止）
    (function adjustCanvasForDPR(cv) {
        const dpr = window.devicePixelRatio || 1;
        const rect = cv.getBoundingClientRect();
        // CSSサイズはそのまま、実ピクセルだけ拡大
        cv.style.width = rect.width + 'px';
        cv.style.height = rect.height + 'px';
        cv.width = Math.round(rect.width * dpr);
        cv.height = Math.round(rect.height * dpr);
    })(canvas);

    // 通変星のデータを取得
    const tsuhenData = meishiki.meishiki.tsuhen; // [日, 月, 年]
    const zokanTsuhenData = meishiki.meishiki.zokan_tsuhen; // [日, 月, 年]

    // 通変星名の定義
    const tsuhenNames = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '印綬'];

    // 命式テーブルから通変星の値を取得（ダミーデータ: 実装都合）
    const chartData = [45, 25, 15, 10, 5];
    const chartLabels = [];

    // 命式テーブルから実際の値を取得
    const meishikiTable = document.getElementById('meishikiTable');
    const zokanTsuhenRow = document.getElementById('zokanTsuhenRow');
    const zokanTsuhenMonthCell = zokanTsuhenRow ? zokanTsuhenRow.children[2] : null;
    const zokanTsuhenMonthValue = zokanTsuhenMonthCell ? zokanTsuhenMonthCell.textContent.trim() : 'なし';
    chartLabels.push(zokanTsuhenMonthValue);

    const tsuhenRow = document.getElementById('tsuhenRow');
    const tsuhenMonthCell = tsuhenRow ? tsuhenRow.children[2] : null;
    const tsuhenMonthValue = tsuhenMonthCell ? tsuhenMonthCell.textContent.trim() : 'なし';
    chartLabels.push(tsuhenMonthValue);

    const zokanTsuhenDayCell = zokanTsuhenRow ? zokanTsuhenRow.children[1] : null;
    const zokanTsuhenDayValue = zokanTsuhenDayCell ? zokanTsuhenDayCell.textContent.trim() : 'なし';
    chartLabels.push(zokanTsuhenDayValue);

    const zokanTsuhenYearCell = zokanTsuhenRow ? zokanTsuhenRow.children[3] : null;
    const zokanTsuhenYearValue = zokanTsuhenYearCell ? zokanTsuhenYearCell.textContent.trim() : 'なし';
    chartLabels.push(zokanTsuhenYearValue);

    const tsuhenYearCell = tsuhenRow ? tsuhenRow.children[3] : null;
    const tsuhenYearValue = tsuhenYearCell ? tsuhenYearCell.textContent.trim() : 'なし';
    chartLabels.push(tsuhenYearValue);

    const chartColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#FFCC66', '#4BC0C0', '#FF6384'
    ];

    // 通変星グループ名マップ
    const tsuhenGroupMap = {
        '比肩': '自己鍛錬', '劫財': '自己鍛錬',
        '食神': '健康維持', '傷官': '健康維持',
        '偏財': '交流人脈', '正財': '交流人脈',
        '偏官': '仕事企画', '正官': '仕事企画',
        '偏印': '研究解析', '印綬': '研究解析'
    };
    // グループごとに合算
    const groupDataMap = {};
    chartLabels.forEach((label, i) => {
        const group = tsuhenGroupMap[label] || label;
        if (!groupDataMap[group]) groupDataMap[group] = 0;
        groupDataMap[group] += chartData[i];
    });

    // 合計値の多い順にソート
    const sortedEntries = Object.entries(groupDataMap).sort((a, b) => b[1] - a[1]);
    const sortedLabels = sortedEntries.map(e => e[0]);
    const sortedData = sortedEntries.map(e => e[1]);

    // グラデーション色の設定
    const groupColors = {
        '自己鍛錬': ['#81C784', '#2E7D32'],
        '健康維持': ['#E57373', '#D32F2F'],
        '交流人脈': ['#FFD54F', '#F57C00'],
        '仕事企画': ['#BA68C8', '#8E24AA'],
        '研究解析': ['#64B5F6', '#1976D2']
    };

    // グラデーション作成ヘルパー
    function createGradient(ctx, colors, startAngle, endAngle) {
        const centerAngle = (startAngle + endAngle) / 2;
        const radius = 120;
        const startX = 150 + Math.cos(startAngle) * radius;
        const startY = 150 + Math.sin(startAngle) * radius;
        const endX = 150 + Math.cos(endAngle) * radius;
        const endY = 150 + Math.sin(endAngle) * radius;
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        return gradient;
    }

    // 円グラフを作成
    const ctx = document.getElementById('tsuhenChart').getContext('2d');

    const isSingleSegment100 = sortedLabels.length === 1 && sortedData[0] === 100;

    const segmentColors = sortedLabels.map((label, index) => {
        const colors = groupColors[label] || ['#cccccc', '#999999'];
        if (isSingleSegment100) {
            return colors[0];
        }
        const totalData = sortedData.reduce((sum, val) => sum + val, 0);
        let currentAngle = -Math.PI / 2;
        for (let i = 0; i < index; i++) {
            currentAngle += (sortedData[i] / totalData) * 2 * Math.PI;
        }
        const segmentAngle = (sortedData[index] / totalData) * 2 * Math.PI;
        const startAngle = currentAngle;
        const endAngle = currentAngle + segmentAngle;
        return createGradient(ctx, colors, startAngle, endAngle);
    });

    let displayLabels = sortedLabels;
    let displayData = sortedData;
    let displayColors = segmentColors;
    if (sortedLabels.length === 1) {
        displayData = [100];
    }

    const dpr = window.devicePixelRatio || 1;
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: dpr,
        cutout: '40%',
        spacing: 2,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e3a8a',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#1e3a8a',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 16,
                caretSize: 10,
                displayColors: false,
                titleFont: {
                    size: 24,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 24,
                    weight: 'normal'
                },
                callbacks: {
                    title: function() { return ''; },
                    label: function(context) {
                        return context.label + ': ' + context.parsed + '%';
                    }
                }
            },
            datalabels: {
                color: '#ffffff',
                font: {
                    weight: 'bold',
                    size: 18
                },
                formatter: function(value, context) {
                    return context.chart.data.labels[context.dataIndex];
                }
            }
        }
    };

    try {
        if (typeof ChartDataLabels === 'undefined') {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: displayLabels,
                    datasets: [{
                        data: displayData,
                        backgroundColor: displayColors,
                        borderWidth: 0,
                        spacing: 2
                    }]
                },
                options: chartOptions
            });
        } else {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: displayLabels,
                    datasets: [{
                        data: displayData,
                        backgroundColor: displayColors,
                        borderWidth: 0,
                        spacing: 2
                    }]
                },
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
        }
    } catch (error) {
        // 表示エラーはUIに影響させない
    }

    const finalChartContainer = document.getElementById('tsuhenChartContainer');
    const finalCanvas = document.getElementById('tsuhenChart');
    if (finalChartContainer && finalCanvas) {
        finalChartContainer.style.display = 'block';
        finalChartContainer.style.visibility = 'visible';
        finalCanvas.style.display = 'block';
        finalCanvas.style.visibility = 'visible';
    }
}

// 地支＋五行＋番号表示用関数
function formatShiWithGogyo(shiIndex) {
    if (shiIndex === -1) return '';
    const shi = kanshiData.shi[shiIndex];
    const gogyoIndex = kanshiData.gogyo_shi[shiIndex];
    const gogyo = kanshiData.gogyo[gogyoIndex];
    const sign = (shiIndex % 2 === 0) ? '+' : '-';
    return `${shi}<br>（${sign}${gogyo}）`;
}

// 干支番号（1～60）を取得する関数
function getKanshiNumber(kan, shi) {
    for (let i = 0; i < kanshiData.sixty_kanshi.length; i++) {
        if (kanshiData.sixty_kanshi[i][0] === kan && kanshiData.sixty_kanshi[i][1] === shi) {
            return i + 1;
        }
    }
    return '';
}

// === 大運計算用クラス ===
class Unsei {
    constructor(meishiki, birthdate, sex) {
        this.meishiki = meishiki; // Meishikiインスタンス
        this.birthdate = birthdate;
        this.sex = parseInt(sex); // 性別を数値として処理
        this.daiun = [];
    }

    // 節入り日から開始年齢を計算
    convertYearRatio() {
        // setsuiri: [年, 月, 日, 時, 分]
        const bd = this.birthdate;
        // 大運計算用：生年月日を0:00:00(UTC)に設定し、前節入り→誕生日の差のみ当日を含める(+1日)
        const bd_for_daiun = new Date(Date.UTC(bd.getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate(), 0, 0, 0, 0));
        let previous_setsuiri = null, next_setsuiri = null;
        
        // 生年月日より前の節入り日と後の節入り日を検索
        let same_day_setsuiri = null; // 同日の節入り日
        const bd_date_only_for_compare = new Date(Date.UTC(bd_for_daiun.getUTCFullYear(), bd_for_daiun.getUTCMonth(), bd_for_daiun.getUTCDate(), 0, 0, 0, 0));
        
        for (let i = 0; i < kanshiData.setsuiri.length; i++) {
            const s = kanshiData.setsuiri[i];
            const setsuiriDate = new Date(Date.UTC(s[0], s[1] - 1, s[2], s[3], s[4]));
            const setsuiriDateOnly = new Date(Date.UTC(s[0], s[1] - 1, s[2], 0, 0, 0, 0));
            
            // 同日の節入り日を検出（日付のみで比較）
            if (setsuiriDateOnly.getTime() === bd_date_only_for_compare.getTime()) {
                same_day_setsuiri = setsuiriDate;
            }
            
            // 生年月日より前の節入り日を探す（最も近いものを選択）
            if (setsuiriDate < bd_for_daiun) {
                if (!previous_setsuiri || setsuiriDate > previous_setsuiri) {
                    previous_setsuiri = setsuiriDate;
                }
            }
            
            // 生年月日より後の節入り日を探す（最初に見つかったものを選択）
            if (setsuiriDate > bd_for_daiun && !next_setsuiri) {
                next_setsuiri = setsuiriDate;
                break; // 最初に見つかったものを選択
            }
        }
        
        // 同日の節入り日がある場合、前後両方として扱う（日付差0）
        if (same_day_setsuiri) {
            previous_setsuiri = same_day_setsuiri;
            next_setsuiri = same_day_setsuiri;
        }
        
        
        // 最も近い前後の節入り日を確定
        if (previous_setsuiri && next_setsuiri) {
        }
        
        if (!previous_setsuiri || !next_setsuiri) {
            return [0, 10];
        }
        
        // 日数差の丸め方を暦日ベースに統一（いずれも0:00 UTCに切り揃え）
        const dayMs = 1000 * 60 * 60 * 24;
        const bd_date_only = new Date(Date.UTC(bd_for_daiun.getUTCFullYear(), bd_for_daiun.getUTCMonth(), bd_for_daiun.getUTCDate(), 0, 0, 0, 0));
        const prev_date_only = new Date(Date.UTC(previous_setsuiri.getUTCFullYear(), previous_setsuiri.getUTCMonth(), previous_setsuiri.getUTCDate(), 0, 0, 0, 0));
        const next_date_only = new Date(Date.UTC(next_setsuiri.getUTCFullYear(), next_setsuiri.getUTCMonth(), next_setsuiri.getUTCDate(), 0, 0, 0, 0));
        // 前節入り→誕生日: 日付差（節入日も日数としてカウントするため+1）
        const diff_previous = (bd_date_only.getTime() - prev_date_only.getTime()) / dayMs + 1;
        // 誕生日→次節入り: 日付差
        const diff_next = (next_date_only.getTime() - bd_date_only.getTime()) / dayMs;
        
        // 日数 ÷ 3 の切り上げが年運（最小1年、最大10年運に丸め）
        let p_year = Math.ceil(diff_previous / 3);
        let n_year = Math.ceil(diff_next / 3);
        if (p_year < 1) p_year = 1;  // 最小1年
        if (n_year < 1) n_year = 1;  // 最小1年
        if (p_year > 10) p_year = 10;
        if (n_year > 10) n_year = 10;

        
        console.log(`[節入り日計算] 生年月日(UTC 0:00固定): ${bd_date_only.toISOString().slice(0,10)} (日付差、当日0日・翌日1日)`);
        console.log(`[節入り日計算] 前節入り(UTC 0:00固定): ${prev_date_only.toISOString().slice(0,10)}`);
        console.log(`[節入り日計算] 次節入り(UTC 0:00固定): ${next_date_only.toISOString().slice(0,10)}`);
        console.log(`[節入り日計算] Δms(prev→bd): ${bd_date_only.getTime() - prev_date_only.getTime()} / dayMs=${dayMs}`);
        console.log(`[節入り日計算] Δms(bd→next): ${next_date_only.getTime() - bd_date_only.getTime()} / dayMs=${dayMs}`);
        console.log(`[節入り日計算] 生まれた日から前節入りまでの日数: ${diff_previous}日 → ceil(/3)=${Math.ceil(diff_previous / 3)} → p_year=${p_year}`);
        console.log(`[節入り日計算] 生まれた日から次節入りまでの日数: ${diff_next}日 → ceil(/3)=${Math.ceil(diff_next / 3)} → n_year=${n_year}`);
        
        return [p_year, n_year];
    }

    // 順運・逆運判定
    isJununGyakuun(y_kan) {
        // 男性: 陽干→順行、陰干→逆行／女性: 陽干→逆行、陰干→順行
        const isYang = (y_kan % 2) === 0; // 陽干（偶数）かどうか
        
        if (this.sex === 1) { // 男性
            return isYang ? 1 : 0; // 陽干→順行、陰干→逆行
        } else { // 女性
            return isYang ? 0 : 1; // 陽干→逆行、陰干→順行
        }
    }

    // 六十干支インデックス取得
    findKanshiIdx(kan, shi) {
        for (let i = 0; i < kanshiData.sixty_kanshi.length; i++) {
            const sk = kanshiData.sixty_kanshi[i];
            if (sk[0] === kan && sk[1] === shi) return i;
        }
        console.error('干支インデックスが見つかりません:', kan, shi);
        console.error('天干:', kanshiData.kan[kan], '地支:', kanshiData.shi[shi]);
        return -1;
    }

    // 大運リスト生成
    appendDaiun() {
        console.log('=== 大運計算開始 ===');
        const yearRatio = this.convertYearRatio();
        const y_kan = this.meishiki.meishiki.tenkan[2]; // 年柱天干
        const m_kan = this.meishiki.meishiki.tenkan[1]; // 月柱天干
        const m_shi = this.meishiki.meishiki.chishi[1]; // 月柱地支
        const d_kan = this.meishiki.meishiki.tenkan[0]; // 日柱天干
        const d_shi = this.meishiki.meishiki.chishi[0]; // 日柱地支
        
        console.log(`[大運] 基本情報:`);
        console.log(`  年柱天干: ${kanshiData.kan[y_kan]} (インデックス: ${y_kan})`);
        console.log(`  月柱干支: ${kanshiData.kan[m_kan]}${kanshiData.shi[m_shi]} (天干: ${m_kan}, 地支: ${m_shi})`);
        console.log(`  日柱干支: ${kanshiData.kan[d_kan]}${kanshiData.shi[d_shi]} (天干: ${d_kan}, 地支: ${d_shi})`);
        console.log(`  性別: ${this.sex === 1 ? '男性' : '女性'}`);
        
        this.isGyakko = this.isJununGyakuun(y_kan) === 0; // 逆行ならtrue
        console.log(`[大運] 方向判定: ${this.isGyakko ? '逆行' : '順行'}`);
        
        // 順行：次の節入り日までの年数、逆行：前の節入り日からの年数
        let firstEndAge = this.isGyakko ? yearRatio[0] : yearRatio[1];
        console.log(`[大運] 大運年齢計算:`);
        console.log(`  前節入りからの年数: ${yearRatio[0]}年`);
        console.log(`  次節入りまでの年数: ${yearRatio[1]}年`);
        console.log(`  方向: ${this.isGyakko ? '逆行' : '順行'}`);
        console.log(`  使用する年数: ${this.isGyakko ? yearRatio[0] : yearRatio[1]}年 → firstEndAge = ${firstEndAge}`);
        this.startAge = firstEndAge;
        
        let p;
        if (!this.isGyakko) {
            p = 1;
        } else {
            p = -1;
        }
        
        let idx = this.findKanshiIdx(m_kan, m_shi);
        
        if (idx === -1) {
            console.error('月柱干支インデックスが見つからないため、大運計算を中止します');
            return;
        }
        
        // 1つ目の大運（firstEndAge に応じて可変）
        // 10年運: 0～9 歳
        // 3歳運: 0～2 歳
        // 2歳運: 0～1 歳
        // 4～9歳運: 0～(firstEndAge-1) 歳
        let currentIdx = idx;
        let ageStart = 0;
        let ageEnd;
        if (firstEndAge >= 10) {
            ageEnd = 9;
        } else if (firstEndAge === 3) {
            ageEnd = 2;  // 3歳運: 0～2歳
        } else if (firstEndAge <= 1) {
            // 1年運は 0歳のみ（0～0）
            ageEnd = 0;
        } else {
            ageEnd = firstEndAge - 1;
        }
        console.log(`[大運] 1つ目の大運年齢: ${ageStart}歳～${ageEnd}歳`);
        
        // 月柱の干支から順行・逆行で次の干支を計算
        const beforeIdx = currentIdx;
        // 月柱の干支から始める（次の干支ではなく）
        console.log(`[大運] 計算: ${beforeIdx} → ${currentIdx} (月柱の干支から開始)`);
        
        const kanshi1 = kanshiData.sixty_kanshi[currentIdx];
        const tsuhen1 = this.meishiki.findTsuhen(d_kan, kanshi1[0]);
        const t_fortune1 = this.meishiki.findTwelveFortune(d_kan, kanshi1[1]);
        
        console.log(`[大運] 1つ目の大運干支: ${kanshiData.kan[kanshi1[0]]}${kanshiData.shi[kanshi1[1]]} (インデックス: ${currentIdx})`);
        console.log(`[大運] 通変星: ${tsuhen1 !== -1 ? kanshiData.tsuhen[tsuhen1] : 'なし'}`);
        console.log(`[大運] 十二運: ${t_fortune1 !== -1 ? kanshiData.twelve_fortune[t_fortune1] : 'なし'}`);
        
        this.daiun.push({
            ageStart: ageStart,
            ageEnd: ageEnd,
            kan: kanshi1[0],
            shi: kanshi1[1],
            tsuhen: tsuhen1,
            t_fortune: t_fortune1,
            kanshiIndex: currentIdx
        });
        
        // 2つ目以降の大運
        for (let i = 0; i < 12; i++) {
            if (i === 0) {
                // 2つ目の大運は firstEndAge から開始
                // 1年以下だった場合は 1 歳からに補正
                ageStart = (firstEndAge <= 1) ? 1 : firstEndAge;
                ageEnd = ageStart + 9;
            } else {
                // 3つ目以降は前の大運の終了年齢+1から開始
                ageStart = ageEnd + 1;
                ageEnd = ageStart + 9;
            }
            
            // 次の大運計算用にインデックスを進める
            currentIdx += p;
            if (currentIdx >= 60) currentIdx = 0;
            if (currentIdx < 0) currentIdx = 59;
            
            const kanshi = kanshiData.sixty_kanshi[currentIdx];
            const tsuhen = this.meishiki.findTsuhen(d_kan, kanshi[0]);
            const t_fortune = this.meishiki.findTwelveFortune(d_kan, kanshi[1]);
            
            // 2つ目と3つ目の大運のログを表示
            if (i < 2) {
                console.log(`[大運] ${i + 2}つ目の大運干支: ${kanshiData.kan[kanshi[0]]}${kanshiData.shi[kanshi[1]]} (インデックス: ${currentIdx})`);
                console.log(`[大運] ${i + 2}つ目の大運年齢: ${ageStart}歳～${ageEnd}歳`);
            }
            
            this.daiun.push({
                ageStart: ageStart,
                ageEnd: ageEnd,
                kan: kanshi[0],
                shi: kanshi[1],
                tsuhen,
                t_fortune,
                kanshiIndex: currentIdx
            });
        }
    }
}

function drawKanshiTriangle(meishiki) {
    const canvas = document.getElementById('triangleCanvas');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // スマホの縦型表示時のキャンバスサイズ調整
    if (window.innerWidth <= 600 && window.innerHeight > window.innerWidth) {
        const containerWidth = Math.min(window.innerWidth - 32, 600); // 画面幅から32px引く、最大600px
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerWidth + 'px'; // 正方形を保つ
    } else {
        // 通常表示時は元のサイズ
        canvas.style.width = '600px';
        canvas.style.height = '600px';
    }

    // 三角形コンテナを表示（画像読み込み前に表示）
    const triangleContainer = document.getElementById('triangleContainer');
    if (triangleContainer) {
        triangleContainer.style.display = 'block';
    }

    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 画像をキャンバスサイズに収まるようにスケーリング（アスペクト比保持）
        const maxSize = Math.min(canvas.width, canvas.height);
        const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
        const drawWidth = img.naturalWidth * scale;
        const drawHeight = img.naturalHeight * scale;
        const imageX = (canvas.width - drawWidth) / 2;
        const imageY = (canvas.height - drawHeight) / 2;
        
        ctx.drawImage(img, imageX, imageY, drawWidth, drawHeight);
        // 背景画像の北半球干支ラベルを、南半球表から描画し直す。
        // 番号・エリア配置は参考表の番号体系を維持する。
        ctx.save();
        ctx.translate(imageX + drawWidth / 2, imageY + drawHeight / 2);
        ctx.scale(drawWidth / 600, drawHeight / 600);
        ctx.beginPath();
        ctx.arc(0, 0, 156, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 24;
        ctx.stroke();
        ctx.font = '8px "Yu Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#54236d';
        kanshiData.sixty_kanshi.forEach(([kan, shi], index) => {
            ctx.save();
            ctx.rotate((index * 6 + 3) * Math.PI / 180);
            ctx.fillText(kanshiData.kan[kan], 0, -161);
            ctx.fillText(kanshiData.shi[shi], 0, -152);
            ctx.restore();
        });
        ctx.restore();
        
        drawTriangleContent();
    };
    img.onerror = function() {
        console.error('画像の読み込みに失敗しました');
        // 画像が読み込めなくても三角形コンテナは表示する
        drawTriangleContent();
    };
    img.src = '60eto3.png';
    
    if (img.complete) {
        img.onload();
    }

    function drawTriangleContent() {
        const centerX = 300; // 600/2
        const centerY = 300; // 600/2
        const radius = 145;  // 150から5ピクセル短縮
        

        // 3. 干支番号を取得
        const dayKanshi = [meishiki.meishiki.tenkan[0], meishiki.meishiki.chishi[0]];
        const monthKanshi = [meishiki.meishiki.tenkan[1], meishiki.meishiki.chishi[1]];
        const yearKanshi = [meishiki.meishiki.tenkan[2], meishiki.meishiki.chishi[2]];

        const dayNum = getKanshiNumber(dayKanshi[0], dayKanshi[1]);
        const monthNum = getKanshiNumber(monthKanshi[0], monthKanshi[1]);
        const yearNum = getKanshiNumber(yearKanshi[0], yearKanshi[1]);

        const points = [dayNum, monthNum, yearNum];
        const pointColors = ['#00A3A5', '#E6007E', '#F6B400'];
        const pointCoords = [];
        const vertexCircleRadius = 5; // 頂点の円をさらに小さく

        // 4. 三角形の頂点の座標を計算
        points.forEach((point, index) => {
            if (point && point >= 1 && point <= 60) {
                const angleRad = ((point * 6 - 3) - 90) * Math.PI / 180;
                const vertexPositionRadius = radius;
                const x = centerX + vertexPositionRadius * Math.cos(angleRad);
                const y = centerY + vertexPositionRadius * Math.sin(angleRad);
                pointCoords.push({ x, y });
            } else {
                pointCoords.push(null);
            }
        });

        // 5. 三角形の辺を描画
        ctx.strokeStyle = '#243673';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const validPoints = pointCoords.filter(p => p !== null);
        if (validPoints.length > 1) {
            ctx.moveTo(validPoints[0].x, validPoints[0].y);
            for (let i = 1; i < validPoints.length; i++) {
                ctx.lineTo(validPoints[i].x, validPoints[i].y);
            }
            if (validPoints.length === 3) {
                ctx.closePath();
            }
        }
        ctx.stroke();

        // 6. 三角形の頂点の円を描画
        points.forEach((point, index) => {
            if (point && point >= 1 && point <= 60) {
                const coord = pointCoords[index];
                if (coord) {
                    ctx.strokeStyle = '#243673';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(coord.x, coord.y, vertexCircleRadius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            }
        });

        // 7. 各頂点の近くに番号（1〜60）を描画
        ctx.save();
        ctx.fillStyle = '#243673';
        ctx.font = 'bold 16px "Meiryo", "Hiragino Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelOffset = 16; // 頂点からのオフセット（内側へ）
        points.forEach((point) => {
            if (point && point >= 1 && point <= 60) {
                const angleRad = ((point * 6 - 3) - 90) * Math.PI / 180;
                const labelRadius = radius - labelOffset; // 外側ではなく内側（中心方向）に配置
                const lx = centerX + labelRadius * Math.cos(angleRad);
                const ly = centerY + labelRadius * Math.sin(angleRad);
                ctx.fillText(String(point), lx, ly);
            }
        });
        ctx.restore();

        // 8. 行動キーワードコンテナも表示（存在する場合のみ）
        const actionKeywordsContainer = document.getElementById('actionKeywordsContainer');
        if (actionKeywordsContainer) {
            actionKeywordsContainer.style.display = 'block';
        }
    }
}
