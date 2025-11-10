import { jwtDecode } from 'jwt-decode';
import { httpRequest } from './http';
import { setToken, clearToken, getToken } from './token';

export async function loginApi({ email, password }) {
	const data = await httpRequest('/auth/login', { method: 'POST', body: { email, password } });
	// Expecting { token: '...' }
	if (!data?.token) throw new Error('Invalid login response');
	setToken(data.token);
	return data.token;
}

export async function signupApi({ name, email, password }) {
	const data = await httpRequest('/auth/signup', { method: 'POST', body: { name, email, password } });
	// Expecting { token: '...' } upon successful signup/login flow
	if (data?.token) setToken(data.token);
	return data;
}

export function logout() {
	clearToken();
}

export function decodeToken(token = getToken()) {
	if (!token) return null;
	try {
		return jwtDecode(token);
	} catch {
		return null;
	}
}

export function getRoleFromToken(token = getToken()) {
	const payload = decodeToken(token);
	if (!payload) return null;
	// Accept common claim names
	return payload.role || payload.roles?.[0] || payload.userRole || null;
}


