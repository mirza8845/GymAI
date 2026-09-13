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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import { RFPercentage } from "react-native-responsive-fontsize";
import auth from "@react-native-firebase/auth";
import { WorkoutHistoryService } from "../../services/firebaseWorkoutHistory";
import { useSelector } from "react-redux";

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

const StartFullWorkoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { day, warmup = [], cooldown = [], allExercises = [] } = route.params || {};

  const [currentPhase, setCurrentPhase] = useState("warmup");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [timerKey, setTimerKey] = useState(Date.now());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [completedExercises, setCompletedExercises] = useState([]);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [completedExercisesData, setCompletedExercisesData] = useState([]);
  const [setData, setSetData] = useState({}); // { exerciseId: [{setNumber, reps, weight}] }
  const [weightUsed, setWeightUsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({
    totalDuration: 0,
    totalWeightLifted: 0,
    totalReps: 0,
  });
  const [currentRpe, setCurrentRpe] = useState(5);
  const [currentPain, setCurrentPain] = useState(false);

  const sessionId = useRef(`workout-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const saveStarted = useRef(false);
  const currentExercise = allExercises[currentExerciseIndex];
  const totalExercises = allExercises.length;
  const totalSets = currentExercise?.workoutDetails?.sets || 3;
  const restTime = currentExercise?.workoutDetails?.restSeconds || 60;
  const targetReps = currentExercise?.workoutDetails?.reps || "8-12";
  const userId = auth().currentUser?.uid;
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Record workout start time
    setWorkoutStartTime(new Date());
  }, []);

  const handleCompleteSet = () => {
    if (!currentExercise || isResting || currentPhase !== "exercise") return;
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

    // Save set data for current exercise
    const exerciseId = currentExercise?.id;
    if (exerciseId) {
      const newSetData = {
        setNumber: currentSet,
        reps: repCount,
        weight: weightUsed,
        completedAt: new Date().toISOString(),
      };

      setSetData((prev) => ({
        ...prev,
        [exerciseId]: [...(prev[exerciseId] || []), newSetData],
      }));

      // Update workout stats
      setWorkoutStats((prev) => ({
        ...prev,
        totalReps: prev.totalReps + repCount,
        totalWeightLifted: prev.totalWeightLifted + weightUsed * repCount,
      }));
    }

    if (currentSet < totalSets) {
      setIsResting(true);
      setIsTimerPaused(false);
      setTimerKey(Date.now());
    } else {
      const today = localDateKey();

      const exerciseSets = [...(setData[currentExercise?.id] || []), { setNumber: currentSet, reps: repCount, weight: weightUsed, completedAt: new Date().toISOString() }];

      const totalReps = exerciseSets.reduce((sum, s) => sum + (s.reps || 0), 0);

      const totalVolume = exerciseSets.reduce(
        (sum, s) => sum + s.reps * s.weight,
        0,
      );

      const avgWeight = totalReps > 0 ? Math.round(totalVolume / totalReps) : 0;

      const completedExerciseData = {
        id: currentExercise.id,
        name: currentExercise.name,
        target: currentExercise.target,
        bodyPart: currentExercise.bodyPart,
        equipment: currentExercise.equipment,

        sets: totalSets,
        reps: totalReps,
        targetReps,
        weightUsed: avgWeight,
        duration: 0,
        calories: Math.round(totalVolume * 0.05),

        setData: exerciseSets,
        order: currentExerciseIndex + 1,
        completed: true,
        skipped: false,
        rpe: currentRpe,
        pain: currentPain ? "Discomfort reported" : null,
        painLevel: currentPain ? 1 : 0,

        date: today,
        workoutDate: today,
        type: "workout",
      };

      setCompletedExercisesData((prev) => [...prev, completedExerciseData]);

      // Move to next exercise or phase
      const nextExerciseIndex = currentExerciseIndex + 1;
      if (nextExerciseIndex < totalExercises) {
        setCurrentExerciseIndex(nextExerciseIndex);
        setCurrentSet(1);
        setRepCount(0);
        setWeightUsed(0);
        setCurrentRpe(5);
        setCurrentPain(false);
      } else {
        if (currentPhase === "warmup") {
          setCurrentPhase("exercise");
          setCurrentExerciseIndex(0);
          setCurrentSet(1);
        } else if (currentPhase === "exercise") {
          setCurrentPhase("cooldown");
        } else {
          setCurrentPhase("completed");
        }
      }
    }
  };

  const handleSkipRest = () => {
    setIsResting(false);
    setIsTimerPaused(false);
    if (currentPhase === "exercise") {
      setCurrentSet((prev) => prev + 1);
    } else {
      handleNextPhase();
    }
    setRepCount(0);
  };

  const handleFinishRest = () => {
    setIsResting(false);
    setIsTimerPaused(false);
    if (currentPhase === "exercise") {
      setCurrentSet((prev) => prev + 1);
      setRepCount(0);
    }
  };

  const handleNextPhase = () => {
    if (currentPhase === "warmup") {
      setCurrentPhase("exercise");
    } else if (
      currentPhase === "exercise" &&
      currentExerciseIndex < totalExercises - 1
    ) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
      setRepCount(0);
      setWeightUsed(0);
      setCurrentRpe(5);
      setCurrentPain(false);
    } else if (currentPhase === "exercise") {
      setCurrentPhase("cooldown");
    } else if (currentPhase === "cooldown") {
      setCurrentPhase("completed");
    }
  };

  const handleSkipExercise = () => {
    if (!currentExercise) return;
    const today = localDateKey();
    const skippedExerciseData = {
      id: currentExercise.id,
      name: currentExercise.name,
      target: currentExercise.target,
      bodyPart: currentExercise.bodyPart,
      equipment: currentExercise.equipment,
      sets: currentExercise?.workoutDetails?.sets || 3,
      reps: 0,
      targetReps,
      weightUsed: 0,
      duration: 0,
      calories: 0,
      setData: [],
      order: currentExerciseIndex + 1,
      completed: false,
      skipped: true,
      rpe: null,
      pain: null,
      painLevel: null,
      date: today,
      workoutDate: today,
      type: "workout",
    };

    setCompletedExercisesData((prev) => [...prev, skippedExerciseData]);

    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex < totalExercises) {
      setCurrentExerciseIndex(nextIndex);
      setCurrentSet(1);
      setRepCount(0);
      setWeightUsed(0);
      setCurrentRpe(5);
      setCurrentPain(false);
    } else {
      if (currentPhase === "exercise") {
        setCurrentPhase("cooldown");
      }
    }
  };

  const handleSkipPhase = () => {
    if (currentPhase === "warmup") {
      setCurrentPhase("exercise");
    } else if (currentPhase === "cooldown") {
      setCurrentPhase("completed");
    } else {
      handleNextPhase();
    }
  };

  const handleFinishWorkout = async () => {
    if (saveStarted.current) return;
    if (!userId) { Alert.alert('Sign in required','Please sign in before saving your workout.'); return; }
    if (!completedExercisesData.length) { Alert.alert('No workout recorded','Complete or skip an exercise before saving.'); return; }
    saveStarted.current = true;
    try {
      setIsSaving(true);

      if (userId) {
        const workoutEndTime = new Date();
        const duration = workoutStartTime
          ? Math.round((workoutEndTime - workoutStartTime) / 1000)
          : 0;

        // Calculate total weight lifted
        const totalWeightLifted = Object.values(setData).reduce(
          (total, exerciseSets) => {
            return (
              total +
              exerciseSets.reduce((sum, set) => sum + set.weight * set.reps, 0)
            );
          },
          0,
        );

        // Calculate total reps
        const totalRepsCompleted = Object.values(setData).reduce(
          (total, exerciseSets) => {
            return total + exerciseSets.reduce((sum, set) => sum + set.reps, 0);
          },
          0,
        );

        // Calculate calories burned (rough estimation)
        const caloriesBurned = Math.round(totalWeightLifted * 0.05);
        const today = localDateKey();

        // Prepare workout data for logging
        const workoutData = {
          sessionId,
          planId: workoutPlan?.planId || null,
          planVersion: workoutPlan?.schemaVersion || 1,
          weekNumber: workoutPlan?.weekNumber || 1,
          day,
          warmup,
          cooldown,
          exercises: completedExercisesData,
          totalExercises: allExercises.length,
          totalSets: allExercises.reduce(
            (total, ex) => total + (ex.workoutDetails?.sets || 3),
            0,
          ),
          totalReps: totalRepsCompleted,
          totalWeight: Math.round(totalWeightLifted),
          duration,
          caloriesBurned,
          startTime: (workoutStartTime || new Date()).toISOString(),
          endTime: workoutEndTime.toISOString(),
          setData: setData,
          intensity: calculateWorkoutIntensity(duration, allExercises.length),
          PRAchieved: checkForPRs(completedExercisesData),
          completionStatus: "completed",
          date: today,
          workoutDate: today,
        };

        // Save to Firebase
        const result = await WorkoutHistoryService.logCompletedWorkout(
          userId,
          workoutData,
        );

        Alert.alert('Workout saved', 'Your workout has been added to your history.', [{ text: 'Done', onPress: () => navigation.popToTop ? navigation.popToTop() : navigation.goBack() }]);
        setCurrentPhase('completed');
      }
    } catch (error) {
      saveStarted.current = false;
      console.error('Error saving workout:', error);
      Alert.alert('Could not save workout', 'Your session is still here. Check your connection and try saving again.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateWorkoutIntensity = (duration, exerciseCount) => {
    if (!duration || duration === 0) return 3;

    const intensityScore = exerciseCount / (duration / 3600); // exercises per hour
    if (intensityScore > 12) return 5; // Very High
    if (intensityScore > 8) return 4; // High
    if (intensityScore > 4) return 3; // Moderate
    if (intensityScore > 2) return 2; // Low
    return 1; // Very Low
  };

  const checkForPRs = (exercises) => {
    // This would check if any personal records were broken
    // For now, we'll use a simple check - if any weight was used
    return exercises.some((ex) => ex.weightUsed > 0);
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

  const renderProgress = () => {
    let progress = 0;
    let currentStep = 1;
    let totalSteps = 0;

    if (currentPhase === "warmup") {
      currentStep = 1;
      totalSteps = 1 + totalExercises + 1; // warmup + exercises + cooldown
    } else if (currentPhase === "exercise") {
      currentStep = 2 + currentExerciseIndex; // warmup + exercises completed
      totalSteps = 1 + totalExercises + 1; // warmup + exercises + cooldown
    } else if (currentPhase === "cooldown") {
      currentStep = 1 + totalExercises + 1; // all steps
      totalSteps = 1 + totalExercises + 1;
    }

    progress = (currentStep / totalSteps) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {currentPhase === "warmup" && "Warmup"}
            {currentPhase === "exercise" &&
              `Exercise ${currentExerciseIndex + 1} of ${totalExercises}`}
            {currentPhase === "cooldown" && "Cooldown"}
            {currentPhase === "completed" && "Completed"}
          </Text>
          <Text style={styles.progressStep}>
            {currentStep}/{totalSteps}
          </Text>
        </View>
      </View>
    );
  };

  const renderWarmupPhase = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={["#1C1C1E", "#2C2C2E"]}
        style={styles.phaseCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.phaseHeader}>
          <MaterialCommunityIcons
            name="run-fast"
            size={40}
            color={darkColors.warning}
          />
          <Text style={styles.phaseTitle}>Warmup</Text>
        </View>

        <Text style={styles.phaseDescription}>
          Prepare your body for the workout with these warmup exercises:
        </Text>

        <View style={styles.warmupList}>
          {warmup.map((item, idx) => (
            <View key={idx} style={styles.warmupItem}>
              <View style={styles.warmupIcon}>
                <MaterialCommunityIcons
                  name={item.type === "cardio" ? "run" : "arm-flex"}
                  size={16}
                  color={darkColors.primary}
                />
              </View>
              <View style={styles.warmupContent}>
                <Text style={styles.warmupName}>{item.name}</Text>
                <Text style={styles.warmupDuration}>{item.duration}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.phaseTip}>
          Perform each exercise to prepare your muscles and joints.
        </Text>

        <View style={styles.phaseButtons}>
          <TouchableOpacity
            style={styles.skipPhaseButton}
            onPress={handleSkipPhase}
            disabled={isSaving}
          >
            <Text style={styles.skipPhaseText}>Skip Warmup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.startPhaseButton}
            onPress={() => setCurrentPhase("exercise")}
            disabled={isSaving}
          >
            <LinearGradient
              colors={[darkColors.primary, darkColors.primaryLight]}
              style={[
                styles.startPhaseGradient,
                isSaving && styles.disabledButton,
              ]}
            >
              {isSaving ? (
                <>
                  <Ionicons name="sync" size={20} color="#fff" />
                  <Text style={styles.startPhaseText}>Starting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.startPhaseText}>Start Workout</Text>
                  <Ionicons
                    name="play"
                    size={20}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderExercisePhase = () => {
    if (!currentExercise) return null;

    if (isResting) {
      return renderRestTimer();
    }

    return (
      <Animated.View
        style={[
          styles.exerciseContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={["#1C1C1E", "#2C2C2E"]}
          style={styles.exerciseCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Exercise Info */}
          <View style={styles.exerciseInfo}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              <View style={styles.exerciseBadge}>
                <Text style={styles.exerciseBadgeText}>
                  {currentExerciseIndex + 1}/{totalExercises}
                </Text>
              </View>
            </View>

            <View style={styles.exerciseStats}>
              <View style={styles.exerciseStat}>
                <Text style={styles.statValue}>
                  Set {currentSet}/{totalSets}
                </Text>
                <Text style={styles.statLabel}>Current Set</Text>
              </View>
              <View style={styles.exerciseStat}>
                <Text style={styles.statValue}>{targetReps}</Text>
                <Text style={styles.statLabel}>Target Reps</Text>
              </View>
              <View style={styles.exerciseStat}>
                <Text style={styles.statValue}>{currentExercise.target}</Text>
                <Text style={styles.statLabel}>Target Muscle</Text>
              </View>
            </View>
          </View>

          {/* Rep Counter */}
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
                  color={
                    repCount === 0 ? darkColors.textMuted : darkColors.error
                  }
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
          </View>

          {/* Weight Selector for weighted exercises */}
          {currentExercise?.equipment !== "body weight" &&
            currentExercise?.equipment !== "body weight" &&
            currentExercise?.equipment !== "bodyweight" && (
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

          {/* RPE Selector */}
          <View style={styles.rpeContainer}>
            <Text style={styles.rpeLabel}>Effort Level (RPE)</Text>
            <View style={styles.rpeButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
                <TouchableOpacity
                  key={rpe}
                  style={[
                    styles.rpeButton,
                    currentRpe === rpe && styles.rpeButtonActive,
                  ]}
                  onPress={() => setCurrentRpe(rpe)}
                >
                  <Text
                    style={[
                      styles.rpeButtonText,
                      currentRpe === rpe && styles.rpeButtonTextActive,
                    ]}
                  >
                    {rpe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pain Toggle */}
          <TouchableOpacity
            style={[
              styles.painButton,
              currentPain && styles.painButtonActive,
            ]}
            onPress={() => setCurrentPain(!currentPain)}
          >
            <MaterialCommunityIcons
              name={currentPain ? "alert" : "alert-outline"}
              size={20}
              color={currentPain ? darkColors.error : darkColors.textSecondary}
            />
            <Text
              style={[
                styles.painButtonText,
                currentPain && styles.painButtonTextActive,
              ]}
            >
              {currentPain ? "Pain Reported" : "No Pain"}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.exerciseActions}>
            <TouchableOpacity
              style={styles.skipExerciseButton}
              onPress={handleSkipExercise}
              disabled={isSaving}
            >
              <Text style={styles.skipExerciseText}>Skip Exercise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.completeSetButton}
              onPress={handleCompleteSet}
              disabled={repCount === 0 || isSaving}
            >
              <LinearGradient
                colors={[darkColors.primary, darkColors.primaryLight]}
                style={[
                  styles.completeSetGradient,
                  (repCount === 0 || isSaving) && styles.disabledButton,
                ]}
              >
                <Text style={styles.completeSetText}>
                  {currentSet === totalSets &&
                  currentExerciseIndex === totalExercises - 1
                    ? "Finish Last Set"
                    : currentSet === totalSets
                    ? "Next Exercise"
                    : "Complete Set"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Instructions */}
          {currentExercise.instructions &&
            currentExercise.instructions.length > 0 && (
              <View style={styles.quickInstructions}>
                <Text style={styles.instructionsTitle}>Key Step:</Text>
                <Text style={styles.instructionText} numberOfLines={2}>
                  {currentExercise.instructions[0].replace(/^Step:\d+\s*/, "")}
                </Text>
              </View>
            )}
        </LinearGradient>
      </Animated.View>
    );
  };

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
            <Ionicons name="time" size={40} color={darkColors.warning} />
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
              size={160}
              strokeWidth={12}
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
            {currentPhase === "exercise"
              ? `Rest before set ${currentSet + 1} of ${currentExercise?.name}`
              : "Take a moment to rest"}
          </Text>

          <View style={styles.restActions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipRest}
              disabled={isSaving}
            >
              <Text style={styles.skipButtonText}>Skip Rest</Text>
            </TouchableOpacity>

            {isResting && !isTimerPaused ? (
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={() => setIsTimerPaused(true)}
                disabled={isSaving}
              >
                <Ionicons name="pause" size={20} color="#fff" />
                <Text style={styles.pauseButtonText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => setIsTimerPaused(false)}
                disabled={isSaving}
              >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.resumeButtonText}>Resume</Text>
              </TouchableOpacity>
            )}
          </View>

          {isSaving && (
            <Text style={styles.savingText}>Saving workout data...</Text>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderCooldownPhase = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={["#1C1C1E", "#2C2C2E"]}
        style={styles.phaseCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.phaseHeader}>
          <MaterialCommunityIcons
            name="water"
            size={40}
            color={darkColors.success}
          />
          <Text style={styles.phaseTitle}>Cooldown</Text>
        </View>

        <Text style={styles.phaseDescription}>
          Great job! Now cool down with these recovery exercises:
        </Text>

        <View style={styles.cooldownList}>
          {cooldown.map((item, idx) => (
            <View key={idx} style={styles.cooldownItem}>
              <View style={styles.cooldownIcon}>
                <MaterialCommunityIcons
                  name={item.type === "stretching" ? "yoga" : "meditation"}
                  size={16}
                  color={darkColors.success}
                />
              </View>
              <View style={styles.cooldownContent}>
                <Text style={styles.cooldownName}>{item.name}</Text>
                <Text style={styles.cooldownDuration}>{item.duration}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.phaseTip}>
          These exercises help with recovery and reduce muscle soreness.
        </Text>

        <View style={styles.phaseButtons}>
          <TouchableOpacity
            style={styles.skipPhaseButton}
            onPress={handleSkipPhase}
            disabled={isSaving}
          >
            <Text style={styles.skipPhaseText}>Cooldown</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishWorkoutButton}
            onPress={handleFinishWorkout}
            disabled={isSaving}
          >
            <LinearGradient
              colors={[darkColors.success, "#34D399"]}
              style={[
                styles.finishWorkoutGradient,
                isSaving && styles.disabledButton,
              ]}
            >
              {isSaving ? (
                <>
                  <Ionicons name="sync" size={20} color="#fff" />
                  <Text style={styles.finishWorkoutText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.finishWorkoutText}>Finish Workout</Text>
                  <Ionicons
                    name="trophy"
                    size={20}
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

  const renderCompletedPhase = () => (
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

        <Text style={styles.completedTitle}>Workout Complete!</Text>

        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalExercises}</Text>
            <Text style={styles.summaryLabel}>Exercises</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {allExercises.reduce(
                (total, ex) => total + (ex.workoutDetails?.sets || 3),
                0,
              )}
            </Text>
            <Text style={styles.summaryLabel}>Total Sets</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {workoutStats.totalWeightLifted.toFixed(1)}kg
            </Text>
            <Text style={styles.summaryLabel}>Weight Lifted</Text>
          </View>
        </View>

        <Text style={styles.congratsText}>
          Amazing work! You completed the entire {day} workout.
        </Text>

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
          <Text style={styles.headerTitle}>{day} Workout</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Bar */}
        {renderProgress()}

        {/* Current Phase Content */}
        {currentPhase === "warmup" && renderWarmupPhase()}
        {currentPhase === "exercise" && renderExercisePhase()}
        {currentPhase === "cooldown" && renderCooldownPhase()}
        {currentPhase === "completed" && renderCompletedPhase()}

        {/* Exercises Preview */}
        {currentPhase === "exercise" && (
          <View style={styles.exercisesPreview}>
            <Text style={styles.previewTitle}>Upcoming Exercises</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {allExercises.slice(currentExerciseIndex + 1).map((ex, idx) => (
                <View key={idx} style={styles.previewExercise}>
                  <Text style={styles.previewExerciseName} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <Text style={styles.previewExerciseSets}>
                    {ex.workoutDetails?.sets || 3} sets
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: darkColors.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  progressStep: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  phaseContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  phaseCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  phaseHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  phaseTitle: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Montserrat-Bold",
    marginTop: 12,
  },
  phaseDescription: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  warmupList: {
    marginBottom: 20,
  },
  warmupItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  warmupIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  warmupContent: {
    flex: 1,
  },
  warmupName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginBottom: 2,
  },
  warmupDuration: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
  },
  cooldownList: {
    marginBottom: 20,
  },
  cooldownItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cooldownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cooldownContent: {
    flex: 1,
  },
  cooldownName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginBottom: 2,
  },
  cooldownDuration: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
  },
  phaseTip: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 24,
  },
  phaseButtons: {
    flexDirection: "row",
    gap: 12,
  },
  skipPhaseButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  skipPhaseText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  startPhaseButton: {
    flex: 1.5,
  },
  startPhaseGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  startPhaseText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  finishWorkoutButton: {
    flex: 2,
  },
  finishWorkoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  finishWorkoutText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  exerciseContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  exerciseInfo: {
    marginBottom: 24,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Montserrat-Bold",
    flex: 1,
    marginRight: 12,
    lineHeight: 28,
  },
  exerciseBadge: {
    backgroundColor: darkColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exerciseBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  exerciseStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
  },
  exerciseStat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  statLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    textAlign: "center",
  },
  repCounter: {
    alignItems: "center",
    marginBottom: 24,
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
  weightSelector: {
    alignItems: "center",
    marginBottom: 20,
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
  exerciseActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  skipExerciseButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  skipExerciseText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  completeSetButton: {
    flex: 1.5,
  },
  completeSetGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  completeSetText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  quickInstructions: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  instructionsTitle: {
    color: "#3b82f6",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    lineHeight: 18,
  },
  restContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  restCard: {
    borderRadius: 16,
    padding: 32,
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
    fontSize: 28,
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
    fontSize: 36,
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
  },
  timerLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginTop: 4,
  },
  restMessage: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
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
  rpeContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  rpeLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginBottom: 10,
  },
  rpeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  rpeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rpeButtonActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  rpeButtonText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
  },
  rpeButtonTextActive: {
    color: "#fff",
  },
  painButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
    marginBottom: 16,
    gap: 8,
  },
  painButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: darkColors.error,
  },
  painButtonText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  painButtonTextActive: {
    color: darkColors.error,
  },
  exercisesPreview: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    marginBottom: 12,
  },
  previewExercise: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
  },
  previewExerciseName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginBottom: 4,
  },
  previewExerciseSets: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
  },
  completedContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    fontSize: 28,
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
  congratsText: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  finishButton: {
    width: "100%",
  },
  finishButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  disabledButton: {
    opacity: 0.6,
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

export default StartFullWorkoutScreen;
