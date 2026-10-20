export async function platformRequest(path: string, authorization: string, body?: unknown) {
  const response = await fetch(`${Deno.env.get('PLATFORM_BASE_URL')}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      authorization,
      'x-api-key': Deno.env.get('PLATFORM_API_KEY') || '',
      'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error('Platform request failed');
  return response.json();
}
