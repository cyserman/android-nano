#!/data/data/com.termux/files/usr/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║   NanoClaw — Persistent Android AI Assistant Installer                 ║
# ║   Target: Samsung S24 Ultra via Termux                                 ║
# ║   Run this once inside Termux to install and daemonize NanoClaw        ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# WhatsApp Note: WhatsApp uses server-side webhooks. Your messages come
# through the webhook to your deployed app. No polling needed on device!

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
pkg install -y -q curl wget git python3 termux-api termux-services openssh
log "Termux packages installed"

# ── Step 2: Create NanoClaw directory ────────────────────────────────────────
step "Creating NanoClaw home"
mkdir -p "$NANOCLAW_DIR"
mkdir -p "$HOME/bin"
log "Directory: $NANOCLAW_DIR"

# ── Step 3: Configure ────────────────────────────────────────────────────────
step "Configuration"

if [ -f "$CONFIG_FILE" ]; then
  warn "Config exists at $CONFIG_FILE — skipping (delete to reconfigure)"
else
  echo ""
  echo -e "  ${BOLD}WhatsApp Setup (Meta Developer Console):${RESET}"
  echo "  1. Go to developers.facebook.com → My Apps → Create App"
  echo "  2. Select 'Other' → 'Business' → Create"
  echo "  3. Add WhatsApp product to your app"
  echo "  4. Get Phone Number ID and Access Token"
  echo ""
  echo -e "  Enter your settings (press Enter to skip optional items):"
  echo ""

  read -r -p "  NanoClaw URL [required]: " input_url
  read -r -p "  WhatsApp Phone Number ID [from Meta]: " input_wa_pnid
  read -r -p "  WhatsApp Access Token [from Meta]: " input_wa_token
  read -r -p "  Your WhatsApp phone number [+1234567890]: " input_wa_phone
  read -r -p "  WhatsApp Verify Token [any secret]: " input_wa_verify
  read -r -p "  OpenAI API Key [optional]: " input_openai

  cat > "$CONFIG_FILE" << ENVEOF
# NanoClaw Configuration
NANOCLAW_URL="${input_url:-$SERVICE_URL}"
WHATSAPP_PHONE_NUMBER_ID="${input_wa_pnid}"
WHATSAPP_ACCESS_TOKEN="${input_wa_token}"
WHATSAPP_AUTHORIZED_PHONE="${input_wa_phone}"
WHATSAPP_VERIFY_TOKEN="${input_wa_verify:-nanoclaw_verify_token}"
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

chmod +x "$HOME/bin/bin/nanoclaw" 2>/dev/null || true
chmod +x "$HOME/bin/nanoclaw"
log "nanoclaw CLI installed → run: nanoclaw 'your message'"

# ── Step 5: Daily brief cron ────────────────────────────────────────────────
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

# Send to WhatsApp if configured
if [ -n "\$WHATSAPP_ACCESS_TOKEN" ] && [ -n "\$WHATSAPP_AUTHORIZED_PHONE" ]; then
  curl -s -X POST "\${NANOCLAW_URL}/api/whatsapp/send" \
    -H "Content-Type: application/json" \
    -d "{\"to\": \"\$WHATSAPP_AUTHORIZED_PHONE\", \"message\": \"\$BRIEF\"}" > /dev/null 2>&1
fi

echo "[\$(date)] Daily brief sent" >> "\$HOME/.nanoclaw/nanoclaw.log"
BRIEFEOF

chmod +x "$BRIEF_SCRIPT"

# Install crontab (8AM daily brief)
(crontab -l 2>/dev/null; echo "0 8 * * * $BRIEF_SCRIPT") | crontab -
log "Daily brief scheduled at 08:00"

# ── Step 6: Termux boot service ─────────────────────────────────────────────
step "Configuring auto-start (optional)"

mkdir -p "$HOME/.termux/boot"

cat > "$HOME/.termux/boot/nanoclaw-start.sh" << BOOTEOF
#!/data/data/com.termux/files/usr/bin/bash
# Auto-starts NanoClaw services on Termux boot

source "\$HOME/.nanoclaw/config.env" 2>/dev/null

echo "[\$(date)] NanoClaw boot service started" >> "\$HOME/.nanoclaw/nanoclaw.log"

# Wake lock to prevent Android from killing processes
termux-wake-lock 2>/dev/null || true
BOOTEOF

chmod +x "$HOME/.termux/boot/nanoclaw-start.sh"
log "Boot service installed → install Termux:Boot from F-Droid for auto-start"

# ── Step 7: WhatsApp webhook verification ───────────────────────────────────
step "WhatsApp Webhook Setup"

echo ""
echo -e "  ${BOLD}To complete WhatsApp setup:${RESET}"
echo "  1. Go to your WhatsApp product in Meta Developer Console"
echo "  2. Navigate to Configuration → Webhooks"
echo "  3. Click 'Edit' and enter your callback URL:"
echo ""
echo -e "    ${CYAN}${NANOCLAW_URL}/api/telegram${RESET}"
echo ""
echo "  4. For 'Verify Token', use: ${WHATSAPP_VERIFY_TOKEN:-nanoclaw_verify_token}"
echo "  5. Click 'Verify and Save'"
echo "  6. Click 'Manage' next to your phone number → 'Edit' → Subscribe to webhooks"
echo "  7. Subscribe to: messages"
echo ""

# Verify webhook is reachable
log "Testing webhook endpoint..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${NANOCLAW_URL}/api/telegram" || echo "000")
if [ "$TEST_RESPONSE" = "200" ] || [ "$TEST_RESPONSE" = "403" ]; then
  log "Webhook endpoint is reachable (got HTTP $TEST_RESPONSE)"
else
  warn "Webhook may not be reachable (HTTP $TEST_RESPONSE)"
  warn "Make sure your app is deployed and the URL is correct"
fi

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
echo -e "  ${BOLD}WhatsApp:${RESET}"
echo -e "    Message your WhatsApp Business number"
echo -e "    NanoClaw will respond via the webhook"
echo ""
echo -e "  ${BOLD}Daily brief:${RESET}"
echo -e "    Auto-sends at 08:00 to your WhatsApp"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "    1. Configure WhatsApp webhook (see above)"
echo -e "    2. Set ${CYAN}OPENAI_API_KEY${RESET} in $CONFIG_FILE for full AI"
echo -e "    3. Install ${CYAN}Termux:Boot${RESET} from F-Droid for auto-start"
echo ""
