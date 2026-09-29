#!/usr/bin/env bash
# Rebuild the subset WOFF2 fonts used by the game from Google Fonts (OFL) sources.
# Chinese edition: body = Noto Sans SC (Bold / Black instances), display = ZCOOL QingKe HuangYou.
# Requires: curl, uv. Usage: bash tools/build_fonts.sh
set -euo pipefail
GAME="$(cd "$(dirname "$0")/../app" && pwd)"
WORK="$(mktemp -d)"
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -sSfo "$WORK/qingke.ttf" "$BASE/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf"
curl -sSfo "$WORK/noto-sc-vf.ttf" "$BASE/notosanssc/NotoSansSC%5Bwght%5D.ttf"
curl -sSfo "$GAME/fonts/OFL-ZCOOLQingKeHuangYou.txt" "$BASE/zcoolqingkehuangyou/OFL.txt"
curl -sSfo "$GAME/fonts/OFL-NotoSansSC.txt" "$BASE/notosanssc/OFL.txt"
python3 - "$GAME" "$WORK/chars.txt" <<'PY'
import sys, pathlib
game = pathlib.Path(sys.argv[1])
chars = {chr(c) for c in range(0x20, 0x7f)}
for f in [*game.glob('*.html'), *game.glob('*.css'), *game.glob('js/*.js')]:
    chars |= set(f.read_text(encoding='utf-8'))
chars |= set('０１２３４５６７８９＋−×÷＝、。・！？「」（）ー〜…☆')
pathlib.Path(sys.argv[2]).write_text(''.join(sorted(c for c in chars if ord(c) >= 0x20)), encoding='utf-8')
PY
# Noto Sans SC is a variable font: split it into two static instances first.
uv run --no-project --with fonttools \
  fonttools varLib.instancer "$WORK/noto-sc-vf.ttf" wght=700 -o "$WORK/noto-bold.ttf" >/dev/null
uv run --no-project --with fonttools \
  fonttools varLib.instancer "$WORK/noto-sc-vf.ttf" wght=900 -o "$WORK/noto-black.ttf" >/dev/null
for pair in "qingke zcool-qingke-huangyou" "noto-bold noto-sans-sc-bold" "noto-black noto-sans-sc-black"; do
  set -- $pair
  uv run --no-project --with fonttools --with brotli pyftsubset "$WORK/$1.ttf" --text-file="$WORK/chars.txt" --flavor=woff2 --layout-features='*' --output-file="$GAME/fonts/$2.woff2"
done
rm -rf "$WORK"
echo "fonts rebuilt in $GAME/fonts"
