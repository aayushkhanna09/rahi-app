// src/screens/Explore.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, Modal } from 'react-native';
import { collection, query, getDocs, limit, orderBy, where, doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { database, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;

interface Post {
    id: string;
    state?: string;
    text?: string;
    image?: string;
    location?: string;
    isRecommendation?: boolean;
    likes?: string[];
    uid?: string;
    [key: string]: any;
}

export default function Explore({ navigation }: any) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
    const [discoverPosts, setDiscoverPosts] = useState<any[]>([]);
    const [userResults, setUserResults] = useState<any[]>([]);
    const [postResults, setPostResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    useEffect(() => { fetchDiscoverGrid(); }, []);

    const fetchDiscoverGrid = async () => {
        setLoading(true);
        try {
            const q = query(collection(database, 'posts'), orderBy('timestamp', 'desc'), limit(30));
            const snapshot = await getDocs(q);
            const postsWithImages = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((post: any) => post.image);
            setDiscoverPosts(postsWithImages);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.trim() === '') { setUserResults([]); setPostResults([]); return; }
        setLoading(true);
        const searchLower = text.toLowerCase();
        try {
            if (activeTab === 'users') {
                const q = query(collection(database, 'users'), where('email', '>=', searchLower), where('email', '<=', searchLower + '\uf8ff'), limit(15));
                const snapshot = await getDocs(q);
                setUserResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.id !== auth.currentUser?.uid));
            } else {
                const q = query(collection(database, 'posts'), orderBy('timestamp', 'desc'), limit(50));
                const snapshot = await getDocs(q);
                const filteredPosts = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                    .filter((post: Post) =>
                        post.state?.toLowerCase().includes(searchLower) ||
                        post.location?.toLowerCase().includes(searchLower) ||
                        post.text?.toLowerCase().includes(searchLower) ||
                        (post.isRecommendation && searchLower.includes('recommend'))
                    );
                setPostResults(filteredPosts);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (searchQuery) handleSearch(searchQuery); }, [activeTab]);

    // --- CRASH-PROOF LIKE FUNCTION ---
    const handleLike = async (post: Post) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const postRef = doc(database, 'posts', post.id);

        // SAFE CHECK: Ensure likes is an array
        const currentLikes = Array.isArray(post.likes) ? post.likes : [];
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
        <TouchableOpacity onPress={() => setSelectedPost(item)}>
            <Image source={{ uri: item.image }} style={styles.gridImage} />
        </TouchableOpacity>
    );

    const renderUserItem = ({ item }: any) => (
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('UserProfile', { uid: item.id })}>
            {item.photoURL ? <Image source={{ uri: item.photoURL }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><Text>👤</Text></View>}
            <View>
                <Text style={styles.listTitle}>{item.email?.split('@')[0]}</Text>
                <Text style={styles.listSub}>{item.bio || 'Traveler'}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPostItem = ({ item }: any) => (
        <TouchableOpacity style={styles.listItem} onPress={() => setSelectedPost(item)}>
            <View style={styles.avatarPlaceholder}><Ionicons name={item.isRecommendation ? "star" : "location"} size={20} color={item.isRecommendation ? "#FFD700" : "#888"} /></View>
            <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.location || item.state || 'India'}</Text>
                <Text style={styles.listSub} numberOfLines={1}>{item.text}</Text>
            </View>
            {item.image && <Image source={{ uri: item.image }} style={styles.tinyPreview} />}
        </TouchableOpacity>
    );

    const isSearching = searchQuery.trim().length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#888" style={{ marginRight: 10 }} />
                    <TextInput style={styles.searchInput} placeholder="Search users, locations, or tags..." value={searchQuery} onChangeText={handleSearch} autoCapitalize="none" />
                    {isSearching && <TouchableOpacity onPress={() => handleSearch('')}><Ionicons name="close-circle" size={20} color="#888" /></TouchableOpacity>}
                </View>
                {isSearching && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
                            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeTab === 'posts' && styles.activeTab]} onPress={() => setActiveTab('posts')}>
                            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>Places & Posts</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {loading && isSearching ? (
                <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
            ) : !isSearching ? (
                <FlatList key="grid-view" data={discoverPosts} numColumns={3} keyExtractor={item => item.id} renderItem={renderGridItem} ListHeaderComponent={<Text style={styles.exploreTitle}>Discover India 🇮🇳</Text>} />
            ) : (
                <FlatList key={`list-view-${activeTab}`} data={activeTab === 'users' ? userResults : postResults} keyExtractor={item => item.id} renderItem={activeTab === 'users' ? renderUserItem : renderPostItem} contentContainerStyle={{ padding: 10 }} ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#888' }}>No results found.</Text>} />
            )}

            {/* MODAL */}
            <Modal visible={!!selectedPost} animationType="fade" transparent={true} onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPost(null)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
                        {selectedPost?.image && <Image source={{ uri: selectedPost.image }} style={styles.modalImage} />}
                        <View style={styles.modalInfo}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={styles.modalUsername}>@{selectedPost?.displayName || 'User'}</Text>
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
    header: { padding: 15, paddingTop: 60, backgroundColor: '#fff', elevation: 2, zIndex: 10 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 15, height: 45 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    tabContainer: { flexDirection: 'row', marginTop: 15 },
    tab: { flex: 1, paddingBottom: 10, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderColor: '#4CAF50' },
    tabText: { fontSize: 14, color: '#888', fontWeight: 'bold' },
    activeTabText: { color: '#4CAF50' },
    exploreTitle: { fontSize: 18, fontWeight: 'bold', margin: 15, color: '#333' },
    gridImage: { width: GRID_SIZE, height: GRID_SIZE, borderWidth: 0.5, borderColor: '#fff' },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    listSub: { fontSize: 13, color: '#888', marginTop: 2 },
    tinyPreview: { width: 40, height: 40, borderRadius: 5, marginLeft: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '100%', maxWidth: 500, backgroundColor: '#222', borderRadius: 15, overflow: 'hidden' },
    closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 20, padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    modalImage: { width: '100%', height: width },
    modalInfo: { padding: 20 },
    modalUsername: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
    modalLocation: { color: '#aaa', fontSize: 12 },
    modalText: { color: '#fff', fontSize: 16, lineHeight: 22 }
});