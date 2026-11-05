import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import { useAuth } from '../context/AuthContext';

export default function PerfilScreen() {
  const { usuario, sair } = useAuth();
  const router = useRouter();

  async function logout() {
    await sair();
    router.replace('/');
  }

  if (!usuario) return <View style={styles.container}><Text style={styles.title}>Entre na sua conta</Text><Link href="/login" style={styles.link}>Entrar</Link></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{usuario.nome}</Text>
      <Text style={styles.detail}>{usuario.email}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>{usuario.tipo_usuario}</Text></View>
      <Link href="/agendamentos" style={styles.link}>Ver agendamentos</Link>
      <ActionButton title="Sair da conta" secondary onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101010', padding: 24, paddingTop: 42, gap: 16 },
  title: { color: '#f5f3ef', fontSize: 26, fontWeight: '700' },
  detail: { color: '#a6a19a', fontSize: 15 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#4a4334', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#f3c76a', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  link: { color: '#f3c76a', fontSize: 15, marginVertical: 6 },
});
