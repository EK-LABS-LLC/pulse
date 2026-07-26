set -euo pipefail

LOG_FILE="/tmp/pulse-bootstrap-scale.log"
rm -rf "${WAL_DIR}" "${WAL_SPAN_DIR}"

bun run pulse.ts >"${LOG_FILE}" 2>&1 &
PID=$!

cleanup() {
  kill "${PID}" 2>/dev/null || true
  wait "${PID}" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 40); do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
  if [ "$i" -eq 40 ]; then
    echo "Scale service failed to become healthy. Last logs:"
    tail -n 200 "${LOG_FILE}" || true
    exit 1
  fi
done

EMAIL="bootstrap-scale-$(date +%s)-${RANDOM}@pulse.test"
PASSWORD="BootstrapPass!123"
PROJECT_NAME="Bootstrap Scale Project"

SIGNUP_STATUS="$(curl -sS -o /tmp/bootstrap-scale-signup.body -w "%{http_code}" \
  -X POST "http://localhost:${PORT}/dashboard/api/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Bootstrap User\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"projectName\":\"${PROJECT_NAME}\"}")"
if [ "${SIGNUP_STATUS}" != "201" ]; then
  echo "Signup failed with status ${SIGNUP_STATUS}"
  cat /tmp/bootstrap-scale-signup.body || true
  tail -n 200 "${LOG_FILE}" || true
  exit 1
fi

SIGNIN_STATUS="$(curl -sS -D /tmp/bootstrap-scale-signin.headers -o /tmp/bootstrap-scale-signin.body -w "%{http_code}" \
  -X POST "http://localhost:${PORT}/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"
if [ "${SIGNIN_STATUS}" != "200" ]; then
  echo "Sign-in failed with status ${SIGNIN_STATUS}"
  cat /tmp/bootstrap-scale-signin.body || true
  tail -n 200 "${LOG_FILE}" || true
  exit 1
fi

SESSION_COOKIE="$(tr -d '\r' < /tmp/bootstrap-scale-signin.headers | sed -n 's/^set-cookie:[[:space:]]*\(better-auth\.session_token=[^;]*\).*/\1/ip' | head -n1)"
if [ -z "${SESSION_COOKIE}" ]; then
  echo "Expected Better Auth session cookie was not returned"
  cat /tmp/bootstrap-scale-signin.headers || true
  exit 1
fi

PROJECTS_STATUS="$(curl -sS -o /tmp/bootstrap-scale-projects.body -w "%{http_code}" \
  -H "Cookie: ${SESSION_COOKIE}" \
  "http://localhost:${PORT}/dashboard/api/projects")"
if [ "${PROJECTS_STATUS}" != "200" ]; then
  echo "Listing projects failed with status ${PROJECTS_STATUS}"
  cat /tmp/bootstrap-scale-projects.body || true
  tail -n 200 "${LOG_FILE}" || true
  exit 1
fi

grep -q "\"projects\"" /tmp/bootstrap-scale-projects.body
