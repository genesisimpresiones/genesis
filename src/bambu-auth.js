export async function loginBambuCloud({
  account,
  password = '',
  code = '',
  baseUrl = 'https://api.bambulab.com',
}) {
  if (!account) throw new Error('Bambu account is required');
  if (!password && !code) throw new Error('Bambu password or verification code is required');
  if (password && code) throw new Error('Use password or verification code, not both');

  const endpoint = new URL('/v1/user-service/user/login', baseUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'GenesisLanding/0.1 (+https://github.com/Doridian/OpenBambuAPI)',
    },
    body: JSON.stringify({
      account,
      ...(password ? { password } : {}),
      ...(code ? { code } : {}),
    }),
  });

  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) {
    throw new Error(`Bambu login returned ${response.status}: ${payload?.message ?? text}`);
  }

  if (payload?.loginType === 'verifyCode' && !payload.accessToken) {
    return {
      ok: false,
      loginType: 'verifyCode',
      message: 'Bambu requires a verification code for this account.',
      raw: payload,
    };
  }

  if (!payload?.accessToken) {
    throw new Error(payload?.message ?? 'Bambu login did not return accessToken');
  }

  return {
    ok: true,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? payload.accessToken,
    expiresIn: payload.expiresIn ?? null,
    loginType: payload.loginType ?? '',
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
