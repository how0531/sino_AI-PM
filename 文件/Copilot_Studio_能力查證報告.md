# AIPM 多 Agent 專案經理提案 — 可行性查證報告

**查證日期：** 2026-07-10　**查證範圍：** Copilot Studio / Power Automate / Planner / Power BI / Purview 共 16 項能力宣稱　**依據：** Microsoft Learn 官方文件（優先）與官方部落格/定價頁

---

## 1. 總結論

本提案的技術架構**整體成立，無致命缺陷**。核心骨幹——主 Agent 意圖分流（multi-agent orchestration）、自主/排程觸發、檔案上傳分析、Planner 開單/掃描、Adaptive Card 人在迴路確認、Teams/Outlook 通知、on-premises data gateway 查內網資料庫、SharePoint RAG 知識庫、Purview 原生稽核——**全數為 GA 功能，可照原案執行**。但有三類事項必須處理：**（一）說法要改**：資安頁「數據不出企業邊界」與官方措辭不符（正確為「Microsoft Cloud 信任邊界」），且「租戶內 LLM」易被誤解，需改寫；「貼上逐字稿」不應宣稱無上限，應改為檔案上傳路徑。**（二）硬前提**：Phase 1 時程模組若採用 Planner **Premium**（Timeline/甘特圖需 Planner Plan 1 授權），Power Automate 的 Planner 連接器**只支援 basic plans**，排程掃描將掃不到 Premium 任務——這是全案最大的架構矛盾點，需在提案中明確二選一（basic plan + Power BI Gantt，或 Premium plan + Graph API）；Phase 2 的 gateway 與自訂連接器屬 **Premium 連接器**，需 Copilot Studio standalone 訂閱（或 agent flows 路徑）；tools 強制使用者身分驗證與「排程自主觸發」互斥，需分開設計。**（三）成本要講對**：計費單位已改名 Copilot Credits；M365 Copilot 授權的「免費」僅限 B2E、以已驗證使用者身分執行的情境，**排程/自主觸發一律吃 credits**，週報與逾期掃描不在免費範圍內。

---

## 2. 逐項查證表

