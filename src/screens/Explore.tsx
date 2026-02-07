// src/screens/Explore.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

// --- PLACES DATA ---
const PLACES = [
    { id: '1', name: 'Jibhi', state: 'Himachal', tag: 'Nature', image: 'https://images.unsplash.com/photo-1626621341120-20d716e94069?w=500' },
    { id: '2', name: 'Gokarna', state: 'Karnataka', tag: 'Beaches', image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=500' },
    { id: '3', name: 'Varkala', state: 'Kerala', tag: 'Relax', image: 'https://images.unsplash.com/photo-1591529865715-992e5927376c?w=500' },
    { id: '4', name: 'Ziro Valley', state: 'Arunachal', tag: 'Culture', image: 'https://images.unsplash.com/photo-1625299499870-8735392e2764?w=500' },
    { id: '5', name: 'Munnar', state: 'Kerala', tag: 'Nature', image: 'https://images.unsplash.com/photo-1596323187680-77458390892d?w=500' },
    { id: '6', name: 'Hampi', state: 'Karnataka', tag: 'History', image: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?w=500' },
];

export default function Explore({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<'places' | 'people'>('places');
    const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- FETCH USERS ---
    useEffect(() => {
        const q = query(collection(database, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const rankedUsers = userList.sort((a: any, b: any) => (b.visitedStates?.length || 0) - (a.visitedStates?.length || 0));
            setUsers(rankedUsers);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // --- RENDER PLACES ---
    const renderPlaces = () => {
        const filteredPlaces = PLACES.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        return (
            <View style={{ flex: 1 }}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        placeholder="Search hidden gems..."
                        style={styles.input}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <FlatList
                    key="places-grid" // <--- CRITICAL FIX: Unique Key
                    data={filteredPlaces}
                    keyExtractor={item => item.id}
                    numColumns={2} // <--- This forces Grid Layout
                    contentContainerStyle={{ padding: 10 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.placeCard}
                            onPress={() => Alert.alert("Suggestion", `Visit ${item.name}! Perfect for ${item.tag}.`)}
                        >
                            <Image source={{ uri: item.image }} style={styles.placeImage} />
                            <View style={styles.placeOverlay}>
                                <Text style={styles.placeTitle}>{item.name}</Text>
                                <Text style={styles.placeSubtitle}>{item.state}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    };

    // --- RENDER LEADERBOARD ---
    const renderLeaderboard = () => {
        if (loading) return <ActivityIndicator color="#4CAF50" style={{ marginTop: 50 }} />;

        const filteredUsers = leaderboardType === 'global'
            ? users
            : users.filter(u => (u.visitedStates?.length || 0) >= 2);

        return (
            <View style={{ flex: 1 }}>
                <View style={styles.subTabContainer}>
                    <TouchableOpacity
                        style={[styles.subTab, leaderboardType === 'global' && styles.activeSubTab]}
                        onPress={() => setLeaderboardType('global')}
                    >
                        <Text style={[styles.subTabText, leaderboardType === 'global' && styles.activeSubTabText]}>Global 🌎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTab, leaderboardType === 'friends' && styles.activeSubTab]}
                        onPress={() => setLeaderboardType('friends')}
                    >
                        <Text style={[styles.subTabText, leaderboardType === 'friends' && styles.activeSubTabText]}>Friends 👥</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    key="leaderboard-list" // <--- CRITICAL FIX: Unique Key
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    numColumns={1} // <--- This forces List Layout
                    contentContainerStyle={{ padding: 15 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No friends active yet!</Text>}
                    renderItem={({ item, index }) => {
                        let rankIcon = null;
                        if (index === 0) rankIcon = '🥇';
                        else if (index === 1) rankIcon = '🥈';
                        else if (index === 2) rankIcon = '🥉';

                        return (
                            <TouchableOpacity
                                style={styles.userCard}
                                onPress={() => navigation.navigate('UserProfile', { uid: item.id })}
                            >
                                <View style={styles.rankContainer}>
                                    {rankIcon ? <Text style={styles.medal}>{rankIcon}</Text> : <Text style={styles.rankNum}>#{index + 1}</Text>}
                                </View>
                                <View style={styles.avatarContainer}>
                                    {item.photoURL ? (
                                        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatar, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text>👤</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{item.email?.split('@')[0]}</Text>
                                    <Text style={styles.userStats}>{item.visitedStates?.length || 0} States Visited</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Discover India 🇮🇳</Text>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'places' && styles.activeTab]}
                        onPress={() => setActiveTab('places')}
                    >
                        <Text style={[styles.tabText, activeTab === 'places' && styles.activeTabText]}>Places</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'people' && styles.activeTab]}
                        onPress={() => setActiveTab('people')}
                    >
                        <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>Leaderboard</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'places' ? renderPlaces() : renderLeaderboard()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center', marginBottom: 15 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 25, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20 },
    activeTab: { backgroundColor: '#fff', elevation: 2 },
    tabText: { fontWeight: '600', color: '#888' },
    activeTabText: { color: '#4CAF50' },

    subTabContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15 },
    subTab: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#ddd' },
    activeSubTab: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    subTabText: { color: '#666', fontWeight: '600' },
    activeSubTabText: { color: '#fff' },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, margin: 15, borderRadius: 10, elevation: 1 },
    input: { marginLeft: 10, flex: 1, fontSize: 16 },
    placeCard: { flex: 1, margin: 5, height: 180, borderRadius: 15, overflow: 'hidden', backgroundColor: '#eee' },
    placeImage: { width: '100%', height: '100%' },
    placeOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.4)', padding: 10 },
    placeTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    placeSubtitle: { color: '#ddd', fontSize: 12 },

    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
    rankContainer: { width: 40, alignItems: 'center' },
    rankNum: { fontSize: 16, fontWeight: 'bold', color: '#555' },
    medal: { fontSize: 24 },
    avatarContainer: { marginRight: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    userStats: { fontSize: 13, color: '#666' }
});