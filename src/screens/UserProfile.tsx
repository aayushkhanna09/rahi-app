// src/screens/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { collection, query, where, doc, onSnapshot, updateDoc, writeBatch, arrayRemove, arrayUnion, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;

interface Post {
    id: string;
    image?: string;
    text?: string;
    likes?: string[];
    uid?: string;
    displayName?: string;
    location?: string;
    state?: string;
    [key: string]: any;
}

export default function UserProfile({ route, navigation }: any) {
    const { uid } = route.params;
    const currentUid = auth.currentUser?.uid;
    const isOwnProfile = uid === currentUid;

    const [targetUserData, setTargetUserData] = useState<any>(null);
    const [currentUserData, setCurrentUserData] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    useEffect(() => {
        if (!currentUid) return;
        setLoading(true);

        const targetRef = doc(database, 'users', uid);
        const unsubTarget = onSnapshot(targetRef, (docSnap) => { if (docSnap.exists()) setTargetUserData(docSnap.data()); });

        let unsubCurrent = () => { };
        if (!isOwnProfile) {
            const currentRef = doc(database, 'users', currentUid);
            unsubCurrent = onSnapshot(currentRef, (docSnap) => { if (docSnap.exists()) setCurrentUserData(docSnap.data()); });
        }

        const postsQuery = query(collection(database, 'posts'), where('uid', '==', uid));
        const unsubPosts = onSnapshot(postsQuery, (postSnapshot) => {
            const posts = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            posts.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setUserPosts(posts);
            setLoading(false);
        });

        return () => { unsubTarget(); unsubCurrent(); unsubPosts(); };
    }, [uid, currentUid]);

    const isFollowing = targetUserData?.followers?.includes(currentUid);
    const hasRequested = targetUserData?.followRequests?.includes(currentUid);

    const handleFollowAction = async () => {
        if (!currentUid || !targetUserData || isOwnProfile) return;
        const targetRef = doc(database, 'users', uid);
        const currentRef = doc(database, 'users', currentUid);
        try {
            const batch = writeBatch(database);
            if (isFollowing) {
                batch.update(targetRef, { followers: arrayRemove(currentUid) });
                batch.update(currentRef, { following: arrayRemove(uid) });
                await batch.commit();
            } else if (hasRequested) {
                await updateDoc(targetRef, { followRequests: arrayRemove(currentUid) });
            } else {
                await updateDoc(targetRef, { followRequests: arrayUnion(currentUid) });
            }
        } catch (error) { console.error("Error toggling follow status", error); }
    };

    // --- CRASH-PROOF LIKE FUNCTION ---
    const handleLike = async (post: Post) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const postRef = doc(database, 'posts', post.id);
        const currentLikes = Array.isArray(post.likes) ? post.likes : []; // SAFE CHECK
        const isLiked = currentLikes.includes(currentUser.uid);

        const updatedLikes = isLiked
            ? currentLikes.filter(id => id !== currentUser.uid)
            : [...currentLikes, currentUser.uid];

        setSelectedPost({ ...post, likes: updatedLikes });

        try {
            if (isLiked) {
                await updateDoc(postRef, { likes: arrayRemove(currentUser.uid), likeCount: increment(-1) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(currentUser.uid), likeCount: increment(1) });
                if (post.uid && post.uid !== currentUser.uid) {
                    await addDoc(collection(database, 'notifications'), {
                        type: 'like',
                        senderUid: currentUser.uid,
                        senderName: currentUser.displayName || currentUser.email?.split('@')[0],
                        senderPhoto: currentUser.photoURL || null,
                        receiverUid: post.uid,
                        postId: post.id,
                        postImage: post.image,
                        timestamp: serverTimestamp(),
                        read: false
                    });
                }
            }
        } catch (error) { console.error("Error toggling like:", error); }
    };

    // --- SAFE RENDER HELPERS ---
    const getLikesCount = (post: Post | null) => {
        if (!post || !Array.isArray(post.likes)) return 0;
        return post.likes.length;
    };

    const isPostLiked = (post: Post | null) => {
        if (!post || !Array.isArray(post.likes)) return false;
        return post.likes.includes(auth.currentUser?.uid || '');
    };

    const renderGridItem = ({ item }: any) => (
        <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedPost(item)}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.gridImage} />
            ) : (
                <View style={[styles.gridImage, styles.noImagePlaceholder]}>
                    <Text style={styles.noImageText} numberOfLines={2}>{item.text}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1, justifyContent: 'center' }} />;

    return (
        <View style={styles.container}>
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>{targetUserData?.email?.split('@')[0] || 'User'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.header}>
                <Image source={{ uri: targetUserData?.photoURL || 'https://via.placeholder.com/100' }} style={styles.profileAvatar} />
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{userPosts.length}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{targetUserData?.followers?.length || 0}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{targetUserData?.following?.length || 0}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>
            </View>

            <View style={styles.bioSection}>
                <Text style={styles.username}>{targetUserData?.displayName || targetUserData?.email?.split('@')[0]}</Text>
                <Text style={styles.bio}>{targetUserData?.bio || 'Traveler'}</Text>
                {isOwnProfile ? (
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => navigation.navigate('EditProfile')}><Text style={styles.editProfileText}>Edit Profile</Text></TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.followBtn, isFollowing ? styles.followingBtn : hasRequested ? styles.requestedBtn : styles.notFollowingBtn]} onPress={handleFollowAction}>
                        <Text style={[styles.followBtnText, (isFollowing || hasRequested) ? styles.darkText : styles.lightText]}>
                            {isFollowing ? 'Following' : hasRequested ? 'Requested' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {(isOwnProfile || isFollowing) ? (
                <FlatList data={userPosts} numColumns={3} keyExtractor={item => item.id} renderItem={renderGridItem} ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>} />
            ) : (
                <View style={styles.privateContainer}>
                    <Ionicons name="lock-closed-outline" size={50} color="#ccc" />
                    <Text style={styles.privateText}>This account is private.</Text>
                    <Text style={styles.privateSub}>Follow to see their photos and trips.</Text>
                </View>
            )}

            {/* MODAL */}
            <Modal visible={!!selectedPost} animationType="fade" transparent={true} onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPost(null)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
                        {selectedPost?.image && <Image source={{ uri: selectedPost.image }} style={styles.modalImage} />}
                        <View style={styles.modalInfo}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={styles.modalUsername}>@{targetUserData?.displayName || targetUserData?.email?.split('@')[0]}</Text>
                                {(selectedPost?.location || selectedPost?.state) && <Text style={styles.modalLocation}>📍 {selectedPost.location || selectedPost.state}</Text>}
                            </View>
                            <Text style={styles.modalText}>{selectedPost?.text}</Text>

                            {/* CRASH-PROOF LIKE BUTTON */}
                            <TouchableOpacity onPress={() => selectedPost && handleLike(selectedPost)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                                <Ionicons name={isPostLiked(selectedPost) ? "heart" : "heart-outline"} size={28} color={isPostLiked(selectedPost) ? "#E53935" : "#fff"} />
                                <Text style={{ marginLeft: 8, color: '#fff', fontWeight: 'bold' }}>{getLikesCount(selectedPost)} likes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#eee' },
    backBtn: { padding: 5 },
    navTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    header: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, alignItems: 'center' },
    profileAvatar: { width: 80, height: 80, borderRadius: 40, marginRight: 20 },
    statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
    statBox: { alignItems: 'center' },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 13, color: '#666' },
    bioSection: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderColor: '#eee' },
    username: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    bio: { fontSize: 14, color: '#444', marginBottom: 15 },
    followBtn: { paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    editProfileBtn: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ccc', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    editProfileText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
    notFollowingBtn: { backgroundColor: '#4CAF50' },
    requestedBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
    followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
    followBtnText: { fontWeight: 'bold', fontSize: 14 },
    lightText: { color: '#fff' },
    darkText: { color: '#333' },
    gridItem: { width: GRID_SIZE, height: GRID_SIZE, borderWidth: 0.5, borderColor: '#fff' },
    gridImage: { width: '100%', height: '100%' },
    noImagePlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', padding: 10 },
    noImageText: { fontSize: 10, color: '#888', textAlign: 'center' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
    privateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    privateText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15 },
    privateSub: { fontSize: 14, color: '#888', marginTop: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '100%', maxWidth: 500, backgroundColor: '#222', borderRadius: 15, overflow: 'hidden' },
    closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 20, padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    modalImage: { width: '100%', height: width },
    modalInfo: { padding: 20 },
    modalUsername: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
    modalLocation: { color: '#aaa', fontSize: 12 },
    modalText: { color: '#fff', fontSize: 16, lineHeight: 22 }
});