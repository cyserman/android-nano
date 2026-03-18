#!/data/data/com.termux/files/usr/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║   NanoClaw — Persistent Android AI Assistant Installer                 ║
# ║   Target: Samsung S24 Ultra via Termux                                 ║
# ║   Run this once inside Termux to install and daemonize NanoClaw        ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -e

NANOCLAW_DIR="$HOME/.nanoclaw"
SERVICE_URL="${NANOCLAW_URL:-https://your-app-url.kiloapps.io}"
LOG_FILE="$NANOCLAW_DIR/nanoclaw.log"
PID_FILE="$NANOCLAW_DIR/nanoclaw.pid"
CONFIG_FILE="$NANOCLAW_DIR/config.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "  ███╗   ██╗ █████╗ ███╗   ██╗ ██████╗  ██████╗██╗      █████╗ ██╗    ██╗"
  echo "  ████╗  ██║██╔══██╗████╗  ██║██╔═══██╗██╔════╝██║     ██╔══██╗██║    ██║"
  echo "  ██╔██╗ ██║███████║██╔██╗ ██║██║   ██║██║     ██║     ███████║██║ █╗ ██║"
  echo "  ██║╚██╗██║██╔══██║██║╚██╗██║██║   ██║██║     ██║     ██╔══██║██║███╗██║"
  echo "  ██║ ╚████║██║  ██║██║ ╚████║╚██████╔╝╚██████╗███████╗██║  ██║╚███╔███╔╝"
  echo "  ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ "
  echo -e "${RESET}"
  echo -e "  ${BOLD}Persistent AI Assistant for S24 Ultra${RESET}"
  echo ""
}

log() { echo -e "${GREEN}[✓]${RESET} $1"; }
warn() { echo -e "${YELLOW}[!]${RESET} $1"; }
err() { echo -e "${RED}[✗]${RESET} $1"; }
step() { echo -e "\n${BOLD}${CYAN}━━ $1 ━━${RESET}"; }

# ── Step 1: Bootstrap Termux packages ────────────────────────────────────────
step "Bootstrapping Termux"
pkg update -y -q && pkg upgrade -y -q
pkg install -y -q curl wget git nodejs-lts python termux-api termux-services
log "Termux packages installed"

# ── Step 2: Create NanoClaw directory ────────────────────────────────────────
step "Creating NanoClaw home"
mkdir -p "$NANOCLAW_DIR"
log "Directory: $NANOCLAW_DIR"

# ── Step 3: Configure ────────────────────────────────────────────────────────
step "Configuration"

if [ -f "$CONFIG_FILE" ]; then
  warn "Config exists at $CONFIG_FILE — skipping (delete to reconfigure)"
else
  echo ""
  echo -e "  Enter your settings (press Enter to skip optional items):"
  echo ""

  read -r -p "  NanoClaw URL [required]: " input_url
  read -r -p "  Telegram Bot Token [optional]: " input_tg_token
  read -r -p "  Your Telegram Chat ID [optional]: " input_tg_chat
  read -r -p "  OpenAI API Key [optional]: " input_openai

  cat > "$CONFIG_FILE" << ENVEOF
# NanoClaw Configuration
NANOCLAW_URL="${input_url:-$SERVICE_URL}"
TELEGRAM_BOT_TOKEN="${input_tg_token}"
TELEGRAM_CHAT_ID="${input_tg_chat}"
OPENAI_API_KEY="${input_openai}"
NANOCLAW_VERSION="1.0.0"
ENVEOF

  log "Config written to $CONFIG_FILE"
fi

source "$CONFIG_FILE"

# ── Step 4: Install nanoclaw CLI ─────────────────────────────────────────────
step "Installing NanoClaw CLI"

cat > "$HOME/bin/nanoclaw" << 'CLIPEOF'
#!/data/data/com.termux/files/usr/bin/bash
# NanoClaw CLI — talk to your assistant from Termux

source "$HOME/.nanoclaw/config.env" 2>/dev/null

URL="${NANOCLAW_URL}"
SESSION="termux_$(hostname)_$(whoami)"

if [ -z "$1" ]; then
  echo "Usage: nanoclaw <message>"
  echo "  e.g. nanoclaw 'what should I work on today?'"
  exit 0
fi

MESSAGE="$*"

RESPONSE=$(curl -s -X POST "$URL/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$MESSAGE\", \"sessionId\": \"$SESSION\", \"channel\": \"web\"}")

if command -v jq &>/dev/null; then
  echo "$RESPONSE" | jq -r '.message // .error // "No response"'
else
  echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', d.get('error','No response')))"
fi
CLIPEOF

chmod +x "$HOME/bin/nanoclaw"
mkdir -p "$HOME/bin"
log "nanoclaw CLI installed → run: nanoclaw 'your message'"

# ── Step 5: Telegram daemon ───────────────────────────────────────────────────
step "Setting up persistent Telegram webhook poller"

cat > "$NANOCLAW_DIR/telegram-poll.sh" << 'POLLEOF'
#!/data/data/com.termux/files/usr/bin/bash
# Telegram long-poll daemon for NanoClaw
# Runs continuously — survives screen/tmux sessions

source "$HOME/.nanoclaw/config.env" 2>/dev/null

TOKEN="$TELEGRAM_BOT_TOKEN"
URL="${NANOCLAW_URL}"
OFFSET=0
LOG="$HOME/.nanoclaw/nanoclaw.log"

