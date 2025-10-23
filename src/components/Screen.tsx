import React, { ReactNode } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors } from '../theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export default function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom']
}: ScreenProps) {
  const content = scroll ? (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
      enableAutomaticScroll={true}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>{children}</View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
