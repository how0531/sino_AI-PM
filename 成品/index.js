document.addEventListener('DOMContentLoaded', () => {
    // 1. 側邊欄分頁切換邏輯
    const navItems = document.querySelectorAll('.sidebar-nav li');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有 active 狀態
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // 設定當前 active 狀態
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 2. 數據 Agent 模擬邏輯
    const dataQuerySelect = document.getElementById('data-query-select');
    const dataQueryText = document.getElementById('data-query-text');
    const btnDataQuery = document.getElementById('btn-data-query');
    const dataFlowSteps = document.getElementById('data-flow-steps');
    const dataOutputResult = document.getElementById('data-output-result');

    // 預設查詢範例切換
    dataQuerySelect.addEventListener('change', (e) => {
        if (e.target.value === 'retention') {
            dataQueryText.value = '幫我查過去一週，新功能 A 在 iOS 端的次日留存率，並按日排列。';
        } else if (e.target.value === 'funnel') {
            dataQueryText.value = '分析這次電商節活動的購物車到結帳漏斗，哪一個步驟流失最嚴重？';
        }
    });

    btnDataQuery.addEventListener('click', () => {
        // 顯示流程動畫
        dataFlowSteps.style.display = 'flex';
        dataOutputResult.innerHTML = '<p class="placeholder-text">正在分析自然語言並呼叫內部資料庫 API...</p>';

        setTimeout(() => {
            const queryType = dataQuerySelect.value;
            let resultHtml = '';

            if (queryType === 'retention') {
                resultHtml = `
                    <div class="output-summary">
                        <strong>查詢摘要：新功能 A 過去一週 iOS 端次日留存率分析</strong>
                        <p>過去一週 iOS 端的次日留存率呈現穩定波動，均值約為 42.5%。其中 7 月 5 日出現峰值 46.2%，推測與當日推送的活躍用戶促銷推播有關。</p>
                    </div>
                    <table class="output-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>iOS 活躍用戶數</th>
                                <th>次日留存用戶數</th>
                                <th>次日留存率</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>2026-07-02</td><td>12,450</td><td>5,129</td><td>41.2%</td></tr>
                            <tr><td>2026-07-03</td><td>13,100</td><td>5,371</td><td>41.0%</td></tr>
                            <tr><td>2026-07-04</td><td>12,800</td><td>5,440</td><td>42.5%</td></tr>
                            <tr><td>2026-07-05</td><td>15,200</td><td>7,022</td><td>46.2%</td></tr>
                            <tr><td>2026-07-06</td><td>14,100</td><td>6,063</td><td>43.0%</td></tr>
                            <tr><td>2026-07-07</td><td>13,500</td><td>5,535</td><td>41.0%</td></tr>
                            <tr><td>2026-07-08</td><td>13,900</td><td>5,921</td><td>42.6%</td></tr>
                        </tbody>
                    </table>
                `;
            } else {
                resultHtml = `
                    <div class="output-summary">
                        <strong>查詢摘要：電商節購物車至結帳漏斗分析</strong>
                        <p>分析顯示，整體轉化率為 18.2%。流失最嚴重的斷點發生在「加入購物車」至「點擊結帳」階段，流失率高達 65.4%，建議針對此步驟優化載入速度或簡化折扣碼輸入流程。</p>
                    </div>
                    <table class="output-table">
                        <thead>
                            <tr>
                                <th>漏斗步驟</th>
                                <th>觸發人數</th>
                                <th>單步轉化率</th>
                                <th>流失率</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>1. 瀏覽商品</td><td>50,000</td><td>100%</td><td>0%</td></tr>
                            <tr><td>2. 加入購物車</td><td>22,000</td><td>44.0%</td><td>56.0%</td></tr>
                            <tr><td>3. 點擊結帳</td><td>7,612</td><td>34.6%</td><td>65.4% (流失最嚴重)</td></tr>
                            <tr><td>4. 完成支付</td><td>9,100</td><td>119.5% *</td><td>-</td></tr>
                        </tbody>
                    </table>
                    <p class="margin-top-md" style="font-size: 0.8rem; color: var(--text-muted);">* 註：完成支付包含先前暫存購物車之合併結帳筆數。</p>
                `;
            }
            dataOutputResult.innerHTML = resultHtml;
        }, 1200);
    });

    // 3. 時程管理 Agent 模擬邏輯
    const btnScanTimeline = document.getElementById('btn-scan-timeline');
    const scanListContainer = document.getElementById('scan-list-container');
    const timelineOutputResult = document.getElementById('timeline-output-result');

    btnScanTimeline.addEventListener('click', () => {
        scanListContainer.style.display = 'block';
        timelineOutputResult.innerHTML = '<p class="placeholder-text">看板掃描完成，請點擊清單中的按鈕檢視詳細催辦或衝突排除建議。</p>';
    });

    // 動態委派事件給智慧催辦
    scanListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-generate-teams')) {
            timelineOutputResult.innerHTML = `
                <div class="output-summary">
                    <strong>智慧催辦機制：已為您生成 Teams 委婉提醒訊息</strong>
                    <p>此訊息已複製至剪貼簿，並預備傳送至與王大明的私人對話中。</p>
                </div>
                <div class="teams-chat-preview">
                    <div class="teams-chat-header">
                        <span>Microsoft Teams 訊息預覽</span>
                        <span class="teams-user-badge">傳送給：王大明</span>
                    </div>
                    <div class="teams-chat-body">
                        嗨大明，系統注意到您負責的「API 欄位調整」任務原定今天下班前交付，目前進度有遇到任何技術阻礙需要 PM 協助調度資源嗎？謝謝！
                    </div>
                </div>
            `;
        } else if (e.target.classList.contains('btn-generate-warn')) {
            timelineOutputResult.innerHTML = `
                <div class="output-summary">
                    <strong>時程衝突預警與排除建議</strong>
                    <p>偵測到設計師 A 下週請假 3 天，可能直接導致「大戶投 UI 更新」無法如期於下週五交付。</p>
                </div>
                <div class="margin-top-md">
                    <h4 class="card-subtitle">PM 建議調度策略：</h4>
                    <ul class="security-list" style="margin-top: 0.5rem;">
                        <li>
                            <strong>方案一：延後交付時程</strong>
                            <p>將「大戶投 UI 更新」的預定交付時間順延 3 天至再下週三，並於 Jira 中同步更新時程看板。</p>
                        </li>
                        <li>
                            <strong>方案二：資源重新指派</strong>
                            <p>協調設計師 B 於下週二前協助完成剩餘的 UI 設計工作，以維持原定交付時程。</p>
                        </li>
                    </ul>
                </div>
            `;
        }
    });

    // 4. 提案 Agent 模擬邏輯
    const btnGeneratePrd = document.getElementById('btn-generate-prd');
    const prdOutputResult = document.getElementById('prd-output-result');

    btnGeneratePrd.addEventListener('click', () => {
        prdOutputResult.innerHTML = '<p class="placeholder-text">正在使用 Copilot Studio Public Website Web Search 搜尋市場報告並分析競品官網...</p>';

        setTimeout(() => {
            prdOutputResult.innerHTML = `
                <div class="output-summary">
                    <strong>智慧訂閱功能：競品分析矩陣</strong>
                    <p>外部搜尋發現，目前市場上僅有少數獨立理財軟體提供動態微調扣款日的定期定額訂閱功能，大型券商尚未普遍導入此項客製化機制。本功能具有高度市場差異化優勢。</p>
                </div>
                <table class="output-table">
                    <thead>
                        <tr>
                            <th>分析維度</th>
                            <th>本行規劃 (智慧定期定額訂閱)</th>
                            <th>競品 A (傳統定期定額)</th>
                            <th>競品 B (智慧投顧)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>扣款日調整</td>
                            <td class="font-highlight" style="padding: 0.3rem 0.6rem; border-radius: 4px; display: inline-block;">基於回測數據動態微調</td>
                            <td>固定日期扣款</td>
                            <td>系統決定扣款區間</td>
                        </tr>
                        <tr>
                            <td>手續費率</td>
                            <td>單筆均一價，訂閱制免手續費</td>
                            <td>按筆抽成百分比</td>
                            <td>收取管理費</td>
                        </tr>
                        <tr>
                            <td>市場成熟度</td>
                            <td>高差異化 (先行者)</td>
                            <td>高普及率</td>
                            <td>中普及率</td>
                        </tr>
                    </tbody>
                </table>

                <div class="margin-top-md">
                    <h4 class="card-subtitle">擴充 User Story 與驗收標準 (Acceptance Criteria)</h4>
                    <div style="background-color: rgba(15, 24, 39, 0.3); padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
                        <strong>User Story：</strong>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">身為大戶投 App 的長期投資用戶，我想在設定定期定額時選擇智慧扣款，以便於系統能根據歷史大數據分析，自動在扣款日前後 3 天內微調至歷史相對低點扣款，降低平均申購成本。</p>
                        
                        <strong>驗收標準 (Acceptance Criteria)：</strong>
                        <ul class="security-list" style="margin-top: 0.5rem; font-size: 0.85rem;">
                            <li>
                                <strong>申購設定：</strong>
                                <p>用戶在申購流程中，可以自由切換「固定扣款日」與「智慧動態扣款」模式。</p>
                            </li>
                            <li>
                                <strong>扣款演算法執行：</strong>
                                <p>系統必須在預定扣款日前 3 個營業日完成歷史低點演算，並於選定最佳扣款日的前 1 日透過 App 推播通知用戶。</p>
                            </li>
                        </ul>
                    </div>
                </div>
            `;
        }, 1500);
    });

    // 5. KPI 管理 Agent 模擬邏輯
    const btnKpiAnalysis = document.getElementById('btn-kpi-analysis');
    const kpiOutputResult = document.getElementById('kpi-output-result');

    btnKpiAnalysis.addEventListener('click', () => {
        kpiOutputResult.innerHTML = `
            <div class="output-summary">
                <strong>差距分析：本季大戶投 GMV 目標達成落差</strong>
                <p>本季度時間已過 60%，但 GMV 達成率僅 45% (450 萬 / 1000 萬)，目前存在 15% 的進度落差 (Gap)。若維持現有增長率，預計季末達成率將落在 75% 至 80% 之間，未能達標。</p>
            </div>
            <div class="margin-top-md">
                <h4 class="card-subtitle">AI 策略推薦方案</h4>
                <ul class="security-list" style="margin-top: 0.5rem;">
                    <li>
                        <strong>策略一：鎖定高價值客戶行銷</strong>
                        <p>根據 Cube 與神策歷史數據，建議針對本季「交易活躍度前 10%」的老客戶發送特定促銷券，以刺激客單價與交易頻率。</p>
                    </li>
                    <li>
                        <strong>策略二：限時申購手續費優惠</strong>
                        <p>針對已開戶但本季尚未申購定期定額的沉睡用戶，發送限時 3 天「智慧定期定額手續費 0 元」推播，藉此提升新增申購總額。</p>
                    </li>
                </ul>
            </div>
        `;
    });

    // 6. 會議記錄 Agent 模擬邏輯
    const btnProcessMeeting = document.getElementById('btn-process-meeting');
    const meetingOutputResult = document.getElementById('meeting-output-result');

    btnProcessMeeting.addEventListener('click', () => {
        meetingOutputResult.innerHTML = '<p class="placeholder-text">正在解析會議逐字稿片段，提取結構化 Action Items...</p>';

        setTimeout(() => {
            meetingOutputResult.innerHTML = `
                <div class="output-summary">
                    <strong>會議結構化摘要與待辦清單 (Action Items)</strong>
                    <p>已為您完成逐字稿重點解析，本次會議共產出 2 筆核心待辦事項。</p>
                </div>
                <div class="margin-top-md">
                    <ul class="security-list" style="margin-top: 0.5rem; font-size: 0.85rem;">
                        <li>
                            <strong>待辦事項 1：調整大戶投 UI 設計稿</strong>
                            <p>指派負責人：小明 | 預定交付時間：2026-07-15</p>
                        </li>
                        <li>
                            <strong>待辦事項 2：調整後端 API 欄位</strong>
                            <p>指派負責人：大明 | 預定交付時間：2026-07-20 (待設計稿交付後執行)</p>
                        </li>
                    </ul>
                    <div class="margin-top-md">
                        <p>是否需要將上述待辦事項一鍵派單至 Jira / Planner 系統？</p>
                        <button id="btn-jira-dispatch" class="btn btn-primary margin-top-md">一鍵開單指派</button>
                    </div>
                </div>
            `;

            // 為新產生的按鈕綁定一鍵開單事件
            document.getElementById('btn-jira-dispatch').addEventListener('click', () => {
                const btnDispatch = document.getElementById('btn-jira-dispatch');
                btnDispatch.disabled = true;
                btnDispatch.textContent = '正在開立任務單...';

                setTimeout(() => {
                    btnDispatch.style.display = 'none';
                    const jiraContainer = document.createElement('div');
                    jiraContainer.innerHTML = `
                        <div class="output-summary" style="margin-top: 1rem; border-left-color: #51cf66;">
                            <strong>Jira 系統派單成功！工作閉環已建立。</strong>
                        </div>
                        <div class="jira-card">
                            <span class="jira-badge">JIRA-1042</span>
                            <div class="jira-title">大戶投 UI 設計調整與優化</div>
                            <div class="jira-details">
                                <div class="jira-detail-item">指派給：<span>小明</span></div>
                                <div class="jira-detail-item">到期日：<span>2026-07-15</span></div>
                                <div class="jira-detail-item">狀態：<span>To Do</span></div>
                                <div class="jira-detail-item">優先級：<span>Medium</span></div>
                            </div>
                        </div>
                        <div class="jira-card" style="margin-top: 0.5rem;">
                            <span class="jira-badge">JIRA-1043</span>
                            <div class="jira-title">大戶投智慧訂閱功能 API 欄位調整</div>
                            <div class="jira-details">
                                <div class="jira-detail-item">指派給：<span>大明</span></div>
                                <div class="jira-detail-item">到期日：<span>2026-07-20</span></div>
                                <div class="jira-detail-item">狀態：<span>To Do</span></div>
                                <div class="jira-detail-item">優先級：<span>Medium</span></div>
                            </div>
                        </div>
                    `;
                    meetingOutputResult.appendChild(jiraContainer);
                }, 1000);
            });
        }, 1200);
    });
});
