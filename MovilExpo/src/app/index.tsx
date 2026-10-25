import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import AlumnoHomeScreen from '../screens/AlumnoHomeScreen';
import DocenteHomeScreen from '../screens/DocenteHomeScreen';
import COLORS from '../theme/colors';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.green} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (user.role === 'profesor') {
    return <DocenteHomeScreen />;
  }

  return <AlumnoHomeScreen />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
