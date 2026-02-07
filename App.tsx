import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/config/firebase';

// Screens
import Login from './src/screens/Login';
import AppNavigator from './src/navigation/AppNavigator';
import UserProfile from './src/screens/UserProfile'; // <--- NEW IMPORT
import Chat from './src/screens/Chat';
import Conversation from './src/screens/Conversation';
const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // AUTHENTICATED USERS SEE THIS
          <>
            <Stack.Screen name="Main" component={AppNavigator} />
            <Stack.Screen name="UserProfile" component={UserProfile} />
            <Stack.Screen name="Conversation" component={Conversation} />
            <Stack.Screen name="PrivateChat" component={Conversation} />
          </>
        ) : (
          // GUESTS SEE THIS
          <Stack.Screen name="Login" component={Login} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}