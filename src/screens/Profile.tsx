// src/screens/Profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Alert, TextInput } from 'react-native';
import { collection, query, where, doc, getDoc, onSnapshot, deleteDoc, updateDoc, writeBatch, arrayRemove, arrayUnion, orderBy, limit, getDocs, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface Post {
    id: string;
    state?: string;
    text?: string;
    image?: string;
    latitude?: number;
    longitude?: number;
    location?: string;
    displayName?: string;
    likes?: string[]; // Array of User IDs
    uid?: string;
    [key: string]: any;
}

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;

export default function Profile({ navigation }: any) {
    const [userData, setUserData] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [uniqueStatesCount, setUniqueStatesCount] = useState(0);
    const [activeTab, setActiveTab] = useState<'grid' | 'map'>('grid');
    const [loading, setLoading] = useState(true);

    // Selection & Edit States
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editText, setEditText] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Modals state
    const [menuVisible, setMenuVisible] = useState(false);
    const [followType, setFollowType] = useState<'followers' | 'following' | null>(null);
    const [followUsers, setFollowUsers] = useState<any[]>([]);
    const [loadingFollows, setLoadingFollows] = useState(false);

    // Activity state
    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [activityList, setActivityList] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        setLoading(true);

        const userRef = doc(database, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (userDoc) => {
            if (userDoc.exists()) setUserData(userDoc.data());
        });

        const postsQuery = query(collection(database, 'posts'), where('uid', '==', currentUser.uid));
        const unsubscribePosts = onSnapshot(postsQuery, (postSnapshot) => {
            const posts = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            posts.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setUserPosts(posts);
            const states = new Set(posts.map((p: any) => p.state).filter(Boolean));
            setUniqueStatesCount(states.size);
            setLoading(false);
        });

        return () => { unsubscribeUser(); unsubscribePosts(); };
    }, []);

    // --- ACTIVITY LOGIC ---
    const fetchActivity = async () => {
        setActivityModalVisible(true);
        setLoadingActivity(true);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const combinedActivity: any[] = [];

        try {
            // 1. Fetch Follow Requests
            const requestUids = userData?.followRequests || [];
            if (requestUids.length > 0) {
                const fetchedRequests = await Promise.all(requestUids.map(async (uid: string) => {
                    const docSnap = await getDoc(doc(database, 'users', uid));
                    return docSnap.exists() ? {
                        id: docSnap.id,
                        type: 'follow_request',
                        ...docSnap.data(),
                        timestamp: Date.now()
                    } : null;
                }));
                combinedActivity.push(...fetchedRequests.filter(Boolean));
            }

            // 2. Fetch Notifications
            const q = query(
                collection(database, 'notifications'),
                where('receiverUid', '==', currentUser.uid),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const notificationSnaps = await getDocs(q);
            const fetchedNotifs = notificationSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            combinedActivity.push(...fetchedNotifs);

            combinedActivity.sort((a, b) => b.timestamp - a.timestamp);
            setActivityList(combinedActivity);

        } catch (error) { console.error("Error fetching activity", error); }
        finally { setLoadingActivity(false); }
    };

    const acceptRequest = async (requesterId: string) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        try {
            const batch = writeBatch(database);
            const currentUserRef = doc(database, 'users', currentUser.uid);
            const requesterRef = doc(database, 'users', requesterId);
            batch.update(currentUserRef, { followRequests: arrayRemove(requesterId), followers: arrayUnion(requesterId) });
            batch.update(requesterRef, { following: arrayUnion(currentUser.uid) });
            await batch.commit();
            setActivityList(prev => prev.filter(item => item.id !== requesterId));
        } catch (error) { console.error(error); }
    };

    const declineRequest = async (requesterId: string) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        try {
            await updateDoc(doc(database, 'users', currentUser.uid), { followRequests: arrayRemove(requesterId) });
            setActivityList(prev => prev.filter(item => item.id !== requesterId));
        } catch (error) { console.error(error); }
    };

    // --- CRASH-PROOF LIKE FUNCTION ---
    const handleLike = async (post: Post) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const postRef = doc(database, 'posts', post.id);
        const currentLikes = Array.isArray(post.likes) ? post.likes : [];
        const isLiked = currentLikes.includes(currentUser.uid);

        // UI Optimistic Update
        const updatedLikes = isLiked
            ? currentLikes.filter(id => id !== currentUser.uid)
            : [...currentLikes, currentUser.uid];

        setSelectedPost({ ...post, likes: updatedLikes });

        try {
            if (isLiked) {
                await updateDoc(postRef, { likes: arrayRemove(currentUser.uid), likeCount: increment(-1) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(currentUser.uid), likeCount: increment(1) });
                // We typically don't notify ourselves for liking our own post, but logic is here if needed
            }
        } catch (error) { console.error("Error toggling like:", error); }
    };

    // --- SAFE LIKE HELPERS ---
    const getLikesCount = (post: Post | null) => {
        if (!post || !Array.isArray(post.likes)) return 0;
        return post.likes.length;
    };

    const isPostLiked = (post: Post | null) => {
        if (!post || !Array.isArray(post.likes)) return false;
        return post.likes.includes(auth.currentUser?.uid || '');
    };

    // --- EXISTING ACTIONS ---
    const handleLongPress = (post: Post) => {
        Alert.alert("Post Options", "What would you like to do with this post?", [
            { text: "Edit Post", onPress: () => openEditModal(post) },
            { text: "Delete Post", style: "destructive", onPress: () => confirmDelete(post) },
            { text: "Cancel", style: "cancel" }
        ]);
    };

    const openEditModal = (post: Post) => {
        setSelectedPost(post);
        setEditText(post.text || '');
        setEditLocation(post.location || post.state || '');
        setEditModalVisible(true);
    };

    const handleUpdatePost = async () => {
        if (!selectedPost) return;
        setIsUpdating(true);
        try {
            await updateDoc(doc(database, 'posts', selectedPost.id), { text: editText, location: editLocation });
            setEditModalVisible(false);
            setSelectedPost(null);
        } catch (error) { Alert.alert("Error", "Failed to update post."); }
        finally { setIsUpdating(false); }
    };

    const confirmDelete = (post: Post) => {
        Alert.alert("Delete Post", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deletePost(post.id) }
        ]);
    };

    const deletePost = async (postId: string) => {
        try {
            await deleteDoc(doc(database, 'posts', postId));
            setSelectedPost(null);
        } catch (error) { Alert.alert("Error", "Could not delete post."); }
    };

    const fetchFollowData = async (type: 'followers' | 'following') => {
        setFollowType(type);
        setLoadingFollows(true);
        const uids = userData?.[type] || [];
        if (uids.length === 0) {
            setFollowUsers([]);
            setLoadingFollows(false);
            return;
        }
        try {
            const fetchedUsers = await Promise.all(uids.map(async (uid: string) => {
                const docSnap = await getDoc(doc(database, 'users', uid));
                return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
            }));
            setFollowUsers(fetchedUsers.filter(Boolean));
        } catch (error) { console.error(error); }
        finally { setLoadingFollows(false); }
    };

    // --- RENDERERS ---

    const renderGridItem = ({ item }: { item: Post }) => (
        <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedPost(item)} onLongPress={() => handleLongPress(item)}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.gridImage} />
            ) : (
                <View style={[styles.gridImage, styles.noImagePlaceholder]}>
                    <Text style={styles.noImageText} numberOfLines={2}>{item.text}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderFollowUser = ({ item }: any) => (
        <TouchableOpacity style={styles.followListItem} onPress={() => {
            setFollowType(null);
            navigation.navigate('UserProfile', { uid: item.id });
        }}>
            {item.photoURL ? <Image source={{ uri: item.photoURL }} style={styles.followAvatar} /> : <View style={styles.followAvatarPlaceholder}><Text>👤</Text></View>}
            <Text style={styles.followEmail}>{item.email?.split('@')[0]}</Text>
        </TouchableOpacity>
    );

    const renderActivityItem = ({ item }: any) => {
        if (item.type === 'follow_request') {
            return (
                <View style={styles.requestListItem}>
                    <TouchableOpacity style={styles.activityUserInfo} onPress={() => {
                        setActivityModalVisible(false);
                        navigation.navigate('UserProfile', { uid: item.id });
                    }}>
                        {item.photoURL ? <Image source={{ uri: item.photoURL }} style={styles.followAvatar} /> : <View style={styles.followAvatarPlaceholder}><Text>👤</Text></View>}
                        <View>
                            <Text style={styles.activityUserText}>{item.email?.split('@')[0]}</Text>
                            <Text style={styles.activitySubText}>Requested to follow you</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(item.id)}><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.declineBtn} onPress={() => declineRequest(item.id)}><Ionicons name="close" size={20} color="#666" /></TouchableOpacity>
                    </View>
                </View>
            );
        }
        return (
            <TouchableOpacity style={styles.requestListItem} onPress={() => {/* Open Post Logic */ }}>
                <View style={styles.activityUserInfo}>
                    {item.senderPhoto ? <Image source={{ uri: item.senderPhoto }} style={styles.followAvatar} /> : <View style={styles.followAvatarPlaceholder}><Text>👤</Text></View>}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.activityUserText}>
                            {item.senderName || 'Someone'}
                            <Text style={{ fontWeight: 'normal' }}>{item.type === 'like' ? ' liked your post.' : ` commented: "${item.content}"`}</Text>
                        </Text>
                    </View>
                </View>
                {item.postImage && <Image source={{ uri: item.postImage }} style={styles.activityPostPreview} />}
            </TouchableOpacity>
        );
    };

    if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1, justifyContent: 'center' }} />;

    const defaultTags = ['Explorer', 'Traveler'];
    const userTags = userData?.tags?.length ? userData.tags : defaultTags;
    const badgeCount = userData?.followRequests?.length || 0;

    return (
        <View style={styles.container}>
            <View style={styles.topNav}>
                <Text style={styles.navTitle}>{userData?.email?.split('@')[0] || 'Profile'}</Text>
                <View style={styles.navRightIcons}>
                    <TouchableOpacity onPress={fetchActivity} style={styles.menuIcon}>
                        <Ionicons name="time-outline" size={28} color="#333" />
                        {badgeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount}</Text></View>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuIcon}>
                        <Ionicons name="menu" size={32} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.header}>
                <Image source={{ uri: userData?.photoURL || 'https://via.placeholder.com/100' }} style={styles.profileAvatar} />
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{userPosts.length}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </View>
                    <TouchableOpacity style={styles.statBox} onPress={() => fetchFollowData('followers')}>
                        <Text style={styles.statNumber}>{userData?.followers?.length || 0}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => fetchFollowData('following')}>
                        <Text style={styles.statNumber}>{userData?.following?.length || 0}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.bioSection}>
                <Text style={styles.username}>{userData?.displayName || userData?.email?.split('@')[0] || 'User'}</Text>
                <Text style={styles.bio}>{userData?.bio || 'Living my RAही life ✈️🌍'}</Text>
                <View style={styles.achievementsRow}>
                    <View style={styles.achievementBadge}><Text style={styles.achievementText}>🏆 {userData?.badges?.length || 0} Badges</Text></View>
                    <View style={styles.achievementBadge}><Text style={styles.achievementText}>📍 {uniqueStatesCount} States</Text></View>
                </View>
                <View style={styles.tagsRow}>
                    {userTags.map((tag: string, index: number) => (
                        <View key={index} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>
                    ))}
                </View>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity onPress={() => setActiveTab('grid')} style={styles.tab}>
                    <Ionicons name="grid-outline" size={24} color={activeTab === 'grid' ? '#4CAF50' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('map')} style={styles.tab}>
                    <Ionicons name="map-outline" size={24} color={activeTab === 'map' ? '#4CAF50' : '#888'} />
                </TouchableOpacity>
            </View>

            {activeTab === 'grid' ? (
                <FlatList data={userPosts} numColumns={3} keyExtractor={item => item.id} renderItem={renderGridItem} ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>} />
            ) : (
                <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={{ latitude: 20.5937, longitude: 78.9629, latitudeDelta: 25.0, longitudeDelta: 25.0 }}>
                    {userPosts.map(post => post.latitude && post.longitude ? (
                        <Marker key={post.id} coordinate={{ latitude: post.latitude, longitude: post.longitude }} title={post.location || post.state} onPress={() => setSelectedPost(post)}>
                            {post.image ? <Image source={{ uri: post.image }} style={styles.mapMarkerImage} /> : <Ionicons name="location" size={30} color="#E53935" />}
                        </Marker>
                    ) : null)}
                </MapView>
            )}

            {/* ACTIVITY MODAL */}
            <Modal visible={activityModalVisible} transparent animationType="slide" onRequestClose={() => setActivityModalVisible(false)}>
                <View style={styles.followModalContainer}>
                    <View style={styles.followModalContent}>
                        <View style={styles.followModalHeader}>
                            <Text style={styles.followModalTitle}>Activity</Text>
                            <TouchableOpacity onPress={() => setActivityModalVisible(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
                        </View>
                        {loadingActivity ? <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} /> : <FlatList data={activityList} keyExtractor={item => item.id} renderItem={renderActivityItem} ListEmptyComponent={<Text style={styles.emptyText}>No recent activity.</Text>} />}
                    </View>
                </View>
            </Modal>

            {/* EDIT POST MODAL */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlayDark}>
                    <View style={styles.editCard}>
                        <Text style={styles.editTitle}>Edit Post</Text>
                        <Text style={styles.label}>Location</Text>
                        <TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} />
                        <Text style={styles.label}>Caption</Text>
                        <TextInput style={[styles.input, { height: 80 }]} value={editText} onChangeText={setEditText} multiline />
                        <View style={styles.editActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdatePost} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}</TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* POST DETAIL MODAL */}
            <Modal visible={!!selectedPost && !editModalVisible} animationType="fade" transparent={true} onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalOverlayDark}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPost(null)}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        {selectedPost?.image && <Image source={{ uri: selectedPost.image }} style={styles.modalImage} />}
                        <View style={styles.modalInfo}>
                            <Text style={styles.modalUsername}>@{selectedPost?.displayName || userData?.email?.split('@')[0]}</Text>
                            {(selectedPost?.location || selectedPost?.state) && (
                                <Text style={styles.modalLocation}>📍 {selectedPost.location || selectedPost.state}</Text>
                            )}
                            <Text style={styles.modalText}>{selectedPost?.text}</Text>

                            {/* LIKE BUTTON (Added here to fix Home issue) */}
                            <TouchableOpacity onPress={() => selectedPost && handleLike(selectedPost)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                                <Ionicons name={isPostLiked(selectedPost) ? "heart" : "heart-outline"} size={28} color={isPostLiked(selectedPost) ? "#E53935" : "#fff"} />
                                <Text style={{ marginLeft: 8, color: '#fff', fontWeight: 'bold' }}>{getLikesCount(selectedPost)} likes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* SETTINGS DROPDOWN MODAL */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlayTransparent} onPress={() => setMenuVisible(false)}>
                    <View style={styles.dropdownMenu}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('EditProfile'); }}>
                            <Ionicons name="pencil-outline" size={20} color="#333" />
                            <Text style={styles.menuItemText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); auth.signOut(); }}>
                            <Ionicons name="log-out-outline" size={20} color="#E53935" />
                            <Text style={[styles.menuItemText, { color: '#E53935' }]}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* FOLLOWERS / FOLLOWING MODAL */}
            <Modal visible={!!followType} transparent animationType="slide" onRequestClose={() => setFollowType(null)}>
                <View style={styles.followModalContainer}>
                    <View style={styles.followModalContent}>
                        <View style={styles.followModalHeader}>
                            <Text style={styles.followModalTitle}>{followType === 'followers' ? 'Followers' : 'Following'}</Text>
                            <TouchableOpacity onPress={() => setFollowType(null)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
                        </View>
                        {loadingFollows ? <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} /> : <FlatList data={followUsers} keyExtractor={item => item.id} renderItem={renderFollowUser} ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>} />}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
    navTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    navRightIcons: { flexDirection: 'row', alignItems: 'center' },
    menuIcon: { padding: 5, marginLeft: 15, position: 'relative' },
    badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#E53935', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    header: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 15, alignItems: 'center' },
    profileAvatar: { width: 80, height: 80, borderRadius: 40, marginRight: 20 },
    statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
    statBox: { alignItems: 'center' },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 13, color: '#666' },
    bioSection: { paddingHorizontal: 20, paddingBottom: 15 },
    username: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    bio: { fontSize: 14, color: '#444', marginBottom: 10 },
    achievementsRow: { flexDirection: 'row', marginBottom: 10 },
    achievementBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 10 },
    achievementText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    tag: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginBottom: 5 },
    tagText: { fontSize: 12, color: '#4CAF50', fontWeight: 'bold' },
    tabBar: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    gridItem: { width: GRID_SIZE, height: GRID_SIZE, borderWidth: 0.5, borderColor: '#fff' },
    gridImage: { width: '100%', height: '100%' },
    noImagePlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', padding: 10 },
    noImageText: { fontSize: 10, color: '#888', textAlign: 'center' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
    map: { flex: 1 },
    mapMarkerImage: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#fff' },
    modalOverlayTransparent: { flex: 1, backgroundColor: 'transparent' },
    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '100%', maxWidth: 500, backgroundColor: '#222', borderRadius: 15, overflow: 'hidden' },
    closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 20, padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    modalImage: { width: '100%', height: width },
    modalInfo: { padding: 20 },
    modalUsername: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
    modalLocation: { color: '#aaa', fontSize: 12, marginBottom: 10 },
    modalText: { color: '#fff', fontSize: 16, lineHeight: 22 },
    dropdownMenu: { position: 'absolute', top: 90, right: 20, backgroundColor: '#fff', borderRadius: 8, padding: 5, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15 },
    menuItemText: { fontSize: 16, marginLeft: 10, color: '#333' },
    followModalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    followModalContent: { backgroundColor: '#fff', height: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    followModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 15, marginBottom: 10 },
    followModalTitle: { fontSize: 18, fontWeight: 'bold' },
    followListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    followAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
    followAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    followEmail: { fontSize: 16, color: '#333' },
    editCard: { width: '90%', backgroundColor: '#fff', borderRadius: 15, padding: 20 },
    editTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 14, color: '#666', marginBottom: 5 },
    input: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
    editActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    cancelBtn: { padding: 15, flex: 1, alignItems: 'center' },
    saveBtn: { backgroundColor: '#4CAF50', padding: 15, flex: 1, borderRadius: 8, alignItems: 'center' },
    cancelText: { color: '#666', fontWeight: 'bold' },
    saveText: { color: '#fff', fontWeight: 'bold' },
    requestListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    activityUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
    activityUserText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    activitySubText: { fontSize: 12, color: '#666' },
    activityPostPreview: { width: 40, height: 40, borderRadius: 4, marginLeft: 10 },
    acceptBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginRight: 10 },
    acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    declineBtn: { backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8 },
});