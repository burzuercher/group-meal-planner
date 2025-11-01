import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading } from '../../components';
import { colors, spacing } from '../../theme';
import { linkWithEmailAndPassword } from '../../services/authService';
import { RootStackParamList } from '../../types';

type LinkAccountNavigationProp = StackNavigationProp<RootStackParamList, 'LinkAccount'>;

export default function LinkAccountScreen() {
  const navigation = useNavigation<LinkAccountNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLinkAccount = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await linkWithEmailAndPassword(email.trim(), password);
      navigation.goBack();
    } catch (err: any) {
      console.error('Error linking account:', err);
      setError(err.message || 'Failed to link account. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Linking account..." />;
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="bodyMedium" style={styles.hint}>
            Link your account to an email and password so you can access your data from any device.
          </Text>

          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            error={!!error && !email.trim()}
            autoFocus
          />

          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            placeholder="At least 6 characters"
            secureTextEntry={!showPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
            error={!!error && password.length > 0 && password.length < 6}
          />

          <Text variant="bodySmall" style={styles.note}>
            Password must be at least 6 characters
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleLinkAccount}
            style={styles.button}
            disabled={loading}
          >
            Link Account
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  content: {
    // No flex here to avoid pushing buttons down
  },
  hint: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  note: {
    color: colors.text.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
  },
});
