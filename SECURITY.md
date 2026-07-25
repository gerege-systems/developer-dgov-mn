# Security Policy · Аюулгүй байдлын бодлого · 安全策略

## Reporting a vulnerability · Эмзэг байдлыг мэдээлэх

**Please do NOT open a public issue for security vulnerabilities.**
**Аюулгүй байдлын эмзэг байдлыг олон нийтийн issue-гээр бүү нээнэ үү.**
**请勿为安全漏洞公开提交 issue。**

Instead, report privately via one of:
- GitHub **Private vulnerability reporting** — the *Security* tab → *Report a vulnerability*.
- Or email the maintainers (Gerege Systems Development Team).

Please include: affected component (`backend`/`frontend`), version/commit, a
description, reproduction steps, and impact. We aim to acknowledge within
**72 hours** and to provide a remediation timeline after triage.

Та дараахыг хавсаргана уу: хамаарах хэсэг (`backend`/`frontend`), хувилбар/commit,
тайлбар, давтах алхмууд, нөлөө. Бид **72 цагийн** дотор хүлээн авсныг мэдэгдэхийг
зорино.

请通过以下方式之一私下报告：GitHub 的 **Private vulnerability reporting**
（*Security* 标签页 → *Report a vulnerability*），或发邮件给维护者
（Gerege Systems 开发团队）。请附上：受影响的组件（`backend`/`frontend`）、
版本/commit、问题描述、复现步骤与影响。我们力争在 **72 小时**内确认收到，
并在初步分类后给出修复时间表。

## Supported versions · Дэмжигдэх хувилбар

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| older tags | ❌ |

## Scope · Хамрах хүрээ · 范围

In scope: code in `backend/` and `frontend/`. Out of scope: third-party
dependencies (report upstream), and deployment/infrastructure you operate.

范围内：`backend/` 与 `frontend/` 中的代码。范围外：第三方依赖
（请向上游报告），以及由您自己运维的部署/基础设施。

## Our security posture · Бидний аюулгүй байдлын байдал

This template is hardened against the OWASP ASVS / API Top 10 and NIST 800-63B
baselines — see **[backend/docs/SECURITY.md](backend/docs/SECURITY.md)** for the
implemented controls, the ASVS roadmap, and known gaps. Operators are still
responsible for production hardening (TLS, secrets management, least-privilege
DB roles, WAF, monitoring).

本模板依据 OWASP ASVS / API Top 10 与 NIST 800-63B 基线进行了加固 —
已实现的控制、ASVS 路线图与已知不足见
**[backend/docs/SECURITY_ZH.md](backend/docs/SECURITY_ZH.md)**。
运维方仍需自行负责生产加固（TLS、密钥管理、最小权限数据库角色、WAF、监控）。

## Disclosure · Ил болгох · 披露

We follow coordinated disclosure: we will work with you on a fix and credit you
(if you wish) once a patch is released.

我们遵循协同披露：我们会与您一起完成修复，并在补丁发布后按您的意愿致谢。

---

**Gerege Template Platform V3.0** — Co-developed by the Gerege Systems
Development Team and Claude AI, 2026.
