// src/navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

// --- IMPORT YOUR REAL SCREENS HERE ---
import Login from '../screens/Login';
import Chat from '../screens/Chat';
import Planner from '../screens/Planner';
import Home from '../screens/Home';
import Profile from '../screens/Profile';
import Explore from '../screens/Explore'; // <--- NEW: Import the real Explore file

// Placeholder for Chat (we haven't built this yet)
function ChatScreen() { return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Chat Coming Soon</Text></View>; }

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#4CAF50',
                tabBarInactiveTintColor: 'gray',
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any = 'help-circle';

                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Planner') iconName = focused ? 'map' : 'map-outline';
                    else if (route.name === 'Explore') iconName = focused ? 'compass' : 'compass-outline';
                    else if (route.name === 'Chat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={Home} />

            {/* UPDATED: Uses the real Explore screen now */}
            <Tab.Screen name="Explore" component={Explore} />

            <Tab.Screen name="Planner" component={Planner} />
            <Tab.Screen name="Chat" component={Chat} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );
}