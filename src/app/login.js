import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro('');
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      router.replace('/painel');
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.description}>Entre para acompanhar seus horários e serviços.</Text>
        <View style={styles.form}>
          <FormField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <FormField label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
          {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
          <ActionButton title="Entrar" loading={enviando} onPress={enviar} />
        </View>
        <Link href="/cadastro" style={styles.link}>Ainda não tem conta? Cadastre-se</Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#101010' },
  container: { flexGrow: 1, padding: 24, paddingTop: 48 },
  title: { color: '#f5f3ef', fontSize: 28, fontWeight: '700' },
  description: { color: '#a6a19a', fontSize: 15, lineHeight: 23, marginTop: 10 },
  form: { marginTop: 32, gap: 4 },
  error: { color: '#ff8f82', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  link: { color: '#f3c76a', fontSize: 15, marginTop: 26 },
});
