// src/screens/Profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Alert } from 'react-native';
import { collection, query, where, doc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
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

    // Modals & Selection state
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [followType, setFollowType] = useState<'followers' | 'following' | null>(null);
    const [followUsers, setFollowUsers] = useState<any[]>([]);
    const [loadingFollows, setLoadingFollows] = useState(false);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        setLoading(true);

        const userRef = doc(database, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (userDoc) => {
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }
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

        return () => {
            unsubscribeUser();
            unsubscribePosts();
        };
    }, []);

    const confirmDelete = (post: Post) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this memory?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deletePost(post.id)
                }
            ]
        );
    };

    const deletePost = async (postId: string) => {
        try {
            await deleteDoc(doc(database, 'posts', postId));
            setSelectedPost(null);
        } catch (error) {
            console.error("Error deleting post: ", error);
            Alert.alert("Error", "Could not delete post. Try again.");
        }
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
            const fetchedUsers = await Promise.all(
                uids.map(async (uid: string) => {
                    const docSnap = await getDoc(doc(database, 'users', uid));
                    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
                })
            );
            setFollowUsers(fetchedUsers.filter(Boolean));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingFollows(false);
        }
    };

    const renderGridItem = ({ item }: { item: Post }) => (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedPost(item)}
            onLongPress={() => confirmDelete(item)}
        >
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
            {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.followAvatar} />
            ) : (
                <View style={styles.followAvatarPlaceholder}><Text>👤</Text></View>
            )}
            <Text style={styles.followEmail}>{item.email?.split('@')[0]}</Text>
        </TouchableOpacity>
    );

    if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1, justifyContent: 'center' }} />;

    const defaultTags = ['Explorer', 'Traveler'];
    const userTags = userData?.tags?.length ? userData.tags : defaultTags;

    return (
        <View style={styles.container}>
            <View style={styles.topNav}>
                <Text style={styles.navTitle}>{userData?.email?.split('@')[0] || 'Profile'}</Text>
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuIcon}>
                    <Ionicons name="menu" size={32} color="#333" />
                </TouchableOpacity>
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
                    <View style={styles.achievementBadge}>
                        <Text style={styles.achievementText}>🏆 {userData?.badges?.length || 0} Badges</Text>
                    </View>
                    <View style={styles.achievementBadge}>
                        <Text style={styles.achievementText}>📍 {uniqueStatesCount} States</Text>
                    </View>
                </View>
                <View style={styles.tagsRow}>
                    {userTags.map((tag: string, index: number) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>#{tag}</Text>
                        </View>
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
                <FlatList
                    data={userPosts}
                    numColumns={3}
                    keyExtractor={item => item.id}
                    renderItem={renderGridItem}
                    ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>}
                />
            ) : (
                <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{ latitude: 20.5937, longitude: 78.9629, latitudeDelta: 25.0, longitudeDelta: 25.0 }}
                >
                    {userPosts.map(post => (
                        post.latitude && post.longitude ? (
                            <Marker key={post.id} coordinate={{ latitude: post.latitude, longitude: post.longitude }} title={post.location || post.state}>
                                {post.image ? <Image source={{ uri: post.image }} style={styles.mapMarkerImage} /> : <Ionicons name="location" size={30} color="#E53935" />}
                            </Marker>
                        ) : null
                    ))}
                </MapView>
            )}

            {/* POST DETAIL MODAL WITH DELETE */}
            <Modal visible={!!selectedPost} animationType="fade" transparent={true} onRequestClose={() => setSelectedPost(null)}>
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

                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => selectedPost && confirmDelete(selectedPost)}
                            >
                                <Ionicons name="trash-outline" size={22} color="#FF4444" />
                                <Text style={styles.deleteText}>Delete Post</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* SETTINGS DROPDOWN MODAL */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlayTransparent} onPress={() => setMenuVisible(false)}>
                    <View style={styles.dropdownMenu}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setMenuVisible(false);
                            navigation.navigate('EditProfile');
                        }}>
                            <Ionicons name="pencil-outline" size={20} color="#333" />
                            <Text style={styles.menuItemText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setMenuVisible(false);
                            auth.signOut();
                        }}>
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
                            <TouchableOpacity onPress={() => setFollowType(null)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>
                        {loadingFollows ? (
                            <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={followUsers}
                                keyExtractor={item => item.id}
                                renderItem={renderFollowUser}
                                ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
                            />
                        )}
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
    menuIcon: { padding: 5 },
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
    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '100%', maxWidth: 500, backgroundColor: '#222', borderRadius: 15, overflow: 'hidden' },
    closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 20, padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    modalImage: { width: '100%', height: width },
    modalInfo: { padding: 20 },
    modalUsername: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
    modalLocation: { color: '#aaa', fontSize: 12, marginBottom: 10 },
    modalText: { color: '#fff', fontSize: 16, lineHeight: 22 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#444' },
    deleteText: { color: '#FF4444', marginLeft: 10, fontWeight: 'bold' },
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
});