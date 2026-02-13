// src/screens/Home.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Post {
    id: string;
    uid: string;
    displayName?: string;
    email?: string;
    text?: string;
    image?: string;
    location?: string;
    state?: string;
    photoURL?: string;
    likes?: string[];
    timestamp?: any;
    [key: string]: any;
}

export default function Home({ navigation }: any) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = auth.currentUser;

    useEffect(() => {
        const q = query(collection(database, 'posts'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Home Snapshot Error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLike = async (post: Post) => {
        if (!currentUser) return;
        const postRef = doc(database, 'posts', post.id);
        const currentLikes = Array.isArray(post.likes) ? post.likes : [];
        const isLiked = currentLikes.includes(currentUser.uid);

        try {
            if (isLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(currentUser.uid),
                    likeCount: increment(-1)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(currentUser.uid),
                    likeCount: increment(1)
                });
                if (post.uid !== currentUser.uid) {
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
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>RAही Feed</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Planner')}>
                    <Ionicons name="map-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addPostContainer} onPress={() => navigation.navigate('CreatePost')}>
                <Image
                    source={{ uri: currentUser?.photoURL || 'https://via.placeholder.com/150' }}
                    style={styles.addPostAvatar}
                />
                <View style={styles.addPostInputPlaceholder}>
                    <Text style={styles.addPostPlaceholderText}>Share your travel story...</Text>
                </View>
                <Ionicons name="images-outline" size={24} color="#4CAF50" />
            </TouchableOpacity>
        </View>
    );

    const renderPost = ({ item }: { item: Post }) => {
        const likesArray = Array.isArray(item.likes) ? item.likes : [];
        const isLiked = likesArray.includes(auth.currentUser?.uid || '');
        const likeCount = likesArray.length;
        const profilePic = item.photoURL ? { uri: item.photoURL } : { uri: 'https://via.placeholder.com/150' };

        // Reusable Footer Component
        const PostFooter = () => (
            <View style={styles.footer}>
                <View style={styles.iconRow}>
                    <TouchableOpacity onPress={() => handleLike(item)} style={styles.iconButton}>
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={28}
                            color={isLiked ? "#E53935" : "#333"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="chatbubble-outline" size={26} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="paper-plane-outline" size={26} color="#333" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.likesText}>
                    {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </Text>
            </View>
        );

        // Reusable Caption Component
        const PostCaption = () => (
            item.text ? (
                <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>
                        <Text style={styles.captionUsername}>{item.displayName || item.email?.split('@')[0]} </Text>
                        {item.text}
                    </Text>
                </View>
            ) : null
        );

        return (
            <View style={styles.postCard}>
                <View style={styles.postHeader}>
                    <TouchableOpacity
                        style={styles.userInfo}
                        onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}
                    >
                        <Image source={profilePic} style={styles.avatar} />
                        <View>
                            <Text style={styles.username}>{item.displayName || item.email?.split('@')[0] || 'User'}</Text>
                            <Text style={styles.location}>
                                📍 {item.location || 'Unknown'} {item.state ? `• ${item.state}` : ''}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {item.image && (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                )}

                {/* CONDITIONAL RENDERING LOGIC */}
                {item.image ? (
                    <>
                        <PostFooter />
                        <PostCaption />
                    </>
                ) : (
                    <>
                        <PostCaption />
                        <PostFooter />
                    </>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee'
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#333' },
    addPostContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        marginTop: 10,
        marginBottom: 10,
        marginHorizontal: 10,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    addPostAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#eee' },
    addPostInputPlaceholder: { flex: 1 },
    addPostPlaceholderText: { color: '#888', fontSize: 15 },
    postCard: {
        backgroundColor: '#fff',
        marginBottom: 10,
        elevation: 1,
        paddingBottom: 10
    },
    postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', marginRight: 10 },
    username: { fontWeight: '700', fontSize: 15, color: '#262626' },
    location: { fontSize: 11, color: '#666', marginTop: 1 },
    postImage: {
        width: width,
        height: 350,
        backgroundColor: '#f0f0f0'
    },
    footer: {
        paddingHorizontal: 15,
        marginTop: 10,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconButton: {
        marginRight: 18,
    },
    likesText: {
        fontWeight: '700',
        fontSize: 14,
        color: '#262626',
    },
    captionContainer: {
        paddingHorizontal: 15,
        marginTop: 10, // Increased slightly for better text separation
        marginBottom: 5
    },
    captionText: { fontSize: 14, color: '#333', lineHeight: 20 },
    captionUsername: { fontWeight: '700' },
});