[ -z "$TOKEN" ] && { echo "No TELEGRAM_BOT_TOKEN set" >> "$LOG"; exit 1; }

echo "[$(date)] NanoClaw Telegram daemon started" >> "$LOG"

while true; do
  UPDATES=$(curl -s "https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${OFFSET}&timeout=30&allowed_updates=[\"message\",\"callback_query\"]")

  RESULT_COUNT=$(echo "$UPDATES" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  r=d.get('result',[])
  print(len(r))
  for u in r:
    print('UPDATE',u.get('update_id',''))
except:
  print(0)
" 2>/dev/null | head -1)

  if [ "$RESULT_COUNT" -gt "0" ] 2>/dev/null; then
    # Forward each update to NanoClaw webhook handler
    echo "$UPDATES" | python3 -c "
import sys,json,subprocess,urllib.request

data=json.load(sys.stdin)
results=data.get('result',[])
for u in results:
  body=json.dumps(u).encode()
  req=urllib.request.Request(
    '${URL}/api/telegram',
    data=body,
    headers={'Content-Type':'application/json'},
    method='POST'
  )
  try:
    urllib.request.urlopen(req, timeout=10)
  except Exception as e:
    pass
  print('OFFSET', u.get('update_id',0)+1)
" 2>>"$LOG" | while read -r line; do
      [[ "$line" == OFFSET* ]] && OFFSET="${line#OFFSET }"
    done
  fi

  sleep 1
done
POLLEOF

chmod +x "$NANOCLAW_DIR/telegram-poll.sh"
log "Telegram poller script created"

# ── Step 6: Daily brief cron ──────────────────────────────────────────────────
step "Scheduling daily brief"

BRIEF_SCRIPT="$NANOCLAW_DIR/daily-brief.sh"
cat > "$BRIEF_SCRIPT" << BRIEFEOF
#!/data/data/com.termux/files/usr/bin/bash
source "\$HOME/.nanoclaw/config.env" 2>/dev/null
BRIEF=\$(curl -s "\${NANOCLAW_URL}/api/assistant" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Generate my daily brief with tasks and opportunities","sessionId":"daily_brief","channel":"web"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','Brief unavailable'))")

# Send to Telegram if configured
if [ -n "\$TELEGRAM_BOT_TOKEN" ] && [ -n "\$TELEGRAM_CHAT_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"\$TELEGRAM_CHAT_ID\", \"text\": \"\$BRIEF\", \"parse_mode\": \"Markdown\"}" > /dev/null
fi

echo "[\$(date)] Daily brief sent" >> "\$HOME/.nanoclaw/nanoclaw.log"
BRIEFEOF

chmod +x "$BRIEF_SCRIPT"

# Install crontab (8AM daily brief)
(crontab -l 2>/dev/null; echo "0 8 * * * $BRIEF_SCRIPT") | crontab -
log "Daily brief scheduled at 08:00"

# ── Step 7: Termux boot service ───────────────────────────────────────────────
step "Configuring auto-start on device boot"

mkdir -p "$HOME/.termux/boot"

cat > "$HOME/.termux/boot/nanoclaw-start.sh" << BOOTEOF
#!/data/data/com.termux/files/usr/bin/bash
# Auto-starts NanoClaw daemon on Termux:Boot

source "\$HOME/.nanoclaw/config.env" 2>/dev/null

# Start Telegram polling daemon in background
nohup "\$HOME/.nanoclaw/telegram-poll.sh" >> "\$HOME/.nanoclaw/nanoclaw.log" 2>&1 &
echo \$! > "\$HOME/.nanoclaw/nanoclaw.pid"

echo "[\$(date)] NanoClaw daemon started (PID: \$!)" >> "\$HOME/.nanoclaw/nanoclaw.log"

# Wake lock to prevent Android from killing the process
termux-wake-lock 2>/dev/null || true
BOOTEOF

chmod +x "$HOME/.termux/boot/nanoclaw-start.sh"
log "Boot service installed → install Termux:Boot from F-Droid for auto-start"

# ── Step 8: Start daemon now ──────────────────────────────────────────────────
step "Starting NanoClaw daemon"

# Kill existing instance
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
fi

nohup "$NANOCLAW_DIR/telegram-poll.sh" >> "$LOG_FILE" 2>&1 &
DAEMON_PID=$!
echo "$DAEMON_PID" > "$PID_FILE"
log "Daemon started (PID: $DAEMON_PID)"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   NanoClaw Installed Successfully! 🧠            ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Usage:${RESET}"
echo -e "    ${CYAN}nanoclaw 'what should I work on today?'${RESET}"
echo -e "    ${CYAN}nanoclaw 'find me a revenue opportunity'${RESET}"
echo -e "    ${CYAN}nanoclaw 'help me debug this Python script'${RESET}"
echo ""
echo -e "  ${BOLD}Daemon:${RESET}"
echo -e "    Status:  ${CYAN}cat $LOG_FILE${RESET}"
echo -e "    Stop:    ${CYAN}kill \$(cat $PID_FILE)${RESET}"
echo -e "    Restart: ${CYAN}bash $NANOCLAW_DIR/telegram-poll.sh &${RESET}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "    1. Install ${CYAN}Termux:Boot${RESET} from F-Droid"
echo -e "    2. Open Telegram → find your bot → /start"
echo -e "    3. Set ${CYAN}OPENAI_API_KEY${RESET} in $CONFIG_FILE for full AI"
echo ""
