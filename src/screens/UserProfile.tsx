// src/screens/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import IndiaMap from '../components/IndiaMap';

export default function UserProfile({ route, navigation }: any) {
    const { uid } = route.params;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const docSnap = await getDoc(doc(database, 'users', uid));
                if (docSnap.exists()) { setUserData(docSnap.data()); }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchUser();
    }, [uid]);

    // --- NEW: LOGIC TO START PRIVATE CHAT ---
    const handleMessage = () => {
        if (!auth.currentUser) return;
        const myUid = auth.currentUser.uid;
        const otherUid = uid;

        // Create a unique Room ID by sorting UIDs (so UserA+UserB is always same as UserB+UserA)
        const roomId = [myUid, otherUid].sort().join('_');
        const chatName = userData.email?.split('@')[0];

        navigation.navigate('PrivateChat', { roomId, chatName });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
    if (!userData) return <View style={styles.center}><Text>User not found.</Text></View>;

    const badges = userData?.badges || [];
    const states = userData?.visitedStates || [];
    const tags = userData?.tags || [];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Profile</Text>
            </View>

            <View style={styles.header}>
                <View style={styles.avatarPlaceholder}>
                    {userData.photoURL ? (
                        <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
                    ) : (
                        <Text style={{ fontSize: 30 }}>👤</Text>
                    )}
                </View>

                <Text style={styles.name}>{userData.email?.split('@')[0]}</Text>
                <Text style={styles.bio}>{userData.bio || "Explorer on RAHī 🌍"}</Text>

                {/* Tags */}
                <View style={styles.tagsRow}>
                    {tags.map((tag: string) => (
                        <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>
                    ))}
                </View>

                {/* --- NEW MESSAGE BUTTON --- */}
                {auth.currentUser?.uid !== uid && (
                    <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                        <Text style={styles.msgBtnText}>Message</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.statsRow}>
                    <View style={styles.stat}><Text style={styles.statNum}>{states.length}</Text><Text style={styles.statLabel}>States</Text></View>
                    <View style={styles.stat}><Text style={styles.statNum}>{badges.length}</Text><Text style={styles.statLabel}>Badges</Text></View>
                </View>
            </View>

            <IndiaMap visitedStates={states} />

            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
            <View style={styles.badgesContainer}>
                {badges.length === 0 ? <Text style={{ color: '#888' }}>No badges yet.</Text> :
                    badges.map((badge: string, index: number) => (
                        <View key={index} style={styles.badge}>
                            <Ionicons name="medal" size={24} color="#FFD700" />
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    ))
                }
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: 50, backgroundColor: '#fff', elevation: 2 },
    navTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20 },
    header: { alignItems: 'center', padding: 20, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderColor: '#eee' },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarImage: { width: 80, height: 80, borderRadius: 40 },
    name: { fontSize: 22, fontWeight: 'bold' },
    bio: { color: '#666', marginBottom: 10, textAlign: 'center' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 15 },
    tagPill: { backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, margin: 3 },
    tagText: { color: '#00695C', fontSize: 12, fontWeight: '600' },

    // New Message Button Style
    msgBtn: { flexDirection: 'row', backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, alignItems: 'center', marginBottom: 15, elevation: 2 },
    msgBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },

    statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 10 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
    statLabel: { fontSize: 12, color: '#888' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 10, marginBottom: 10 },
    badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 8, borderRadius: 15, marginRight: 10, marginBottom: 10 },
    badgeText: { marginLeft: 5, fontWeight: 'bold', color: '#F57F17' },
});