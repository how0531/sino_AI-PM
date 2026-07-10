# AIPM 多 Agent 架構規劃（2026/07/10 更新版）

> 專案目標：AIPM＝一個「AI 專案經理」多 Agent 團隊。
> 本文件取代單一 agent 聚焦版，作為競賽簡報改版與後續建置依據。

## 前提（重要）

本機的 CUBE／神策查數 skill 是 Claude 端的，Copilot Studio 呼叫不到。
但其中的 MDX 查詢與神策 API 呼叫邏輯**已驗證、可直接移植**進 Power Automate／內部 API。
對外話術：「查詢邏輯已完成驗證，剩下的是把它包進 Power Platform」。

## 四大核心 Agent

### 1. 數據 Agent（⚠️ 有條件，Phase 2）
- 卡點：雲端 Copilot 打不到內網 DB
- 解法：on-premises data gateway＋把已驗證查詢包成內部 API／自訂連接器
- 防呆：查詢範本白名單（約 15 種），LLM 只填參數不生 SQL
- 產出：繁中摘要＋表格，全程稽核 Log

### 2. 時程 Agent（✅ Phase 1）
- 進度追蹤：Planner 連接器＋每日排程（Flow recurrence／autonomous trigger）掃逾期與今日到期
- 提醒策略：到期日當天**自動發**溫馨提醒（Teams＋Outlook）；**逾期 2 天升級**催辦，先給 PM 確認再發
- 甘特圖（2026/07/10 查證定案）：任務一律存 **basic plan**——Power Automate 的 Planner 連接器僅支援 basic，
  用 Premium 會讓排程掃描失效（Timeline 檢視需 Planner Plan 1 授權，是授權陷阱）。
  甘特圖採 **Power BI Gantt**（Microsoft 官方免費視覺效果）嵌 Teams 頁籤，Agent 負責丟連結＋口頭摘要。
  若未來需要 Premium 相依性排程，掃描改走 Graph API（HTTP premium 連接器），架構已預留

### 3. 會議記錄 Agent（✅ Phase 1，已有 POC）
- 逐字稿 → 結論＋待辦（負責人／期限／需確認標記）→ PM 確認 → Planner 開單
- **與其他 agent 的整合方式：共用資料層，不是 agent 互聊。**
  待辦寫進 Planner → 時程 agent 自動接手追蹤 → KPI agent 從同一份數據算達成率。
  Planner（＋需要時 Dataverse）＝整個 AIPM 的共同記憶。

### 4. KPI Agent（拆兩層）
| 層 | 數據來源 | 階段 |
|---|---|---|
| 專案執行 KPI：節點完成率、逾期率、成員負載 | Planner | ✅ Phase 1 |
| 業務 KPI：留存、GMV、市佔 vs 目標 | SharePoint Excel（目標）＋數據 Agent 管線（現況） | ⚠️ Phase 2 |

Gap 數字純程式算（Flow 運算式），LLM 只寫說明＋建議方向並標「參考」。

## 追加建議 Agent（Copilot Studio 原生強項）

1. **專案知識庫 Agent**（✅ 最該加，接近零開發）：專案文件放 SharePoint，用 Knowledge（RAG），
   成員問「上次為什麼決定砍 A 功能」直接得到附出處的答案。
2. **週報 Agent**（✅ 高亮點低成本）：每週五排程彙整 Planner 進度＋本週會議結論 → 週報草稿 → PM 確認後發送。
3. （選配）風險議題 Agent：Dataverse 風險登記表＋到期複審提醒。

## 整體架構

```
成員/PM（Teams 入口）
   → AIPM 主 Agent（意圖分流，connected agents）
   ├─ 會議記錄 Agent ──┐
   ├─ 時程 Agent ──────┤→ 共同資料層：Planner（任務）＋ SharePoint（文件/KPI目標）
   ├─ KPI Agent ───────┤        ↑
   ├─ 知識庫 Agent ────┘        │ Phase 2: on-prem gateway
   └─ 數據 Agent → 查詢白名單 → CUBE／神策
（寫入/外送動作一律 PM 確認；全程稽核 Log）
```

### 跨 Agent 協作閉環（經共用資料層接力，非 agent 互聊）

```
會議記錄 ─寫入待辦→ Planner ─讀取任務→ 時程 Agent（追蹤/催辦）
                      └─讀取執行數據→ KPI Agent（達成率/缺口）
數據 Agent ─（P2 業務數據管線）→ KPI Agent
KPI 缺口警示 → PM 帶入下次會議 → 產生新待辦（管理閉環）
```

對外一句話：**Agent 之間不直接對話，透過共用資料層接力**——迴避 agent-to-agent
通訊的複雜度與稽核難題，每一步交接都有 Planner／SharePoint 留痕。

## 落地順序

| 週次 | 上線 | 理由 |
|---|---|---|
| 第 1 週 | 會議記錄（有 POC）＋知識庫（零開發） | 立刻有東西 demo |
| 第 2 週 | 時程 Agent（排程＋提醒＋Planner 時間表） | 閉環成形 |
| 第 3 週 | KPI Agent 執行層＋週報 Agent | 管理價值浮現 |
| 並行 | 申請 gateway、移植查數邏輯 | Phase 2 前置 |
| 基建到位 | 數據 Agent → KPI 業務層 | 完全體 |

## 待辦（回家接續）

- [x] 競賽簡報第 1～7 頁改寫成多 agent 版本（2026/07/10 完成：AI競賽.pptx 已填四核心 Agent 版）
- [x] 總架構流程圖重畫（2026/07/10：第 5 頁改用「四大 Agent 對話決策流程圖」four_agents_detailed_flow_16_9.png，
      含跨 Agent 協作連線與共用資料層；總架構圖同步重繪四 Agent 版取代舊五 Agent 版 agent_architecture_diagram_16_9.png）
- [ ] 第 6 頁量化數字換成真實值（目前是範例：100 場會/年、每場 8 條待辦、30 分→5 分）
- [ ] 實際在 Copilot Studio 建會議記錄 Agent，截 4 張圖補第 7 頁
      （Instructions 現成：outputs/AIPM_Copilot_Instructions.txt）
