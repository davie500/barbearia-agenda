import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = String(process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'barberapp.jwt';

export async function api(path, { method = 'GET', body, token } = {}) {
  if (!API_URL) {
    throw new Error('Configure EXPO_PUBLIC_API_URL no arquivo .env antes de conectar ao backend.');
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique o endereço e se o backend está ativo.');
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.erro ?? 'Ocorreu um erro ao processar a solicitação.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function salvarToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function lerToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removerToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
