import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export default function CadastroScreen() {
  const router = useRouter();
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro('');
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.');
      return;
    }
    setEnviando(true);
    try {
      await cadastrar({ nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), senha });
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
        <Text style={styles.title}>Crie sua conta</Text>
        <Text style={styles.description}>Seus dados serão usados para organizar seus agendamentos.</Text>
        <View style={styles.form}>
          <FormField label="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" />
          <FormField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <FormField label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
          <FormField label="Senha (mínimo de 8 caracteres)" value={senha} onChangeText={setSenha} secureTextEntry />
          <FormField label="Confirme a senha" value={confirmacao} onChangeText={setConfirmacao} secureTextEntry />
          {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
          <ActionButton title="Criar conta" loading={enviando} onPress={enviar} />
        </View>
        <Link href="/login" style={styles.link}>Já tem conta? Entrar</Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#101010' },
  container: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 32 },
  title: { color: '#f5f3ef', fontSize: 28, fontWeight: '700' },
  description: { color: '#a6a19a', fontSize: 15, lineHeight: 23, marginTop: 10 },
  form: { marginTop: 26, gap: 4 },
  error: { color: '#ff8f82', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  link: { color: '#f3c76a', fontSize: 15, marginTop: 24 },
});
