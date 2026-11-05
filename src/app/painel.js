import { Link, Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

function PainelLink({ href, title, detail }) {
  return <Link href={href} style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text></Link>;
}

export default function PainelScreen() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <View style={styles.center}><ActivityIndicator color="#f3c76a" /></View>;
  if (!usuario) return <Redirect href="/login" />;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{usuario.tipo_usuario}</Text>
      <Text style={styles.title}>Olá, {usuario.nome}</Text>
      {usuario.tipo_usuario === 'CLIENTE' ? <>
        <PainelLink href="/agendamento" title="Agendar horário" detail="Consulte os horários e reserve um serviço" />
        <PainelLink href="/agendamentos" title="Meus agendamentos" detail="Consulte ou cancele seus horários futuros" />
      </> : null}
      {usuario.tipo_usuario === 'BARBEIRO' ? <>
        <PainelLink href="/agendamentos" title="Agenda de atendimentos" detail="Acompanhe horários e atualize o status" />
        <PainelLink href="/admin/expediente" title="Meu expediente" detail="Consulte seus horários de trabalho" />
      </> : null}
      {usuario.tipo_usuario === 'ADMINISTRADOR' ? <>
        <PainelLink href="/agendamentos" title="Todos os agendamentos" detail="Consulte a agenda da barbearia" />
        <PainelLink href="/admin/servicos" title="Serviços" detail="Cadastre, edite e remova serviços" />
        <PainelLink href="/admin/barbeiros" title="Barbeiros" detail="Gerencie os profissionais" />
        <PainelLink href="/admin/clientes" title="Clientes" detail="Consulte e gerencie cadastros" />
        <PainelLink href="/admin/expediente" title="Expediente" detail="Defina os dias, horários e intervalos" />
        <PainelLink href="/admin/usuarios" title="Usuários e permissões" detail="Associe contas a clientes e barbeiros" />
        <PainelLink href="/perfil" title="Perfil e sessão" detail="Veja seus dados e encerre a sessão" />
      </> : null}
      {usuario.tipo_usuario !== 'ADMINISTRADOR' ? <PainelLink href="/perfil" title="Meu perfil" detail="Consulte seus dados e encerre a sessão" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#101010', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#101010', padding: 22, paddingTop: 26 },
  eyebrow: { color: '#f3c76a', letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },
  title: { color: '#f5f3ef', fontSize: 27, fontWeight: '700', marginTop: 7, marginBottom: 20 },
  card: { backgroundColor: '#1b1b1b', borderColor: '#2d2a24', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10 },
  cardTitle: { color: '#f5f3ef', fontSize: 15, fontWeight: '600' },
  detail: { color: '#a6a19a', fontSize: 13, marginTop: 5 },
});
