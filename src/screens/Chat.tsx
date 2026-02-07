// src/screens/Chat.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function Chat({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
    const [chatRooms, setChatRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch My Private Chats
    useEffect(() => {
        if (!auth.currentUser) return;

        // We query the 'rooms' collection where I am a participant
        const q = query(
            collection(database, 'rooms'),
            where('participants', 'array-contains', auth.currentUser.uid),
            orderBy('lastActive', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const openGlobalChat = () => {
        navigation.navigate('Conversation', { isGlobal: true });
    };

    const openPrivateChat = (room: any) => {
        navigation.navigate('Conversation', {
            roomId: room.id,
            chatName: room.chatName || "Chat",
            isGlobal: false
        });
    };

    const renderChatItem = ({ item }: any) => (
        <TouchableOpacity style={styles.chatItem} onPress={() => openPrivateChat(item)}>
            <View style={styles.avatar}>
                <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.chatName || "User"}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage || "No messages yet"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chats 💬</Text>
                {/* Global Chat Toggle */}
                <TouchableOpacity style={styles.globalBtn} onPress={openGlobalChat}>
                    <Ionicons name="planet" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
                    onPress={() => setActiveTab('groups')}
                >
                    <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'friends' ? (
                loading ? <ActivityIndicator style={{ marginTop: 50 }} color="#4CAF50" /> :
                    <FlatList
                        data={chatRooms}
                        keyExtractor={item => item.id}
                        renderItem={renderChatItem}
                        contentContainerStyle={{ padding: 10 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={{ color: '#888' }}>No chats yet.</Text>
                                <Text style={{ color: '#888', fontSize: 12 }}>Visit a profile to message someone!</Text>
                            </View>
                        }
                    />
            ) : (
                <View style={styles.empty}>
                    <Ionicons name="people-outline" size={50} color="#ccc" />
                    <Text style={{ color: '#888', marginTop: 10 }}>No active Trip Groups.</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>Create a trip in Planner to start one!</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    globalBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 20, elevation: 2 },

    tabContainer: { flexDirection: 'row', padding: 15, paddingBottom: 0 },
    tab: { marginRight: 20, paddingBottom: 10 },
    activeTab: { borderBottomWidth: 2, borderColor: '#4CAF50' },
    tabText: { fontSize: 16, color: '#888', fontWeight: '600' },
    activeTabText: { color: '#4CAF50' },

    chatItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    chatInfo: { flex: 1 },
    chatName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    lastMsg: { color: '#888', marginTop: 3 },
    empty: { alignItems: 'center', marginTop: 100 },
});