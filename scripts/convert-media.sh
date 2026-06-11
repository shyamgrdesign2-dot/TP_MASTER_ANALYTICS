#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'EOF'
Usage: scripts/convert-media.sh [--webp] [--overwrite] [files...]

Converts GIFs and other video files to WebM and MP4 (H.264), optimized for web delivery.
If --webp is provided, GIFs also get an animated WebP output (useful for CSS backgrounds).

Examples:
  scripts/convert-media.sh --webp src/assets/images/gen-rx-bg.gif
  scripts/convert-media.sh src/assets/images/*.gif
  scripts/convert-media.sh --overwrite src/assets/videos/*.mov
EOF
}

webp=false
overwrite=false
inputs=()

if ffmpeg -hide_banner -encoders 2>/dev/null | rg -q "libwebp"; then
  has_webp=true
else
  has_webp=false
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    --webp)
      webp=true
      shift
      ;;
    --overwrite)
      overwrite=true
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
    *)
      inputs+=("$1")
      shift
      ;;
  esac
done

if [[ ${#inputs[@]} -eq 0 ]]; then
  while IFS= read -r line; do
    inputs+=("$line")
  done < <(rg --files -g '*.gif' src/assets)
fi

if [[ ${#inputs[@]} -eq 0 ]]; then
  echo "No input files found." >&2
  exit 1
fi

ensure_even_scale="scale=trunc(iw/2)*2:trunc(ih/2)*2"

for input in "${inputs[@]}"; do
  if [[ ! -f "$input" ]]; then
    echo "Skipping missing file: $input" >&2
    continue
  fi

  ext="${input##*.}"
  base="${input%.*}"
  webm_out="${base}.webm"
  mp4_out="${base}.mp4"
  webp_out="${base}.webp"

  if [[ "$ext" == "webm" ]]; then
    echo "Skipping WebM output for WebM input: $input"
  elif [[ -f "$webm_out" && "$overwrite" == "false" ]]; then
    echo "Skipping existing: $webm_out"
  else
    if ffmpeg -y -i "$input" \
      -c:v libvpx-vp9 -b:v 0 -crf 32 -pix_fmt yuv420p \
      -vf "$ensure_even_scale" \
      "$webm_out" >/dev/null 2>&1; then
      echo "Created: $webm_out"
    else
      echo "Failed to create: $webm_out" >&2
      continue
    fi
  fi

  if [[ -f "$mp4_out" && "$overwrite" == "false" ]]; then
    echo "Skipping existing: $mp4_out"
  else
    if ffmpeg -y -i "$input" \
      -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p \
      -vf "$ensure_even_scale" -movflags +faststart \
      "$mp4_out" >/dev/null 2>&1; then
      echo "Created: $mp4_out"
    else
      echo "Failed to create: $mp4_out" >&2
      continue
    fi
  fi

  if [[ "$webp" == "true" && "$ext" == "gif" && "$has_webp" == "true" ]]; then
    if [[ -f "$webp_out" && "$overwrite" == "false" ]]; then
      echo "Skipping existing: $webp_out"
    else
      if ffmpeg -y -i "$input" \
        -vcodec libwebp -loop 0 -compression_level 6 -q:v 75 \
        "$webp_out" >/dev/null 2>&1; then
        echo "Created: $webp_out"
      else
        echo "Failed to create: $webp_out" >&2
      fi
    fi
  elif [[ "$webp" == "true" && "$ext" == "gif" && "$has_webp" == "false" ]]; then
    echo "Skipping WebP (libwebp encoder not available): $input"
  fi
done
