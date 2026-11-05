import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ActionButton from '../../components/ActionButton';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const configs = {
  clientes: { titulo: 'Clientes', campos: [
    { key: 'nome', label: 'Nome' }, { key: 'email', label: 'E-mail', keyboardType: 'email-address' }, { key: 'telefone', label: 'Telefone', keyboardType: 'phone-pad' },
  ] },
  barbeiros: { titulo: 'Barbeiros', campos: [
    { key: 'nome', label: 'Nome' }, { key: 'foto', label: 'URL da foto' },
  ] },
  servicos: { titulo: 'Serviços', campos: [
    { key: 'nome', label: 'Nome' }, { key: 'preco', label: 'Preço', keyboardType: 'decimal-pad', numeric: true }, { key: 'duracao_minutos', label: 'Duração em minutos', keyboardType: 'number-pad', numeric: true },
  ] },
  expediente: { titulo: 'Expediente', endpoint: 'expediente', campos: [
    { key: 'profissional_id', label: 'ID do barbeiro', keyboardType: 'number-pad', numeric: true },
    { key: 'dia_semana', label: 'Dia da semana (0 domingo a 6 sábado)', keyboardType: 'number-pad', numeric: true },
    { key: 'inicio_expediente', label: 'Início (HH:mm)' }, { key: 'inicio_almoco', label: 'Início do almoço (opcional)' },
    { key: 'fim_almoco', label: 'Fim do almoço (opcional)' }, { key: 'fim_expediente', label: 'Fim (HH:mm)' },
  ] },
  usuarios: { titulo: 'Usuários', campos: [
    { key: 'nome', label: 'Nome' }, { key: 'email', label: 'E-mail', keyboardType: 'email-address' },
    { key: 'senha', label: 'Senha (mínimo 8 caracteres)', secureTextEntry: true },
    { key: 'tipo_usuario', label: 'Tipo: ADMINISTRADOR, BARBEIRO ou CLIENTE' },
    { key: 'cliente_id', label: 'ID do cliente (quando aplicável)', keyboardType: 'number-pad', numeric: true },
    { key: 'barbeiro_id', label: 'ID do barbeiro (quando aplicável)', keyboardType: 'number-pad', numeric: true },
  ] },
};

const statusAgendamento = ['Agendado', 'Confirmado', 'Em atendimento', 'Finalizado', 'Cancelado'];

function valorInicial(campos) {
  return Object.fromEntries(campos.map(({ key }) => [key, '']));
}

