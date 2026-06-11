#!/usr/bin/env bash
set -euo pipefail

# Convert raster images (png/jpg/jpeg) to WebP.
# Skips SVG by default (keep SVG as vector for best performance).
#
# Usage:
#   scripts/convert-images-to-webp.sh [root_dir]
#
# Optional env vars:
#   QUALITY=80            # 0-100, default 80
#   LOSSLESS=0            # 1 for lossless (PNG only), default 0
#   OVERWRITE=0           # 1 to overwrite existing .webp, default 0
#   KEEP_ORIGINALS=1      # 0 to delete originals after conversion, default 1
#   INCLUDE_SVG=0         # 1 to rasterize SVG to WebP (not recommended), default 0
#
# Requires one of: cwebp (preferred), magick (ImageMagick), or ffmpeg.

ROOT_DIR="${1:-.}"
QUALITY="${QUALITY:-80}"
LOSSLESS="${LOSSLESS:-0}"
OVERWRITE="${OVERWRITE:-0}"
KEEP_ORIGINALS="${KEEP_ORIGINALS:-1}"
INCLUDE_SVG="${INCLUDE_SVG:-0}"

if command -v cwebp >/dev/null 2>&1; then
  CONVERTER="cwebp"
elif command -v magick >/dev/null 2>&1; then
  CONVERTER="magick"
elif command -v ffmpeg >/dev/null 2>&1; then
  CONVERTER="ffmpeg"
else
  echo "Error: Need cwebp, ImageMagick (magick), or ffmpeg on PATH." >&2
  exit 1
fi

exts="png|jpg|jpeg"
if [[ "${INCLUDE_SVG}" == "1" ]]; then
  exts="png|jpg|jpeg|svg"
fi

if find "${ROOT_DIR}" -type f -regextype posix-extended -iregex ".*\\.(${exts})$" -print0 >/dev/null 2>&1; then
  FIND_CMD=(find "${ROOT_DIR}" -type f -regextype posix-extended -iregex ".*\\.(${exts})$" -print0)
else
  # macOS/BSD find fallback
  FIND_CMD=(find -E "${ROOT_DIR}" -type f -iregex ".*\\.(${exts})$" -print0)
fi

while IFS= read -r -d '' file; do
  out="${file%.*}.webp"
  if [[ -f "${out}" && "${OVERWRITE}" != "1" ]]; then
    continue
  fi

  case "${CONVERTER}" in
    cwebp)
      if [[ "${LOSSLESS}" == "1" && "${file##*.}" =~ ^(png|PNG)$ ]]; then
        cwebp -lossless -q "${QUALITY}" "${file}" -o "${out}"
      else
        cwebp -q "${QUALITY}" "${file}" -o "${out}"
      fi
      ;;
    magick)
      if [[ "${LOSSLESS}" == "1" && "${file##*.}" =~ ^(png|PNG)$ ]]; then
        magick "${file}" -quality "${QUALITY}" -define webp:lossless=true "${out}"
      else
        magick "${file}" -quality "${QUALITY}" "${out}"
      fi
      ;;
    ffmpeg)
      if [[ "${LOSSLESS}" == "1" && "${file##*.}" =~ ^(png|PNG)$ ]]; then
        ffmpeg -hide_banner -loglevel error -y -i "${file}" -c:v libwebp -lossless 1 -q:v "${QUALITY}" "${out}"
      else
        ffmpeg -hide_banner -loglevel error -y -i "${file}" -c:v libwebp -q:v "${QUALITY}" "${out}"
      fi
      ;;
  esac

  if [[ "${KEEP_ORIGINALS}" != "1" ]]; then
    rm -f "${file}"
  fi
done < <("${FIND_CMD[@]}")

echo "Done."
