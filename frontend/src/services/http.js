import config from '../config';
import { getToken } from './token';

export async function httpRequest(path, { method = 'GET', body, headers = {} } = {}) {
	const token = getToken();
	const isJson = body && !(body instanceof FormData);
	const finalHeaders = { ...headers };
	if (isJson) finalHeaders['Content-Type'] = 'application/json';
	if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${config.apiBaseUrl}${path}`, {
            method,
            headers: finalHeaders,
            body: isJson ? JSON.stringify(body) : body,
            // We authenticate via Authorization header; no cookies needed.
            // Dropping credentials avoids strict CORS requirements that can cause Failed to fetch.
            credentials: 'omit',
        });
    } catch (e) {
        throw new Error('Network error: unable to reach API');
    }

	const contentType = response.headers.get('content-type') || '';
	const isJsonResponse = contentType.includes('application/json');
	const data = isJsonResponse ? await response.json() : await response.text();

	if (!response.ok) {
		const message = isJsonResponse ? (data?.message || 'Request failed') : (data || 'Request failed');
		throw new Error(message);
	}

	return data;
}


