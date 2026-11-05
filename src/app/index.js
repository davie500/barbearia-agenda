import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function HomeScreen() {
  const { usuario } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([api('/servicos'), api('/barbeiros')])
      .then(([listaServicos, listaBarbeiros]) => {
        if (ativo) {
          setServicos(listaServicos);
          setBarbeiros(listaBarbeiros);
        }
      })
      .catch((error) => { if (ativo) setErro(error.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandInitial}>B</Text></View>
        <Text style={styles.eyebrow}>CUIDADO CLÁSSICO, NO SEU TEMPO</Text>
        <Text style={styles.title}>BarberApp</Text>
        <Text style={styles.subtitle}>Seu próximo corte começa com um horário organizado.</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.sectionTitle}>Um bom corte começa com hora marcada.</Text>
        <Text style={styles.muted}>Escolha um serviço, seu barbeiro e um horário disponível.</Text>
        {usuario?.tipo_usuario === 'CLIENTE'
          ? <Link href="/agendamento" asChild><ActionButton title="Agendar horário" onPress={() => {}} /></Link>
          : <Link href={usuario ? '/painel' : '/login'} asChild><ActionButton title={usuario ? 'Abrir meu painel' : 'Entrar para agendar'} onPress={() => {}} /></Link>}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Serviços</Text>
        <Text style={styles.mutedSmall}>Disponíveis na barbearia</Text>
      </View>
      {carregando ? <ActivityIndicator color="#f3c76a" /> : null}
      {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
      {!carregando && !erro && servicos.length === 0
        ? <Text style={styles.muted}>Nenhum serviço cadastrado ainda.</Text>
        : servicos.map((servico) => (
          <View key={servico.id} style={styles.listCard}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{servico.nome}</Text>
              <Text style={styles.mutedSmall}>{servico.duracao_minutos} min</Text>
            </View>
            <Text style={styles.price}>R$ {Number(servico.preco).toFixed(2).replace('.', ',')}</Text>
          </View>
        ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Barbeiros</Text>
      </View>
      {!carregando && !erro && barbeiros.length === 0
        ? <Text style={styles.muted}>Nenhum barbeiro cadastrado ainda.</Text>
        : barbeiros.map((barbeiro) => (
          <View key={barbeiro.id} style={styles.listCard}>
            <Text style={styles.itemTitle}>{barbeiro.nome}</Text>
            <Text style={styles.gold}>BARBEIRO</Text>
          </View>
        ))}

      <View style={styles.footerLinks}>
        {usuario
          ? <><Link href="/agendamentos" style={styles.link}>Meus agendamentos</Link><Link href="/painel" style={styles.link}>Meu perfil e painel</Link></>
          : <><Link href="/login" style={styles.link}>Entrar</Link><Link href="/cadastro" style={styles.link}>Criar conta</Link></>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101010' },
  container: { padding: 22, paddingTop: 26, paddingBottom: 36 },
  header: { paddingTop: 18, paddingBottom: 24 },
  brandMark: { width: 48, height: 48, borderColor: '#f3c76a', borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  brandInitial: { color: '#f3c76a', fontSize: 25, fontWeight: '700' },
  eyebrow: { color: '#f3c76a', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#f5f3ef', fontSize: 34, fontWeight: '700', marginTop: 7 },
  subtitle: { color: '#a6a19a', fontSize: 15, lineHeight: 22, marginTop: 8 },
  heroCard: { backgroundColor: '#1b1b1b', borderColor: '#2d2a24', borderWidth: 1, borderRadius: 22, padding: 19, gap: 12 },
  sectionHeader: { marginTop: 28, marginBottom: 12 },
  sectionTitle: { color: '#f5f3ef', fontSize: 19, fontWeight: '600' },
  muted: { color: '#a6a19a', fontSize: 14, lineHeight: 21 },
  mutedSmall: { color: '#948f87', fontSize: 12, marginTop: 5 },
  listCard: { backgroundColor: '#1b1b1b', borderRadius: 15, padding: 15, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  itemTitle: { color: '#f5f3ef', fontSize: 15, fontWeight: '600' },
  price: { color: '#f3c76a', fontSize: 15, fontWeight: '700' },
  gold: { color: '#f3c76a', fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  error: { color: '#ff8f82', marginTop: 8 },
  footerLinks: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 20, gap: 12 },
  link: { color: '#f3c76a', fontSize: 13 },
});
