import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AlumnoHomeScreen from './src/screens/AlumnoHomeScreen';
import DocenteHomeScreen from './src/screens/DocenteHomeScreen';

function NavigationRoot() {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <LoginScreen />;
  }

  if (user.role === 'profesor') {
    return <DocenteHomeScreen />;
  }

  return <AlumnoHomeScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AuthProvider>
        <NavigationRoot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
