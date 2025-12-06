import React, { useState, useEffect } from "react";
import { 
  StyleSheet, Text, View, Button, Image, TextInput, 
  TouchableOpacity, Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";

export default function App() {
  const [image, setImage] = useState(null);
  const [quote, setQuote] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [db, setDb] = useState(null);

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    const database = await SQLite.openDatabaseAsync("moments.db");
    setDb(database);
    
    // Create table if it doesn't exist
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS moments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imageUri TEXT,
        quote TEXT
      );
    `);
    
    // Check if data already exists
    loadMoment(database);
  };

  const loadMoment = async (database) => {
    try {
      const result = await database.getAllAsync("SELECT * FROM moments LIMIT 1");
      
      if (result.length > 0) {
        const moment = result[0];
        setImage(moment.imageUri);
        setQuote(moment.quote);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error loading moment:", error);
    }
  };

  const pickImage = async () => {
    // Request permissions for media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library");
      return;
    }

    // Show options for camera or gallery
    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => takePhoto(),
        },
        {
          text: "Choose from Gallery",
          onPress: () => chooseFromGallery(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your camera");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const chooseFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const saveMoment = async () => {
    if (!image || !quote.trim()) {
      Alert.alert("Missing Information", "Please select an image and enter a quote");
      return;
    }

    try {
      // Copy image to permanent storage
      const filename = image.split("/").pop();
      const permanentUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.copyAsync({
        from: image,
        to: permanentUri,
      });

      
      if (db) {
        // Clear any existing data (single moment app)
        await db.runAsync("DELETE FROM moments");
        
        // Insert new moment
        await db.runAsync(
          "INSERT INTO moments (imageUri, quote) VALUES (?, ?)",
          [permanentUri, quote]
        );

        setImage(permanentUri);
        setIsSaved(true);
        Alert.alert("Success", "Your moment has been saved!");
      }
    } catch (error) {
      console.error("Error saving moment:", error);
      Alert.alert("Error", "Failed to save moment");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Favourite Moment 
        ikenna opara 
      </Text>
      
      {/* Image Section */}
      <TouchableOpacity 
        style={styles.imageContainer} 
        onPress={pickImage}
        disabled={isSaved}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Tap to select image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Quote Input */}
      <TextInput
        style={styles.input}
        placeholder="Enter your favourite quote"
        value={quote}
        onChangeText={setQuote}
        multiline
        editable={!isSaved}
      />

      {/* Save Button - Hidden when saved */}
      {!isSaved && (
        <Button title="Save Moment" onPress={saveMoment} color="#4CAF50" />
      )}

      {isSaved && (
        <Text style={styles.savedText}>✓ Your moment is saved forever!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  imageContainer: {
    width: "100%",
    height: 300,
    marginBottom: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  placeholderText: {
    color: "#999",
    fontSize: 16,
  },
  input: {
    height: 100,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
    backgroundColor: "#fafafa",
  },
  savedText: {
    textAlign: "center",
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 10,
  },
}); 