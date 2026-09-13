import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import React, { useEffect, useState, useContext } from "react";
import { useNavigation, useTheme } from "@react-navigation/native";
import Heading from "../../CommonComponent/Heading";
import profileImg from "../../assets/images/noDp.png";
import EditIcon from "../../assets/svg/edit.svg";
import CommonInput from "../../CommonComponent/CommonInput";
import { Colors, Fonts } from "../../constants/theme";
import { RFPercentage } from "react-native-responsive-fontsize";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import Toast from "react-native-toast-message";
import { UserContext } from "../../utils/userContext";
import { launchImageLibrary } from "react-native-image-picker";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AntDesign from 'react-native-vector-icons/AntDesign'

// Cloudinary configuration (store these securely in environment variables)
const CLOUDINARY_CLOUD_NAME = 'ded4krotx';
const CLOUDINARY_UPLOAD_PRESET = 'GymAi Profile Photos'; // Create unsigned upload preset in Cloudinary

const ProfileQuestionaire = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserContext);

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Function to upload image to Cloudinary
  const uploadImageToCloudinary = async (uri) => {
    try {
      setUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg', // or get the actual mime type from the image
        name: `profile_${uuidv4()}.jpg`,
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      
      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      const result = await response.json();
      
      if (response.ok && result.secure_url) {
        return result.secure_url; // Return the Cloudinary URL
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      // The outer save owns the busy state through the profile write.
    }
  };

  const handleSelectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.7,
        maxWidth: 800,
        maxHeight: 800,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        console.log("User cancelled image picker");
        return;
      }

      if (result.errorCode) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: result.errorMessage || "Failed to pick image",
        });
        return;
      }

      const uri = result.assets?.[0]?.uri;
      if (uri) {
        setImageUri(uri);
        
        // Optional: Upload immediately when selected
        // const cloudinaryUrl = await uploadImageToCloudinary(uri);
        // Save the URL temporarily or update state
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to select image",
      });
    }
  };

  useEffect(() => {
    if (userData) {
      setFullName(userData.fullName || "");
      setNickname(userData.nickname || "");
      setEmail(auth().currentUser?.email || "");
      setMobile(userData.mobile || "");
      // If user already has a profile image from Cloudinary
      if (userData.profileImage) {
        setImageUri(userData.profileImage);
      }
    }
  }, [userData]);

  const handleStart = async () => {
    const user = auth().currentUser;
    if (!user) {
      Toast.show({
        type: "error",
        text1: "User not found",
        text2: "Please log in again.",
      });
      return;
    }

    if (!fullName.trim() || !nickname.trim() || !mobile.trim()) {
      Toast.show({
        type: "info",
        text1: "Missing fields",
        text2: "Please fill out all fields.",
      });
      return;
    }

    try {
      setUploading(true);
      
      let profileImageUrl = userData?.profileImage || ""; // Keep existing if no new image
      
      // Upload new image if selected
      if (imageUri && /^(file|content):\/\//.test(imageUri)) {
        try {
          profileImageUrl = await uploadImageToCloudinary(imageUri);
        } catch (uploadError) {
          Toast.show({
            type: "error",
            text1: "Upload Error",
            text2: "Failed to upload image. Profile saved without image.",
          });
        }
      }

      const updatedInfo = { 
        fullName: fullName.trim(), 
        nickname: nickname.trim(), 
        mobile: mobile.trim(),
        profileImage: profileImageUrl,
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      await firestore().collection("Users").doc(user.uid).update(updatedInfo);
      
      setUserData({ 
        ...userData, 
        ...updatedInfo 
      });

      Toast.show({
        type: "success",
        text1: "Profile",
        text2: "Your profile has been saved successfully.",
      });

      navigation.navigate("WorkoutGenerating");
    } catch (error) {
      console.error("Profile save error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView 
        contentContainerStyle={[styles.container, { backgroundColor: Colors.background, flexGrow: 1 }]} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.goBack()} style={{ position: "absolute", left: 20 }}>
            <AntDesign name="arrowleft" color={"white"} size={RFPercentage(3.1)} />
          </TouchableOpacity>
          <Heading title="Fill Your Profile" />
        </View>

        <View style={{ marginTop: RFPercentage(3), alignItems: "center", justifyContent: "center" }}>
          <TouchableOpacity
            onPress={handleSelectImage}
            disabled={uploading}
            style={[
              styles.imageContainer,
              { borderWidth: 1.5, borderColor: Colors.primary }
            ]}
          >
            {uploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <>
                <Image 
                  source={imageUri ? { uri: imageUri } : profileImg} 
                  style={styles.profileImg} 
                />
                {/* <View style={styles.editIcon}>
                  <EditIcon width={16} height={16} />
                </View> */}
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <CommonInput 
            img={require("../../assets/images/user.png")} 
            placeholder="Enter Your Full Name" 
            value={fullName} 
            onChangeText={setFullName} 
          />
          <CommonInput 
            icon={"user-edit"} 
            placeholder="Enter your Nick name" 
            value={nickname} 
            onChangeText={setNickname} 
          />
          <CommonInput 
            img={require("../../assets/images/mail.png")} 
            placeholder="Enter your Email" 
            value={email} 
            editable={false} 
            textInputStyle={{ color: "#888" }} 
          />
          <CommonInput 
            icon={"phone"} 
            placeholder="Enter your Mobile Number" 
            value={mobile} 
            onChangeText={setMobile} 
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, uploading && styles.buttonDisabled]} 
          onPress={handleStart}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btntext}>Start</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProfileQuestionaire;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: RFPercentage(10),
    paddingBottom: 40,
    paddingHorizontal: RFPercentage(2.8),
  },
  imageContainer: {
    width: RFPercentage(19),
    height: RFPercentage(19),
    borderRadius: RFPercentage(100),
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },
  profileImg: {
    width: "100%",
    height: "100%",
    borderRadius: RFPercentage(100),
  },
  editIcon: {
    position: "absolute",
    bottom: 30,
    right: 5,
    backgroundColor: "white",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    zIndex:999
  },
  loadingContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  formSection: {
    width: "100%",
    marginTop: 40,
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    alignSelf: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btntext: {
    fontSize: RFPercentage(2.1),
    color: "white",
    fontFamily: Fonts.Montserrat_SemiBold,
  },
});