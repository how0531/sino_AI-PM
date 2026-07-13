# AIPM 建置計畫 — Copilot Studio 工程師審查報告

**審查日期:** 2026-07-13　**方式:** 資深 Power Platform 架構師視角,逐項對照 Microsoft Learn 官方文件(2026 年 3~7 月版)。無法查證處標「未驗證」。

## (a) 會踩雷的地方與修正

1. **計畫第四步寫的是 connected agent 流程,實作用的是 child agent** — 要改。child agent 活在主 agent 內部,不需獨立發佈、不需允許連接,發佈主 agent 一起帶上。第四步簡化為:Agents → Add → New child agent,分流靠 description。
   [Add a child agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-agent-child-agent)
2. **「工具描述寫 PM 確認後才可呼叫」擋不住誤呼叫** — 要改。描述是機率性引導。正解:工具開啟「Ask the end user before running」(確定性關卡),Adaptive Card 留作結構化編輯層,雙層把關。
   [Add tools to custom agents](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent)
3. **Claude 模型在亞洲區是 cross-geo** — 全案最大合規風險。資料可能在組織地理邊界外處理;Anthropic 是 Microsoft subprocessor。需過三關:PPAC「Move data across regions」、PPAC 外部模型開關、M365 admin center 允許 Anthropic,並送資安/法遵留紀錄。不過就換回 GPT 系模型。(Claude Sonnet 4.5 已 Retired,4.6 是對的)
   [Select a primary AI model](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-select-agent-model)
4. **Flow 裡的 AI 潤稿吃 AI Builder credits,不是 Copilot Credits** — 兩個授權池分開盤點,用罄該步驟直接失敗。
   [Billing rates](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
5. **逾期提醒缺去重機制會天天轟炸** — Planner 無「已提醒」欄位。用 category 標籤(V3 支援 25 色)或 SharePoint List 記錄提醒狀態,Filter 時排除。(實作建議,無官方指引)
6. **Post adaptive card and wait 逐則核可會序列阻塞** — PM 不按第一張,後面全卡住。改「彙總一張卡多選核可」或平行分支+timeout。(逾時上限細節未驗證,實作時測)
7. **Planner 連接器節流 100 次/60 秒** — 避免逐筆 Get task details 迴圈,能用 List tasks 一次拿就一次拿。
   [Planner connector](https://learn.microsoft.com/en-us/connectors/planner/)

## (b) 確認可行(維持原計畫)

8. 排程主體放 Power Automate(比 agent 自主觸發便宜且確定;agent action 5 credits/次)✅
9. KPI 的 Gap 用運算式不經 LLM ✅(符合官方 multi-agent 指引精神)
10. Power BI 官方免費 Gantt visual 嵌 Teams 頁籤 ✅(觀看者通常需 Power BI Pro 或 Premium 容量;agent 只丟連結,不自己生圖)
11. 工具掛在 child agent 層而非主 agent 層 ✅(主 agent 可選動作總數 30-40 個是路由品質分水嶺)

## (c) 上線前必須處理(計畫沒提到)

12. **Power Platform DLP 政策**:確認 Planner/SharePoint/Teams/Excel Online 連接器同組可用,金控環境常有既有 DLP 直接擋掉。
13. **誰能用這個 agent**:發佈到 Teams 要設分享對象(安全群組)+ Entra 驗證;Teams admin center 要核准自訂 app。
14. **每月用量上限**:PPAC 可對單一 agent 設每月 credits 上限;125% 超額 agent 會被停用,要有人收通知。
15. **Purview 稽核**:預設開啟;上線前實際查一次事件有沒有進來。
16. **上線前評測**:Agent evaluations 已 GA,建 20-30 條繁中測試集(含「不該開單」負面案例)跑過再發佈。
17. **Entra Agent ID(preview)**:為每個 agent 建 Entra 身分套 Conditional Access,治理上值得排入評估,不急著上。
18. **Code interpreter 是 preview**:與 Claude 主模型相容性未驗證,別當上線關鍵路徑。

## 特別問題結論

- **Q1 child vs connected**:此場景 child agent 正確。child 可各自掛工具/知識(僅該子 Agent 可用)、有獨立工具限額;但**不能被獨立排程觸發**(排程掛主 agent 的 event trigger)。
- **Q2 排程 Flow 與時程子 Agent 怎麼接**:兩軌分工不硬接。Flow=每日確定性催辦引擎;子 Agent=對話式即席查詢(掛唯讀 List tasks)。接點是同一個 Planner plan,不是 Flow 呼叫 agent。
- **Q3 確認關卡**:工具層「Ask the end user before running」(基線防呆)+ Adaptive Card(結構化編輯),兩者都用。
- **Q4 Claude 注意事項**:cross-geo 合規(見第 3 點);管理員關外部模型會自動 fallback 到內部模型;繁中/工具參數抽取品質無官方文件,用評測集實測。
- **Q5 Planner connection 身分**:agent 內開單用 end user credentials(任務建立者=PM 本人、稽核乾淨、離職不斷鏈);排程 Flow 用服務帳號+co-owner。坑:connection 標 Not shareable;連線帳號須為 plan 所屬 M365 群組成員;2026 wave1 起管理員可政策封鎖 maker-provided credentials。

## 接下來 3 個最該做的動作

1. **先過 Claude cross-geo 合規關**(管理員三開關+送法遵)——不過就換模型,越早知道越好。
2. **寫入把關改雙層**(工具開「執行前先問」+卡片編輯層)。
3. **建繁中評測集再發佈**,同步在 PPAC 設每月 credit 上限。

---

## 實戰補充(2026-07-13 實際建置時踩到)

- **ToolIdentifierConflict『---Agent』**:child agent 名稱若為「中文+Agent」,識別碼正規化會剝除中文字,多個子 Agent 識別碼相同 → 對話直接報錯不回覆。**解法:名稱含唯一英文**,如「會議記錄 Agent (Meeting)」「時程 Agent (Schedule)」「數據 Agent (Data)」。
- **child agent 編輯表單的「儲存」按鈕在無變更時是停用的**,自動化/快速操作時點了沒反應也不報錯,存檔後務必重載頁面驗證。
- **主題名稱與顯示名稱是同一個屬性**,無法「中文顯示+英文識別」分開設定。
