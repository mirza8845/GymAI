import React, { useEffect, useContext, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { UserContext } from "../../utils/userContext";
import { generateExerciseDBWorkoutPlan } from "../../services/generateWorkoutPlan";


// TEMPORARY: Define Colors and Fonts here if theme.js doesn't exist
const Colors = {
  background: "#141516",
  primary: "#F34E3A",
  white: "white",
  grey: "#3656565",
  secondary: '#7B68EE',
  accent: '#FF6B6B',
  surface: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: 'rgba(255, 255, 255, 0.1)',
};

const Fonts = {
  Montserrat_Bold: "Montserrat-Bold",
  Montserrat_Medium: "Montserrat-Medium",
  Montserrat_SemiBold: "Montserrat-SemiBold",
  Montserrat_Regular: "Montserrat-Regular",
};

const WorkoutGenerating = () => {
  const navigation = useNavigation();
  const { userData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Creating your personalized workout plan..."
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
console.log("userdata.........",userData)
  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Generate workout on mount and retry
  useEffect(() => {
    if (!error) {
      createWorkoutPlan();
    }
  }, [retryCount]);

  const createWorkoutPlan = async () => {
    const user = auth().currentUser;
    if (!user) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please log in first",
      });
      setLoading(false);
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStatusMessage("Creating your personalized workout plan...");

      setStatusMessage("Analyzing your profile...");

      // Generate the workout plan. This now calls the `generateWorkoutPlan`
      // Vercel endpoint, which reads the saved questionnaire profile
      // server-side and both builds AND saves the plan to
      // `workouts/{uid}` itself — there is no separate client-side
      // Firestore write anymore (previously this screen wrote the plan
      // itself right after generating it locally; see
      // src/services/generateWorkoutPlan.js for the migration details).
      setStatusMessage("Building your workout plan...");
      await generateExerciseDBWorkoutPlan(userData);

      Toast.show({
        type: "success",
        text1: "Workout Plan Ready!",
        text2: "Let's get started 💪",
      });

      // Navigate to main app
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" }],
        });
      }, 1500);
    } catch (error) {
      console.error("Workout generation failed:", error);
      setLoading(false);

      // Handle different error types
      if (error.code === "REQUEST_IN_PROGRESS") {
        setError({
          type: "in_progress",
          title: "Already Generating",
          message: "A workout is being created. Please wait.",
        });
      } else if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") {
        setError({
          type: "network",
          title: "Connection Error",
          message: "Cannot connect to exercise database. Check your internet.",
        });
        setCooldownSeconds(5);
      } else if (error.code === "VALIDATION_ERROR") {
        setError({
          type: "validation",
          title: "Missing Information",
          message: error.message,
        });
      } else if (error.code === "GENERATION_FAILED") {
        setError({
          type: "generation",
          title: "Generation Failed",
          message: error.message || "Could not create workout plan.",
          details: error.details,
        });
        setCooldownSeconds(3);
      } else {
        setError({
          type: "unknown",
          title: "Something Went Wrong",
          message: "Please try again in a moment.",
          details: error.message,
        });
        setCooldownSeconds(3);
      }
    }
  };

  const handleRetry = () => {
    if (cooldownSeconds > 0) {
      Toast.show({
        type: "info",
        text1: "Please Wait",
        text2: `Try again in ${cooldownSeconds} seconds`,
      });
      return;
    }
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleManualWorkout = () => {
    navigation.navigate("ManualWorkout");
  };

  // Error Screen
  if (error) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{error.title}</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>

          {error.details && (
            <Text style={styles.errorDetails}>{error.details}</Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRetry}
              activeOpacity={0.8}
              disabled={cooldownSeconds > 0}
            >
              <Text style={styles.buttonText}>
                {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Try Again"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>

          {error.type === "network" && (
            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>💡 Connection Tips:</Text>
              <Text style={styles.tipText}>
                • Check your internet connection
              </Text>
              <Text style={styles.tipText}>
                • Try switching between WiFi and mobile data
              </Text>
              <Text style={styles.tipText}>• Wait a moment and try again</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.manualButton}
            onPress={handleManualWorkout}
            activeOpacity={0.8}
          >
            <Text style={styles.manualButtonText}>
              Or create workout manually →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Loading Screen
  return (
    <View style={styles.container}>
      <View style={styles.loadingContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💪</Text>
        </View>

        <Text style={styles.title}>Building Your Plan</Text>
        <Text style={styles.statusText}>{statusMessage}</Text>

        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressText}>
            {retryCount > 0 ? `Attempt ${retryCount + 1}` : "First attempt"}
          </Text>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Did you know?</Text>
          <Text style={styles.tipsText}>
            This workout plan is generated using a free exercise database with
            real exercise GIFs and instructions!
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.Montserrat_Bold,
    color: "white",
    marginBottom: 10,
    textAlign: "center",
  },
  statusText: {
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Regular,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  loader: {
    marginVertical: 20,
  },
  progressContainer: {
    width: "80%",
    marginTop: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    width: "70%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Regular,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  tipsContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    width: "100%",
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: Fonts.Montserrat_SemiBold,
    color: Colors.primary,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    fontFamily: Fonts.Montserrat_Regular,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: Fonts.Montserrat_Bold,
    color: "white",
    marginBottom: 10,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Regular,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  errorDetails: {
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Regular,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 30,
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.Montserrat_SemiBold,
    color: "white",
  },
  secondaryButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  tipBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: Fonts.Montserrat_SemiBold,
    color: Colors.primary,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    fontFamily: Fonts.Montserrat_Regular,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  manualButtonText: {
    fontSize: 15,
    fontFamily: Fonts.Montserrat_Regular,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
});

export default WorkoutGenerating;
// REMOVE ALL EXPORTS FROM HERE - they should be in a separate file