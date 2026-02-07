// src/screens/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import IndiaMap from '../components/IndiaMap';

export default function UserProfile({ route, navigation }: any) {
    const { uid } = route.params;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionLoading, setConnectionLoading] = useState(false);

    const currentUserUid = auth.currentUser?.uid;

    useEffect(() => {
        fetchUser();
    }, [uid]);

    const fetchUser = async () => {
        try {
            const docSnap = await getDoc(doc(database, 'users', uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                // Check if I am already in their followers list
                if (data.followers && data.followers.includes(currentUserUid)) {
                    setIsConnected(true);
                }
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const toggleConnection = async () => {
        if (!currentUserUid) return;
        setConnectionLoading(true);

        const targetUserRef = doc(database, 'users', uid);
        const myUserRef = doc(database, 'users', currentUserUid);

        try {
            if (isConnected) {
                // DISCONNECT
                await updateDoc(targetUserRef, { followers: arrayRemove(currentUserUid) });
                await updateDoc(myUserRef, { following: arrayRemove(uid) });
                setIsConnected(false);
                Alert.alert("Disconnected", `You unfollowed ${userData.email?.split('@')[0]}`);
            } else {
                // CONNECT
                await updateDoc(targetUserRef, { followers: arrayUnion(currentUserUid) });
                await updateDoc(myUserRef, { following: arrayUnion(uid) });
                setIsConnected(true);
                Alert.alert("Connected! 🤝", `You are now connected with ${userData.email?.split('@')[0]}`);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not update connection.");
        } finally {
            setConnectionLoading(false);
        }
    };

    const handleMessage = () => {
        if (!currentUserUid) return;
        const roomId = [currentUserUid, uid].sort().join('_');
        const chatName = userData.email?.split('@')[0];
        navigation.navigate('Conversation', { roomId, chatName, isGlobal: false });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
    if (!userData) return <View style={styles.center}><Text>User not found.</Text></View>;

    const badges = userData?.badges || [];
    const states = userData?.visitedStates || [];
    const tags = userData?.tags || [];

    return (
        <ScrollView style={styles.container}>
            {/* Nav Header */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Profile</Text>
            </View>

            {/* Profile Card */}
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

                <View style={styles.tagsRow}>
                    {tags.map((tag: string) => (
                        <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>
                    ))}
                </View>

                {/* --- ACTION BUTTONS ROW --- */}
                {currentUserUid !== uid && (
                    <View style={styles.actionRow}>
                        {/* Connect Button */}
                        <TouchableOpacity
                            style={[styles.actionBtn, isConnected ? styles.connectedBtn : styles.connectBtn]}
                            onPress={toggleConnection}
                            disabled={connectionLoading}
                        >
                            {connectionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                                <>
                                    <Ionicons name={isConnected ? "checkmark" : "person-add"} size={18} color={isConnected ? "#333" : "#fff"} />
                                    <Text style={[styles.btnText, isConnected ? { color: '#333' } : { color: '#fff' }]}>
                                        {isConnected ? "Connected" : "Connect"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Message Button */}
                        <TouchableOpacity style={[styles.actionBtn, styles.msgBtn]} onPress={handleMessage}>
                            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                            <Text style={[styles.btnText, { color: '#fff' }]}>Message</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}><Text style={styles.statNum}>{states.length}</Text><Text style={styles.statLabel}>States</Text></View>
                    <View style={styles.stat}><Text style={styles.statNum}>{badges.length}</Text><Text style={styles.statLabel}>Badges</Text></View>
                    <View style={styles.stat}><Text style={styles.statNum}>{userData.followers?.length || 0}</Text><Text style={styles.statLabel}>Followers</Text></View>
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

    // Action Buttons
    actionRow: { flexDirection: 'row', marginBottom: 15 },
    actionBtn: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
    connectBtn: { backgroundColor: '#4CAF50' }, // Green
    connectedBtn: { backgroundColor: '#e0e0e0', borderWidth: 1, borderColor: '#ccc' }, // Gray
    msgBtn: { backgroundColor: '#2196F3' }, // Blue
    btnText: { fontWeight: 'bold', marginLeft: 8 },

    statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 10 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 12, color: '#888' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 10, marginBottom: 10 },
    badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 8, borderRadius: 15, marginRight: 10, marginBottom: 10 },
    badgeText: { marginLeft: 5, fontWeight: 'bold', color: '#F57F17' },
});