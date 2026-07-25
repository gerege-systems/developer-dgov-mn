# AI 流水线（Gemini）

> 一条免 SDK 的 REST 流水线：聊天、语音与实时翻译 — 工具在服务端执行（function calling）。

## 总体图景

```
浏览器 (/me/ai, /me/translate)
   │  同源 fetch（带 CSRF 请求头）
   ▼
Next.js BFF  /api/ai/{chat,stt,tts,translate}   ← 校验数据结构，附加 JWT
   │  服务器→服务器
   ▼
Go API  /api/v1/ai/*   （JWT + 限流约 20 次/分钟）
   │
   ▼
usecases/ai ──────────► pkg/gemini ──────► Gemini REST API
   │   ▲                 （429/5xx/网络错误时 3 次退避重试）
   │   └─ functionResponse
   ▼
ToolDef.Execute()  ← 在后端以请求上下文运行
   ├─ search_knowledge → ai_knowledge 表
   └─ get_server_time  → 演示工具
```

!!! note "核心原则"
    **由模型决定调用哪个工具，由后端负责执行。** 模型永远不会运行代码。
    工具在请求的 context 下运行，因此它们触碰的一切都受 RLS 和超时约束。

## 聊天流程（function-calling 循环）

1. 用历史消息（≤ 20 轮）加上新的提示词构建 `contents`。语音消息会作为内联 base64
   音频片段传入 — Gemini 可直接理解，因此无需单独的 STT 步骤。
2. 携带分层的 system instruction 和工具声明调用 Gemini。
3. 若回复中包含 **function call**：逐个执行工具，追加模型轮次和一条 `functionResponse`
   轮次，然后继续循环（最多 `MaxSteps` 次，默认 4）。每次执行都会记录为
   `Step{Tool, Args, Result}` 并返回给客户端，便于界面展示“AI 做了什么”。
4. 若回复是**文本**：直接返回。

### 失败语义

| 情形 | 结果 |
|---|---|
| Gemini 暂时性故障（在客户端自身 3 次重试之后） | **不返回 5xx** — 返回用户所用语言的兜底回复，并带 `degraded: true` |
| 缺少 `GEMINI_API_KEY` | 真实错误 — 500，原因记入日志 |
| 未知工具或工具执行失败 | 以 `{"error": …}` 形式回报给模型 — 绝不直接暴露给客户端 |

!!! tip "请勿修改此行为"
    在 Gemini 出现暂时性故障时，聊天必须优雅降级为兜底回复 — 不要把它变成 5xx。

## 提示词分层

系统提示词按请求由三层组装而成：

1. **硬编码的防护规则** — 固定在代码中，永不可配置。
2. **适用范围（scope）** — 来自 `ai_prompts` 表，管理员可编辑。
3. **补充指令（instructions）** — 同样从数据库配置。

!!! tip "回复语言"
    前端通过 `lang` 字段发送界面语言（`mn`/`en`/`zh`/`ru`），助手**只**以该语言回复 —
    用户输入所用的语言、对话历史、知识库与工具结果都不会改变它（其他语言的来源会被翻译）。
    `degraded` 兜底回复同样本地化。

!!! warning "切勿让防护层变为可配置"
    防护层只能存在于代码中。仅有 `scope` 与 `instructions` 由数据库驱动。

## 添加一个工具

```go
ai.ToolDef{
    Declaration: gemini.FunctionDeclaration{
        Name:        "my_tool",
        Description: "模型应在何时调用此工具…",
        Parameters:  map[string]any{ /* JSON Schema */ },
    },
    Execute: func(ctx context.Context, args map[string]any) (map[string]any, error) {
        // 在后端运行；ctx 携带请求的身份信息（RLS 生效）
        return map[string]any{"result": "…"}, nil
    },
}
```

在 `cmd/api/server/server.go` 中注册：

```go
aiTools := append(ai.DefaultTools(), ai.KnowledgeSearchTool(aiRepo), myTool)
```

### 随平台附带的工具

- **`search_knowledge`** — 检索 `ai_knowledge` 表（标题/内容 `ILIKE` 加标签匹配，取前 5 条）。
  基础防护规则要求模型在回答平台相关问题*之前*先调用它，并在检索不到内容时回答
  “我不知道”，而不是猜测。通过插入数据行来扩充语料库；当数据量增大时，把
  `repositories/postgres/ai` 中那条查询换成 tsvector 或 pgvector 即可。
- **`get_server_time`** — 一个最小演示（乌兰巴托时间），零依赖。

## 语音

| 能力 | 端点 | 工作方式 |
|---|---|---|
| 语音聊天消息 | 带 `audio` 的 `POST /ai/chat` | 音频作为内联数据直接进入用户轮次 — 聊天模型本身是多模态的 |
| 语音转文字 | `POST /ai/stt` | 一次性调用，附带严格的“逐字转写”指令；文本为空表示没有语音 |
| 文字转语音 | `POST /ai/tts` | 单独的 TTS 模型，`responseModalities: ["AUDIO"]`；原始 PCM（L16/24kHz）会被包上 WAV 头以便浏览器播放 |
| 实时翻译 | `POST /ai/translate` | 文本 → 直接翻译；音频 → **两步**：STT→翻译；`speak: true` 会附加一段 TTS 音频（TTS 失败时静默降级 — 文本照常返回） |

音频输入按 mime 白名单校验（webm/ogg/wav/mpeg/mp3/mp4/m4a/aac/flac），
并在 BFF 与后端 DTO 两处都限制在约 700 KB base64（约 30 秒的 opus）以内。

!!! note "实时翻译的细节"
    麦克风以约 7 秒为一段录制，且**每段都使用全新的 `MediaRecorder`** —
    timeslice 分块只有第一块携带容器头，正因如此每段音频才能独立有效。
    静音片段会返回空字段并被丢弃，而不是抛出错误。

## 限流

`/ai/*` 大致限制为**每个 IP 每分钟 20 次请求**。实时翻译每分钟约推送 8 个分片，
因此调低该限额时请务必谨慎。

完整细节见仓库中的
[`backend/docs/AI_PIPELINE.md`](https://github.com/gerege-systems/template-gerege-mn/blob/main/backend/docs/AI_PIPELINE.md)。
