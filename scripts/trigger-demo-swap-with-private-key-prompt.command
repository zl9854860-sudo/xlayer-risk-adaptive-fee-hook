#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/deployments"
LOG_FILE="$LOG_DIR/trigger-swap-latest.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

echo "X Layer RiskAdaptiveFeeHook real swap trigger"
echo "Project: $PROJECT_DIR"
echo "Log: $LOG_FILE"
echo ""
echo "A secure local prompt will ask for the deployer private key."
echo "Use the same wallet that holds the demo tokens."
echo ""

PRIVATE_KEY="$(osascript <<'APPLESCRIPT'
set dlg to display dialog "请输入 X Layer 钱包私钥。\n\n建议使用刚才创建 demo pool 的同一个钱包，因为它持有 RISKX/xUSD。\n私钥只用于本次命令，不会显示在聊天里，也不会写入 .env。" default answer "" with hidden answer buttons {"取消", "触发 swap"} default button "触发 swap" cancel button "取消"
return text returned of dlg
APPLESCRIPT
)"

if [ -z "$PRIVATE_KEY" ]; then
  echo "Private key was empty; swap trigger stopped."
  exit 2
fi

echo "Starting real swap trigger..."
PRIVATE_KEY="$PRIVATE_KEY" npm run trigger:swap 2>&1 | tee "$LOG_FILE"

echo ""
echo "Swap trigger command finished."
echo "Press Enter to close this window."
read _
