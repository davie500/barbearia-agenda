import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function dataHoje() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

export default function AgendamentoScreen() {
  const { token, usuario } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [servico, setServico] = useState(null);
  const [barbeiro, setBarbeiro] = useState(null);
  const [data, setData] = useState(dataHoje());
  const [horarios, setHorarios] = useState([]);
  const [horario, setHorario] = useState('');
  const [confirmacao, setConfirmacao] = useState(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);
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
      .finally(() => { if (ativo) setCarregandoDados(false); });
    return () => { ativo = false; };
  }, []);

  async function consultarDisponibilidade() {
    setErro('');
    setHorario('');
    setHorarios([]);
    setConfirmacao(null);
    if (!servico || !barbeiro || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      setErro('Escolha um serviço, barbeiro e data válida (AAAA-MM-DD).');
      return;
    }
    setConsultando(true);
    try {
      const consulta = new URLSearchParams({
        servico_id: String(servico.id), barbeiro_id: String(barbeiro.id), data,
      });
      const resposta = await api(`/agendamentos/disponibilidade?${consulta.toString()}`);
      setHorarios(resposta.horarios);
      if (!resposta.horarios.length) setErro('Não há horários disponíveis nesta data.');
    } catch (error) {
      setErro(error.message);
    } finally {
      setConsultando(false);
    }
  }

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      const resposta = await api('/agendamentos', {
        method: 'POST', token,
        body: { servico_id: servico.id, barbeiro_id: barbeiro.id, data, horario },
      });
      setConfirmacao(resposta);
      setHorarios((atuais) => atuais.filter((item) => item !== horario));
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  if (usuario?.tipo_usuario !== 'CLIENTE') {
    return <View style={styles.container}><Text style={styles.title}>Agendamento para clientes</Text><Text style={styles.muted}>Entre com uma conta de cliente para reservar um horário.</Text><Link href="/login" style={styles.link}>Entrar</Link></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Agende seu horário</Text>
      <Text style={styles.muted}>A disponibilidade é consultada no sistema antes da confirmação.</Text>
      {carregandoDados ? <ActivityIndicator color="#f3c76a" style={styles.loader} /> : null}

      <Text style={styles.section}>1. Escolha um serviço</Text>
      {servicos.map((item) => (
        <Pressable key={item.id} onPress={() => { setServico(item); setHorario(''); setHorarios([]); setConfirmacao(null); }} style={[styles.option, servico?.id === item.id && styles.selected]}>
          <View style={styles.flex}><Text style={styles.optionTitle}>{item.nome}</Text><Text style={styles.mutedSmall}>{item.duracao_minutos} min</Text></View>
          <Text style={styles.gold}>R$ {Number(item.preco).toFixed(2).replace('.', ',')}</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>2. Escolha um barbeiro</Text>
      <View style={styles.chips}>
        {barbeiros.map((item) => <Pressable key={item.id} onPress={() => { setBarbeiro(item); setHorario(''); setHorarios([]); setConfirmacao(null); }} style={[styles.chip, barbeiro?.id === item.id && styles.chipSelected]}><Text style={[styles.chipText, barbeiro?.id === item.id && styles.gold]}>{item.nome}</Text></Pressable>)}
      </View>

      <Text style={styles.section}>3. Escolha a data</Text>
      <FormField label="Data (AAAA-MM-DD)" value={data} onChangeText={(valor) => { setData(valor); setHorario(''); setHorarios([]); setConfirmacao(null); }} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
      <ActionButton title="Consultar horários" loading={consultando} onPress={consultarDisponibilidade} />

      {horarios.length > 0 ? <>
        <Text style={styles.section}>4. Horários disponíveis</Text>
        <View style={styles.chips}>{horarios.map((item) => <Pressable key={item} onPress={() => setHorario(item)} style={[styles.chip, horario === item && styles.chipSelected]}><Text style={[styles.chipText, horario === item && styles.gold]}>{item}</Text></Pressable>)}</View>
      </> : null}

      {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
      {horario ? <View style={styles.confirmBox}><Text style={styles.optionTitle}>{servico?.nome} · {barbeiro?.nome}</Text><Text style={styles.muted}>{data} às {horario} · R$ {Number(servico?.preco ?? 0).toFixed(2).replace('.', ',')}</Text><ActionButton title="Confirmar agendamento" loading={enviando} onPress={confirmar} /></View> : null}
      {confirmacao ? <View style={styles.success}><Text style={styles.successTitle}>Horário reservado</Text><Text style={styles.muted}>{confirmacao.data_hora_inicio} · {confirmacao.barbeiro} · {confirmacao.servico}</Text><Link href="/agendamentos" style={styles.link}>Ver meus agendamentos</Link></View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101010' },
  container: { padding: 22, paddingBottom: 36 },
  title: { color: '#f5f3ef', fontSize: 27, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#a6a19a', fontSize: 14, lineHeight: 21 },
  mutedSmall: { color: '#948f87', fontSize: 12, marginTop: 5 },
  loader: { marginVertical: 20 },
  section: { color: '#f3c76a', fontSize: 15, fontWeight: '700', marginTop: 26, marginBottom: 12 },
  option: { backgroundColor: '#1b1b1b', borderWidth: 1, borderColor: '#2e2b25', borderRadius: 14, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selected: { borderColor: '#f3c76a' },
  flex: { flex: 1 },
  optionTitle: { color: '#f5f3ef', fontSize: 15, fontWeight: '600' },
  gold: { color: '#f3c76a', fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#49443b', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 10 },
  chipSelected: { borderColor: '#f3c76a', backgroundColor: '#29251b' },
  chipText: { color: '#f5f3ef', fontSize: 14 },
  error: { color: '#ff8f82', fontSize: 14, marginTop: 16 },
  confirmBox: { backgroundColor: '#1b1b1b', borderRadius: 16, padding: 16, gap: 12, marginTop: 18 },
  success: { backgroundColor: '#17241b', borderColor: '#2d5535', borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, marginTop: 18 },
  successTitle: { color: '#a8e1b3', fontSize: 18, fontWeight: '700' },
  link: { color: '#f3c76a', fontSize: 15, marginTop: 20 },
});