| # | 宣稱 | 判定 | GA/Preview | 關鍵注意事項 | 出處 |
|---|------|------|-----------|-------------|------|
| 1 | 主 Agent 意圖分流給子 Agent（multi-agent orchestration） | ✅ 可行 | **GA**（child agents、同環境 connected agents、A2A）；接 Foundry/Fabric/M365 SDK agents 仍 Preview | 須開啟生成式編排；connected agent 須同環境、已發佈、開放被連接；僅一層巢狀（掛了子 agent 的主 agent 不能再被當子 agent）；無官方硬性數量上限，但 tools+topics+agents 總數 >30–40 個路由精準度下降 | [authoring-add-other-agents](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-add-other-agents)、[multi-agent-patterns](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/multi-agent-patterns) |
| 2 | 自主 agent / 排程・事件觸發 | ✅ 可行 | **GA**（2025-03-24） | 僅限生成式編排 agent；觸發器種類受 Power Automate DLP 政策控制；觸發只能用 maker 本人認證；**每次觸發即計費**（agent action = 5 credits），不在 M365 Copilot 免費範圍 | [authoring-triggers-about](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-triggers-about)、[release plan](https://learn.microsoft.com/en-us/power-platform/release-plan/2024wave2/microsoft-copilot-studio/create-automated-copilots-triggered-events) |
| 3 | 對話中直接貼上長逐字稿 | ⚠️ 有條件 | 官方未公布單一字元上限 | 上限由通道決定：Direct Line 256K 字元（建議 <150K）、Omnichannel/Teams 約 28KB；網傳 10,240 字元是消費者版 Copilot 的限制、非 Copilot Studio；**長逐字稿建議走檔案上傳**（見 #4） | [requirements-quotas](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-quotas)、[Direct Line 3.0](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-api-reference?view=azure-bot-service-4.0) |
| 4 | 使用者上傳檔案給 agent 分析 | ✅ 可行 | **GA**（XLSX/PPTX 仍 experimental） | 需手動開啟 File uploads（預設關）；單檔 15MB；未開 code interpreter 時文字解析上限 **30,000 字元**（開啟後無上限）；支援 DOCX/PDF/TXT/CSV；SharePoint 通道不能上傳 | [image-input-analysis](https://learn.microsoft.com/en-us/microsoft-copilot-studio/image-input-analysis) |
| 5 | Planner 連接器 Create / List / Update task | ✅ 可行 | **GA**（Standard 連接器） | 現行版本為 CreateTask_V3 / ListTasks_V3 / UpdateTask_V2（舊版已淘汰）；**僅支援 basic plans，不支援 Premium 方案**；節流 100 次/60 秒 | [connectors/planner](https://learn.microsoft.com/en-us/connectors/planner/) |
| 6 | Adaptive Card 確認關卡（人在迴路） | ✅ 可行 | **GA**（兩條路徑皆原生） | Copilot Studio「Ask with Adaptive Card」節點原生等待 Submit；Power Automate「Post adaptive card and wait for a response」會暫停 flow 至回覆（上限 30 天）；訊息約 28KB；Teams 管理中心需允許 Workflows App；網傳「該動作已淘汰」與官方連接器文件不符 | [authoring-ask-with-adaptive-card](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card)、[connectors/teams](https://learn.microsoft.com/en-us/connectors/teams/) |
| 7 | Recurrence 排程掃描 Planner 逾期任務 | ✅ 可行 | **GA** | 標準授權即可（無需 Premium）；**只掃得到 basic plans**；List tasks 無伺服器端篩選，需在 flow 內用 Filter array 以 `dueDateTime < utcNow()` 自行過濾 | [run-scheduled-tasks](https://learn.microsoft.com/en-us/power-automate/run-scheduled-tasks)、[connectors/planner](https://learn.microsoft.com/en-us/connectors/planner/) |
| 8 | Flow 發 Teams 私訊 + Outlook 郵件（Standard 連接器） | ✅ 可行 | **GA** | 皆為 Standard；1:1 私訊任意使用者僅 Flow bot 可（顯示為 Workflows 機器人）；Post as User 只能發到本人已加入的對話；需 Teams 管理中心允許 Workflows App；訊息約 28KB、不支援私人頻道 | [send-a-message-in-teams](https://learn.microsoft.com/en-us/power-automate/teams/send-a-message-in-teams)、[connectors/office365](https://learn.microsoft.com/en-us/connectors/office365/) |
| 9 | Planner Timeline（甘特圖）需 Premium 授權 | ✅ 屬實 | **GA** | 需 Planner Plan 1（約 US$10/人/月）以上，且**方案本身**須為 Premium 方案；基本版只有 Grid/Board/Schedule/Charts；⚠️ 與 #5/#7 衝突：連接器不支援 Premium plans | [advanced-capabilities-with-premium-plans](https://support.microsoft.com/en-us/planner/teams/advanced-capabilities-with-premium-plans-in-planner) |
| 10 | Power BI Gantt 嵌入 Teams 頁籤 | ⚠️ 有條件 | **GA** | Gantt 非內建視覺效果，需加 AppSource 的 Microsoft 官方免費 Gantt 視覺效果；檢視者需 Power BI Pro/PPU（或 F64+/P 容量下 Free 即可）；嵌入不自動授權，需另行共用報表 | [service-embed-report-microsoft-teams](https://learn.microsoft.com/en-us/power-bi/collaborate-share/office-integration/service-embed-report-microsoft-teams)、[powerbi-visuals-gantt](https://github.com/microsoft/powerbi-visuals-gantt) |
| 11 | on-prem data gateway 查內網 SQL | ✅ 可行 | **GA** | SQL 連接器屬 **Premium** 等級（Power Automate 需 Premium 方案、Copilot Studio 需 standalone 訂閱）；request 2MB/response 8MB；「Execute a SQL query (V2)」不支援 gateway（改用 stored procedure）；110 秒逾時；VNet 環境與 gateway 互斥 | [gateway-reference](https://learn.microsoft.com/en-us/power-automate/gateway-reference)、[connectors/sql](https://learn.microsoft.com/en-us/connectors/sql/) |
| 12 | 自訂連接器包內部 REST API 作為 agent tools | ✅ 可行 | **GA**（直接上傳 OpenAPI 的「REST API tools」路徑仍 Preview） | custom connector 屬 premium 能力；OpenAPI v2 為準（v3 自動轉譯）；內網 API 搭配 gateway；名稱已由 actions/plugins 改稱 **tools** | [custom-connectors overview](https://learn.microsoft.com/en-us/connectors/custom-connectors/)、[advanced-connectors](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-connectors) |
| 13 | tools 以終端使用者身分驗證（PM 身分列級權限） | ✅ 可行 | **GA**（且為預設值） | 權限由資料來源端依使用者身分執行（DB 需有對應權限模型）；**強制使用者憑證後，排程/自主觸發會失敗**（無即時登入者）；user auth 僅支援 Teams/自訂網站/SharePoint/Omnichannel 通道；Teams 需設 Entra ID SSO；無縫免登入需另設 OBO | [configure-enduser-authentication](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-enduser-authentication) |
| 14 | SharePoint 知識來源 RAG + 引用出處 + 權限修剪 | ✅ 可行 | **GA** | 官方確認 security trimming（僅回覆使用者有權限的內容）與引用出處；生成式編排模式每 agent 最多 25 個站台 URL；租戶無任何 M365 Copilot 授權時單檔僅 7MB；租戶啟用 Restricted SharePoint Search 會封鎖此功能 | [knowledge-add-sharepoint](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-add-sharepoint) |
| 15 | 「租戶內 LLM／數據不出企業邊界」 | ⚠️ 有條件 | **GA**（但**說法需修正**） | 官方措辭是「Microsoft **Cloud 信任邊界**」而非企業/租戶邊界；prompts/responses 不用於訓練基礎模型（除非租戶 opt-in）、不與 OpenAI 共享；資料留在所選 Azure 地理區（有災備等例外）；非美國區可能需管理員勾選「Move data across regions」 | [faqs-copilot-data-security-privacy](https://learn.microsoft.com/en-us/power-platform/faqs-copilot-data-security-privacy)、[data-location](https://learn.microsoft.com/en-us/microsoft-copilot-studio/data-location) |
| 16 | 稽核 Log 原生寫入 Purview（免自建 Flow 落 log） | ✅ 可行 | **GA**（CopilotInteraction 事件 2025-01-10 GA） | 管理/製作活動預設啟用且不可停用；Audit 事件僅含 thread ID **不含對話全文**（全文需 DSPM for AI）；保留期依 Purview 授權（Standard 180 天，更長需 E5/附加） | [admin-logging-copilot-studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-logging-copilot-studio)、[audit-copilot](https://learn.microsoft.com/en-us/purview/audit-copilot) |
| 17 | 計費：Copilot Credits 費率與購買方式 | ✅ 屬實 | **GA** | 2025-09-01 起 messages 改名 Copilot Credits（費率不變）：生成式回答 2、agent action（含觸發）5、tenant graph grounding 10、agent flow 每 100 動作 13；預付包 25,000 credits/US$200/月 或 Azure PAYG 約 US$0.01/credit；預付用到 125% 時 agent 停用；**舊制 25 credits/自主動作已過時** | [requirements-messages-management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)、[Azure 定價頁](https://azure.microsoft.com/en-us/pricing/details/copilot-studio/) |
| 18 | agent flows 免 Power Automate 授權、可用 premium 連接器 | ⚠️ 有條件 | **GA** | 僅限「agent flows」（Copilot Studio 內建立或由 cloud flow 單向轉換）；一般 cloud flow 仍走 Power Automate 授權；agent flows 不能共用/複製；**gateway 支援未在 agent flows 文件明列，導入前需實測**；2026 文件已改稱 Workflows | [flows-faqs](https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-faqs) |
| 19 | 有 M365 Copilot 授權即免額外費用 | ⚠️ 有條件 | **GA** | 零費率僅限 **B2E + 以已驗證 M365 Copilot 使用者身分執行 + M365/Teams/SharePoint 通道**；**排程/自主觸發、CUA 一律計費**；無 M365 Copilot 授權者（Copilot Chat）使用會碰租戶資料的 agent 需啟用計量計費 | [billing-licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/billing-licensing)、[cost-considerations](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/cost-considerations) |

---

## 3. 簡報話術修正建議

| # | 原提案說法（風險） | 問題 | 建議修正句 |
|---|------------------|------|-----------|
| 1 | 「內部數據不出企業邊界」「租戶內 LLM」 | 官方措辭是 **Microsoft Cloud trust boundary**，非企業/租戶邊界；LLM 是 Microsoft 託管的 Azure OpenAI，不在客戶租戶內；Bing 功能與第三方外掛屬明列例外 | 「客戶資料（含 prompts 與回應）**儲存於 Microsoft Cloud 信任邊界內、依租戶所選地理區存放，不用於訓練基礎模型，Microsoft 亦不與 OpenAI 共享資料**；本方案不啟用 Bing 搜尋與第三方外掛，避免資料流出該邊界。」 |
| 2 | 「PM 把逐字稿貼進對話即可」 | 通道有 28KB～256K 字元不等的訊息上限，長會議逐字稿可能超限 | 「逐字稿以**檔案上傳**（DOCX/TXT/PDF，單檔 15MB）方式提供；agent 啟用 code interpreter 後**無文字解析字元上限**。」（若不開 code interpreter，需註明 30,000 字元上限） |
| 3 | 「用 Planner 甘特圖呈現時程」+「Flow 排程掃描 Planner 逾期任務」並列 | **架構矛盾**：Timeline 需 Premium 方案，但 Planner 連接器只支援 basic plans，Flow 掃不到 Premium 任務 | 二選一明講：「任務資料存於 **basic plan** 供 Flow 自動化掃描，**甘特圖以 Power BI Gantt 視覺效果（Microsoft 官方免費）嵌入 Teams 頁籤**呈現」；或「採 Planner Premium（每 PM 加購 Plan 1 授權），逾期掃描改走 **Graph API（HTTP premium 連接器）**」。 |
| 4 | 「PM 身分列級權限」一體適用 | tools 的使用者身分驗證與**排程/自主觸發互斥**（自主執行時無登入使用者，只能用 maker 憑證） | 「**互動查詢**（KPI/數據查詢）以終端使用者身分驗證，資料庫端依 PM 身分授權；**排程任務**（逾期掃描、週報）以受控服務帳號憑證執行，僅授予唯讀白名單資料表權限，並以 Purview 稽核留痕。」 |
| 5 | 「公司已有 M365 Copilot，本方案零成本」（若有此暗示） | 免費僅限 B2E 已驗證使用者互動情境；排程/自主觸發一律消耗 Copilot Credits | 「PM 於 Teams 內**互動使用**由既有 M365 Copilot 授權涵蓋（零費率）；**排程掃描與週報屬自主觸發，按 Copilot Credits 計費**——以每日 1 次掃描估算約每月 150 credits（agent action 5 credits/次），成本可控且可設 agent 每月消耗上限。」 |
| 6 | 「稽核 Log 完整記錄對話」（若有此說法） | Purview Audit 事件只含 thread ID，不含對話全文 | 「管理與使用者互動事件**原生寫入 Microsoft Purview 稽核（預設啟用、不可關閉）**；如需完整對話逐字稿檢視，搭配 Purview **DSPM for AI**（需相應授權）。」 |
| 7 | 「多 Agent 協作」如提到接 Azure AI Foundry / Fabric agents | 該部分依現行 Learn 文件仍為 Preview | 「Phase 1–2 僅使用 **GA 的 Copilot Studio 原生 child/connected agents**；Foundry/Fabric agent 整合列為未來選項（目前 Preview）。」 |
| 8 | 使用「actions / plugins / messages 訊息包」等舊詞 | 官方已改名 | 一律改用 **tools（工具）** 與 **Copilot Credits**，展現對產品現況的掌握。 |

---

## 4. 答辯 Q&A 準備

**Q1：你們的多 Agent 架構是行銷話術還是真的 GA 功能？子 Agent 有數量上限嗎？**
> A：是 GA 功能。Copilot Studio 的 child agents 與同環境 connected agents（含 A2A 協定）均為正式版，主 agent 以生成式編排依意圖委派。官方未載明硬性數量上限，但官方指引建議可選動作總數（tools+topics+agents）控制在 30–40 個以內以維持路由精準度——本案 4–5 個子 Agent 遠低於此。要注意的結構限制是巢狀僅一層，我們的架構是扁平的一層分流，不受影響。

**Q2：資料安全——逐字稿和內網數據會不會被拿去訓練模型？會出台灣嗎？**
> A：官方 FAQ 明載 prompts 與回應**不用於訓練或改進 Microsoft 或第三方（含 OpenAI）模型**，除非租戶管理員主動 opt-in；資料儲存於 Microsoft Cloud 信任邊界內、依租戶所選 Azure 地理區存放。要誠實說明兩點：一是我們的措辭是「Microsoft Cloud 信任邊界」而非「不出公司」；二是若本地區 Azure OpenAI 容量不足，管理員可選擇是否勾選「Move data across regions」，未勾選則功能受限但資料不跨區——這是我們可以控制的治理開關。內網 CUBE 資料只在查詢當下經 gateway 加密通道取用，白名單限制查詢範圍。

**Q3：排程催辦說要「以 PM 身分」，但自主觸發不是只能用開發者憑證嗎？權限怎麼控？**
> A：正確，這正是我們分兩軌設計的原因。互動式查詢用 tools 的 User authentication（GA 且為預設），資料來源端依登入 PM 的身分授權；排程掃描則以受控 maker/服務帳號執行，只授予 Planner 唯讀與白名單資料表權限，且催辦動作前有 Adaptive Card 的 PM 核可關卡——自主流程只做「偵測與提案」，「執行」永遠過人。全程 Purview 稽核預設記錄、無法關閉。

**Q4：成本怎麼估？聽說有 M365 Copilot 就免費？**
> A：分兩塊。PM 在 Teams 內互動使用，屬 B2E 已驗證使用者情境，由 M365 Copilot 授權涵蓋、零費率。但排程/自主觸發不在豁免內，按 Copilot Credits 計費：每次觸發 5 credits、生成式回答 2 credits、agent flow 每 100 動作 13 credits。以每日掃描一次加每週週報估算，每月約數百 credits，用 Azure PAYG（約 US$0.01/credit）即每月數美元等級；並可在 Power Platform 管理中心對單一 agent 設每月消耗上限，超支自動管控。另 Phase 2 的 gateway/自訂連接器屬 premium，需一席 Copilot Studio standalone 訂閱，這是主要固定成本。

**Q5：甘特圖到底用什麼做？Planner 不是要加購授權？**
> A：我們刻意避開這個授權陷阱。Planner Timeline 確實需要 Planner Plan 1（約 US$10/人/月）且方案要升級 Premium，但 Power Automate 的 Planner 連接器**只支援 basic plans**——若用 Premium，自動化掃描就失效。所以 Phase 1 採 basic plan 存任務、用 Microsoft 官方免費開源的 Power BI Gantt 視覺效果嵌入 Teams 頁籤呈現時程，自動化與視覺化兩者兼得，且不需每人加購 Planner 授權（Power BI 檢視授權依既有租戶容量而定）。若未來需要 Premium 的相依性排程功能，掃描改走 Graph API 即可，架構已預留。

**Q6：長逐字稿真的塞得進去？**
> A：不硬塞對話框。我們走檔案上傳路徑（GA）：DOCX/PDF/TXT 單檔 15MB，agent 啟用 code interpreter 後無文字解析字元上限；一般 2 小時會議逐字稿約 3–5 萬字元，完全在範圍內。此功能需在 agent 設定中開啟 File uploads，POC 已驗證。
