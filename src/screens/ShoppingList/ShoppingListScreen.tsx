import React from 'react';
import { StyleSheet } from 'react-native';
import { Screen, EmptyState } from '../../components';
import { spacing } from '../../theme';

export default function ShoppingListScreen() {
  return (
    <Screen>
      <EmptyState
        icon="cart"
        title="Shopping List"
        message="Shopping list coming soon! It will auto-generate from your reserved items."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
});
