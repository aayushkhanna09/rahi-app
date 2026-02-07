// src/components/CommentModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function CommentModal({ visible, post, onClose }: any) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);

    // 1. Listen for Comments on THIS specific post
    useEffect(() => {
        if (!post) return;
        const commentsRef = collection(database, 'posts', post.id, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'asc')); // Oldest first (like chat)

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [post]);

    // 2. Send Comment
    const handleSend = async () => {
        if (newComment.trim() === '') return;
        setSending(true);
        try {
            await addDoc(collection(database, 'posts', post.id, 'comments'), {
                text: newComment,
                uid: auth.currentUser?.uid,
                displayName: auth.currentUser?.email?.split('@')[0],
                timestamp: serverTimestamp()
            });
            setNewComment('');
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    if (!visible || !post) return null;

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Comments</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* List */}
                    <FlatList
                        data={comments}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.commentItem}>
                                <Text style={styles.username}>{item.displayName}</Text>
                                <Text style={styles.text}>{item.text}</Text>
                            </View>
                        )}
                        contentContainerStyle={{ padding: 15 }}
                        ListEmptyComponent={<Text style={styles.emptyText}>Be the first to comment!</Text>}
                    />

                    {/* Input */}
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Add a comment..."
                                value={newComment}
                                onChangeText={setNewComment}
                            />
                            <TouchableOpacity onPress={handleSend} disabled={sending}>
                                {sending ? <ActivityIndicator color="#4CAF50" /> : <Ionicons name="send" size={24} color="#4CAF50" />}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { height: '70%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontWeight: 'bold', fontSize: 16 },

    commentItem: { marginBottom: 15 },
    username: { fontWeight: 'bold', fontSize: 13, color: '#555' },
    text: { fontSize: 15, marginTop: 2 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },

    inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
});