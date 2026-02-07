// src/screens/Conversation.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function Conversation({ route, navigation }: any) {
    // Params determine if it's Global or Private
    const { roomId, chatName, isGlobal } = route.params || {};

    // Logic: If Global, use 'chats' collection. If Private, use 'rooms/roomId/messages'
    const collectionPath = isGlobal ? 'chats' : `rooms/${roomId}/messages`;
    const headerTitle = isGlobal ? "Global Community 🌎" : chatName || "Chat";

    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [myPhoto, setMyPhoto] = useState<string | null>(null);

    useEffect(() => {
        if (auth.currentUser) {
            getDoc(doc(database, 'users', auth.currentUser.uid)).then(snap => {
                setMyPhoto(snap.data()?.photoURL || null);
            });
        }
    }, []);

    useEffect(() => {
        const q = query(collection(database, collectionPath), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [collectionPath]);

    const handleSend = async () => {
        const msg = text.trim();
        if (msg.length === 0) return;

        setText(''); // Optimistic update

        const { uid, email } = auth.currentUser!;

        // If private, update the 'Room' document so it shows in the list with the last message
        if (!isGlobal && roomId) {
            await setDoc(doc(database, 'rooms', roomId), {
                lastMessage: msg,
                lastActive: serverTimestamp(),
                participants: roomId.split('_'),
                chatName: chatName // Save name for list view
            }, { merge: true });
        }

        await addDoc(collection(database, collectionPath), {
            text: msg,
            uid,
            displayName: email?.split('@')[0],
            photoURL: myPhoto,
            createdAt: serverTimestamp()
        });
    };

    const renderMessage = ({ item }: any) => {
        const isMe = item.uid === auth.currentUser?.uid;
        return (
            <View style={[styles.msgRow, isMe ? styles.rowRight : styles.rowLeft]}>
                {!isMe && (
                    item.photoURL ? <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                        : <View style={[styles.avatar, { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }]}><Text>👤</Text></View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                    {!isMe && isGlobal && <Text style={styles.senderName}>{item.displayName}</Text>}
                    <Text style={[styles.text, isMe ? styles.textRight : styles.textLeft]}>{item.text}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isGlobal ? { backgroundColor: '#075E54' } : { backgroundColor: '#4CAF50' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={styles.title}>{headerTitle}</Text>
                    <Text style={styles.subtitle}>{messages.length} messages</Text>
                </View>
                <View style={{ width: 30 }} />
            </View>

            <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                inverted
                contentContainerStyle={{ padding: 15 }}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={text}
                        onChangeText={setText}
                    />
                    <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, isGlobal ? { backgroundColor: '#075E54' } : { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E5DDD5' },
    header: { flexDirection: 'row', padding: 15, paddingTop: 50, alignItems: 'center', elevation: 4 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 12, color: '#E0F2F1' },
    msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
    rowRight: { justifyContent: 'flex-end' },
    rowLeft: { justifyContent: 'flex-start' },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginBottom: 2 },
    bubble: { maxWidth: '75%', padding: 10, borderRadius: 15, elevation: 1 },
    bubbleRight: { backgroundColor: '#DCF8C6', borderTopRightRadius: 0 },
    bubbleLeft: { backgroundColor: '#fff', borderTopLeftRadius: 0 },
    senderName: { fontSize: 11, color: '#E57373', fontWeight: 'bold', marginBottom: 2 },
    text: { fontSize: 16 },
    textRight: { color: '#000' },
    textLeft: { color: '#000' },
    inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, marginRight: 10, fontSize: 16 },
    sendBtn: { width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center', elevation: 2 },
});