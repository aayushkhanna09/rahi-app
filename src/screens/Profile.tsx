// src/screens/Profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { pickImage } from '../config/media';
import { Ionicons } from '@expo/vector-icons';
import IndiaMap from '../components/IndiaMap';

const INTEREST_TAGS = ['Solo Traveller', 'Foodie', 'Photographer', 'Mountain Lover', 'Beach Bum', 'History Buff', 'Biker', 'Luxury'];

export default function Profile() {
    const [userData, setUserData] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    // Edit Mode State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [newBio, setNewBio] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsub = onSnapshot(doc(database, 'users', auth.currentUser.uid), (doc) => {
            setUserData(doc.data());
            setNewBio(doc.data()?.bio || '');
            setSelectedTags(doc.data()?.tags || []);
        });
        return unsub;
    }, []);

    const handleProfilePicUpdate = async () => {
        try {
            const base64Image = await pickImage();
            if (!base64Image) return;
            setUploading(true);
            await updateDoc(doc(database, 'users', auth.currentUser!.uid), { photoURL: base64Image });
            Alert.alert("Success", "Profile picture updated!");
        } catch (e: any) {
            Alert.alert("Error", "Image too large or cancelled.");
        } finally {
            setUploading(false);
        }
    };

    const saveProfile = async () => {
        try {
            await updateDoc(doc(database, 'users', auth.currentUser!.uid), {
                bio: newBio,
                tags: selectedTags
            });
            setEditModalVisible(false);
            Alert.alert("Saved", "Profile updated!");
        } catch (e) {
            Alert.alert("Error", "Could not save profile.");
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            if (selectedTags.length >= 4) { Alert.alert("Limit Reached", "Max 4 tags allowed."); return; }
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const badges = userData?.badges || [];
    const states = userData?.visitedStates || [];
    const profileImage = userData?.photoURL;
    const tags = userData?.tags || [];

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleProfilePicUpdate} disabled={uploading}>
                    {uploading ? (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: '#eee' }]}><ActivityIndicator color="#4CAF50" /></View>
                    ) : profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarPlaceholder}><Text style={{ fontSize: 30 }}>📷</Text></View>
                    )}
                    <View style={styles.editBadge}><Ionicons name="pencil" size={12} color="#fff" /></View>
                </TouchableOpacity>

                <Text style={styles.name}>{auth.currentUser?.email?.split('@')[0]}</Text>
                <Text style={styles.bio}>{userData?.bio || "Ready to explore India! 🇮🇳"}</Text>

                {/* Tags Display */}
                <View style={styles.tagsRow}>
                    {tags.map((tag: string) => (
                        <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>
                    ))}
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => setEditModalVisible(true)}>
                    <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>

                <View style={styles.statsRow}>
                    <View style={styles.stat}><Text style={styles.statNum}>{states.length}</Text><Text style={styles.statLabel}>States</Text></View>
                    <View style={styles.stat}><Text style={styles.statNum}>{badges.length}</Text><Text style={styles.statLabel}>Badges</Text></View>
                </View>
            </View>

            <IndiaMap visitedStates={states} />

            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
            <View style={styles.badgesContainer}>
                {badges.length === 0 ? (
                    <Text style={{ color: '#888' }}>No badges yet. Go travel!</Text>
                ) : (
                    badges.map((badge: string, index: number) => (
                        <View key={index} style={styles.badge}>
                            <Ionicons name="medal" size={24} color="#FFD700" />
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    ))
                )}
            </View>

            <Text style={styles.sectionTitle}>📍 Visited List</Text>
            <FlatList
                data={states}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <View style={styles.stateCard}><Text style={{ fontWeight: 'bold' }}>{item}</Text></View>}
                keyExtractor={item => item}
                style={{ paddingLeft: 20, marginBottom: 50 }}
            />

            <TouchableOpacity style={styles.logoutBtn} onPress={() => auth.signOut()}>
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            {/* EDIT PROFILE MODAL */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={styles.input}
                            value={newBio}
                            onChangeText={setNewBio}
                            placeholder="Tell us about yourself..."
                            multiline
                        />

                        <Text style={styles.label}>Interests (Max 4)</Text>
                        <View style={styles.tagsContainer}>
                            {INTEREST_TAGS.map(tag => (
                                <TouchableOpacity
                                    key={tag}
                                    style={[styles.tagSelect, selectedTags.includes(tag) && styles.tagSelected]}
                                    onPress={() => toggleTag(tag)}
                                >
                                    <Text style={[styles.tagSelectText, selectedTags.includes(tag) && { color: '#fff' }]}>{tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={{ color: '#555' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderColor: '#eee' },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
    editBadge: { position: 'absolute', bottom: 10, right: 0, backgroundColor: '#4CAF50', padding: 6, borderRadius: 15 },

    name: { fontSize: 22, fontWeight: 'bold' },
    bio: { color: '#666', marginBottom: 10, textAlign: 'center', paddingHorizontal: 20 },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 15 },
    tagPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, margin: 3 },
    tagText: { color: '#2E7D32', fontSize: 12, fontWeight: '600' },

    editBtn: { borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 15, backgroundColor: '#fff' },
    editBtnText: { color: '#333', fontWeight: '600' },

    statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 10 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
    statLabel: { fontSize: 12, color: '#888' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 10, marginBottom: 10 },
    badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 8, borderRadius: 15, marginRight: 10, marginBottom: 10 },
    badgeText: { marginLeft: 5, fontWeight: 'bold', color: '#F57F17' },
    stateCard: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, marginRight: 10, height: 50, justifyContent: 'center' },
    logoutBtn: { margin: 20, padding: 15, backgroundColor: '#ffebee', borderRadius: 10, alignItems: 'center' },
    logoutText: { color: '#c62828', fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    label: { fontWeight: 'bold', color: '#555', marginTop: 10, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, minHeight: 60, textAlignVertical: 'top' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    tagSelect: { padding: 8, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
    tagSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    tagSelectText: { color: '#555' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    cancelBtn: { padding: 10 },
    saveBtn: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }
});