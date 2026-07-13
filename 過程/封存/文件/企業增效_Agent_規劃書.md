# 全方位企業增效 Agent 規劃書

## 壹、 專案願景與目標

在數位金融與證券業務快速變遷的環境下，專案經理（PM）與團隊每天面臨繁雜的數據分析、時程追蹤、提案撰寫、KPI 管理與會議記錄等行政工作。本專案規劃導入「AI PM 專案經理特助」，透過五大核心 Agent，深度整合企業內部的數據庫與協作工具。本規劃書旨在利用 Microsoft Copilot Studio 與 Power Automate 建立高效率、高安全性的 AI 輔助系統，全面釋放團隊生產力，達成企業增效的目標。

---

## 貳、 技術架構與資料整合

本專案的核心驅動力來自於知識庫（Knowledge）與動作（Actions，即 Power Automate Flow 與 API Plugins）的深度整合。為了說服工程與資安評審，本架構在資料串接與資訊安全上，採取了嚴格的標準與控管機制。

### 一、 資料串接架構

五大 Agent 透過 Power Automate 的 HTTP 動作或自訂連接器（Custom Connector），以非同步或即時查詢方式與企業內部系統進行安全對接：

1. **數據與 KPI 串接 (Cube & 神策數據)**：
   * 透過 Power Automate 自訂連接器，直接呼叫 Cube 資料庫的內部 API（或透過 Dataverse 轉接）。
   * 對接神策數據（Sensors Data）的查詢 API，以獲取使用者行為與功能留存率數據。
2. **專案時程管理系統 (Planner / Jira)**：
   * 整合 Microsoft Planner API 與 Jira Cloud/On-Premise REST API，實現任務狀態的雙向同步。
3. **會議溝通管道 (Teams)**：
   * 串接 Microsoft Graph API，存取 Teams Meeting Transcript 逐字稿，或提供暫存上傳音檔與逐字稿文字的安全管道。

### 二、 資訊安全與權限控管

金融機構對於資料隱私與合規性有極高要求，本平台採取下列資安防護策略：

1. **身分驗證與單一登入 (SSO)**：
   * 整合企業 Active Directory（Azure AD），所有使用者必須透過單一登入進行驗證。Agent 的存取權限將與使用者的 Windows 帳號權限完全連動，落實權限最小化原則。
2. **資料傳輸與儲存加密**：
   * 所有 API 呼叫均採用 HTTPS 傳輸協定，並使用 TLS 1.3 加密通道。
   * Cube 與神策數據的查詢參數與敏感欄位，在傳輸前進行動態去識別化處理（例如將身分證字號、卡號或姓名進行遮罩）。
3. **資料防洩漏 (DLP) 策略**：
   * 在 Power Automate 中設定資料防洩漏策略，禁止將內部 Cube 資料庫或神策數據的輸出，串接至非授權的外部第三方 API。
   * 暫存於 Dataverse 的會議逐字稿設定定期清理機制，保障敏感對話不外洩。

---

## 參、 五大 Agent 功能細部規劃

### 一、 數據 Agent (Data Insights Agent)

#### 1. 核心 Skill 與技術對接
* 串接 Cube 資料庫 API。
* 串接神策數據（Sensors Data）查詢 API。

#### 2. 核心功能
* **自然語言轉 SQL/API 查詢**：PM 無須具備 SQL 撰寫能力或熟悉神策數據的複雜後台操作。例如，PM 可直接輸入：「幫我查過去一週，新功能 A 在 iOS 端的次日留存率，並按日排列。」Agent 會將此需求轉化為對應的查詢條件。
* **漏斗分析摘要**：自動分析特定業務流程（例如電商節活動的「購物車到結帳」漏斗），找出流失率最高的斷點並生成分析摘要。

