import { localDateKey } from "../../utils/workoutData";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import AntDesign from "react-native-vector-icons/AntDesign";
import LinearGradient from "react-native-linear-gradient";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import { RFPercentage } from "react-native-responsive-fontsize";
import auth from "@react-native-firebase/auth";
import { WorkoutHistoryService } from "../../services/firebaseWorkoutHistory";

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

const StartSingleExerciseScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { exercise = {}, warmup = [], cooldown = [], day, exerciseIndex, totalExercises,
    planId, planVersion, weekNumber } = route.params || {};

  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timerKey, setTimerKey] = useState(Date.now());
  const [repCount, setRepCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [exerciseStartTime, setExerciseStartTime] = useState(null);
  const [setData, setSetData] = useState([]);
  const [weightUsed, setWeightUsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const sessionId = useRef(`exercise-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const saveStarted = useRef(false);
  const totalSets = exercise?.workoutDetails?.sets || 3;
  const restTime = exercise?.workoutDetails?.restSeconds || 60;
  const targetReps = exercise?.workoutDetails?.reps || "8-12";
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Record start time
    setExerciseStartTime(new Date());
  }, []);

  const handleCompleteSet = () => {
    if (isResting || isCompleted || !exercise.id) return;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Save set data
    const newSetData = {
      setNumber: currentSet,
      reps: repCount,
      weight: weightUsed,
      completedAt: new Date().toISOString(),
    };

    setSetData((prev) => [...prev, newSetData]);

    if (currentSet < totalSets) {
      setIsResting(true);
      setIsTimerPaused(false);
      setTimerKey(Date.now());
    } else {
      setIsCompleted(true);
    }
  };

  const handleSkipRest = () => {
    setIsResting(false);
    setIsTimerPaused(false);
    setCurrentSet((prev) => prev + 1);
    setRepCount(0);
  };

  const handleFinishRest = () => {
    setIsResting(false);
    setIsTimerPaused(false);
    setCurrentSet((prev) => prev + 1);
    setRepCount(0);
  };

  const handleFinishWorkout = async () => {
    if (saveStarted.current) return;
    if (!userId || !setData.length) { Alert.alert('Unable to save','Sign in and complete a set before saving.'); return; }
    saveStarted.current = true;
    try {
      setIsSaving(true);

      if (!userId) {
        navigation.goBack();
        return;
      }

      const exerciseEndTime = new Date();
      const duration = exerciseStartTime
        ? Math.round((exerciseEndTime - exerciseStartTime) / 1000)
        : 0;

      const totalRepsCompleted = setData.reduce(
        (sum, set) => sum + (set.reps || 0),
        0,
      );

      const totalWeightUsed = setData.reduce(
        (sum, set) => sum + (set.weight || 0),
        0,
      );

      const avgWeight =
        setData.length > 0 ? Math.round(totalWeightUsed / setData.length) : 0;

      const today = localDateKey();

      const exerciseData = {
        sessionId,
        id: exercise?.id,
        name: exercise?.name,
        target: exercise?.target,
        bodyPart: exercise?.bodyPart,
        equipment: exercise?.equipment,

        // workout details
        sets: totalSets,
        reps: totalRepsCompleted,
        targetReps,
        weightUsed: avgWeight,
        restTime,
        duration,

        // analytics
        calories: Math.round(totalWeightUsed * 0.05), // same logic as workouts
        difficulty: calculateDifficulty(totalRepsCompleted, targetReps),

        // metadata
        notes: "",
        workoutId: null, // single exercise
        workoutDate: today,
        date: today,

        // progression data
        planId: planId || null,
        planVersion: planVersion || 1,
        weekNumber: weekNumber || null,
        completed: true,
        skipped: false,
        rpe: calculateDifficulty(totalRepsCompleted, targetReps),
        pain: null,
        painLevel: null,

        // optional extras
        day,
        setData,
        type: "single",
      };

      await WorkoutHistoryService.logCompletedExercise(userId, exerciseData);

      Alert.alert(
        "Exercise Saved 💪",
        `${exercise?.name} has been added to your workout history.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      saveStarted.current = false;
      console.error("Error saving exercise:", error);
      Alert.alert("Error", "Failed to save exercise. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDifficulty = (completedReps, targetRepsStr) => {
    // Parse target reps (could be "8-12" or just "10")
    let targetMin, targetMax;
    if (typeof targetRepsStr === "string" && targetRepsStr.includes("-")) {
      const [min, max] = targetRepsStr.split("-").map(Number);
      targetMin = min;
      targetMax = max;
    } else {
      targetMin = Number(targetRepsStr) || 10;
      targetMax = targetMin;
    }

    const targetAvg = (targetMin + targetMax) / 2;

    if (completedReps >= targetMax + 2) return 5; // Very Easy (exceeded by 2+)
    if (completedReps >= targetMax) return 4; // Easy (reached max)
    if (completedReps >= targetMin) return 3; // Moderate (within range)
    if (completedReps >= targetMin - 2) return 2; // Hard (slightly below)
    return 1; // Very Hard (well below)
  };

  const handleAddRep = () => {
    setRepCount((prev) => Math.max(0, prev + 1));
  };

  const handleRemoveRep = () => {
    setRepCount((prev) => Math.max(0, prev - 1));
  };

  const handleAddWeight = () => {
    setWeightUsed((prev) => Math.max(0, prev + 2.5));
  };

  const handleRemoveWeight = () => {
    setWeightUsed((prev) => Math.max(0, prev - 2.5));
  };

  const renderWeightSelector = () => (
    <View style={styles.weightSelector}>
      <Text style={styles.weightLabel}>Weight (kg)</Text>
      <View style={styles.weightControls}>
        <TouchableOpacity
          style={styles.weightButton}
          onPress={handleRemoveWeight}
          disabled={weightUsed === 0}
        >
          <AntDesign
            name="minuscircle"
            size={24}
            color={weightUsed === 0 ? darkColors.textMuted : darkColors.error}
          />
        </TouchableOpacity>

        <View style={styles.weightDisplay}>
          <Text style={styles.weightValue}>{weightUsed}</Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>

        <TouchableOpacity style={styles.weightButton} onPress={handleAddWeight}>
          <AntDesign name="pluscircle" size={24} color={darkColors.success} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExerciseInfo = () => (
    <LinearGradient
      colors={["#1C1C1E", "#2C2C2E"]}
      style={styles.infoCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.infoHeader}>
        <Text style={styles.exerciseName}>{exercise?.name}</Text>
        <View style={styles.targetMuscleBadge}>
          <FontAwesome5 name="target" size={12} color={darkColors.primary} />
          <Text style={styles.targetMuscleText}>{exercise?.target}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {currentSet}/{totalSets}
          </Text>
          <Text style={styles.statLabel}>Set</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{targetReps}</Text>
          <Text style={styles.statLabel}>Target Reps</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{restTime}s</Text>
          <Text style={styles.statLabel}>Rest</Text>
        </View>
      </View>

      <View style={styles.secondaryInfo}>
        <Text style={styles.equipmentText}>
          <FontAwesome5
            name="dumbbell"
            size={12}
            color={darkColors.textSecondary}
          />{" "}
          {exercise?.equipment}
        </Text>
        {day && (
          <Text style={styles.dayText}>
            <FontAwesome5
              name="calendar"
              size={12}
              color={darkColors.textSecondary}
            />{" "}
            {day}
          </Text>
        )}
      </View>
    </LinearGradient>
  );

  const renderRestTimer = () => {
    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = time % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
      <Animated.View style={[styles.restContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={["#1C1C1E", "#2C2C2E"]}
          style={styles.restCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.restHeader}>
            <Ionicons name="time" size={32} color={darkColors.warning} />
            <Text style={styles.restTitle}>Rest Time</Text>
          </View>

          <View style={styles.countdownContainer}>
            <CountdownCircleTimer
              key={timerKey}
              isPlaying={isResting && !isTimerPaused}
              duration={restTime}
              colors={[
                darkColors.primary,
                darkColors.primaryLight,
                darkColors.warning,
                darkColors.error,
              ]}
              colorsTime={[restTime, restTime * 0.66, restTime * 0.33, 0]}
              size={140}
              strokeWidth={10}
              trailColor="rgba(255, 255, 255, 0.1)"
              onComplete={handleFinishRest}
            >
              {({ remainingTime }) => (
                <View style={styles.timerTextContainer}>
                  <Text style={styles.timerDigits}>
                    {formatTime(remainingTime)}
                  </Text>
                  <Text style={styles.timerLabel}>remaining</Text>
                </View>
              )}
            </CountdownCircleTimer>
          </View>

          <Text style={styles.restMessage}>
            Rest before starting set {currentSet + 1} of {totalSets}
          </Text>

          <View style={styles.restActions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipRest}
            >
              <Text style={styles.skipButtonText}>Skip Rest</Text>
            </TouchableOpacity>

            {isResting && !isTimerPaused ? (
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={() => setIsTimerPaused(true)}
              >
                <Ionicons name="pause" size={16} color="#fff" />
                <Text style={styles.pauseButtonText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => setIsTimerPaused(false)}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.resumeButtonText}>Resume</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderActiveWorkout = () => (
    <Animated.View
      style={[
        styles.activeContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={["#1C1C1E", "#2C2C2E"]}
        style={styles.activeCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.setIndicator}>
          <Text style={styles.setNumber}>Set {currentSet}</Text>
          <Text style={styles.setTotal}>of {totalSets}</Text>
        </View>

        <View style={styles.repCounter}>
          <Text style={styles.repLabel}>Current Reps</Text>
          <View style={styles.repControls}>
            <TouchableOpacity
              style={styles.repButton}
              onPress={handleRemoveRep}
              disabled={repCount === 0}
            >
              <AntDesign
                name="minuscircle"
                size={32}
                color={repCount === 0 ? darkColors.textMuted : darkColors.error}
              />
            </TouchableOpacity>

            <View style={styles.repDisplay}>
              <Text style={styles.repCount}>{repCount}</Text>
              <Text style={styles.repTarget}>/ {targetReps}</Text>
            </View>

            <TouchableOpacity style={styles.repButton} onPress={handleAddRep}>
              <AntDesign
                name="pluscircle"
                size={32}
                color={darkColors.success}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.repHint}>Tap +/- to adjust rep count</Text>
        </View>

        {/* Weight Selector - only show for weighted exercises */}
        {exercise?.equipment !== "body weight" &&
          exercise?.equipment !== "body weight" && (
            <>
              {renderWeightSelector()}

              <View style={styles.setSummary}>
                <Text style={styles.setSummaryTitle}>
                  Set {currentSet} Summary:
                </Text>
                <View style={styles.setSummaryRow}>
                  <Text style={styles.setSummaryText}>Reps: {repCount}</Text>
                  <Text style={styles.setSummaryText}>
                    Weight: {weightUsed}kg
                  </Text>
                  <Text style={styles.setSummaryText}>
                    Volume: {repCount * weightUsed}kg
                  </Text>
                </View>
              </View>
            </>
          )}

        <TouchableOpacity
          style={styles.completeSetButton}
          onPress={handleCompleteSet}
          disabled={repCount === 0}
        >
          <LinearGradient
            colors={[darkColors.primary, darkColors.primaryLight]}
            style={[
              styles.completeButtonGradient,
              repCount === 0 && styles.disabledButton,
            ]}
          >
            <Text style={styles.completeButtonText}>
              {currentSet === totalSets ? "Finish Exercise" : "Complete Set"}
            </Text>
            <Ionicons
              name="checkmark"
              size={20}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderCompleted = () => (
    <Animated.View style={[styles.completedContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={["#1C1C1E", "#2C2C2E"]}
        style={styles.completedCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.completedIcon}>
          <Ionicons name="trophy" size={60} color={darkColors.success} />
        </View>

        <Text style={styles.completedTitle}>Exercise Complete!</Text>

        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalSets}</Text>
            <Text style={styles.summaryLabel}>Sets</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {setData.reduce((sum, set) => sum + set.reps, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Reps</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {setData.length > 0
                ? Math.round(
                    setData.reduce((sum, set) => sum + set.weight, 0) /
                      setData.length,
                  )
                : 0}
              kg
            </Text>
            <Text style={styles.summaryLabel}>Avg Weight</Text>
          </View>
        </View>

        {/* Set-by-set breakdown */}
        {setData.length > 0 && (
          <View style={styles.setBreakdown}>
            <Text style={styles.setBreakdownTitle}>Set Breakdown:</Text>
            {setData.map((set, index) => (
              <View key={index} style={styles.setBreakdownItem}>
                <Text style={styles.setBreakdownSet}>Set {index + 1}:</Text>
                <Text style={styles.setBreakdownReps}>{set.reps} reps</Text>
                {set.weight > 0 && (
                  <Text style={styles.setBreakdownWeight}>{set.weight}kg</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.congratsText}>
          Great work! You completed all sets of {exercise?.name}.
        </Text>

        <View style={styles.completedButtons}>
          <TouchableOpacity
            style={styles.viewTipsButton}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.viewTipsText}>Back to Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishWorkout}
            disabled={isSaving}
          >
            <LinearGradient
              colors={[darkColors.success, "#34D399"]}
              style={[
                styles.finishButtonGradient,
                isSaving && styles.disabledButton,
              ]}
            >
              {isSaving ? (
                <>
                  <Ionicons name="sync" size={16} color="#fff" />
                  <Text style={styles.finishButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.finishButtonText}>Save & Finish</Text>
                  <Ionicons
                    name="cloud-upload"
                    size={16}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isSaving && (
          <Text style={styles.savingText}>
            Saving your workout data to the cloud...
          </Text>
        )}
      </LinearGradient>
    </Animated.View>
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
            onPress={() => {
              if (isSaving) {
                Alert.alert(
                  "Saving in Progress",
                  "Your workout data is being saved. Are you sure you want to leave?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Leave",
                      style: "destructive",
                      onPress: () => navigation.goBack(),
                    },
                  ],
                );
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Exercise</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Exercise Info */}
        {renderExerciseInfo()}

        {/* Content based on state */}
        {isCompleted
          ? renderCompleted()
          : isResting
          ? renderRestTimer()
          : renderActiveWorkout()}

        {/* Bottom Padding */}
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
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
  },
  headerSpacer: {
    width: 40,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    flex: 1,
    marginRight: 12,
  },
  targetMuscleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 78, 58, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  targetMuscleText: {
    color: darkColors.primary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  statLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  statDivider: {
    width: 1,
    backgroundColor: darkColors.border,
  },
  secondaryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  equipmentText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    flex: 1,
  },
  dayText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 12,
  },
  activeContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  activeCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
    alignItems: "center",
  },
  setIndicator: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 24,
  },
  setNumber: {
    color: darkColors.primary,
    fontSize: 32,
    fontFamily: "Montserrat-Bold",
  },
  setTotal: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  repCounter: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  repLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginBottom: 16,
  },
  repControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  repButton: {
    padding: 10,
  },
  repDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  repCount: {
    color: "#fff",
    fontSize: 48,
    fontFamily: "Montserrat-Bold",
  },
  repTarget: {
    color: darkColors.textSecondary,
    fontSize: 20,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  repHint: {
    color: darkColors.textMuted,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    fontStyle: "italic",
  },
  weightSelector: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  weightLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginBottom: 12,
  },
  weightControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "80%",
  },
  weightButton: {
    padding: 8,
  },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  weightValue: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Montserrat-Bold",
  },
  weightUnit: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginLeft: 4,
  },
  setSummary: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  setSummaryTitle: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
  },
  setSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  setSummaryText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  completeSetButton: {
    width: "100%",
  },
  completeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  restContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  restCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
    alignItems: "center",
  },
  restHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  restTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Montserrat-Bold",
    marginTop: 12,
  },
  countdownContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  timerTextContainer: {
    alignItems: "center",
  },
  timerDigits: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
  },
  timerLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginTop: 4,
  },
  restMessage: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 20,
  },
  restActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  skipButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  pauseButton: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: darkColors.error,
  },
  pauseButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: darkColors.success,
  },
  resumeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  completedContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  completedCard: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: darkColors.border,
    alignItems: "center",
  },
  completedIcon: {
    marginBottom: 20,
  },
  completedTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Montserrat-Bold",
    marginBottom: 24,
    textAlign: "center",
  },
  summaryStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: "100%",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  summaryLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: darkColors.border,
  },
  setBreakdown: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  setBreakdownTitle: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginBottom: 12,
  },
  setBreakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  setBreakdownSet: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    flex: 1,
  },
  setBreakdownReps: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 12,
  },
  setBreakdownWeight: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginLeft: 12,
  },
  congratsText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  completedButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  viewTipsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
    flex: 1,
  },
  viewTipsText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 8,
  },
  finishButton: {
    flex: 1,
  },
  finishButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  savingText: {
    color: darkColors.warning,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
});

export default StartSingleExerciseScreen;
