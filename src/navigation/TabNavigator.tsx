import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import { colors } from '../theme';

// Import screens
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import WeekMenuScreen from '../screens/Menu/WeekMenuScreen';
import GroupsScreen from '../screens/Groups/GroupsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="WeekMenu"
        component={WeekMenuScreen}
        options={{
          title: 'This Week',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="food" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
