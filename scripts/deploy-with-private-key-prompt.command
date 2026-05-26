#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/deployments"
LOG_FILE="$LOG_DIR/deploy-latest.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

echo "X Layer RiskAdaptiveFeeHook deployment"
echo "Project: $PROJECT_DIR"
echo "Log: $LOG_FILE"
echo ""
echo "A secure local prompt will ask for the deployer private key."
echo "The key is used only as an environment variable for this process."
echo ""

PRIVATE_KEY="$(osascript <<'APPLESCRIPT'
set dlg to display dialog "请输入 X Layer 部署钱包私钥。\n\n私钥只用于本次部署命令，不会显示在聊天里，也不会写入 .env。\n钱包需要有少量 X Layer 主网 OKB 作为 gas。" default answer "" with hidden answer buttons {"取消", "部署"} default button "部署" cancel button "取消"
return text returned of dlg
APPLESCRIPT
)"

if [ -z "$PRIVATE_KEY" ]; then
  echo "Private key was empty; deployment stopped."
  exit 2
fi

echo "Starting deployment..."
echo "Private key is set in process memory only; it will not be printed."
echo ""

PRIVATE_KEY="$PRIVATE_KEY" npm run deploy:xlayer 2>&1 | tee "$LOG_FILE"

echo ""
echo "Deployment command finished."
echo "Press Enter to close this window."
read _
