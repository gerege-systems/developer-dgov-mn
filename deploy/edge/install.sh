#!/usr/bin/env bash
# template.gerege.mn — edge nginx vhost суулгах.
#
# Энэ скрипт ХОСТ ДЭЭР ажиллана (deploy/deploy.sh дуудна, эсвэл гараар):
#
#   bash deploy/edge/install.sh
#
# Апп-ыг дахин барихгүйгээр ЗӨВХӨН edge конфигийг шинэчлэх боломжтой —
# vhost засварт бүтэн deploy хийх шаардлагагүй.
#
# Тохиргоог env-ээр дарж болно:
#   EDGE_CONTAINER (default gerege-nginx)
#   EDGE_CONF_D    (default: edge контейнерийн mount-аас АВТОМАТААР олно)
#
# EDGE_CONF_D-г хатуу бичээгүй нь санаатай: энэ репо НЭЭЛТТЭЙ ЭХ тул хостын
# зам код дотор байх ёсгүй. Скрипт нь `docker inspect`-ээр edge контейнерийн
# /etc/nginx/conf.d mount-ийн эх сурвалжийг олж авдаг.
#
# Эзэмшлийн загварыг deploy/edge/README.md-ээс үзнэ үү.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EDGE_CONTAINER="${EDGE_CONTAINER:-gerege-nginx}"
SRC="$HERE/template.gerege.mn.conf"

[[ -f "$SRC" ]] || { echo "✖ $SRC олдсонгүй"; exit 1; }

command -v docker >/dev/null || { echo "✖ docker олдсонгүй — энэ скриптийг ХОСТ дээр ажиллуулна"; exit 1; }
docker inspect "$EDGE_CONTAINER" >/dev/null 2>&1 || { echo "✖ '$EDGE_CONTAINER' контейнер олдсонгүй"; exit 1; }

# conf.d-ийн хостын замыг edge контейнерийн mount-аас олно.
if [[ -z "${EDGE_CONF_D:-}" ]]; then
  EDGE_CONF_D="$(docker inspect "$EDGE_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/conf.d"}}{{.Source}}{{end}}{{end}}')"
fi
[[ -n "$EDGE_CONF_D" ]] || {
  echo "✖ conf.d mount олдсонгүй. EDGE_CONF_D-г гараар зааж өгнө үү."; exit 1;
}

TARGET="$EDGE_CONF_D/template.gerege.mn.conf"
# Backup нь sudo-гоор үүсдэг тул root эзэмшилтэй болно; /tmp дээр sticky bit
# байдаг учир түүнийг УСТГАХАД ч sudo хэрэгтэй.
BACKUP=/tmp/template.gerege.mn.conf.prev

echo "▶ Edge vhost суулгаж байна → $TARGET"

sudo rm -f "$BACKUP"
if sudo test -f "$TARGET"; then
  sudo cp "$TARGET" "$BACKUP"
fi

# Эзэмшлийг тухайн хавтасны бусад файлтай ижил байлгана.
OWNER="$(sudo stat -c '%U:%G' "$EDGE_CONF_D")"
sudo install -o "${OWNER%%:*}" -g "${OWNER##*:}" -m 0644 "$SRC" "$TARGET"

# nginx -t БҮТЭЛГҮЙТВЭЛ reload хийхгүй — ажиллаж буй nginx хуучин сайн
# конфигоороо үргэлжилнэ. Шинэ файлаа буцаагаад алдаагаар зогсоно.
if ! docker exec "$EDGE_CONTAINER" nginx -t; then
  echo "✖ nginx -t амжилтгүй — vhost-ыг буцаалаа."
  if sudo test -f "$BACKUP"; then
    sudo install -o "${OWNER%%:*}" -g "${OWNER##*:}" -m 0644 "$BACKUP" "$TARGET"
  else
    sudo rm -f "$TARGET"
  fi
  sudo rm -f "$BACKUP"
  exit 1
fi

docker exec "$EDGE_CONTAINER" nginx -s reload
sudo rm -f "$BACKUP"
echo "✅ Edge vhost суулгагдаж, nginx reload хийгдлээ → https://template.gerege.mn/"
