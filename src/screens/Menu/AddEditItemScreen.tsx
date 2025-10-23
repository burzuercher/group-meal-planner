import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store';
import { createMenuItem } from '../../services/menuService';
import { RootStackParamList, MenuItemCategory } from '../../types';

type AddEditItemRouteProp = RouteProp<RootStackParamList, 'AddEditItem'>;
type AddEditItemNavigationProp = StackNavigationProp<RootStackParamList, 'AddEditItem'>;

const CATEGORIES: MenuItemCategory[] = [
  'Main Dish',
  'Side Dish',
  'Appetizer',
  'Dessert',
  'Beverage',
  'Other',
];

export default function AddEditItemScreen() {
  const route = useRoute<AddEditItemRouteProp>();
  const navigation = useNavigation<AddEditItemNavigationProp>();
  const { currentGroupId, userProfile } = useAppStore();

  const { menuId } = route.params;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MenuItemCategory>('Main Dish');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [dietaryInfo, setDietaryInfo] = useState('');
  const [recipe, setRecipe] = useState('');
  const [reserveNow, setReserveNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Item name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (!currentGroupId || !userProfile) {
      alert('Please select a group');
      return;
    }

    setLoading(true);

    try {
      await createMenuItem(currentGroupId, menuId, {
        name: name.trim(),
        category,
        quantity: quantity.trim() || undefined,
        notes: notes.trim(),
        dietaryInfo: dietaryInfo.trim(),
        recipe: recipe.trim() || undefined,
        reservedBy: reserveNow ? userProfile.name : null,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error creating menu item:', error);
      alert('Failed to create menu item. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Adding item..." />;
  }

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text variant="headlineSmall" style={styles.title}>
          Add Menu Item
        </Text>

          {/* Item Name */}
          <TextInput
            mode="outlined"
            label="Item Name *"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g., Pasta Salad, Apple Pie"
            style={styles.input}
            error={!!errors.name}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          {/* Category */}
          <Text variant="labelLarge" style={styles.label}>
            Category *
          </Text>
          <View style={styles.categoryButtons}>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                mode={category === cat ? 'contained' : 'outlined'}
                onPress={() => setCategory(cat)}
                style={styles.categoryButton}
                compact
              >
                {cat}
              </Button>
            ))}
          </View>

          {/* Quantity */}
          <TextInput
            mode="outlined"
            label="Quantity/Servings (Optional)"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g., serves 8, 2 bottles"
            style={styles.input}
          />

          {/* Dietary Info */}
          <TextInput
            mode="outlined"
            label="Dietary Info"
            value={dietaryInfo}
            onChangeText={setDietaryInfo}
            placeholder="e.g., vegetarian, gluten-free"
            style={styles.input}
          />

          {/* Notes */}
          <TextInput
            mode="outlined"
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special notes or instructions"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          {/* Recipe Link */}
          <TextInput
            mode="outlined"
            label="Recipe Link (Optional)"
            value={recipe}
            onChangeText={setRecipe}
            placeholder="https://..."
            keyboardType="url"
            style={styles.input}
          />

          {/* Reserve Option */}
          <View style={styles.reserveSection}>
            <Text variant="labelLarge" style={styles.label}>
              Reserve this item?
            </Text>
            <SegmentedButtons
              value={reserveNow ? 'yes' : 'no'}
              onValueChange={(value) => setReserveNow(value === 'yes')}
              buttons={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes, I\'ll bring it' },
              ]}
              style={styles.segmentedButtons}
            />
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
            onPress={handleSave}
            style={styles.button}
            disabled={loading}
          >
            Add Item
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryButton: {
    minWidth: 100,
  },
  reserveSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  segmentedButtons: {
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
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
