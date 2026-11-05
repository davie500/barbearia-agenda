import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#101010' },
          headerTintColor: '#f3c76a',
          contentStyle: { backgroundColor: '#101010' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'BarberApp', headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="agendamento" options={{ title: 'Agendar horário' }} />
        <Stack.Screen name="agendamentos" options={{ title: 'Meus agendamentos' }} />
        <Stack.Screen name="perfil" options={{ title: 'Meu perfil' }} />
        <Stack.Screen name="painel" options={{ title: 'Painel' }} />
        <Stack.Screen name="admin/[entidade]" options={{ title: 'Administração' }} />
      </Stack>
    </AuthProvider>
  );
}
