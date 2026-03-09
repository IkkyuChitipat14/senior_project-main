const CLEARPASS_BASE_URL = "https://clearpass.mfu.ac.th:443/api";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export async function allowInternetForMac(mac: string, extendHours = 1): Promise<any> {
  const normalizedMac = mac.replace(/-/g, ":").toLowerCase();
  console.log(`[ClearPass] ⏱️ Start - mac=${mac}, normalized=${normalizedMac}, extendHours=${extendHours}`);

  const username = process.env.CLEARPASS_USERNAME;
  const password = process.env.CLEARPASS_PASSWORD;
  const clientId = process.env.CLEARPASS_CLIENT_ID;

  if (!username || !password || !clientId) {
    throw new Error("Missing ClearPass credentials (CLEARPASS_USERNAME, PASSWORD, CLIENT_ID)");
  }

  // STEP 1: Authenticate
  const tokenUrl = `${CLEARPASS_BASE_URL}/oauth`;
  const authResp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      username,
      password,
      client_id: clientId, // fixed: now correctly uses env value
    }),
  });

  if (!authResp.ok) {
    const txt = await authResp.text().catch(() => "");
    throw new Error(`[ClearPass] ❌ Auth failed: ${authResp.status} ${txt}`);
  }

  const { access_token: token } = await authResp.json();
  if (!token) throw new Error("[ClearPass] ❌ No access_token received");

  console.log("[ClearPass] ✅ Auth success");

  // STEP 2: PATCH endpoint to update Allow-Guest-Internet + Expiry
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + extendHours);

  const patchData = {
    mac_address: normalizedMac,
    description: "updated by ThaiD backend",
    status: "Known",
    attributes: {
      "Allow-Guest-Internet": "true",
      "MAC-Auth Expiry": formatDate(expiry),
    },
  };

  const patchUrl = `${CLEARPASS_BASE_URL}/endpoint/mac-address/${encodeURIComponent(normalizedMac)}`;
  const patchResp = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patchData),
  });

  if (!patchResp.ok) {
    const txt = await patchResp.text().catch(() => "");
    throw new Error(`[ClearPass] ❌ PATCH failed: ${patchResp.status} ${txt}`);
  }

  console.log(`[ClearPass] ✅ PATCH success for mac=${normalizedMac} with expiry=${patchData.attributes["MAC-Auth Expiry"]}`);

  // STEP 3: Disconnect old session (force refresh)
  const disconnectUrl = `${CLEARPASS_BASE_URL}/session-action/disconnect/mac/${encodeURIComponent(normalizedMac)}?async=true`;
  const disconnectResp = await fetch(disconnectUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filter: { mac_address: normalizedMac } }),
  });

  const disconnectData = await disconnectResp.json().catch(() => ({}));
  if (!disconnectResp.ok) {
    throw new Error(`[ClearPass] ❌ Disconnect failed: ${disconnectResp.status} ${JSON.stringify(disconnectData)}`);
  }

  console.log(`[ClearPass] ✅ Disconnect accepted for mac=${normalizedMac}`, disconnectData);
  return disconnectData;
}
