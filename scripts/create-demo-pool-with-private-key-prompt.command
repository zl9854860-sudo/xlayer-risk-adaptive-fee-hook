#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/deployments"
LOG_FILE="$LOG_DIR/create-pool-latest.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

echo "X Layer RiskAdaptiveFeeHook demo pool creation"
echo "Project: $PROJECT_DIR"
echo "Log: $LOG_FILE"
echo ""
echo "A secure local prompt will ask for the deployer private key."
echo "Use the same wallet that owns the Hook if you want the script to set demo risk data."
echo ""

PRIVATE_KEY="$(osascript <<'APPLESCRIPT'
set dlg to display dialog "请输入 X Layer 部署钱包私钥。\n\n建议使用刚才部署 Hook 的同一个钱包，这样脚本可以创建池子并设置 demo risk。\n私钥只用于本次命令，不会显示在聊天里，也不会写入 .env。" default answer "" with hidden answer buttons {"取消", "创建池子"} default button "创建池子" cancel button "取消"
return text returned of dlg
APPLESCRIPT
)"

if [ -z "$PRIVATE_KEY" ]; then
  echo "Private key was empty; pool creation stopped."
  exit 2
fi

echo "Starting demo pool creation..."
PRIVATE_KEY="$PRIVATE_KEY" npm run deploy:pool 2>&1 | tee "$LOG_FILE"

echo ""
echo "Pool creation command finished."
echo "Press Enter to close this window."
read _
