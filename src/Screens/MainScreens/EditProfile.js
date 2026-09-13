import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import profileImg from "../../assets/images/noDp.png";
import Heading from "../../CommonComponent/Heading";
import Paragraph from "../../CommonComponent/Paragraph";
import CommonInput from "../../CommonComponent/CommonInput";
import EditIcon from "../../assets/svg/edit.svg";
import { UserContext } from "../../utils/userContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { launchImageLibrary } from "react-native-image-picker";
import { RFPercentage } from "react-native-responsive-fontsize";
import { Colors, Fonts } from "../../constants/theme";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Toast from "react-native-toast-message";

// Cloudinary configuration (use the same as in ProfileQuestionaire)
const CLOUDINARY_CLOUD_NAME = "ded4krotx";
const CLOUDINARY_UPLOAD_PRESET = "GymAi Profile Photos";

// Simple unique ID generator (no uuid dependency needed)
const generateUniqueId = () => {
  return `profile_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
};

const EditProfile = () => {
  const { userData, setUserData } = useContext(UserContext);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Function to upload image to Cloudinary
  const uploadImageToCloudinary = async (uri) => {
    try {
      setUploading(true);

      // Extract file extension
      const fileExtension = uri.split(".").pop().toLowerCase();
      const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
      };

      const mimeType = mimeTypes[fileExtension] || "image/jpeg";

      // Create form data
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: mimeType,
        name: `${generateUniqueId()}.${fileExtension}`,
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (response.ok && result.secure_url) {
        return result.secure_url;
      } else {
        throw new Error(
          "Upload failed: " + (result.error?.message || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
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

        // Optional: Auto-upload when selected
        // If you want to upload immediately when user selects image:
        // try {
        //   const cloudinaryUrl = await uploadImageToCloudinary(uri);
        //   setImageUri(cloudinaryUrl); // Store the URL instead of local URI
        // } catch (error) {
        //   Toast.show({
        //     type: "error",
        //     text1: "Upload Failed",
        //     text2: "Image selected but upload failed",
        //   });
        // }
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
      setEmail(userData.email || auth().currentUser?.email || "");
      setMobileNumber(userData?.mobile || "");
      setDob(userData.dob || "");
      setWeight(userData.weight || "");
      setHeight(userData.height || "");

      // If user already has a profile image (could be Cloudinary URL or local)
      if (userData.profileImage) {
        setImageUri(userData.profileImage);
      }
    }
  }, [userData]);

  const handleUpdate = async () => {
    // Validate required fields
    if (!fullName.trim()) {
      Toast.show({
        type: "info",
        text1: "Missing Information",
        text2: "Please enter your full name",
      });
      return;
    }

    if (!mobileNumber.trim()) {
      Toast.show({
        type: "info",
        text1: "Missing Information",
        text2: "Please enter your mobile number",
      });
      return;
    }

    const user = auth().currentUser;
    if (!user) {
      Toast.show({
        type: "error",
        text1: "Authentication Error",
        text2: "Please log in again",
      });
      return;
    }

    try {
      setUpdating(true);

      let profileImageUrl = userData?.profileImage || "";

      // Upload new image if selected and it's a local file (not already a URL)
      if (imageUri && /^(file|content):\/\//.test(imageUri)) {
        try {
          profileImageUrl = await uploadImageToCloudinary(imageUri);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          Toast.show({
            type: "error",
            text1: "Image Upload Failed",
            text2: "Profile updated but image upload failed",
          });
          // Continue updating profile without changing image URL
          profileImageUrl = userData?.profileImage || "";
        }
      } else if (
        imageUri &&
        !/^(file|content):\/\//.test(imageUri) &&
        imageUri !== userData?.profileImage
      ) {
        // If it's already a URL but different from current one (could be from temp upload)
        profileImageUrl = imageUri;
      }

      const updatedData = {
        fullName: fullName.trim(),
        email: email.trim() || user.email || "",
        mobile: mobileNumber.trim(),
        dob: dob.trim(),
        weight: weight.trim(),
        height: height.trim(),
        profileImage: profileImageUrl,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Update in Firestore
      await firestore().collection("Users").doc(user.uid).update(updatedData);

      // Update local context
      const newUserData = {
        ...userData,
        ...updatedData,
      };

      setUserData(newUserData);

      // Update AsyncStorage
      await AsyncStorage.setItem("userData", JSON.stringify(newUserData));

      Toast.show({
        type: "success",
        text1: "Success!",
        text2: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Update error:", error);
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.message || "Failed to update profile",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Helper function to get profile image source
  const getProfileImageSource = () => {
    if (imageUri) {
      return { uri: imageUri };
    }
    return profileImg;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileContainer}>
          <View
            style={{
              marginTop: RFPercentage(3),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={handleSelectImage}
              disabled={uploading}
              style={[
                styles.profileImgContainer,
                {
                  borderWidth: 1,
                  borderColor: Colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              {uploading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : (
                <>
                  <Image
                    source={getProfileImageSource()}
                    style={styles.profileImage}
                  />
                  <View style={styles.editIcon}>
                    <EditIcon width={16} height={16} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 20 }}>
            <Heading title={userData?.fullName || fullName || "User"} />
          </View>
          <View style={{ bottom: 20 }}>
            <Paragraph
              title={email || auth().currentUser?.email || "No email"}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <CommonInput
            icon={"user"}
            placeholder="Enter Your Full Name"
            value={fullName}
            onChangeText={setFullName}
          />
          <CommonInput
            icon={"phone"}
            placeholder="Enter your Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
          />
          <CommonInput
            icon={"calendar-alt"}
            placeholder="Enter your Date of birth (DD/MM/YYYY)"
            value={dob}
            onChangeText={setDob}
          />
          <CommonInput
            icon={"weight"}
            placeholder="Enter your Weight (e.g., 70kg or 150LB)"
            value={weight}
            onChangeText={setWeight}
          />
          <CommonInput
            icon={"ruler-vertical"}
            placeholder="Enter your Height (e.g., 175cm or 5'9\"
            value={height}
            onChangeText={setHeight}
          />
        </View>

        <Pressable
          style={[
            styles.updateButton,
            (uploading || updating) && styles.updateButtonDisabled,
          ]}
          onPress={handleUpdate}
          disabled={uploading || updating}
        >
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.updateButtonText}>Update Profile</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  profileContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 20,
  },
  profileImgContainer: {
    width: 150,
    height: 150,
    borderRadius: 100,
    position: "relative",
  },
  profileImage: {
    width: 145,
    height: 145,
    borderRadius: 100,
  },
  loadingContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 100,
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: "white",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  formSection: {
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    marginTop: 20,
  },
  updateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    alignSelf: "center",
    marginTop: 40,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Medium,
  },
  deleteImageButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignSelf: "center",
    marginTop: 20,
  },
  deleteImageButtonText: {
    color: "white",
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
  },
});
