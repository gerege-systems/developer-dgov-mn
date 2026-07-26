# Edge nginx — template.gerege.mn

`template.gerege.mn`-ийн edge (урд талын) nginx vhost-ыг **энэ репо эзэмшинэ**:
[`template.gerege.mn.conf`](template.gerege.mn.conf).

## Загвар

Экосистемийн олон домэйн нэг дундын edge nginx контейнерээр үйлчлэгддэг.
Түүний `conf.d` хавтас нь өөр репо-гийн ажлын хуулбараас mount хийгддэг ба тэр
репо-гийн deploy нь `git reset --hard` ажиллуулдаг.

`git reset --hard` нь **tracked** файлуудыг л сэргээдэг — untracked файлыг
хөнддөггүй. Тиймээс энэ репо өөрийн vhost-оо тэр хавтас руу **тусдаа
бүртгэлгүй файлаар** суулгаж, өөрийн конфигоо бүрэн эзэмшиж чадна.

**Үр дүн:** `template.gerege.mn`-ийн ямар ч өөрчлөлт энэ репо дотор дуусна —
өөр репо-д PR илгээх, өөр багийн deploy хүлээх шаардлагагүй.

## Хараат бус байдал

Vhost нь дундын edge файлуудаас **юугаар ч хамаарахгүй** байх ёстой:

| Шийдвэр | Учир |
|---|---|
| Өөрийн `tpl_auth` / `tpl_app` rate-limit zone | Дундын zone файл руу хандвал түүнээс хамаарна |
| Өөрийн `listen 80` блок (ACME + redirect) | Гэрчилгээний шинэчлэлт бие даан ажиллана |
| Deploy бүрд дахин суулгана | Файл алдагдвал өөрөө сэргэнэ |

## Ашиглах

```bash
# Хост дээр, репо-гийн үндсэн хавтсаас:
bash deploy/edge/install.sh
```

Апп-ыг дахин **барихгүйгээр** зөвхөн edge конфигийг шинэчилнэ. `deploy/deploy.sh`
мөн үүнийг төгсгөлд нь дууддаг (`SKIP_EDGE=1`-ээр алгасна), тиймээс `main` руу
push хийхэд CD-гийн хүрээнд автоматаар суулгагдана.

Скрипт юу хийдэг вэ:

1. Edge контейнерийн `/etc/nginx/conf.d` mount-аас **хостын замыг автоматаар олно**
   *(энэ репо нээлттэй эх тул зам код дотор хатуу бичигдээгүй; `EDGE_CONF_D`-ээр дарж болно)*
2. Өмнөх хувилбарыг backup-лана
3. Шинэ файлыг суулгана (хавтасны эзэмшлийг хадгална, `0644`)
4. `nginx -t` — **унавал** өмнөх хувилбарыг буцааж, reload хийхгүй
5. `nginx -s reload`

### Тохируулга

| Env | Default |
|---|---|
| `EDGE_CONTAINER` | `gerege-nginx` |
| `EDGE_CONF_D` | Автоматаар (контейнерийн mount) |
| `SKIP_EDGE` | `deploy.sh`-д `1` өгвөл алгасна |

## Оношилгоо

```bash
# Конфиг зөв эсэх
docker exec gerege-nginx nginx -t

# Манай файл байрандаа байгаа эсэх
CONF_D=$(docker inspect gerege-nginx \
  --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/conf.d"}}{{.Source}}{{end}}{{end}}')
sudo ls -l "$CONF_D/template.gerege.mn.conf"

# Edge-ээс апп руу хүрч байгаа эсэх
docker exec gerege-nginx wget -qO- http://template-gerege-web:3000/ >/dev/null && echo ok

# Гаднаас
curl -s -o /dev/null -w '%{http_code}\n' https://template.gerege.mn/
```

| Шинж тэмдэг | Шалтгаан | Засвар |
|---|---|---|
| `444` / холболт тасрах | Vhost файл устсан (хэн нэгэн `git clean -fd` ажиллуулсан) → default server барьж авсан | `bash deploy/edge/install.sh` |
| `502 Bad Gateway` | `template-gerege-web` унтарсан эсвэл edge сүлжээнд ороогүй | `docker compose up -d`; override файлыг шалга |
| `conflicting server name` анхааруулга | Дундын `default.conf`-д template vhost давхар үлдсэн | Тэндээс хас — эзэмшигч нь энэ репо |
| `nginx` асахгүй | Гэрчилгээ байхгүй | Certbot-оор `template.gerege.mn` гэрчилгээ ав |

## Хамаарал

Vhost нь `template-gerege-web` контейнер руу проксилно. Тэр нэр нь хостын
**untracked** `docker-compose.override.yml`-аас ирдэг — тэр файл `web`
үйлчилгээг хуваалцсан edge сүлжээнд холбож, `container_name`-ийг өгдөг.
Override алга бол vhost 502 өгнө.

Тэр файл нь `.gitignore`-д орсон тул `git clean -fd` устгахгүй. Алдагдсан
тохиолдолд [`../host-override.example.yml`](../host-override.example.yml)-ээс
сэргээнэ:

```bash
cp deploy/host-override.example.yml docker-compose.override.yml
docker compose up -d
```
