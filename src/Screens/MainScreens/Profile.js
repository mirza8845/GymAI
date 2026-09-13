import { callDeleteAccount } from "../../services/workoutApi";
import React, { useContext, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import profileImg from "../../assets/images/noDp.png";
import Heading from "../../CommonComponent/Heading";
import { useNavigation } from "@react-navigation/native";
import { UserContext } from "../../utils/userContext";
import { Colors, Fonts } from "../../constants/theme";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Ionicons from "react-native-vector-icons/Ionicons";

const Profile = () => {
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserContext);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const deleteStarted = useRef(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const profileOptions = [
    { icon: "history", title: "Workout history", navigateTo: "SaveRoutineDate", color: "white" },
    {
      icon: "user",
      title: "Profile",
      navigateTo: "EditProfile",
      color: "white",
    },
    {
      icon: "redo",
      title: "Retake Questionnaire",
      navigateTo: "genderQuestionnaire",
      color: "white",
    },
    {
      icon: "cog",
      title: "Setting",
      navigateTo: "SettingsScreen",
      color: "white",
    },
    {
      icon: "question-circle",
      title: "Help",
      navigateTo: "HelpScreen",
      color: "white",
    },
    { icon: "trash", title: "Delete Account", color: "red" },
    { icon: "sign-out-alt", title: "Logout", color: "red" },
  ];

  const handleLogout = async () => {
    try {
      await auth().signOut();
      await AsyncStorage.multiRemove(['email','password','userData']);
      setUserData(null);
      navigation.reset({index:0,routes:[{name:'Onboarding'}]});
    } catch (_) { Alert.alert('Could not sign out','Please try again.'); }
  };

  const handleDeleteAccount = () => {
    if (deleteStarted.current) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE' || !password) {
      Alert.alert('Confirmation required','Type DELETE and enter your current password.'); return;
    }
    Alert.alert('Permanently delete account?', 'Your profile, plans, workout history and account will be removed. This cannot be undone.', [
      {text:'Cancel',style:'cancel'},
      {text:'Delete account',style:'destructive',onPress:async()=>{
        if(deleteStarted.current)return;
        deleteStarted.current=true;setIsDeleting(true);
        try{
          const user=auth().currentUser;
          if(!user?.email)throw new Error('Sign in again before deleting your account.');
          await user.reauthenticateWithCredential(auth.EmailAuthProvider.credential(user.email,password));
          await callDeleteAccount();
          await auth().signOut();
          await AsyncStorage.multiRemove(['email','password','userData']);
          setPassword('');setUserData(null);setShowDeleteModal(false);
          navigation.reset({index:0,routes:[{name:'Onboarding'}]});
        }catch(error){
          Alert.alert('Account not deleted', error.code?.startsWith('auth/') ? 'Check your password and connection, then try again.' : 'Account deletion could not finish. Please retry when the service is available.');
        }finally{deleteStarted.current=false;setIsDeleting(false);}
      }},
    ]);
  };

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              This action is permanent and cannot be undone
            </Text>
          </View>

          {/* Warning Information */}
          <View style={styles.warningContainer}>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.warningText}>
                All workout data will be permanently deleted
              </Text>
            </View>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.warningText}>
                Personal information will be removed
              </Text>
            </View>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.warningText}>
                This action cannot be reversed
              </Text>
            </View>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.warningText}>
                You will be logged out immediately
              </Text>
            </View>
          </View>

          {/* Confirmation Input */}
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmLabel}>
              Type <Text style={styles.confirmKeyword}>DELETE</Text> to confirm:
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type DELETE here"
                placeholderTextColor="#666666"
                autoCapitalize="characters"
                editable={!isDeleting}
              />
              {deleteConfirmText.length > 0 && (
                <Text
                  style={[
                    styles.confirmStatus,
                    deleteConfirmText.toUpperCase() === "DELETE"
                      ? styles.confirmValid
                      : styles.confirmInvalid,
                  ]}
                >
                  {deleteConfirmText.toUpperCase() === "DELETE" ? "✓" : "✗"}
                </Text>
              )}
            </View>
          </View>

          <TextInput style={styles.textInput} accessibilityLabel="Current password" placeholder="Current password" placeholderTextColor="#aaa" secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} editable={!isDeleting}/>
          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.deleteButton,
                (isDeleting || deleteConfirmText.toUpperCase() !== "DELETE") &&
                  styles.deleteButtonDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={
                isDeleting || deleteConfirmText.toUpperCase() !== "DELETE"
              }
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileCard}>
          <Image
            source={
              userData?.profileImage
                ? { uri: userData?.profileImage }
                : profileImg
            }
            resizeMode="contain"
            style={[
              styles.profileImage,
              { borderWidth: 1, borderColor: Colors.primary },
            ]}
          />
          <Heading title={userData?.fullName} />
          <Text style={styles.email}>{auth().currentUser?.email}</Text>

          <Text style={styles.birthdayText}>
            <Text style={styles.birthdayLabel}>Nickname: </Text>
            <Text style={styles.birthdayValue}>{userData?.nickname}</Text>
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.weight}</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.age}</Text>
              <Text style={styles.statLabel}>Years Old</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData?.height}</Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          {profileOptions.map((item, index) => (
            <Pressable
              key={index}
              style={styles.optionItem}
              onPress={() => {
                if (item.title === "Logout") {
                  handleLogout();
                } else if (item.title === "Delete Account") {
                  setShowDeleteModal(true);
                  setDeleteConfirmText("");
                } else if (item.navigateTo) {
                  navigation.navigate(item.navigateTo);
                }
              }}
            >
              <FontAwesome5 name={item.icon} size={20} color={item.color} />
              <Text style={[styles.optionText, { color: item.color }]}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {renderDeleteModal()}
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  profileCard: {
    borderRadius: 20,
    alignItems: "center",
    padding: 20,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 100,
    marginBottom: 15,
  },
  email: {
    color: "#999",
    fontFamily: Fonts.Montserrat_Medium,
  },
  birthdayText: {
    flexDirection: "row",
  },
  birthdayLabel: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Medium,
  },
  birthdayValue: {
    color: "#999",
    fontFamily: Fonts.Montserrat_Regular,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 30,
    width: "100%",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontFamily: Fonts.Montserrat_Bold,
  },
  statLabel: {
    color: "#999",
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
  },
  divider: {
    width: 2,
    height: 50,
    backgroundColor: "#333",
    alignSelf: "center",
  },
  optionsContainer: {
    marginTop: 30,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
    shadowColor: "#6D6D6D",
  },
  optionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Medium,
    marginLeft: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: "#EF4444",
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
    textAlign: "center",
  },
  warningContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  warningText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
    marginLeft: 12,
    flex: 1,
  },
  confirmContainer: {
    marginBottom: 24,
  },
  confirmLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Medium,
    marginBottom: 12,
  },
  confirmKeyword: {
    color: "#EF4444",
    fontFamily: Fonts.Montserrat_Bold,
  },
  inputContainer: {
    position: "relative",
  },
  textInput: {
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Medium,
  },
  confirmStatus: {
    position: "absolute",
    right: 16,
    top: 16,
    fontSize: 20,
  },
  confirmValid: {
    color: "#10B981",
  },
  confirmInvalid: {
    color: "#EF4444",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#444",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Medium,
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  deleteButtonDisabled: {
    backgroundColor: "#7F1D1D",
    opacity: 0.7,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Bold,
  },
});
