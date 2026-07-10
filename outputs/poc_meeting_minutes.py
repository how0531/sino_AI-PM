# -*- coding: utf-8 -*-
"""
會議記錄 Agent — POC（MVP #1）
輸入：會議逐字稿（純文字）
輸出：結構化「會議結論」＋「待辦清單（負責人／期限）」，並標出需要 PM 確認的開單項

定位：這是規則版 POC，用來在評審現場「當場跑、看得到結果」，不需要任何內部 API。
production 版把 extract_action_items() 換成一次 LLM 呼叫（Copilot Studio / Azure OpenAI）即可，
介面（輸入逐字稿、輸出 dict）維持不變。

# ponytail: 規則式抽取，正確率有天花板（口語變化、同名、隱含期限抓不到）。
#           上線改用 LLM 抽取，本檔的資料結構與 PM 確認關卡直接沿用。
"""
import re


# 觸發「這是一條待辦」的線索詞
_ACTION_CUES = ["要", "需", "負責", "完成", "處理", "跟進", "follow", "產出", "交付", "確認", "整理", "提供"]

# 日期樣式：7/15、07/15、7月15日、下週三…（下週類抓不到精確日，標成相對）
_DATE_ABS = re.compile(r"(\d{1,2})\s*[/\-月]\s*(\d{1,2})\s*日?")
_DATE_REL = re.compile(r"(下週[一二三四五六日]|本週[一二三四五六日]|下週|本週|明天|後天|月底|下個月)")


def _parse_line(line):
    """一行逐字稿 -> (speaker, content)；抓不到 speaker 回 (None, 原文)。"""
    m = re.match(r"\s*([\w一-鿿]{1,12})\s*[:：]\s*(.+)", line)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, line.strip()


# 不可能是人名的功能詞（避免規則把「前/內/我」當成負責人）
_OWNER_STOP = {"前", "後", "內", "我", "你", "他", "她", "它", "這", "那", "們", "先", "會", "要"}


def _extract_owner_due(content, speaker):
    """從內容抓 負責人 與 期限。負責人優先取『內容裡點名的人』，其次取發言人。"""
    owner = None
    # 1) 明確點名："請小明…"、"由 Amy 負責"、"讓 Bob 處理"
    m = re.search(r"(?:請|由|讓)\s*([\w一-鿿]{1,4})", content)
    if m and m.group(1) not in _OWNER_STOP:
        owner = m.group(1)
    # 2) 第一人稱認領："我來做 / 我負責 / 我要"→ 負責人就是發言人
    elif re.search(r"我\s*(?:來|負責|處理|跟進|需|要|會|得)", content):
        owner = speaker
    # 3) "X 要/負責…"（X 需是短名且非功能詞）
    else:
        m = re.search(r"([\w一-鿿]{1,4})\s*(?:負責|處理|完成|跟進)", content)
        if m and m.group(1) not in _OWNER_STOP:
            owner = m.group(1)
    if not owner:
        owner = speaker  # 沒抓到就當發言人自己認領

    due = None
    m = _DATE_ABS.search(content)
    if m:
        due = f"{int(m.group(1))}/{int(m.group(2))}"
    else:
        m = _DATE_REL.search(content)
        if m:
            due = m.group(1) + "（相對日，需 PM 確認精確日）"
    return owner, due


def extract_action_items(transcript):
    """逐字稿 -> {'conclusions': [...], 'action_items': [{task, owner, due, need_confirm}]}"""
    conclusions, actions = [], []
    for raw in transcript.splitlines():
        if not raw.strip():
            continue
        speaker, content = _parse_line(raw)
        is_action = any(cue in content for cue in _ACTION_CUES)
        if is_action:
            owner, due = _extract_owner_due(content, speaker)
            # 需 PM 確認的情況：沒抓到期限、或負責人是相對稱呼、或期限是相對日
            need_confirm = (due is None) or (due and "相對日" in due) or (owner is None)
            actions.append({
                "task": content,
                "owner": owner or "（未指定，PM 需指派）",
                "due": due or "（未定，PM 需確認）",
                "need_confirm": need_confirm,
            })
        elif speaker and len(content) > 6:
            conclusions.append(f"{speaker}：{content}")
    return {"conclusions": conclusions, "action_items": actions}


def render_markdown(result):
    """把結果排成給 PM 看的 Markdown（含『需確認才開單』標記）。"""
    out = ["## 會議結論"]
    out += [f"- {c}" for c in result["conclusions"]] or ["- （無明確結論陳述）"]
    out.append("\n## 待辦清單")
    out.append("| # | 待辦事項 | 負責人 | 期限 | 開單前需 PM 確認 |")
    out.append("|---|---|---|---|---|")
    for i, a in enumerate(result["action_items"], 1):
        flag = "**是**" if a["need_confirm"] else "可直接開單"
        out.append(f"| {i} | {a['task']} | {a['owner']} | {a['due']} | {flag} |")
    return "\n".join(out)


# ---- 自我檢查（ponytail: 一個會在邏輯壞掉時失敗的最小 demo）----
def demo():
    sample = """\
PM：今天結論，A 功能維持 7/20 上線，範圍不擴大。
小明：UI 設計我來做，7/15 前完成。
Amy：API 欄位規格我下週三前整理出來。
Bob：留存口徑我要先跟數據部確認。
PM：好，散會。
"""
    r = extract_action_items(sample)

    # 1. 應抓到 3 條待辦（小明UI、Amy API、Bob口徑），PM 的結論句不算待辦
    assert len(r["action_items"]) == 3, r["action_items"]

    # 2. 小明那條：期限 7/15、負責人=發言人、可直接開單
    xiaoming = next(a for a in r["action_items"] if "UI" in a["task"])
    assert xiaoming["due"] == "7/15" and xiaoming["owner"] == "小明", xiaoming
    assert xiaoming["need_confirm"] is False, xiaoming

    # 3. Amy 那條：相對日 -> 必須標「需 PM 確認」（核心：人在迴路的確認關卡）
    amy = next(a for a in r["action_items"] if "API" in a["task"])
    assert "下週三" in amy["due"] and amy["need_confirm"] is True, amy

    # 4. Bob 那條：沒明確期限 -> 也要標「需 PM 確認」
    bob = next(a for a in r["action_items"] if "口徑" in a["task"])
    assert bob["need_confirm"] is True, bob

    print(render_markdown(r))
    print("\n[self-check] 全部通過")


if __name__ == "__main__":
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows cp950 主控台也能印繁中
    except Exception:
        pass
    demo()
