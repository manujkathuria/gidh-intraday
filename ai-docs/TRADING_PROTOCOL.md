# Gidh Intraday AI Agent & Peer Trading Protocol Manual

> **Contract & Operating Blueprint**: Living protocol document for `gidh.tech`. Steps and execution rules will be documented sequentially as we trade today.

---

## 1. 08:45 AM — Morning Authentication & System Health Protocol

Before market open, verify Zerodha authentication, backend connectivity, and Redis memory cache:

1. **Automated TOTP Login & Token Refresh**:
   ```bash
   # Generates fresh daily token via TOTP secret and updates .env
   cd backend && go run ./cmd/gidh-auth
   ```

2. **Re-initialize Backend Daemon**:
   ```bash
   # Restarts container to reload token and establish Kite Ticker WebSocket connection
   docker restart gidh-backend
   ```

3. **Verify Redis Cache & Connectivity**:
   ```bash
   # Confirm Redis tick cache and live order bus are online
   docker exec gidh-redis redis-cli ping
   ```

4. **Health Check Verification Checklist**:
   - `[ORDER MANAGER] Production mode: Connected to Zerodha live broker & ticker.`
   - `[WEBSOCKET TICKER] Connected to Zerodha Kite Ticker Stream.`
   - `[Redis] Connected successfully.`

---

*(Additional steps and live trading checkpoints will be added as we execute throughout today's session.)*
