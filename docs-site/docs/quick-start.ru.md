# Быстрый старт

> От клонирования репозитория до входа через eID на полном стеке — примерно за пять минут.

## Требования

| Инструмент | Версия | Примечание |
|---|---|---|
| Go | 1.26+ | только если запускаете бэкенд напрямую |
| Node.js | 20+ | только если запускаете фронтенд напрямую |
| Docker + Compose | свежая | **рекомендуется** — весь стек одной командой |
| PostgreSQL / Redis | 15+ / 7+ | не нужны при использовании Docker |

## 1. Самый быстрый путь — Docker Compose

```bash
git clone https://github.com/gerege-systems/template-dgov-mn.git
cd template-dgov-mn
docker compose up -d --build
```

Поднимутся `db` · `redis` · `migrate` (разовый) · `api` · `web`.
Затем откройте **<http://localhost:3000>**.

!!! note "Миграции применяются автоматически"
    Сервис `migrate` запускается при каждом `up` и пропускает уже применённые
    миграции, поэтому повторный запуск безопасен (идемпотентен).

## 2. Запуск вручную (разработка)

=== "Бэкенд"

    ```bash
    cd backend
    cp internal/config/.env.example internal/config/.env
    # задайте JWT_SECRET (≥32 символов), БД, Redis и свои учётные данные EID_* RP
    go run ./cmd/api          # → http://localhost:8080
    ```

=== "Фронтенд"

    ```bash
    cd frontend
    cp .env.example .env.local     # BACKEND_URL=http://localhost:8080
    npm install
    npm run dev                    # → http://localhost:3000
    ```

## 3. Вход

На главной странице выберите **Войти через eID**, далее один из трёх путей:

- **QR-код** — отсканируйте QR с экрана компьютера мобильным приложением eID.
- **App2App** — переход прямо в приложение eID на том же телефоне.
- **Регистрационный номер** — введите его, и в приложение придёт push-уведомление.

Привязка Google появляется только после настройки её учётных данных.

!!! tip "Попробовать без учётных данных eID"
    Пока `EID_*` не задан, вход работать не будет. Если вы хотите лишь посмотреть
    интерфейс и архитектуру, юнит-тесты бэкенда (`go test ./...`) прогоняют потоки
    через заглушку FakeEID.

## 4. Проверка

```bash
cd backend && go test ./...     # юнит-тесты (моки, быстро)
cd frontend && npm run build    # сборка + lint + проверка типов (как в CI)
```

Полностью воспроизвести все проверки CI локально:

```bash
cd backend && make pre-push     # lint + тесты + проверка дрейфа swag + сборка
```

## Что дальше

<div class="grid cards" markdown>

- :material-layers: **[Архитектура](architecture.md)** — слои и поток зависимостей
- :material-shield-key: **[Аутентификация](authentication.md)** — потоки eID + SSO
- :material-connection: **[Подключение приложения](sso-integration.md)** — сделать приложение RP
- :material-cog: **[Конфигурация](configuration.md)** — справочник переменных окружения

</div>
