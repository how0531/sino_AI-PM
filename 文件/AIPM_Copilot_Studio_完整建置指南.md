# 智能專案經理 AIPM — Copilot Studio 完整建置指南

> **2026/07/13 已實際建置**:主 Agent + 四大子 Agent 已在 SinoPac (default) 環境上線並發佈。
> - 主 Agent:智能專案經理 AIPM(bot id `a6cea5f2-8d7e-f111-ab0f-70a8a503d6ba`,模型 Claude Sonnet 4.6)
> - 子 Agent:會議記錄 Agent (Meeting)/時程 Agent (Schedule)/KPI Agent/數據 Agent (Data)——**名稱必須含唯一英文**,否則 ToolIdentifierConflict(詳見審查報告)
> - 會議記錄 Agent 已掛 Planner「建立工作 V3」工具:Group=數媒經營部團隊(`0719a187-d638-4689-9e40-2b968d56ad92`)、Plan=AIPM 測試專案(`TBx46QA8mUupJHZtpb8RaskAEfNe`)、執行前先詢問=是、終端使用者認證;**輸入欄已補 Start Date Time / Due Date Time / Assigned User Ids(可填 email)**,開的單會帶日期與負責人,供時程/KPI 追蹤
> - 數據 Agent 知識庫已上傳電子市佔真實數據(2025/01~2026/06 月報+2026 YTD),Web 搜尋已關
> - **時程 Agent** 已掛 Planner「列出工作」(Group/Plan 綁真實 GUID,唯讀)＋「更新工作 V2」(Task Id/Due Date/Percent Complete,執行前先詢問=是);Teams「張貼訊息」改為 **Post as=Flow bot + Post in=Chat with Flow bot + Recipient=email**(用 email 私訊特定人,不需對話 ID)。Outlook 寄信同備。
> - **KPI Agent** 已掛 Planner「列出工作」(綁真實 GUID,唯讀);實測可自動讀 Planner 任務算完成率/逾期率/成員負載,標(參考),不需人工貼資料
> - 端對端已驗證:①科會會議記錄→待辦→雙層確認→Planner 真實開單 ②Teams 私訊 how.kuo@sinopac.com 已送達 ③KPI 自動讀 Planner 算 KPI(截圖見 成品/)
>
> - **五個 Agent 的指示已全面改寫**:每個子 Agent 開頭都有「【我需要你提供】」清楚列出所需輸入(會議記錄要 email+期限、時程/催辦要收件人 email、數據要指標+對象+期間);主 Agent 加了「能力選單」——使用者問「你會做什麼」或需求不清時,列出四大功能與各自要輸入什麼(實測可正常觸發)。
> - **名字自動查 email 指派(實測成功)**:會議記錄 Agent 加了 Office 365 使用者「搜尋使用者 (V2)」工具。主 Agent 指示改為「遇到名字指派任務時,不反問 email,直接分流給會議記錄 Agent 用搜尋使用者查通訊錄」。實測「指派 王瑀軒 7/16 16:00 提交報告」→ 自動查到 shaun.wang@sinopac.com(部門/職稱都對)+ 自動帶今天為開始日 → 直接到確認關卡,全程不問 email。(截圖:成品/截圖_名字自動查email指派.png)
>
> **踩坑補充(給後續維護)**:
> - 主 Agent 指示在「概觀頁」的行內編輯器有毛病:點編輯常開成空框,若直接存會**清空**現有指示。改動前先確認框內有載入內容,或重寫完整版;存後務必重載頁面驗證。
> - Planner「列出工作/建立工作」的 Group Id、Plan Id **必須從下拉選方案名(解析成 GUID)**,直接打字會 HTTP 404 找不到項目。
> - Teams「張貼訊息」預設是「群組聊天」模式會要一串對話 ID(GUID);要私訊特定人改用「Chat with Flow bot」+ 收件人 **@sinopac.com** email(gmail 收不到,Teams 限租戶內)。
> - 官方 Planner「列出工作」在工具搜尋的扁平結果被藏起來,要用「連接器」篩選 → 點「Planner 連接器」卡 → 才看得到完整動作清單。
> - Planner 任務要能被逾期掃描/甘特圖用,建單時要帶「開始日+到期日」。

