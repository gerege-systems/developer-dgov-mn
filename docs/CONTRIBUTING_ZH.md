# 参与贡献

> 🌐 [English · Монгол](CONTRIBUTING.md) · **中文**

感谢您有意改进 **Gerege Template Platform V3.0**
（Цахим үйлчилгээг бүтээх суурь，即「构建数字服务的基础」）！

## 开始

1. Fork 本仓库，并从 `main` 创建分支：`git checkout -b feat/short-description`。
2. 搭建技术栈 — 参见 [README](../README.md) 中的快速开始。
3. 在 `backend/` 和/或 `frontend/` 中进行修改。

## 提交 PR 之前

**后端（Go）：**

```bash
cd backend
make fmt          # gofmt
make lint         # golangci-lint
make test         # 单元测试
make pre-push     # 复现 CI（lint + 测试 + swag 漂移检查 + 构建）
```

**前端（Next.js）：**

```bash
cd frontend
npm run lint
npm run build
```

- 保持**整洁架构**的边界：business/domain 层不得 import Web 框架。
- 为新行为补充测试。同步更新 `backend/docs/` 中的相关文档
  （以及对应的 `_MN` 和 `_ZH` 版本）。
- 如果修改了 HTTP handler 的注解，请运行 `make swag` 以保持 `docs/` 同步。
- 遵循既有的代码风格以及多语言注释/文档约定。

## Commit 消息

使用清晰的祈使句（鼓励使用 Conventional Commits）：
`feat(auth): add passkey login`、`fix(cors): …`、`docs: …`、`test: …`。

## Pull Request

- 尽可能让 PR 聚焦且小巧。
- 填写 PR 模板；关联相关 issue。
- 所有 CI 检查都必须通过。

## 报告缺陷 / 提出功能需求

请使用 `.github/ISSUE_TEMPLATE/` 下的模板创建 issue。
安全相关问题**请勿**公开提交 issue — 参见 [SECURITY.md](../SECURITY.md)。

## 行为准则

参与即表示您同意遵守[行为准则](CODE_OF_CONDUCT_ZH.md)。

## 许可

提交贡献即表示您同意您的贡献依 [MIT 许可](LICENSE)授权。
