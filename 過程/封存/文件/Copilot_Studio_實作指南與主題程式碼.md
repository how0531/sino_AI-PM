# Copilot Studio 實作指南與對話主題程式碼

本指南提供在 Microsoft Copilot Studio 與 Power Automate 中，將「AI PM 專案經理特助」實體化設計的具體步驟、YAML 主題定義以及自動化流程設定。

---

## 壹、 基礎環境建置與認證設定

在開始設計對話主題（Topics）前，必須先在 Copilot Studio 租戶中完成安全認證，以確保能安全存取企業內部的 Cube 與神策數據庫。

### 一、 啟用 Azure AD 單一登入 (SSO)
1. 進入 Copilot Studio 控制台，選擇您的 Copilot 實例。
2. 點擊左側選單的「設定」 (Settings) > 「安全性」 (Security) > 「驗證」 (Authentication)。
3. 選擇「以 Azure Active Directory 進行驗證」 (Authenticate with Azure Active Directory)。
4. 設定下列參數：
   * **用戶端識別碼 (Client ID)** 與 **租戶識別碼 (Tenant ID)**：輸入您在 Azure Portal 中註冊的 App Registration 資訊。
   * **範圍 (Scopes)**：設定 `User.Read` 以獲取使用者基本資訊，以及存取 Teams 權限的 `Chat.ReadWrite`。

---

## 貳、 核心對話主題 (Topics) YAML 程式碼

在 Copilot Studio 中，您可以透過「程式碼檢視」 (Code View) 直接編輯或貼上 YAML 格式的主題設定。以下提供「數據 Agent」與「會議記錄 Agent」的具體 YAML 定義。

### 主題一、 數據 Agent (Data Insights Agent)

本主題負責引導使用者輸入自然語言查詢需求，並呼叫 Power Automate 進行 SQL/API 轉換與數據撈取。

```yaml
kind: AdaptiveDialog
beginDialog:
  - kind: OnUtterance
    id: OnUtterance_DataQuery
    actions:
      - kind: SendActivity
        id: sendActivity_Welcome
        activity: 您好，我是數據特助。我可以幫您查詢 Cube 資料庫與神策數據。請告訴我您的查詢需求。

      - kind: Question
        id: question_QueryInput
        alwaysPrompt: true
        variable: Topic.UserQueryText
        prompt: 例如：「幫我查過去一週，新功能 A 在 iOS 端的次日留存率，並按日排列。」請問您這次想查詢什麼？
        entity: StringPrebuiltEntity

      - kind: SendActivity
        id: sendActivity_Processing
        activity: 收到您的需求：「{Topic.UserQueryText}」，正在透過 Power Automate 分析語意並撈取數據，這可能需要幾秒鐘的時間...

      # 呼叫 Power Automate Flow
      - kind: InvokeFlow
        id: invokeFlow_sensors_query
        flowId: "shared_query_sensors_data_flow"
        input:
          queryText: =Topic.UserQueryText
        output:
          QueryResultSummary: Topic.ResultSummary
          QueryResultTableMarkdown: Topic.ResultTable

      # 呈現結果
      - kind: SendActivity
        id: sendActivity_ShowResult
        activity: |
          ### 數據分析結果摘要
          {Topic.ResultSummary}
          
          {Topic.ResultTable}
```

### 主題二、 會議記錄與自動派單 Agent (Meeting Minutes Agent)

本主題負責接收會議逐字稿，提取待辦事項 (Action Items)，並在 PM 確認後自動呼叫 Jira/Planner API 進行開單。

```yaml
kind: AdaptiveDialog
beginDialog:
  - kind: OnUtterance
    id: OnUtterance_MeetingProcess
    actions:
      - kind: SendActivity
        id: send_welcome
        activity: 您好，我是會議記錄特助。請提供您的會議記錄或 Teams 逐字稿文字。

      - kind: Question
        id: question_transcript
        alwaysPrompt: true
        variable: Topic.TranscriptText
        prompt: 請直接將逐字稿內容貼在此處：
        entity: StringPrebuiltEntity

      - kind: SendActivity
        id: send_processing
        activity: 正在為您分析逐字稿並提取會議結論與 Action Items...

      # 呼叫 AI Builder / GPT 進行文字摘要與待辦事項提取
      - kind: InvokeFlow
        id: invoke_ai_extract
        flowId: "shared_meeting_minutes_extract_flow"
        input:
          transcript: =Topic.TranscriptText
        output:
          Summary: Topic.MeetingSummary
          ActionItems: Topic.MeetingActionItems
          TaskTitle: Topic.ExtractedTaskTitle
          TaskAssignee: Topic.ExtractedAssignee
          TaskDueDate: Topic.ExtractedDueDate

      - kind: SendActivity
        id: send_summary
        activity: |
          ### 會議結論摘要
          {Topic.MeetingSummary}
          
          ### 待辦清單 (Action Items)
          {Topic.MeetingActionItems}

      # 智慧派單詢問
      - kind: Confirm
        id: confirm_dispatch
        variable: Topic.ConfirmDispatch
        prompt: 偵測到一筆明確任務：指派「{Topic.ExtractedAssignee}」於「{Topic.ExtractedDueDate}」前完成「{Topic.ExtractedTaskTitle}」。是否要自動在 Jira/Planner 系統中建立此任務單？

      - kind: ConditionGroup
        id: condition_dispatch_check
        conditions:
          - condition: =Topic.ConfirmDispatch = true
            actions:
              - kind: SendActivity
                activity: 正在建立任務單並分派中...
              - kind: InvokeFlow
                id: invoke_jira_create
                flowId: "shared_jira_create_issue_flow"
                input:
                  title: =Topic.ExtractedTaskTitle
                  assignee: =Topic.ExtractedAssignee
                  dueDate: =Topic.ExtractedDueDate
                output:
                  issueKey: Topic.CreatedIssueKey
              - kind: SendActivity
                activity: 成功建立！已於 Jira 系統建立任務單：**{Topic.CreatedIssueKey}**，並已自動通知 {Topic.ExtractedAssignee}。
          - condition: =Topic.ConfirmDispatch = false
            actions:
              - kind: SendActivity
                activity: 好的，已為您記錄會議結論，暫不進行系統派單。
```

