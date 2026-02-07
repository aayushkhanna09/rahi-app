// src/config/media.ts
import * as ImagePicker from 'expo-image-picker';

export const pickImage = async () => {
    // 1. Ask Permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return null;
    }

    // 2. Open Gallery (With Heavy Compression)
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // <--- Low quality to keep the text string small!
        base64: true, // <--- This gives us the image as a text string
    });

    if (!result.canceled && result.assets[0].base64) {
        // Return the Base64 string formatted for display
        return `data:image/jpeg;base64,${result.assets[0].base64}`;
    }
    return null;
};