import React, { useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { RFPercentage } from "react-native-responsive-fontsize";
import { UserContext } from "../../utils/userContext";
import { Colors, Fonts } from "../../constants/theme";

const darkColors = {
  background: "#000000",
  primary: "#F34E3A",
  primaryLight: "#F17C3B",
  surface: "#000000",
  surfaceElevated: "#1A1A1A",
  primaryDark: "#D83A28",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#666768",
  border: "#3C3C3C",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gradientStart: "#F34E3A",
  gradientEnd: "#FF6B4A",
};

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { userData } = useContext(UserContext);


  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public",
    showWorkoutStats: true,
    showAchievements: true,
    dataSharing: true,
  });

  const togglePrivacy = (key) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const SettingsSection = ({ title, children, icon }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <View style={styles.sectionIcon}>{icon}</View>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const SettingsItem = ({
    icon,
    title,
    value,
    onPress,
    type = "navigation",
    rightComponent,
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        {icon && <View style={styles.itemIcon}>{icon}</View>}
        <Text style={styles.itemTitle}>{title}</Text>
      </View>

      <View style={styles.settingRight}>
        {type === "navigation" && (
          <>
            {value && <Text style={styles.itemValue}>{value}</Text>}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={darkColors.textSecondary}
            />
          </>
        )}
        {type === "switch" && rightComponent}
        {type === "text" && <Text style={styles.itemValue}>{value}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Account Settings */}
        <SettingsSection
          title="Account"
          icon={<Ionicons name="person" size={20} color={darkColors.primary} />}
        >
          <SettingsItem
            icon={
              <Ionicons
                name="mail"
                size={18}
                color={darkColors.textSecondary}
              />
            }
            title="Email"
            value={userData?.email || "Not set"}
            type="text"
          />

          <SettingsItem
            icon={
              <Ionicons name="key" size={18} color={darkColors.textSecondary} />
            }
            title="Change Password"
            onPress={() => navigation.navigate("ForgetPassword")}
          />
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection
          title="Privacy & Security"
          icon={
            <MaterialCommunityIcons
              name="shield-lock"
              size={20}
              color={darkColors.primary}
            />
          }
        >
          <Text style={{ color: darkColors.textSecondary, padding: 16 }}>Public profiles and analytics sharing are not enabled in this release.</Text>

          <SettingsItem
            icon={
              <Ionicons
                name="document-text"
                size={18}
                color={darkColors.textSecondary}
              />
            }
            title="Privacy Policy"
            onPress={() => navigation.navigate("PrivacyPolicyScreen")}
          />

          <SettingsItem
            icon={
              <Ionicons
                name="document"
                size={18}
                color={darkColors.textSecondary}
              />
            }
            title="Terms of Service"
            onPress={() => navigation.navigate("TermsOfServiceScreen")}
          />
        </SettingsSection>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>GymAI v1.0</Text>
          
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
    marginTop: RFPercentage(6),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(243, 78, 58, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
  },
  sectionContent: {
    backgroundColor: "#100f0fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#100f0fff",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1d1c1cff",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    flex: 1,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemValue: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginRight: 8,
  },
  unitsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  unitLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
  },
  unitButtons: {
    flexDirection: "row",
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  unitButtonActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  unitButtonText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  unitButtonTextActive: {
    color: "#fff",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  versionText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginBottom: 4,
  },
  buildText: {
    color: darkColors.textMuted,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
  },
});

export default SettingsScreen;