export default function AdminEntityScreen() {
  const { entidade: parametro } = useLocalSearchParams();
  const entidade = Array.isArray(parametro) ? parametro[0] : parametro;
  const { token, usuario } = useAuth();
  const config = configs[entidade];
  const endpoint = config?.endpoint ?? entidade;
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState(() => config ? valorInicial(config.campos) : {});
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [barbeiroFiltro, setBarbeiroFiltro] = useState('');

  const modoAgendamentos = entidade === 'agendamentos';
  const modoExpediente = entidade === 'expediente';
  const rota = useMemo(() => modoExpediente && barbeiroFiltro
    ? `/expediente/${encodeURIComponent(barbeiroFiltro)}`
    : `/${endpoint}`, [barbeiroFiltro, endpoint, modoExpediente]);

  const carregar = useCallback(async () => {
    const dados = await api(rota, { token });
    setRegistros(dados);
    setErro('');
  }, [rota, token]);

  useEffect(() => {
    let ativo = true;
    if (modoExpediente && !barbeiroFiltro) return () => { ativo = false; };
    async function carregarDados() {
      try {
        const dados = await api(rota, { token });
        if (ativo) {
          setRegistros(dados);
          setCarregando(false);
        }
      } catch (error) {
        if (ativo) {
          setErro(error.message);
          setCarregando(false);
        }
      }
    }
    carregarDados();
    return () => { ativo = false; };
  }, [barbeiroFiltro, modoExpediente, rota, token]);

  function editar(item) {
    setEditando(item.id);
    setForm(Object.fromEntries(config.campos.map(({ key }) => [key, item[key] == null ? '' : String(item[key])])));
    setErro('');
  }

  function limparForm() {
    setEditando(null);
    setForm(valorInicial(config.campos));
  }

  async function salvar() {
    setErro('');
    setEnviando(true);
    try {
      const body = {};
      for (const campo of config.campos) {
        const value = form[campo.key];
        if (value === '' && (campo.key === 'senha' || campo.key === 'foto' || campo.key === 'telefone' || campo.key === 'inicio_almoco' || campo.key === 'fim_almoco')) continue;
        body[campo.key] = campo.numeric ? Number(value) : value;
      }
      if (entidade === 'usuarios' && editando && !body.senha) delete body.senha;
      await api(`/${endpoint}${editando ? `/${editando}` : ''}`, {
        method: editando ? 'PUT' : 'POST', token, body,
      });
      limparForm();
      await carregar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(id) {
    Alert.alert('Excluir registro', 'Deseja excluir este registro?', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api(`/${endpoint}/${id}`, { method: 'DELETE', token });
          await carregar();
        } catch (error) { setErro(error.message); }
      } },
    ]);
  }

  async function mudarStatus(id, status) {
    try {
      await api(`/agendamentos/${id}`, { method: 'PUT', token, body: { status } });
      await carregar();
    } catch (error) { setErro(error.message); }
  }

  if (usuario?.tipo_usuario !== 'ADMINISTRADOR' && !(modoExpediente && usuario?.tipo_usuario === 'BARBEIRO')) {
    return <View style={styles.container}><Text style={styles.title}>Acesso restrito</Text><Text style={styles.muted}>Esta área é exclusiva da equipe autorizada.</Text></View>;
  }

  if (!config && !modoAgendamentos) return <View style={styles.container}><Text style={styles.title}>Área não encontrada</Text></View>;
  const campos = config?.campos ?? [];
  const titulo = config?.titulo ?? 'Agendamentos';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{titulo}</Text>
      {modoExpediente ? <>
        {usuario?.tipo_usuario === 'ADMINISTRADOR'
          ? <FormField label="Filtrar pelo ID do barbeiro" value={barbeiroFiltro} onChangeText={(value) => { setCarregando(Boolean(value)); setBarbeiroFiltro(value); }} keyboardType="number-pad" />
          : <Text style={styles.muted}>Expediente do barbeiro vinculado à sua conta</Text>}
        {usuario?.tipo_usuario === 'BARBEIRO' ? <Pressable onPress={() => setBarbeiroFiltro(String(usuario.barbeiro_id))}><Text style={styles.link}>Carregar meu expediente</Text></Pressable> : null}
      </> : null}

      {config ? <View style={styles.form}>
        <Text style={styles.section}>{editando ? 'Editar registro' : 'Novo registro'}</Text>
        {campos.map((campo) => <FormField
          key={campo.key}
          label={campo.label}
          value={form[campo.key] ?? ''}
          onChangeText={(value) => setForm((atual) => ({ ...atual, [campo.key]: value }))}
          keyboardType={campo.keyboardType}
          secureTextEntry={campo.secureTextEntry}
        />)}
        <ActionButton title={editando ? 'Salvar alterações' : 'Cadastrar'} loading={enviando} onPress={salvar} />
        {editando ? <Pressable onPress={limparForm} style={styles.cancelEdit}><Text style={styles.link}>Cancelar edição</Text></Pressable> : null}
      </View> : null}

      {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
      {carregando ? <ActivityIndicator color="#f3c76a" style={styles.loader} /> : null}
      {!carregando && !erro && registros.length === 0 ? <Text style={styles.muted}>Nenhum registro encontrado.</Text> : null}

      {registros.map((item) => (
        <View key={item.id} style={styles.card}>
          {modoAgendamentos ? <>
            <Text style={styles.cardTitle}>{item.servico} · {item.status}</Text>
            <Text style={styles.muted}>{String(item.data_hora_inicio).slice(0, 16)} · {item.barbeiro}</Text>
            <Text style={styles.muted}>{item.cliente} · {item.telefone}</Text>
            <View style={styles.chips}>{statusAgendamento.map((status) => <Pressable key={status} onPress={() => mudarStatus(item.id, status)} style={[styles.chip, item.status === status && styles.chipSelected]}><Text style={styles.chipText}>{status}</Text></Pressable>)}</View>
          </> : <>
            <Text style={styles.cardTitle}>{item.nome ?? `Barbeiro ${item.profissional_id} · dia ${item.dia_semana}`}</Text>
            <Text style={styles.muted}>{item.email ?? item.inicio_expediente ?? item.foto ?? item.telefone ?? ''}</Text>
            {entidade === 'servicos' ? <Text style={styles.gold}>R$ {Number(item.preco).toFixed(2).replace('.', ',')} · {item.duracao_minutos} min</Text> : null}
            {entidade === 'usuarios' ? <Text style={styles.gold}>{item.tipo_usuario} · cliente {item.cliente_id ?? '—'} · barbeiro {item.barbeiro_id ?? '—'}</Text> : null}
            <View style={styles.row}>
              {config ? <Pressable onPress={() => editar(item)} style={styles.smallAction}><Text style={styles.gold}>Editar</Text></Pressable> : null}
              <Pressable onPress={() => excluir(item.id)} style={styles.smallAction}><Text style={styles.danger}>Excluir</Text></Pressable>
            </View>
          </>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101010' },
  container: { padding: 22, paddingBottom: 36 },
  title: { color: '#f5f3ef', fontSize: 26, fontWeight: '700', marginBottom: 15 },
  section: { color: '#f3c76a', fontSize: 16, fontWeight: '600', marginBottom: 14 },
  muted: { color: '#a6a19a', fontSize: 13, lineHeight: 20, marginVertical: 4 },
  form: { backgroundColor: '#1b1b1b', borderWidth: 1, borderColor: '#2d2a24', borderRadius: 18, padding: 15, marginBottom: 20 },
  card: { backgroundColor: '#1b1b1b', borderRadius: 15, padding: 15, marginBottom: 10, gap: 7 },
  cardTitle: { color: '#f5f3ef', fontSize: 15, fontWeight: '600' },
  gold: { color: '#f3c76a', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, marginTop: 5 },
  smallAction: { borderWidth: 1, borderColor: '#49443b', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12 },
  danger: { color: '#ff8f82', fontSize: 13 },
  error: { color: '#ff8f82', fontSize: 14, marginBottom: 12 },
  loader: { marginVertical: 22 },
  cancelEdit: { alignSelf: 'center', padding: 12 },
  link: { color: '#f3c76a', fontSize: 14, marginVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#49443b', borderRadius: 15, paddingHorizontal: 8, paddingVertical: 6 },
  chipSelected: { borderColor: '#f3c76a' },
  chipText: { color: '#d8d4cd', fontSize: 10 },
});
