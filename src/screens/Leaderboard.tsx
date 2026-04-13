// src/screens/Leaderboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LeaderboardUser {
    id: string;
    displayName: string;
    username: string;
    photoURL: string;
    statesCount: number;
}

export default function Leaderboard({ navigation }: any) {
    const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            // Query users sorted by statesCount, highest first
            const q = query(
                collection(database, 'users'),
                orderBy('statesCount', 'desc'),
                limit(50) // Top 50 explorers
            );

            const querySnapshot = await getDocs(q);
            const topUsers: LeaderboardUser[] = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Only include users who have visited at least 1 state
                if (data.statesCount > 0) {
                     topUsers.push({
                        id: doc.id,
                        displayName: data.displayName || data.email.split('@')[0],
                        username: data.username || '',
                        photoURL: data.photoURL || 'https://via.placeholder.com/150',
                        statesCount: data.statesCount || 0,
                    });
                }
            });

            setLeaders(topUsers);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }: { item: LeaderboardUser, index: number }) => {
        // Assign medal colors to the top 3
        let rankColor = '#666';
        if (index === 0) rankColor = '#FFD700'; // Gold
        if (index === 1) rankColor = '#C0C0C0'; // Silver
        if (index === 2) rankColor = '#CD7F32'; // Bronze

        return (
            <TouchableOpacity 
                style={styles.userCard}
                onPress={() => navigation.navigate('UserProfile', { uid: item.id })}
            >
                <View style={styles.rankContainer}>
                    <Text style={[styles.rankText, { color: rankColor, fontWeight: index < 3 ? 'bold' : 'normal' }]}>
                        {index + 1}
                    </Text>
                </View>
                
                <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                
                <View style={styles.userInfo}>
                    <Text style={styles.nameText}>{item.displayName}</Text>
                    {item.username ? <Text style={styles.handleText}>@{item.username}</Text> : null}
                </View>

                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{item.statesCount}</Text>
                    <Text style={styles.scoreLabel}>States</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Top Explorers 🏆</Text>
               <View style={{ width: 34 }} />
            </View>

            <FlatList
                data={leaders}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No explorers yet. Start traveling!</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee'
    },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    listContent: { padding: 15 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    rankContainer: { width: 30, alignItems: 'center' },
    rankText: { fontSize: 18 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginHorizontal: 15, backgroundColor: '#eee' },
    userInfo: { flex: 1 },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    handleText: { fontSize: 13, color: '#666', marginTop: 2 },
    scoreContainer: { alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    scoreText: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
    scoreLabel: { fontSize: 10, color: '#4CAF50', fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 }
});