#### 3. Copilot Studio 實作路徑
1. 建立一個 Power Automate Flow，接收 PM 的自然語言輸入。
2. 將輸入傳遞給具備 Text-to-SQL 或 Text-to-API 能力的 LLM 動作，轉換為結構化的 API 查詢參數。
3. 呼叫神策/Cube 的查詢 API，取得 JSON 格式的數據。
4. 將 JSON 數據交由 Copilot 轉化為繁體中文摘要與結構化的 Markdown 表格。

---

### 二、 專案時程管理 Agent (Timeline & Resource Agent)

#### 1. 核心對接系統
* Microsoft Planner API、Jira REST API。
* Microsoft Teams Connector。

#### 2. 核心功能
* **進度主動查核**：每日下班前自動掃描 Jira 或 Planner 的工作看板，撈取狀態為未完成且期限將至的任務。
* **智慧催辦**：當發現某位工程師的 Task 已過期或卡住時，Agent 自動生成一則語氣委婉、目的明確的 Teams 私訊。
  * *催辦範本*：「嗨 [工程師名字]，系統注意到『API 欄位調整』原定今天下班前交付，目前有遇到任何技術阻礙需要 PM 協助調度資源嗎？」
* **時程衝突預警**：比對行事曆與專案看板，主動預警潛在的資源衝突。
  * *預警範本*：「下週設計師 A 請假 3 天，可能影響專案 B 的進度，建議將時程順延或調整優先級。」

---

### 三、 提案 Agent (Product Innovation Agent)

#### 1. 核心對接系統
* Copilot Studio Public Website Web Search。
* 內部知識庫（累積的歷史 PRD 與提案範本）。

#### 2. 核心功能
* **競品與市場分析**：PM 輸入點子後（例如：我們想做智慧訂閱功能），Agent 透過 Public Website Web Search 功能，自動搜尋外部公開市場報告與競爭對手官網，生成包含功能對比、優劣勢分析的競品分析矩陣。
* **PRD/User Story 擴充**：PM 輸入一句簡短的創意，Agent 自動將其擴充為標準的 User Story（身為...我想...以便...）與對應的 Acceptance Criteria（驗收標準）。

---

### 四、 KPI 管理與儀表板 Agent (KPI & Gap Analysis Agent)

#### 1. 核心對接系統
* SharePoint Online (Excel / Microsoft Lists)。
* Cube 與神策數據 API。

#### 2. 核心功能
* **目標與現況對比 (Gap Analysis)**：自動讀取設定在 SharePoint 或 Excel 中的季度 KPI（例如：本季營收目標 1000 萬、活躍用戶增加 20%），並即時撈取神策/Cube 的目前累計數據，計算目標達成率。
* **警示與策略推薦**：當進度落後時，主動提示並根據歷史營銷數據庫推薦補救方案。
  * *推薦範本*：「目前時間已過 60%，但 GMV 目標達成率僅 45%，存在 15% 的落差。根據歷史數據，建議針對活躍度前 10% 的老客戶發送促銷券以刺激客單價。」

---

### 五、 會議記錄 Agent (Meeting Minutes Agent)

#### 1. 核心對接系統
* Teams Meeting Transcript API。
* Jira / DevOps REST API。

#### 2. 核心功能
* **會議摘要與 Action Items 提取**：開完會後，直接將 Teams 逐字稿或會議記錄文字貼給 Agent，自動生成結構化的「會議結論」與「待辦清單」。
* **自動派單（做事閉環）**：識別出「待辦清單：小明要在 7/15 前完成 UI 設計」後，Agent 主動向 PM 確認：「是否需要將此任務寫入系統？」PM 確認後，Agent 自動調用 Jira API 開立任務單並指派給小明，完成工作閉環。

---

## 肆、 預期效益與評估指標

本專案實施後，預期可為企業帶來顯著的增效成果：

1. **工時釋放**：預期減少 PM 在日常數據撈取、進度催辦與會議記錄撰寫上約 40% 的行政工時。
2. **決策加速**：市場分析與 KPI 落差警示由天級縮短至分鐘級，提升市場反應速度。
3. **任務執行力提升**：透過自動派單與智慧催辦，預期專案任務逾期率可降低 25%。