---

## 參、 Power Automate 後端自動化流程 (Flow) 設計

上述對話主題所需的資料查詢與開單動作，必須由 Power Automate Flow 來執行。以下為兩個關鍵 Flow 的步驟設定：

### 流程一、 數據查詢流程 (Query_SensorsData_Flow)

此流程負責接收自然語言，呼叫 LLM 轉換為查詢參數，再向神策/Cube 查詢數據：

1. **觸發程序 (Trigger)**：
   * 動作：`Power Apps / Copilot Studio (V2)`
   * 輸入參數：`queryText` (文字，必填)
2. **語意分析與 API 參數轉譯**：
   * 動作：`GPT (Azure OpenAI)` 或 `AI Builder - Create text with GPT`
   * 提示詞設定：
     ```text
     你是一個資料庫專家的 AI 助理。請將以下使用者的自然語言查詢需求，轉換為向神策數據 API 查詢的 JSON 參數。
     
     使用者的查詢需求：@{triggerBody()?['queryText']}
     
     請嚴格僅輸出 JSON 格式的查詢參數，格式如下：
     {
       "metric": "retention",
       "target_feature": "feature_a",
       "platform": "ios",
       "date_range": "last_7_days"
     }
     ```
3. **呼叫 API**：
   * 動作：`HTTP` (安全存取)
   * 方法：`POST`
   * URI：`https://api.sensors.sinopac.com.tw/v1/query` (範例企業內部網址)
   * 主體：採用上一步 GPT 產出的 JSON 參數。
4. **回傳結果給 Copilot**：
   * 動作：`Return value(s) to Power Virtual Agents`
   * 回傳參數：
     * `QueryResultSummary` (文字)：帶入由 API 回傳之數據整理成的繁體中文摘要。
     * `QueryResultTableMarkdown` (文字)：帶入格式化後的 Markdown 表格數據。

### 流程二、 Jira 自動開單流程 (Jira_Auto_Dispatch_Flow)

此流程負責接收待辦任務資訊，並調用 Jira API 進行自動派單：

1. **觸發程序 (Trigger)**：
   * 動作：`Power Apps / Copilot Studio (V2)`
   * 輸入參數：`title` (文字)、`assignee` (文字)、`dueDate` (文字)
2. **尋找 Jira 用戶識別碼**：
   * 動作：Jira Connector 的 `Search users`
   * 查詢條件：使用 `assignee` 姓名尋找對應的 Jira 帳號與電子郵件。
3. **建立 Jira 任務單**：
   * 動作：Jira Connector 的 `Create a new issue (V2)`
   * 專案：選擇目標專案代碼 (例如 `DIT` - 數位金融處專案)
   * 任務類型：`Task`
   * 摘要 (Summary)：帶入 `@{triggerBody()?['title']}`
   * 負責人 (Assignee)：帶入上一步查到的使用者帳號
   * 到期日 (Due Date)：帶入 `@{triggerBody()?['dueDate']}`
4. **回傳結果**：
   * 動作：`Return value(s) to Power Virtual Agents`
   * 回傳參數：
     * `issueKey` (文字)：帶入新建任務單之代號，例如 `JIRA-1042`。

---

## 肆、 匯入與部署說明

1. **匯入主題**：
   * 在 Copilot Studio 中新建一個自訂主題，將編輯器右上角的檢視切換為「程式碼檢視」 (Code View)。
   * 將本指南中的 YAML 程式碼複製並貼上，隨後切換回「圖形檢視」 (Canvas View) 以進行節點微調。
2. **綁定 Power Automate**：
   * 在對應的「Invoke Flow」節點上，點擊「建立流程」 (Create a flow)。
   * 依據本指南「參、」之步驟建立流程，完成後返回 Copilot Studio 並綁定對應的輸入與輸出變數。
3. **發佈與測試**：
   * 點擊 Copilot Studio 右上角的「發佈」 (Publish)。
   * 即可在側邊的測試視窗中進行完整流程的對話與派單測試。
