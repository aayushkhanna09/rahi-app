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

    // Create Post State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [postText, setPostText] = useState('');
    const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
    const [postImage, setPostImage] = useState<string | null>(null);

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

    // 1. First Step: Get Location & Open Modal
    const initiateCheckIn = async (withPhoto = false) => {
        setLoading(true);
        try {
            // Photo Logic
            if (withPhoto) {
                const img = await pickImage();
                if (!img) { setLoading(false); return; }
                setPostImage(img);
            } else {
                setPostImage(null);
            }

            // Location Logic
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission denied'); setLoading(false); return; }

            let location = await Location.getCurrentPositionAsync({});
            const userPoint = Turf.point([location.coords.longitude, location.coords.latitude]);

            let stateName = "Unknown Location";
            Turf.featureEach(INDIAN_STATES as any, (currentFeature) => {
                if (Turf.booleanPointInPolygon(userPoint, currentFeature as any)) {
                    stateName = currentFeature.properties?.name || "India";
                }
            });

            setDetectedLocation(stateName);
            setPostText(`Checking in at ${stateName}! 🇮🇳`); // Default text
            setCreateModalVisible(true); // <--- OPEN MODAL FOR CAPTION

        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    // 2. Second Step: Actually Post (With User's PFP and Custom Text)
    const finalizePost = async () => {
        if (!auth.currentUser || !detectedLocation) return;
        setLoading(true);
        try {
            // Fetch current user data to get the latest PFP
            const userDoc = await getDoc(doc(database, 'users', auth.currentUser.uid));
            const userData = userDoc.data();
            const userPhoto = userData?.photoURL || null;

            // Update User Travel History
            const userRef = doc(database, 'users', auth.currentUser.uid);
            await setDoc(userRef, { visitedStates: arrayUnion(detectedLocation), email: auth.currentUser.email }, { merge: true });

            // Award Badge
            if ((userData?.visitedStates?.length || 0) >= 1) await setDoc(userRef, { badges: arrayUnion('Bronze Explorer') }, { merge: true });

            // Create Post
            await addDoc(collection(database, 'posts'), {
                text: postText, // <--- Custom User Text
                state: detectedLocation,
                image: postImage,
                uid: auth.currentUser.uid,
                displayName: auth.currentUser.email?.split('@')[0],
                userPhoto: userPhoto, // <--- SAVING PFP TO POST
                timestamp: serverTimestamp(),
                likes: 0,
                likedBy: []
            });

            setCreateModalVisible(false);
            Alert.alert("Success", "Posted!");
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

    const openComments = (post: any) => {
        setSelectedPost(post);
        setModalVisible(true);
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
                        {/* NEW: Display Actual User PFP from Post Data */}
                        {item.userPhoto ? (
                            <Image source={{ uri: item.userPhoto }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}><Text style={{ fontSize: 20 }}>👤</Text></View>
                        )}

                        <View>
                            <Text style={styles.username}>{item.displayName}</Text>
                            <Text style={styles.location}>{item.state || 'India'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={styles.postText}>{item.text}</Text>
                {item.image && <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />}

                <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "red" : "#333"} />
                        <Text style={[styles.actionText, isLiked && { color: 'red' }]}>{item.likes || 0} Likes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
                        <Ionicons name="chatbubble-outline" size={22} color="#333" />
                        <Text style={styles.actionText}>Comment</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>RAHī Feed</Text>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={[styles.iconBtn, { marginRight: 10, backgroundColor: '#E8F5E9' }]} onPress={() => initiateCheckIn(true)} disabled={loading}>
                        <Ionicons name="camera" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.checkInBtn} onPress={() => initiateCheckIn(false)} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>📍 Check In</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList data={posts} renderItem={renderPost} keyExtractor={item => item.id} contentContainerStyle={{ padding: 10 }} />

            <CommentModal visible={modalVisible} post={selectedPost} onClose={() => setModalVisible(false)} />

            {/* CREATE POST MODAL */}
            <Modal visible={createModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Post 📍</Text>
                        <Text style={styles.modalSub}>Detected: {detectedLocation}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Describe your experience..."
                            value={postText}
                            onChangeText={setPostText}
                            multiline
                        />

                        {postImage && <Image source={{ uri: postImage }} style={styles.previewImage} />}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalVisible(false)}>
                                <Text style={{ color: '#555' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.postBtn} onPress={finalizePost} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Post</Text>}
                            </TouchableOpacity>
                        </View>
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
    checkInBtn: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20 },
    iconBtn: { padding: 10, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    username: { fontWeight: 'bold', fontSize: 16 },
    location: { color: '#666', fontSize: 12 },
    postText: { fontSize: 15, lineHeight: 22, marginBottom: 10, color: '#333' },
    postImage: { width: '100%', height: 250, borderRadius: 10, marginBottom: 10 },
    cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    actionText: { marginLeft: 5, color: '#555', fontSize: 14 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
    modalSub: { color: '#666', marginBottom: 15 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, minHeight: 80, textAlignVertical: 'top', marginBottom: 15 },
    previewImage: { width: '100%', height: 150, borderRadius: 10, marginBottom: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { padding: 10, marginRight: 10 },
    postBtn: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 10 }
});