> 依據競賽提案 `outputs/智能專案經理AIPM_競賽提案.pptx` 的專案架構整併。
> 一份文件，從零把「主 Agent＋四大子 Agent」建到可在 Copilot Studio 實際運作。
> 技術宣稱皆對照 [Copilot_Studio_能力查證報告.md](Copilot_Studio_能力查證報告.md)（引 Microsoft Learn 官方文件）。
> 統一以 **Planner** 為共用資料層（舊 Jira 版實作指南已封存於 `過程/封存/`）。

---

## 零、專案架構總覽（來自簡報）

```
成員/PM（Teams 入口）
   → AIPM 主 Agent（生成式編排・意圖分流）
   ├─ 會議記錄 Agent ─寫入待辦─┐
   ├─ 時程 Agent ───────────────┤→ 共用資料層：Planner（任務）＋ SharePoint（文件/KPI 目標）
   ├─ KPI Agent ────────────────┤        ↑
   └─ 數據 Agent ────────────────┘   Phase 2：on-prem gateway → CUBE／神策
（所有「寫入／外送」動作一律 PM 確認；全程 Purview 稽核）
```

**四大 Agent（＋主 Agent）分工**

| Agent | 輸入 | 處理 | 輸出 | 階段 |
|---|---|---|---|---|
| 主 Agent | PM 的自然語言 | 判斷意圖、分流 | 交給對應子 Agent | Phase 1 |
| 會議記錄 | 逐字稿檔／Teams 記錄 | 抽結論＋待辦（負責人/期限/待確認） | 待辦清單 → PM 確認 → Planner 開單 | Phase 1 ✅ |
| 時程 | Planner 任務、時程 | 排程掃逾期／到期 | 催辦草稿（PM 核可後發 Teams/Outlook）＋ Power BI 甘特圖 | Phase 1 ✅ |
| KPI（執行層） | Planner 任務狀態 | 純程式算完成率／逾期率／負載 | 缺口警示與建議 | Phase 1 ✅ |
| 數據 | CUBE／神策 | 白名單查詢，LLM 只填參數 | 繁中摘要＋表格 | Phase 2 ⚠️ |
| KPI（業務層） | SharePoint Excel 目標＋數據管線 | 算 Gap | 缺口 vs 目標 | Phase 2 ⚠️ |

**核心設計原則（會被評審問，先記住）**
1. **Agent 之間不互聊**，透過共用資料層（Planner／SharePoint）接力，每步交接都留痕。
2. **人在迴路**：自主流程只做「偵測與提案」，「執行（開單／發送）」永遠過 PM 確認。
3. **兩軌身分**：互動查詢用「使用者身分」驗證；排程任務用「服務帳號」唯讀白名單。

---

## 壹、前置準備（做一次）

### 1. 需要的授權與角色
- **Microsoft 365 Copilot** 授權（PM 於 Teams 內互動即涵蓋此情境、零費率）。
- **Copilot Studio** 使用權；Phase 2 的 gateway／自訂連接器屬 Premium，需 Copilot Studio standalone 訂閱。
- **Power Automate** 標準連接器（Planner/Teams/Outlook 皆 Standard，Phase 1 不需 Premium）。
- 你要有建立 Agent 與 Flow 的權限；管理員需允許 Teams 的 **Workflows App**（催辦私訊要用）。

### 2. 建共用資料層（先建好，Agent 才有東西接力）
1. **Planner**：為專案建一個 **basic plan**（⚠️ 不要用 Premium／Timeline 方案，Power Automate 的 Planner 連接器只支援 basic，用 Premium 排程會掃不到任務）。記下 `Plan ID` 與 `Group ID`。
2. **SharePoint**：建一個文件庫放專案文件（知識庫用）＋一個 Excel 放 KPI 目標值。

