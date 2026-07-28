# public.template.gerege.mn — байршуулалтын тэмдэглэл

Нээлттэй суурь template-ийн амьд жишиг байршуулалт.

| | |
|---|---|
| Домэйн | <https://public.template.gerege.mn> |
| Хост | `66.181.175.199` (`grg`, дотоод `10.0.0.31`) — нэгдсэн Gerege хост |
| Хэрэглэгч / зам | `grgdev` : `/home/grgdev/public-gerege-template` |
| Compose project | `public-template` |
| Портууд | web `3010`, api relay `8094` |
| DB | `public_template` (тусдаа volume `public-template_dbdata`) |
| Цөм | [`public-gerege-core`](https://github.com/gerege-systems/public-gerege-core) — **нээлттэй**, token шаардахгүй |

`template.gerege.mn` (хаалттай хувилбар) нь **өөр стек** — ижил хост дээр
`temp-gerege-mn` project нэрээр тусдаа ажиллана. Хоёулаа бие биедээ
нөлөөлөхгүй.

## Хостын онцлог тохиргоо (git-д БАЙХГҮЙ)

Хост дээр `docker-compose.override.yml` байдаг — CI-ийн `git reset --hard`-д
амьд үлдэхийн тулд зориудаар untracked:

- `web`-д `container_name: public-template-web` өгч, хуваалцсан `gerege` edge
  сүлжээнд холбоно (edge nginx үүгээр танина).
- `BACKEND_URL`-ийг `http://public-template-api-1:8080` руу **pin** хийнэ.
  Үүнгүйгээр хуваалцсан сүлжээн дэх өөр `api` руу очиж бүх `/api/v1/*` 404 болно.

## Edge nginx

vhost: `public.template.gerege.mn.conf` — edge контейнерийн `conf.d`
(`/home/deploy/sso-gerege-mn/newsrv-nginx/conf.d`) дотор. Rate-limit zone-ууд
нь `ptpl_auth` / `ptpl_app` (амьд `template.gerege.mn`-ий `tpl_*`-тай
зөрчилдөхгүйн тулд өөр нэртэй).

TLS: Let's Encrypt, `certbot/certbot` webroot аргаар
(`gerege-sso-eid_certbot_certs` / `_www` volume-ууд).

## ⚠️ Анхны суулгалтын алхмууд (`docker compose up` дангаараа хангалтгүй)

Шинэ DB volume дээр дараах зүйлс **гараар** шаардлагатай байв:

1. **Extension-ууд** — `uuid-ossp`, `pgcrypto`, `vector`, `citext`-ийг
   `postgres` эрхээр урьдчилан үүсгэнэ. Migration нь эдгээрийг үүсгэх гэж
   оролддог боловч `app_user`-т superuser эрх байхгүй.
2. **`DB_POSTGRE_DSN` нь `postgres` (superuser) байх ёстой** — migration DDL
   ажиллуулдаг. Ажиллах үеийн холболт нь compose-оос `app_user` авдаг тул
   аюулгүй байдал алдагдахгүй.

Хэрэв `schema public`-ыг дахин үүсгэвэл init скриптийн олгосон эрхүүд
устана — тэр үед дараахыг сэргээнэ:

```sql
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

## CI/CD

`main` руу push хийхэд `ci.yml`-ийн `deploy` ажил SSH-ээр орж
`deploy/deploy.sh` ажиллуулна. Шаардлагатай repo secret:
`DEPLOY_HOST` · `DEPLOY_USER` · `DEPLOY_PATH` · `DEPLOY_SSH_KEY`.

Deploy түлхүүр нь `grgdev`-ийн `authorized_keys`-д бүртгэлтэй, зөвхөн энэ
репогийн CI-д зориулсан (оператортой хуваалцаагүй).
