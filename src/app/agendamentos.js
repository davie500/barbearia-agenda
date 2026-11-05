import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AgendamentosScreen() {
  const { token, usuario } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const dados = await api('/agendamentos', { token });
    setAgendamentos(dados);
    setErro('');
  }, [token]);

  useEffect(() => {
    let ativo = true;
    async function carregarAgendamentos() {
      try {
        const dados = await api('/agendamentos', { token });
        if (ativo) setAgendamentos(dados);
      } catch (error) {
        if (ativo) setErro(error.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregarAgendamentos();
    return () => { ativo = false; };
  }, [token]);

  async function acao(id, caminho, body) {
    setErro('');
    try {
      await api(`/agendamentos/${id}`, { method: caminho, token, body });
      await carregar();
    } catch (error) {
      setErro(error.message);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Agendamentos</Text>
      {usuario?.tipo_usuario === 'CLIENTE' ? <Link href="/agendamento" style={styles.link}>Marcar novo horário</Link> : null}
      {carregando ? <ActivityIndicator color="#f3c76a" style={styles.loader} /> : null}
      {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
      {!carregando && !erro && agendamentos.length === 0 ? <Text style={styles.muted}>Você ainda não tem agendamentos.</Text> : null}
      {agendamentos.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.service}>{item.servico}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
          <Text style={styles.details}>{String(item.data_hora_inicio).slice(0, 16)} · {item.barbeiro}</Text>
          {usuario?.tipo_usuario === 'ADMINISTRADOR' ? <Text style={styles.muted}>Cliente: {item.cliente} · {item.telefone}</Text> : null}
          <Text style={styles.price}>R$ {Number(item.preco).toFixed(2).replace('.', ',')}</Text>
          {usuario?.tipo_usuario === 'CLIENTE' && !['Cancelado', 'Finalizado'].includes(item.status)
            ? <Pressable onPress={() => acao(item.id, 'DELETE')} style={styles.action}><Text style={styles.actionText}>Cancelar agendamento</Text></Pressable>
            : null}
          {usuario?.tipo_usuario === 'BARBEIRO' && item.status !== 'Finalizado' && item.status !== 'Cancelado'
            ? <Pressable onPress={() => {
              const next = item.status === 'Agendado' ? 'Confirmado' : item.status === 'Confirmado' ? 'Em atendimento' : 'Finalizado';
              acao(item.id, 'PUT', { status: next });
            }} style={styles.action}><Text style={styles.actionText}>{item.status === 'Agendado' ? 'Confirmar' : item.status === 'Confirmado' ? 'Iniciar atendimento' : 'Finalizar atendimento'}</Text></Pressable>
            : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101010' },
  container: { padding: 22, paddingBottom: 36 },
  title: { color: '#f5f3ef', fontSize: 27, fontWeight: '700', marginBottom: 14 },
  loader: { marginVertical: 22 },
  card: { backgroundColor: '#1b1b1b', borderColor: '#2d2a24', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  service: { color: '#f5f3ef', fontSize: 16, fontWeight: '700', flex: 1 },
  status: { color: '#f3c76a', fontSize: 12, fontWeight: '600' },
  details: { color: '#d2cec7', fontSize: 14 },
  muted: { color: '#a6a19a', fontSize: 13, lineHeight: 20 },
  price: { color: '#f3c76a', fontSize: 14, fontWeight: '700' },
  action: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#49443b', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginTop: 3 },
  actionText: { color: '#f3c76a', fontSize: 13, fontWeight: '600' },
  link: { color: '#f3c76a', fontSize: 14, marginBottom: 10 },
  error: { color: '#ff8f82', marginTop: 12 },
});
