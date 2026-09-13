import useDailyHydration from "../../utils/useDailyHydration";
import { useNavigation } from "@react-navigation/native";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import CircularProgress from "react-native-circular-progress-indicator";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

const { width } = Dimensions.get("window");

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

const HydrationTrackerScreen = () => {
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);

  // Get hydration data from workoutPlan safely
  const hydrationData = useMemo(() => {
    return {
      targetLiters:
        workoutPlan?.recovery?.hydration?.target_liters ||
        workoutPlan?.nutrition?.hydration?.replace("L", "")?.trim() ||
        2,
      tips:
        workoutPlan?.recovery?.hydration?.tips ||
        workoutPlan?.nutrition?.hydration_tips ||
        [],
      dailyTarget: workoutPlan?.nutrition?.hydration || "2L water daily",
    };
  }, [workoutPlan]);

  const {intake,update:setIntake,loaded,error} = useDailyHydration();
  const navigation = useNavigation();
  const waterTarget = Math.max(0.1, parseFloat(hydrationData.targetLiters) || 2);

  const addWater = (amount) => {
    if (!loaded) return;
    const newIntake = intake + amount;
    setIntake(newIntake);
    // Here you would typically update Firestore with the new intake
  };

  const resetIntake = () => setIntake(0);

  const progress = waterTarget > 0 ? Math.min(100, (intake / waterTarget) * 100) : 0;
  const remaining = Math.max(waterTarget - intake, 0);

  const getHydrationStatus = () => {
    if (progress >= 100)
      return {
        text: "Excellent! 🎉",
        color: darkColors.success,
        icon: "trophy",
      };
    if (progress >= 75)
      return {
        text: "Almost There! 💪",
        color: darkColors.success,
        icon: "checkmark-circle",
      };
    if (progress >= 50)
      return {
        text: "Good Progress 👍",
        color: darkColors.warning,
        icon: "trending-up",
      };
    if (progress >= 25)
      return {
        text: "Keep Going! 🔥",
        color: darkColors.warning,
        icon: "flame",
      };
    return {
      text: "Let's Get Started! 💧",
      color: darkColors.error,
      icon: "water",
    };
  };

  const hydrationStatus = getHydrationStatus();

  const waterIntakeButtons = [
    { amount: 0.25, label: "Small Glass", icon: "water", color: "#3b82f6" },
    { amount: 0.5, label: "Large Glass", icon: "water", color: "#60a5fa" },
    { amount: 1.0, label: "Bottle", icon: "wine-bottle", color: "#93c5fd" },
  ];

  // Combine tips from recovery and add default ones
  const hydrationTips = useMemo(() => {
    const tips = [...(hydrationData.tips || [])];

    // Add some default tips if we don't have enough
    const defaultTips = [
      "Drink water first thing in the morning",
      "Keep a water bottle visible throughout the day",
      "Drink before, during, and after workouts",
      "Add lemon or mint for flavor",
      "Set hourly reminders if needed",
    ];

    // Only add defaults if we have less than 3 tips from data
    if (tips.length < 3) {
      tips.push(...defaultTips.slice(0, 5 - tips.length));
    }

    return tips.slice(0, 5); // Limit to 5 tips
  }, [hydrationData.tips]);

  const renderProgressCircle = () => {
    if (progress === 0) {
      return (
        <View style={styles.emptyProgressContainer}>
          <Ionicons
            name="water-outline"
            size={40}
            color={darkColors.textSecondary}
          />
          <Text style={styles.emptyProgressText}>Start tracking!</Text>
        </View>
      );
    }

    return (
      <CircularProgress
        value={progress}
        radius={80}
        duration={1000}
        maxValue={100}
        title={""}
        titleColor={darkColors.textSecondary}
        titleStyle={{ fontFamily: "Montserrat-Medium" }}
        valueSuffix="%"
        valueFontSize={28}
        valueColor={darkColors.textPrimary}
        progressValueStyle={{ top: 0 }}
        activeStrokeWidth={14}
        inActiveStrokeWidth={14}
        inActiveStrokeColor="#3C3C3C"
        activeStrokeColor="#3b82f6"
        activeStrokeSecondaryColor="#60a5fa"
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Back" onPress={() => navigation.goBack()}><Text style={{color:"white"}}>Back</Text></TouchableOpacity>
        {error && <Text style={{color:"#ff8a80"}}>{error}</Text>}
        <Text style={styles.title}>Hydration Tracker</Text>
        <Text style={styles.subtitle}>
          Stay hydrated for optimal performance
        </Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hydration Goal Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={["#3b82f6", "#60a5fa"]}
              style={styles.sectionIcon}
            >
              <Ionicons name="water" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Daily Hydration Goal</Text>
          </View>
          <LinearGradient
            colors={["#000000", "#1A1A1A"]}
            style={styles.goalCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.goalHeader}>
              <View style={styles.goalIcon}>
                <Ionicons name="flag" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.goalValue}>{waterTarget} liters</Text>
                <Text style={styles.goalLabel}>Daily Target</Text>
              </View>
            </View>
            <Text style={styles.goalDescription}>
              Recommended daily water intake based on your workout plan
            </Text>
          </LinearGradient>
        </View>

        {/* Main Progress Card */}
        <View style={styles.section}>
          <LinearGradient
            colors={["#000000", "#1A1A1A"]}
            style={styles.progressCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.progressHeader}>
              <View style={styles.waterIconContainer}>
                <Ionicons
                  name={hydrationStatus.icon}
                  size={32}
                  color={hydrationStatus.color}
                />
              </View>
              <View>
                <Text style={styles.progressTitle}>Today's Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {intake.toFixed(2)}L / {waterTarget}L
                </Text>
              </View>
            </View>

            <View style={styles.circularProgressContainer}>
              {renderProgressCircle()}
            </View>

            {/* Hydration Status */}
            <View style={styles.statusContainer}>
              <Text
                style={[styles.statusText, { color: hydrationStatus.color }]}
              >
                {hydrationStatus.text}
              </Text>
              <Text style={styles.remainingText}>
                {remaining > 0
                  ? `${remaining.toFixed(2)}L remaining`
                  : "Goal achieved! 🎉"}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.buttonsContainer}>
            {waterIntakeButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={styles.waterButton}
                onPress={() => addWater(button.amount)}
              >
                <LinearGradient
                  colors={[button.color, `${button.color}99`]}
                  style={styles.waterButtonIcon}
                >
                  <FontAwesome5
                    name={button.icon}
                    size={button.amount === 1.0 ? 20 : 16}
                    color="#fff"
                  />
                </LinearGradient>
                <Text style={styles.waterButtonLabel}>{button.label}</Text>
                <Text style={styles.waterButtonAmount}>+{button.amount}L</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Manual Input & Reset */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Control</Text>
          <View style={styles.manualControls}>
            <TouchableOpacity style={styles.resetButton} onPress={resetIntake}>
              <Ionicons name="refresh" size={20} color={darkColors.error} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <View style={styles.customInputContainer}>
              <View style={styles.customInputButtons}>
                {[0.1, 0.2, 0.5].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.customInputButton}
                    onPress={() => addWater(amount)}
                  >
                    <Text style={styles.customInputButtonText}>+{amount}L</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Hydration Tips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={[darkColors.primary, darkColors.primaryLight]}
              style={styles.sectionIcon}
            >
              <Ionicons name="bulb" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Hydration Tips</Text>
          </View>
          <LinearGradient
            colors={["#000000", "#1A1A1A"]}
            style={styles.tipsCard}
          >
            {hydrationTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Benefits of Hydration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={["#10B981", "#34D399"]}
              style={styles.sectionIcon}
            >
              <Ionicons name="fitness" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Why Hydrate?</Text>
          </View>
          <LinearGradient
            colors={["#000000", "#1A1A1A"]}
            style={styles.benefitsCard}
          >
            <View style={styles.benefitItem}>
              <Ionicons name="fitness" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Improves muscle recovery</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <Text style={styles.benefitText}>Boosts energy levels</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="color-wand" size={20} color="#8B5CF6" />
              <Text style={styles.benefitText}>Enhances mental focus</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="thermometer" size={20} color="#EF4444" />
              <Text style={styles.benefitText}>Regulates body temperature</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: darkColors.textPrimary,
    fontSize: 24,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  subtitle: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
  },
  goalCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6D6D6D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  goalValue: {
    color: darkColors.textPrimary,
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 2,
  },
  goalLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  goalDescription: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    lineHeight: 18,
  },
  progressCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#6D6D6D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  waterIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  progressTitle: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
  },
  progressSubtitle: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginTop: 2,
  },
  circularProgressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    height: 180,
  },
  emptyProgressContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
  },
  emptyProgressText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginTop: 8,
  },
  statusContainer: {
    alignItems: "center",
  },
  statusText: {
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  remainingText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop:10
  },
  waterButton: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 6,
  },
  waterButtonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#6D6D6D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  waterButtonLabel: {
    color: darkColors.textPrimary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    textAlign: "center",
    marginBottom: 2,
  },
  waterButtonAmount: {
    color: darkColors.textSecondary,
    fontSize: 11,
    fontFamily: "Montserrat-Medium",
  },
  manualControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop:10
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  resetButtonText: {
    color: darkColors.error,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginLeft: 8,
  },
  customInputContainer: {
    flex: 1,
    marginLeft: 16,
  },
  customInputButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customInputButton: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  customInputButtonText: {
    color: "#3b82f6",
    fontSize: 13,
    fontFamily: "Montserrat-Bold",
  },
  tipsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6D6D6D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  tipText: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    lineHeight: 20,
    flex: 1,
  },
  benefitsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6D6D6D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  benefitText: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 12,
    flex: 1,
  },
});

export default HydrationTrackerScreen;
