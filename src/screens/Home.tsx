// src/screens/Home.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput } from 'react-native';
import * as Location from 'expo-location';
import * as Turf from '@turf/turf';
import {
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc, arrayUnion, getDoc, updateDoc, increment, arrayRemove
} from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { INDIAN_STATES } from '../data/indianStates';
import { pickImage } from '../config/media';
import { Ionicons } from '@expo/vector-icons';
import CommentModal from '../components/CommentModal';

export default function Home({ navigation }: any) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Post Creation State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [postText, setPostText] = useState('');
    const [locationName, setLocationName] = useState<string | null>(null);
    const [postImage, setPostImage] = useState<string | null>(null);
    const [locLoading, setLocLoading] = useState(false);

    // Comments State
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const q = query(collection(database, 'posts'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    // --- NEW: Location Tagging Logic (Optional) ---
    const detectLocation = async () => {
        setLocLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission denied'); return; }

            let loc = await Location.getCurrentPositionAsync({});
            const userPoint = Turf.point([loc.coords.longitude, loc.coords.latitude]);

            let stateName = "India";
            Turf.featureEach(INDIAN_STATES as any, (currentFeature) => {
                if (Turf.booleanPointInPolygon(userPoint, currentFeature as any)) {
                    stateName = currentFeature.properties?.name || "India";
                }
            });
            setLocationName(stateName);
        } catch (error: any) { Alert.alert("Error", "Could not fetch location."); }
        finally { setLocLoading(false); }
    };

    // --- NEW: Add Photo Logic ---
    const handleAddPhoto = async () => {
        const img = await pickImage();
        if (img) setPostImage(img);
    };

    // --- NEW: Finalize Post ---
    const handlePost = async () => {
        if (!postText && !postImage) { Alert.alert("Empty Post", "Please add text or an image."); return; }

        setLoading(true);
        try {
            const userDoc = await getDoc(doc(database, 'users', auth.currentUser!.uid));
            const userData = userDoc.data();

            // If location was tagged, update user history
            if (locationName) {
                const userRef = doc(database, 'users', auth.currentUser!.uid);
                await setDoc(userRef, { visitedStates: arrayUnion(locationName) }, { merge: true });
            }

            await addDoc(collection(database, 'posts'), {
                text: postText,
                state: locationName || null, // Optional
                image: postImage || null,
                uid: auth.currentUser!.uid,
                displayName: auth.currentUser!.email?.split('@')[0],
                userPhoto: userData?.photoURL || null,
                timestamp: serverTimestamp(),
                likes: 0,
                likedBy: []
            });

            // Reset & Close
            setPostText('');
            setLocationName(null);
            setPostImage(null);
            setCreateModalVisible(false);

        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (post: any) => {
        const user = auth.currentUser;
        if (!user) return;
        const postRef = doc(database, 'posts', post.id);
        const isLiked = post.likedBy?.includes(user.uid);

        if (isLiked) {
            await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
        } else {
            await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
        }
    };

    const renderPost = ({ item }: any) => {
        const isLiked = item.likedBy?.includes(auth.currentUser?.uid);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}
                    >
                        {item.userPhoto ? (
                            <Image source={{ uri: item.userPhoto }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}><Text style={{ fontSize: 20 }}>👤</Text></View>
                        )}
                        <View>
                            <Text style={styles.username}>{item.displayName}</Text>
                            {item.state && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="location-sharp" size={10} color="#4CAF50" />
                                    <Text style={styles.location}>{item.state}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={styles.postText}>{item.text}</Text>
                {item.image && <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />}

                <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "red" : "#333"} />
                        <Text style={[styles.actionText, isLiked && { color: 'red' }]}>{item.likes || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedPost(item); setModalVisible(true); }}>
                        <Ionicons name="chatbubble-outline" size={22} color="#333" />
                        <Text style={styles.actionText}>Comment</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with (+) Button */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>RAHī Feed</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList data={posts} renderItem={renderPost} keyExtractor={item => item.id} contentContainerStyle={{ padding: 10 }} />

            <CommentModal visible={modalVisible} post={selectedPost} onClose={() => setModalVisible(false)} />

            {/* CREATE POST MODAL */}
            <Modal visible={createModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={styles.modalTitle}>New Post</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="What's on your mind?"
                            value={postText}
                            onChangeText={setPostText}
                            multiline
                        />

                        {/* Attachments Row */}
                        <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                            <TouchableOpacity style={[styles.attachBtn, locationName && styles.attachActive]} onPress={detectLocation} disabled={locLoading}>
                                {locLoading ? <ActivityIndicator size="small" color="#4CAF50" /> : <Ionicons name="location-sharp" size={20} color={locationName ? "#fff" : "#4CAF50"} />}
                                <Text style={[styles.attachText, locationName && { color: '#fff' }]}>{locationName || "Location"}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.attachBtn, postImage && styles.attachActive]} onPress={handleAddPhoto}>
                                <Ionicons name="image" size={20} color={postImage ? "#fff" : "#2196F3"} />
                                <Text style={[styles.attachText, postImage && { color: '#fff' }]}>{postImage ? "Added" : "Photo"}</Text>
                            </TouchableOpacity>
                        </View>

                        {postImage && <Image source={{ uri: postImage }} style={styles.previewImage} />}

                        <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Post</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingTop: 50, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50' },
    createBtn: { backgroundColor: '#4CAF50', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    username: { fontWeight: 'bold', fontSize: 16 },
    location: { color: '#666', fontSize: 12, marginLeft: 2 },
    postText: { fontSize: 15, lineHeight: 22, marginBottom: 10, color: '#333' },
    postImage: { width: '100%', height: 250, borderRadius: 10, marginBottom: 10 },
    cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    actionText: { marginLeft: 5, color: '#555', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    input: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 15, minHeight: 100, textAlignVertical: 'top', marginBottom: 15, fontSize: 16 },
    attachBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee', marginRight: 10 },
    attachActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    attachText: { marginLeft: 5, color: '#555', fontSize: 12, fontWeight: '600' },
    previewImage: { width: '100%', height: 150, borderRadius: 10, marginBottom: 15 },
    postBtn: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 }
});