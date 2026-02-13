// App.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // <--- Fixed missing module
import { onAuthStateChanged, User } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// ✅ FIXED: Merged imports to remove duplicate 'auth' error
import { auth, database } from './src/config/firebase';

// Screens
import Login from './src/screens/Login';
import Home from './src/screens/Home';
import Explore from './src/screens/Explore';
import Planner from './src/screens/Planner';
import Chat from './src/screens/Chat';
import Conversation from './src/screens/Conversation';
import Profile from './src/screens/Profile';
import UserProfile from './src/screens/UserProfile';
import EditProfile from './src/screens/EditProfile';
import CreatePost from './src/screens/CreatePost';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ✅ FIXED: Added 'shouldShowBanner' and 'shouldShowList' to satisfy TypeScript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true, // Required for new Expo SDK
    shouldShowList: true,   // Required for new Expo SDK
  }),
});

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Explore') iconName = 'compass';
          else if (route.name === 'Planner') iconName = 'map';
          else if (route.name === 'Chat') iconName = 'chatbubbles';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Explore" component={Explore} />
      <Tab.Screen name="Planner" component={Planner} />
      <Tab.Screen name="Chat" component={Chat} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 2. Notification Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(database, 'chats'), orderBy('createdAt', 'desc'), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const msg = change.doc.data();
          const isRecent = msg.createdAt?.seconds > (Date.now() / 1000) - 10;

          if (msg.uid !== user.uid && isRecent) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: `New message from ${msg.displayName}`,
                body: msg.text,
              },
              trigger: null,
            });
          }
        }
      });
    });

    return unsubscribe;
  }, [user]);

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
          <>

            <Stack.Screen name="Main" component={AppNavigator} />
            <Stack.Screen name="UserProfile" component={UserProfile} />
            <Stack.Screen name="Conversation" component={Conversation} />
            <Stack.Screen name="PrivateChat" component={Conversation} />
            <Stack.Screen name="CreatePost" component={CreatePost} options={{ title: 'New Post' }} />
            <Stack.Screen
              name="EditProfile"
              component={EditProfile}
              options={{ title: 'Edit Profile' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={Login} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}