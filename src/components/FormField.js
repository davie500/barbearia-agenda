import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function FormField({ label, ...props }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#77736d"
        style={styles.input}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 15 },
  label: { color: '#d9d5ce', fontSize: 13, marginBottom: 7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#393630',
    borderRadius: 12,
    color: '#f5f3ef',
    backgroundColor: '#1b1b1b',
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
