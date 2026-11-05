import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, lerToken, removerToken, salvarToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function restaurarSessao() {
      try {
        const tokenSalvo = await lerToken();
        if (tokenSalvo) {
          const resposta = await api('/auth/perfil', { token: tokenSalvo });
          if (ativo) {
            setToken(tokenSalvo);
            setUsuario(resposta.usuario);
          }
        }
      } catch (error) {
        if (error.status === 401) {
          await removerToken();
        } else {
          const tokenSalvo = await lerToken();
          if (ativo) setToken(tokenSalvo);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    restaurarSessao();
    return () => { ativo = false; };
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const resposta = await api('/auth/login', { method: 'POST', body: { email, senha } });
    await salvarToken(resposta.token);
    setToken(resposta.token);
    setUsuario(resposta.usuario);
    return resposta.usuario;
  }, []);

  const cadastrar = useCallback(async (dados) => {
    const resposta = await api('/auth/cadastro', { method: 'POST', body: dados });
    await salvarToken(resposta.token);
    setToken(resposta.token);
    setUsuario(resposta.usuario);
    return resposta.usuario;
  }, []);

  const sair = useCallback(async () => {
    await removerToken();
    setToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ token, usuario, carregando, entrar, cadastrar, sair }), [
    token, usuario, carregando, entrar, cadastrar, sair,
  ]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return contexto;
}
