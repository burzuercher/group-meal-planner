import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store';
import TabNavigator from './TabNavigator';

// Import screens
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import ProposeMenuScreen from '../screens/Menu/ProposeMenuScreen';
import MenuDetailsScreen from '../screens/Menu/MenuDetailsScreen';
import AddEditItemScreen from '../screens/Menu/AddEditItemScreen';
import GroupDetailsScreen from '../screens/Groups/GroupDetailsScreen';
import EditNameScreen from '../screens/Profile/EditNameScreen';
import EditPartySizeScreen from '../screens/Profile/EditPartySizeScreen';
import LinkAccountScreen from '../screens/Profile/LinkAccountScreen';
import DeleteAccountScreen from '../screens/Profile/DeleteAccountScreen';
import CreateJoinGroupScreen from '../screens/Profile/CreateJoinGroupScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const userProfile = useAppStore((state) => state.userProfile);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!userProfile ? (
          // Show onboarding if no user profile
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // Show main app if user profile exists
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="ProposeMenu"
              component={ProposeMenuScreen}
              options={{
                headerShown: true,
                title: 'Propose Menu',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="MenuDetails"
              component={MenuDetailsScreen}
              options={{
                headerShown: true,
                title: 'Menu Details'
              }}
            />
            <Stack.Screen
              name="AddEditItem"
              component={AddEditItemScreen}
              options={{
                headerShown: true,
                title: 'Add Item',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="GroupDetails"
              component={GroupDetailsScreen}
              options={{
                headerShown: true,
                title: 'Group Details'
              }}
            />
            <Stack.Screen
              name="EditName"
              component={EditNameScreen}
              options={{
                headerShown: true,
                title: 'Edit Name',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="EditPartySize"
              component={EditPartySizeScreen}
              options={{
                headerShown: true,
                title: 'Edit Party Size',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="LinkAccount"
              component={LinkAccountScreen}
              options={{
                headerShown: true,
                title: 'Link Account',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="DeleteAccount"
              component={DeleteAccountScreen}
              options={{
                headerShown: true,
                title: 'Delete Account',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="CreateJoinGroup"
              component={CreateJoinGroupScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params.mode === 'create' ? 'Create Group' : 'Join Group',
                presentation: 'modal'
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
