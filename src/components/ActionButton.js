import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

export default function ActionButton({ title, onPress, loading = false, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading
        ? <ActivityIndicator color={secondary ? '#f3c76a' : '#15120b'} />
        : <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#f3c76a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#49443b' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.65 },
  text: { color: '#15120b', fontSize: 15, fontWeight: '700' },
  secondaryText: { color: '#f3c76a' },
});