### 3. 建主 Agent 外殼與安全開關
1. 進 [Copilot Studio](https://copilotstudio.microsoft.com) → **Create → New agent** → 命名「智能專案經理 AIPM」。
2. **Settings → Generative AI**：把**編排（Orchestration）設為「生成式（Generative）」**（多 Agent 分流的前提）。
3. **Settings → Security → Authentication**：選 **Authenticate with Microsoft Entra ID**（Azure AD SSO）。填 App Registration 的 `Client ID`／`Tenant ID`；Scopes 設 `User.Read`、`Chat.ReadWrite`。
4. **關掉不需要的對外能力**（資安話術要用）：
   - 關 **General knowledge**（避免補進會議未提及的內容）。
   - 不啟用 **Bing 搜尋** 與第三方外掛（避免資料流出 Microsoft Cloud 信任邊界）。
5. **開 File uploads**（會議記錄要傳逐字稿檔，預設是關的）：Settings → 進 agent 的檔案上傳設定開啟；建議一併**開 code interpreter**，逐字稿文字解析才無 30,000 字元上限（一場 2 小時會議約 3–5 萬字元）。

> Instructions 現成內容見 `outputs/AIPM_Copilot_Instructions.txt`，主 Agent 的 Instructions 可直接沿用其「角色／安全與邊界」段。

---

## 貳、主 Agent 指令（Instructions）

貼到主 Agent 的 **Instructions** 欄位：

```text
你是永豐金證券數位經營部專案經理（PM）的 AI 助手「智能專案經理 AIPM」。
一律使用繁體中文。只根據使用者提供的內容或系統回傳的資料輸出，不編造未提及的資訊。

你負責判斷 PM 的需求並分流給對應的子 Agent：
- 提到會議、逐字稿、結論、待辦、派單 → 交給「會議記錄 Agent」
- 提到進度、逾期、催辦、時程、甘特圖 → 交給「時程 Agent」
- 提到完成率、達成率、缺口、KPI、成員負載 → 交給「KPI Agent」
- 提到查數據、CUBE、神策、留存、市佔、GMV → 交給「數據 Agent」

安全鐵則（不可違反）：
- 任何「寫入」（開單）或「外送」（發 Teams／Outlook）動作前，一律先把內容列給 PM，等 PM 明確確認才執行。
- 不憑空指派負責人、不編造期限；資訊不足時標「需 PM 確認」。
- 不輸出專案／任務／查詢結果以外的內容。
```

---

## 參、會議記錄 Agent（Phase 1）

**目標**：PM 上傳逐字稿 → 抽結論＋待辦 → 確認 → 寫進 Planner。

### 步驟 C-1：建 Topic（貼 YAML）
主 Agent → **Topics → Add a topic → From blank** → 右上切 **Code view**，貼：

```yaml
kind: AdaptiveDialog
beginDialog:
  - kind: OnUtterance
    id: OnUtterance_MeetingProcess
    actions:
      - kind: SendActivity
        id: send_welcome
        activity: 您好，我是會議記錄特助。請直接上傳會議逐字稿檔（DOCX／PDF／TXT，單檔 15MB 內），或貼上內容。

      - kind: Question
        id: question_transcript
        alwaysPrompt: true
        variable: Topic.TranscriptText
        prompt: 請提供逐字稿內容或上傳檔案：
        entity: StringPrebuiltEntity

      - kind: SendActivity
        id: send_processing
        activity: 正在分析逐字稿，抽取會議結論與待辦事項（Action Items）...

      - kind: InvokeFlow
        id: invoke_extract
        flowId: "AIPM_MeetingExtract_Flow"
        input:
          transcript: =Topic.TranscriptText
        output:
          Summary: Topic.MeetingSummary
          ActionItemsJson: Topic.ActionItemsJson   # 陣列：title/assignee/dueDate/needConfirm

      - kind: SendActivity
        id: send_summary
        activity: |
          ### 會議結論
          {Topic.MeetingSummary}

          ### 待辦清單
          {Topic.ActionItemsJson}

      - kind: Question
        id: confirm_dispatch
        variable: Topic.ConfirmDispatch
        prompt: 是否要把「負責人與期限都明確」的項目寫入 Planner？（是／否）
        entity: BooleanPrebuiltEntity

      - kind: ConditionGroup
        id: cond_dispatch
        conditions:
          - id: yes_branch
            condition: =Topic.ConfirmDispatch = true
            actions:
              - kind: InvokeFlow
                id: invoke_planner_create
                flowId: "AIPM_PlannerCreate_Flow"
                input:
                  itemsJson: =Topic.ActionItemsJson
                output:
                  CreatedList: Topic.CreatedTasks
              - kind: SendActivity
                activity: 已建立 Planner 任務：{Topic.CreatedTasks}
          - id: no_branch
            condition: =Topic.ConfirmDispatch = false
            actions:
              - kind: SendActivity
                activity: 好的，已記錄結論，暫不開單。
```

### 步驟 C-2：建 Flow「AIPM_MeetingExtract_Flow」（抽待辦）
1. 觸發：**Power Apps / Copilot Studio (V2)**，輸入 `transcript`（文字）。
2. **Create text with GPT**（AI Builder）或 **Azure OpenAI**，提示詞：
   ```text
   你是會議記錄分析助理。從以下逐字稿抽出「已拍板結論」與「待辦事項」。
   逐字稿：@{triggerBody()?['transcript']}
   僅輸出 JSON：
   {
     "summary": "條列式結論文字",
     "items": [
       {"title":"待辦","assignee":"負責人或未指派","dueDate":"YYYY-MM-DD 或 未定","needConfirm": true}
     ]
   }
   規則：負責人或期限不明確時 needConfirm=true。不得編造。
   ```
3. **Return value(s) to Power Virtual Agents**：回 `Summary`（=GPT 的 summary）、`ActionItemsJson`（=GPT 的 items）。

### 步驟 C-3：建 Flow「AIPM_PlannerCreate_Flow」（開單）
1. 觸發：**Copilot Studio (V2)**，輸入 `itemsJson`。
2. **Parse JSON**（用步驟 C-2 的陣列 schema）。
3. **Apply to each** item → 只對 `needConfirm = false` 的項目：**Planner → Create a task (V3)**，帶 `Plan ID`、Title=`title`、Due=`dueDate`；Assignee 用 **Office 365 Users → Search for users** 依 `assignee` 查到 user id 後帶入。
4. **Return**：`CreatedList`＝新任務標題清單。

> ⚠️ 用 **Create a task V3 / List tasks V3 / Update task V2**（舊版連接器已淘汰）。節流上限 100 次／60 秒。

---

## 肆、時程 Agent（Phase 1）

**目標**：每日排程掃 Planner 逾期／到期任務 → 產催辦草稿 → PM 核可後發 Teams＋Outlook；甘特圖用 Power BI。

### 步驟 D-1：排程掃描 Flow「AIPM_OverdueScan_Flow」
1. 觸發：**Recurrence**（每日 09:00）。以**服務帳號（maker 憑證）**執行，只給 Planner 唯讀＋白名單權限（自主觸發沒有登入使用者，不能用使用者身分驗證）。
2. **Planner → List tasks (V3)**（帶 Plan ID）。
3. **Filter array**：`dueDateTime < utcNow()` 且 `percentComplete < 100`（List tasks 無伺服器端篩選，一定要在 Flow 內自己過濾）。逾期 2 天以上另標「升級催辦」。
4. **Apply to each**：用 GPT 生一則語氣委婉、對事不對人的催辦草稿（含任務名、原定期限、一句問是否遇阻礙需 PM 協調）。
5. **Post adaptive card and wait for a response**（發給 PM）：把所有草稿列出，每筆一個「發送／略過」按鈕（此動作會暫停 Flow 至 PM 回覆，上限 30 天）。
6. **條件**：PM 按「發送」才 → **Teams：Post message in a chat**（給負責人私訊，顯示為 Workflows 機器人）＋ **Office 365 Outlook：Send an email**。

> 當日到期可設「自動發溫馨提醒」；逾期升級催辦則一律先過 PM 卡關。這是「偵測自主、執行過人」的兩段設計。

### 步驟 D-2：甘特圖（避開授權陷阱）
- 任務存 **basic plan**（供上面的 Flow 掃描）。
- 甘特圖用 **Power BI 的官方免費 Gantt 視覺效果**（AppSource `powerbi-visuals-gantt`）接 Planner 資料，**嵌到 Teams 頁籤**。
- 時程 Agent 的角色是：回一句進度摘要＋丟這個 Power BI 頁籤連結（Agent 不自己畫甘特圖）。
- 檢視者需 Power BI Pro/PPU（或租戶 F64+／P 容量下 Free 即可），報表要另行共用。

### 步驟 D-3：時程 Topic
建一個 Topic，觸發語如「進度」「逾期」「催辦」「時程」，動作：呼叫上面掃描結果的摘要 Flow ＋回 Power BI 連結。（互動查詢用 PM 使用者身分；排程那條走服務帳號，兩者分開。）

---

## 伍、KPI Agent — 執行層（Phase 1）

**目標**：從 Planner 算專案執行 KPI（完成率／逾期率／成員負載），Gap 純程式算，LLM 只寫說明並標「參考」。

### 步驟 E-1：Flow「AIPM_ExecKPI_Flow」
1. 觸發：**Copilot Studio (V2)**。
2. **Planner → List tasks (V3)**。
3. **用運算式算**（不要交給 LLM 算數字）：
   - 完成率 = 完成數 / 總數
   - 逾期率 = （`dueDateTime < utcNow()` 且未完成）數 / 總數
   - 成員負載 = 依 `assignments` 分組計數
4. **Create text with GPT**：只根據上面算好的數字寫「缺口說明＋建議方向」，結尾標「（參考）」。
5. **Return**：`KpiSummary`、`KpiTableMarkdown`。

### 步驟 E-2：KPI Topic
觸發語「達成率」「完成率」「缺口」「KPI」「負載」→ 呼叫 `AIPM_ExecKPI_Flow` → 回摘要＋表格。

> KPI 業務層（留存／GMV／市佔 vs 目標）屬 Phase 2：目標值讀 SharePoint Excel、現況接數據 Agent 管線，同樣純程式算 Gap。

---

## 陸、數據 Agent（Phase 2 ⚠️ 需基建）

**卡點**：雲端 Copilot 打不到內網 CUBE／神策。本機已驗證的 MDX／神策 API 查詢邏輯**可直接移植**，剩下是把它包進 Power Platform。

### 前置（Phase 2 才做）
- 安裝 **on-premises data gateway**，讓 Flow 能連內網 DB。
- 把已驗證的查詢做成 **內部 REST API**，用 **自訂連接器（OpenAPI）** 包成 agent 的 tool（custom connector 屬 premium，需 Copilot Studio standalone 訂閱）。
- **防呆**：查詢範本白名單（約 15 種），LLM 只填參數、**不生 SQL**。

### 步驟 F-1：Topic（貼 YAML）

```yaml
kind: AdaptiveDialog
beginDialog:
  - kind: OnUtterance
    id: OnUtterance_DataQuery
    actions:
      - kind: SendActivity
        id: sendActivity_Welcome
        activity: 您好，我是數據特助。我可以幫您查詢 CUBE 資料庫與神策數據。

      - kind: Question
        id: question_QueryInput
        alwaysPrompt: true
        variable: Topic.UserQueryText
        prompt: 例如：「幫我查過去一週，新功能 A 在 iOS 端的次日留存率，並按日排列。」請問您這次想查詢什麼？
        entity: StringPrebuiltEntity

      - kind: SendActivity
        id: sendActivity_Processing
        activity: 收到您的需求：「{Topic.UserQueryText}」，正在分析語意並撈取數據...

      - kind: InvokeFlow
        id: invokeFlow_query_data
        flowId: "AIPM_QueryData_Flow"
        input:
          queryText: =Topic.UserQueryText
        output:
          QueryResultSummary: Topic.ResultSummary
          QueryResultTableMarkdown: Topic.ResultTable

      - kind: SendActivity
        id: sendActivity_ShowResult
        activity: |
          ### 數據分析結果摘要
          {Topic.ResultSummary}

          {Topic.ResultTable}
```

### 步驟 F-2：Flow「AIPM_QueryData_Flow」
1. 觸發：**Copilot Studio (V2)**，輸入 `queryText`。
2. **GPT**：把自然語言轉成**白名單範本的參數 JSON**（metric／target／platform／date_range），嚴格只輸出 JSON。
3. **HTTP（經 gateway）**：POST 到內部查詢 API，帶上一步參數。SQL 連接器屬 premium，`Execute a SQL query (V2)` 不支援 gateway，需改用 **stored procedure**；逾時 110 秒。
4. **Return**：`QueryResultSummary`（繁中摘要）＋ `QueryResultTableMarkdown`（Markdown 表格）。
5. 互動查詢用 **PM 使用者身分驗證**，DB 端依 PM 權限授權；全程 Purview 稽核。

---

## 柒、把四個子 Agent 掛到主 Agent（多 Agent 分流）

1. 上面每個子 Agent 若是獨立 agent：先各自 **Publish**，並在其設定開放「可被連接」。（connected agent 必須**同環境、已發佈**。）
2. 主 Agent → **Agents → Add → Connected agents**，把「會議記錄／時程／KPI／數據」四個加進來，各寫一句 description（主 Agent 靠這句話判斷何時委派）。
3. 巢狀只有一層：掛了子 agent 的主 agent 不能再被當別人的子 agent（本案是扁平一層分流，符合）。
4. 路由精準度：可選動作總數（tools＋topics＋agents）建議控制在 **30–40 個以內**，本案 4–5 個遠低於此。

> 也可用「Topics 分流」的輕量版：不拆成獨立 agent，全部做成主 agent 底下的 Topics（前述 YAML 就是這種）。要展示「多 Agent」給評審時用 Connected agents；要最省事上線用 Topics。二擇一即可。

---

## 捌、安全・稽核・成本（評審會問，先備好）

| 面向 | 做法 | 依據 |
|---|---|---|
| 資料邊界 | 資料存於 **Microsoft Cloud 信任邊界**、依租戶所選地理區；不用於訓練基礎模型、不與 OpenAI 共享。**不要說「不出公司」**。關 Bing／外掛避免流出。 | 查證報告 #15 |
| 人在迴路 | 開單／發送前一律 Adaptive Card／Question 卡關，PM 確認才執行。 | #6 |
| 兩軌身分 | 互動查詢＝使用者身分驗證（DB 依 PM 授權）；排程＝服務帳號唯讀白名單。兩者**互斥**，務必分開。 | #13、話術修正 #4 |
| 稽核 | 管理與互動事件**原生寫入 Purview（預設開、不可關）**；需完整對話逐字稿另加 DSPM for AI。 | #16 |
| 成本 | PM 互動由 M365 Copilot 涵蓋（零費率）；**排程／自主觸發吃 Copilot Credits**（agent action 5、生成式回答 2、agent flow 每 100 動作 13）。每日掃描＋週報約每月數百 credits，可對單一 agent 設每月上限。 | #17、#19 |

---

## 玖、發佈與測試

1. **Publish**（右上）主 Agent 與各子 Agent。
2. 在 **Test** 面板逐一驗：
   - 上傳一段逐字稿 → 出結論＋待辦 → 確認 → Planner 真的建了任務。
   - 手動跑一次 `AIPM_OverdueScan_Flow` → 收到 Adaptive Card → 按發送 → Teams/Outlook 真的收到。
   - 問「本專案完成率多少」→ KPI Agent 回數字＋（參考）建議。
3. 部署通道：**Teams**（PM 日常入口，且 file upload／user auth 支援此通道）。

### 第 7 頁佐證截圖清單（競賽用）
1. 主 Agent 的 Instructions 設定畫面（貼上第貳段內容後）。
2. Generative orchestration 開啟 ＋ Connected agents 掛了四個子 Agent 的畫面。
3. 會議記錄：Planner「Create a task V3」Action 設定 ＋ 開單前的確認關卡。
4. 時程：Recurrence 掃描 Flow ＋「Post adaptive card and wait」催辦卡。
5. Test 面板：貼逐字稿 → 成功輸出待辦、成功開單的結果。

---

## 落地順序（照這個排）

| 週 | 上線 | 產出 |
|---|---|---|
| 第 1 週 | 會議記錄（有 POC）＋知識庫（SharePoint RAG，近零開發） | 立刻能 demo |
| 第 2 週 | 時程 Agent（排程＋催辦＋Power BI 甘特） | 閉環成形 |
| 第 3 週 | KPI 執行層＋週報 Agent | 管理價值浮現 |
| 並行 | 申請 gateway、移植查數邏輯 | Phase 2 前置 |
| 基建到位 | 數據 Agent ＋ KPI 業務層 | 完全體 |
```
