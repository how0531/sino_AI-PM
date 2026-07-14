# AIPM 時程排程 Flow 建置藍圖(Power Automate)

> 目標:每個工作日 17:00 自動掃描 Planner「AIPM 測試專案」的逾期任務,整理成清單私訊 PM(郭文浩)。
> 這塊純瀏覽器自動化難以可靠完成(拖拉式設計器＋運算式編輯),故提供精確藍圖,照做約 20 分鐘可建好。
> 前置:Planner 方案為 basic plan(非 Premium);Group=數媒經營部團隊、Plan=AIPM 測試專案。

## 一、建立排程流程

1. https://make.powerautomate.com → 左側「建立」→「已排程的雲端流程」
2. 流程名稱:`AIPM 每日逾期任務掃描`;開始:今天 17:00;重複間隔:`1` `天`;按「建立」

## 二、Recurrence 觸發(改成只在工作日,可選但建議)

點 Recurrence 觸發 →「顯示進階選項」:
- Frequency: `Week`
- Interval: `1`
- On these days: `Monday, Tuesday, Wednesday, Thursday, Friday`
- At these hours: `17`
- At these minutes: `0`
- Time zone: `(UTC+08:00) Taipei`

## 三、動作 1:List tasks(V3)〔Planner〕

- Group Id:**從下拉選**「數媒經營部團隊」(務必下拉選,直接打字會 HTTP 404)
- Plan Id:**從下拉選**「AIPM 測試專案」

## 四、動作 2:Filter array(篩出逾期未完成)

- From:`@outputs('List_tasks')?['body/value']`(選 List tasks 的 value)
- 切「進階模式」,條件填:

```
@and(less(item()?['dueDateTime'], utcNow()), less(item()?['percentComplete'], 100))
```

意思:到期日 < 現在,且 完成度 < 100%。**任務沒設到期日不會被抓到**(dueDateTime 為 null)。

## 五、動作 3:Create HTML table(把逾期清單做成表格)

- From:`@body('Filter_array')`
- 欄位(自訂):`任務`=`item()?['title']`、`到期日`=`item()?['dueDateTime']`、`完成度`=`item()?['percentComplete']`

## 六、動作 4:條件(Condition)— 有逾期才發

- 左:`length(body('Filter_array'))`　運算子:`大於`　右:`0`

## 七、動作 5(條件 = 是):Post message in a chat or channel〔Teams〕

- Post as:`Flow bot`
- Post in:`Chat with Flow bot`
- Recipient:`how.kuo@sinopac.com`(PM 的公司帳號;Teams 只認 @sinopac.com)
- Message:
  ```
  【每日逾期提醒】以下任務已逾期未完成,請追蹤:
  <Create HTML table 的輸出>
  ```

## 八、儲存 → 手動測試一次驗證

按「儲存」→「測試」→「手動」跑一次,確認 PM 收到 Teams 私訊。

---

## 進階版(逐則催辦負責人 + PM 核可)—— 之後有需要再做

在「四、Filter array」後改為:
1. Apply to each:對每筆逾期任務
2. AI 潤稿(可選):用 Create text with GPT 產委婉催辦草稿(注意:走 AI Builder credits,非 Copilot credits)
3. Post adaptive card and wait:把草稿給 PM 核可(✅ 發送 / ❌ 略過)
4. 核可才 Flow bot 私訊負責人 + Outlook

**注意(見工程師審查報告)**:逐則 Post adaptive card and wait 會序列阻塞(PM 不按第一張,後面全卡),且逾期 2 天以上要標「第二次提醒」需自建去重(Planner 無「已提醒」欄,用 category 標籤或 SharePoint List 記錄)。建議先上「彙總私訊 PM」這版(上面一~八),穩定後再加逐則核可。

## 排程用哪個身分(見審查報告 Q5)

排程 Flow 建議用**服務帳號**的連線(與互動查詢的使用者身分兩軌分離),並在 Planner plan 加該帳號為 co-owner;密碼/token 輪替排進維運。
