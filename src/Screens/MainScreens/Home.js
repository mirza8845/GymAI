import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { UserContext } from "../../utils/userContext";
import { setWorkoutPlan } from "../../redux/Actions";
import { checkWeeklyPlan } from "../../services/generateWorkoutPlan";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
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

const Home = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { userData } = useContext(UserContext);
  const { fullName, profileImage } = userData || {};

  const workoutPlan = useSelector(
    (state) => state.workout.workoutPlan
  );

  const [weekStart, setWeekStart] = useState(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [planExpired, setPlanExpired] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);

  /**
   * Check whether the current workout plan has expired.
   */
  const checkPlanExpiry = useCallback(async () => {
    try {
      const user = auth().currentUser;

      if (!user) {
        setPlanExpired(false);
        return;
      }

      const doc = await firestore()
        .collection("workouts")
        .doc(user.uid)
        .get();

      if (!doc.exists) {
        setPlanExpired(false);
        return;
      }

      const data = doc.data();

      if (!data?.nextPlanDue) {
        setPlanExpired(false);
        return;
      }

      let nextDue;

      if (typeof data.nextPlanDue?.toDate === "function") {
        nextDue = data.nextPlanDue.toDate();
      } else {
        nextDue = new Date(data.nextPlanDue);
      }

      if (Number.isNaN(nextDue.getTime())) {
        setPlanExpired(false);
        return;
      }

      setPlanExpired(new Date() >= nextDue);
    } catch (error) {
      console.log(
        "Plan expiry check error:",
        error?.message || error
      );

      setPlanExpired(false);
    }
  }, []);

  /**
   * Fetch workout plan from Firestore.
   */
  const fetchWorkoutPlan = useCallback(async () => {
    try {
      setLoading(true);

      const user = auth().currentUser;

      if (!user) {
        dispatch(setWorkoutPlan(null));
        setWeekStart(null);
        setWeekNumber(1);
        return;
      }

      const doc = await firestore()
        .collection("workouts")
        .doc(user.uid)
        .get();

      if (!doc.exists) {
        dispatch(setWorkoutPlan(null));
        setWeekStart(null);
        setWeekNumber(1);
        return;
      }

      const data = doc.data();

      console.log("Fetched workout data:", data);

      const planInDb = data?.plan || null;

      setWeekStart(data?.weekStart || null);
      setWeekNumber(data?.weekNumber || 1);

      dispatch(setWorkoutPlan(planInDb));
    } catch (error) {
      console.log(
        "Workout plan fetch error:",
        error?.message || error
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const handleCheckWeeklyPlan = useCallback(async () => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const result = await checkWeeklyPlan(user.uid);

      if (result.action === "generated") {
        dispatch(setWorkoutPlan(result.plan));
        setWeekNumber(result.weekNumber);
        setPlanExpired(false);
      } else if (result.action === "up_to_date") {
        setPlanExpired(false);
      }
    } catch (error) {
      if (__DEV__) {
        console.log("Weekly plan check error:", error?.message || error);
      }
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    fetchWorkoutPlan();
    checkPlanExpiry();
  }, [fetchWorkoutPlan, checkPlanExpiry]));

  useEffect(() => {
    if (!loading && planExpired) {
      handleCheckWeeklyPlan();
    }
  }, [loading, planExpired, handleCheckWeeklyPlan]);

  /**
   * Regenerate workout plan.
   *
   * The actual generation is handled by WorkoutGenerating.
   * We only navigate here and tell that screen this is a regeneration.
   */
  const handleRegeneratePlan = useCallback(() => {
    if (regeneratingPlan) {
      return;
    }

    setRegeneratingPlan(true);

    navigation.navigate("WorkoutGenerating", {
      regenerate: true,
    });

    // Reset local button state after navigation.
    setTimeout(() => {
      setRegeneratingPlan(false);
    }, 500);
  }, [navigation, regeneratingPlan]);

  /**
   * Calculate today's workout.
   */
  const {
    currentDayKey,
    currentDayExercises,
    currentWorkoutDay,
    isRestDay,
    todayShifted,
  } = useMemo(() => {
    if (
      !workoutPlan?.weekly_split ||
      !Array.isArray(workoutPlan.weekly_split) ||
      workoutPlan.weekly_split.length === 0 ||
      !weekStart
    ) {
      return {
        currentDayKey: null,
        currentDayExercises: [],
        currentWorkoutDay: null,
        isRestDay: false,
        todayShifted: 0,
      };
    }

    let weekStartDate;

    try {
      if (typeof weekStart?.toDate === "function") {
        weekStartDate = weekStart.toDate();
      } else {
        weekStartDate = new Date(weekStart);
      }
    } catch (error) {
      console.log("Invalid weekStart:", error);
      return {
        currentDayKey: null,
        currentDayExercises: [],
        currentWorkoutDay: null,
        isRestDay: false,
        todayShifted: 0,
      };
    }

    if (
      !weekStartDate ||
      Number.isNaN(weekStartDate.getTime())
    ) {
      return {
        currentDayKey: null,
        currentDayExercises: [],
        currentWorkoutDay: null,
        isRestDay: false,
        todayShifted: 0,
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    weekStartDate.setHours(0, 0, 0, 0);

    const diffTime =
      today.getTime() - weekStartDate.getTime();

    const diffDays = Math.floor(
      diffTime / (1000 * 60 * 60 * 24)
    );

    const adjustedIndex =
      diffDays >= 0
        ? diffDays % workoutPlan.weekly_split.length
        : 0;

    const todayPlanDay =
      workoutPlan.weekly_split[adjustedIndex];

    const dayKey =
      todayPlanDay?.split(":")[0]?.trim();

    const exercises =
      workoutPlan?.daily_workouts?.[dayKey] || [];

    const restDay =
      todayPlanDay
        ?.toLowerCase()
        .includes("rest");

    return {
      currentDayKey: dayKey,
      currentDayExercises: Array.isArray(exercises)
        ? exercises
        : [],
      currentWorkoutDay: todayPlanDay,
      isRestDay: restDay,
      todayShifted: adjustedIndex,
    };
  }, [workoutPlan, weekStart]);

  /**
   * Workout statistics.
   */
  const workoutStats = useMemo(() => {
    if (
      !workoutPlan?.daily_workouts ||
      !workoutPlan?.weekly_split
    ) {
      return null;
    }

    let totalExercises = 0;
    let totalSets = 0;

    Object.values(workoutPlan.daily_workouts).forEach(
      (dayExercises) => {
        if (!Array.isArray(dayExercises)) {
          return;
        }

        totalExercises += dayExercises.length;

        dayExercises.forEach((exercise) => {
          const sets =
            Number(exercise?.workoutDetails?.sets) || 3;

          totalSets += sets;
        });
      }
    );

    const workoutDays =
      workoutPlan.weekly_split.filter(
        (day) =>
          !day
            ?.toLowerCase()
            .includes("rest")
      ).length;

    return {
      totalExercises,
      totalSets,
      workoutDays,
    };
  }, [workoutPlan]);

  /**
   * Quick actions.
   */
  const quickActions = [
    {
      icon: "calendar",
      label: "Today's Focus",
      gradient: ["#F34E3A", "#F17C3B"],
      screen: "TodaysFocusScreen",
      onPress: () =>
        navigation.navigate("TodaysFocusScreen", {
          day: currentDayKey,
          workoutPlan,
        }),
    },
    {
      icon: "book",
      label: "Form Tips",
      gradient: ["#F34E3A", "#F17C3B"],
      screen: "FormTipsLibraryScreen",
    },
    {
      icon: "barbell",
      label: "Equipment Workouts",
      gradient: ["#F34E3A", "#F17C3B"],
      screen: "EquipmentWorkoutsScreen",
    },
    {
      icon: "water",
      label: "Hydration",
      gradient: ["#F34E3A", "#F17C3B"],
      screen: "HydrationTrackerScreen",
    },
  ];

  /**
   * Recovery metrics.
   */
  const recoveryMetrics = [
    {
      icon: "water",
      label: "Water",
      value: `0/${
        workoutPlan?.recovery?.hydration
          ?.target_liters || 2
      } L`,
      gradient: ["#F34E3A", "#F17C3B"],
    },
    {
      icon: "bed",
      label: "Sleep",
      value: `${
        workoutPlan?.recovery?.sleep
          ?.target_hours || 7
      }h`,
      gradient: ["#F34E3A", "#F17C3B"],
    },
    {
      icon: "walk",
      label: "Recovery",
      value:
        workoutPlan?.recovery?.active_recovery
          ?.length || 0,
      gradient: ["#F34E3A", "#F17C3B"],
    },
  ];

  /**
   * Exercise preview.
   */
  const renderExercisePreview = (exercises) => {
    if (!Array.isArray(exercises)) {
      return null;
    }

    return exercises
      .slice(0, 3)
      .map((exercise, index) => (
        <View
          key={`${exercise?.id || exercise?.name || "exercise"}-${index}`}
          style={styles.exerciseTag}
        >
          <Text style={styles.exerciseTagText}>
            {exercise?.name || "Exercise"}
          </Text>

          <Text style={styles.exerciseDetails}>
            {exercise?.workoutDetails?.sets || 3}×
            {exercise?.workoutDetails?.reps || "8-12"}
          </Text>
        </View>
      ));
  };

  /**
   * Warmup / cooldown preview.
   */
  const renderWarmupCooldown = (items) => {
    if (!Array.isArray(items)) {
      return null;
    }

    return items.map((item, index) => (
      <View
        key={`${item?.name || "item"}-${index}`}
        style={styles.exerciseTag}
      >
        <Text style={styles.exerciseTagText}>
          {item?.name || "Activity"}
        </Text>

        <Text style={styles.exerciseDetails}>
          {item?.duration || ""}
        </Text>
      </View>
    ));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: "85%" }}>
              <Text style={styles.greetingText}>
                Welcome back,
              </Text>

              <Text style={styles.userName}>
                {fullName || "User"}
              </Text>

              {workoutPlan?.goal && (
                <Text style={styles.notesText}>
                  Goal: {workoutPlan.goal}
                </Text>
              )}
              {weekNumber > 1 && (
                <Text style={styles.notesText}>
                  Week {weekNumber} Plan
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile")
              }
            >
              <View style={styles.profileContainer}>
                <Image
                  source={
                    profileImage
                      ? { uri: profileImage }
                      : require("../../assets/images/noDp.png")
                  }
                  style={styles.profileImage}
                />

                <View
                  style={styles.onlineIndicator}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Regenerate Workout Plan CTA */}
          {workoutPlan && !planExpired && (
            <View style={styles.regenerateSection}>
              <LinearGradient
                colors={["#1A1A1A", "#000000"]}
                style={styles.regenerateCard}
              >
                <View style={styles.regenerateContent}>
                  <View
                    style={
                      styles.regenerateIconContainer
                    }
                  >
                    <Ionicons
                      name="refresh"
                      size={24}
                      color={darkColors.primary}
                    />
                  </View>

                  <View
                    style={
                      styles.regenerateTextContainer
                    }
                  >
                    <Text
                      style={styles.regenerateTitle}
                    >
                      Want a Fresh Workout Plan?
                    </Text>

                    <Text
                      style={styles.regenerateSubtitle}
                    >
                      Generate a new personalized plan
                      based on your current goals.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.regenerateButton}
                  activeOpacity={0.8}
                  onPress={handleRegeneratePlan}
                  disabled={regeneratingPlan}
                >
                  <LinearGradient
                    colors={[
                      darkColors.primary,
                      darkColors.primaryLight,
                    ]}
                    style={
                      styles.regenerateButtonGradient
                    }
                  >
                    {regeneratingPlan ? (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="refresh"
                          size={18}
                          color="#fff"
                        />

                        <Text
                          style={
                            styles.regenerateButtonText
                          }
                        >
                          Regenerate Plan
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>
              Quick Access
            </Text>

            <View style={styles.actionsGrid}>
              {quickActions.map(
                (action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.actionButton}
                    onPress={() => {
                      if (action.onPress) {
                        action.onPress();
                      } else {
                        navigation.navigate(
                          action.screen
                        );
                      }
                    }}
                  >
                    <LinearGradient
                      colors={action.gradient}
                      style={styles.actionIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name={action.icon}
                        size={24}
                        color="#fff"
                      />
                    </LinearGradient>

                    <Text
                      style={styles.actionLabel}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* Workout Stats */}
          {workoutStats && (
            <View>
              <Text style={styles.sectionTitle}>
                Your Stats
              </Text>

              <LinearGradient
                colors={["#000000", "#1A1A1A"]}
                style={styles.statsGradient}
              >
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {workoutStats.workoutDays}
                  </Text>

                  <Text style={styles.statLabel}>
                    Workout Days
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {workoutStats.totalExercises}
                  </Text>

                  <Text style={styles.statLabel}>
                    Exercises
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {workoutStats.totalSets}
                  </Text>

                  <Text style={styles.statLabel}>
                    Total Sets
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Today's Workout */}
          {!loading &&
            workoutPlan?.weekly_split && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Today's Plan
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate(
                        "MyPlan"
                      )
                    }
                  >
                    <Text
                      style={styles.seeAllText}
                    >
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isRestDay &&
                currentDayExercises &&
                currentDayExercises.length > 0 ? (
                  <TouchableOpacity
                    style={styles.workoutCard}
                    onPress={() =>
                      navigation.navigate(
                        "WorkoutDetails",
                        {
                          day: currentDayKey,
                          exercises:
                            currentDayExercises,
                          warmup:
                            workoutPlan.warmup,
                          cooldown:
                            workoutPlan.cooldown,
                        }
                      )
                    }
                  >
                    <LinearGradient
                      colors={[
                        "#000000",
                        "#1A1A1A",
                      ]}
                      style={
                        styles.workoutGradient
                      }
                    >
                      <View
                        style={
                          styles.workoutHeader
                        }
                      >
                        <View>
                          <Text
                            style={
                              styles.workoutDay
                            }
                          >
                            {currentDayKey}
                          </Text>

                          <Text
                            style={
                              styles.workoutName
                            }
                          >
                            {currentWorkoutDay
                              ?.split(":")[1]
                              ?.trim() ||
                              "Workout"}
                          </Text>
                        </View>

                        <LinearGradient
                          colors={[
                            "#F34E3A",
                            "#F17C3B",
                          ]}
                          style={
                            styles.startButton
                          }
                        >
                          <Ionicons
                            name="play"
                            size={20}
                            color="#fff"
                          />
                        </LinearGradient>
                      </View>

                      <Text
                        style={
                          styles.workoutExercises
                        }
                      >
                        {currentDayExercises.length}{" "}
                        exercises •{" "}
                        {currentDayExercises.reduce(
                          (acc, exercise) =>
                            acc +
                            (Number(
                              exercise
                                ?.workoutDetails
                                ?.sets
                            ) || 3),
                          0
                        )}{" "}
                        sets
                      </Text>

                      {/* Warmup */}
                      {Array.isArray(
                        workoutPlan.warmup
                      ) &&
                        workoutPlan.warmup.length >
                          0 && (
                          <View
                            style={{
                              marginBottom: 12,
                            }}
                          >
                            <Text
                              style={
                                styles.sectionTitle
                              }
                            >
                              Warmup
                            </Text>

                            <View
                              style={
                                styles.exercisePreview
                              }
                            >
                              {renderWarmupCooldown(
                                workoutPlan.warmup
                              )}
                            </View>
                          </View>
                        )}

                      {/* Exercises */}
                      <View
                        style={
                          styles.exercisePreview
                        }
                      >
                        {renderExercisePreview(
                          currentDayExercises
                        )}
                      </View>

                      {/* Cooldown */}
                      {Array.isArray(
                        workoutPlan.cooldown
                      ) &&
                        workoutPlan.cooldown.length >
                          0 && (
                          <View
                            style={{
                              marginTop: 12,
                            }}
                          >
                            <Text
                              style={
                                styles.sectionTitle
                              }
                            >
                              Cooldown
                            </Text>

                            <View
                              style={
                                styles.exercisePreview
                              }
                            >
                              {renderWarmupCooldown(
                                workoutPlan.cooldown
                              )}
                            </View>
                          </View>
                        )}

                      {/* Guidelines */}
                      {workoutPlan.workout_guidelines && (
                        <View
                          style={
                            styles.guidelinesContainer
                          }
                        >
                          {workoutPlan
                            .workout_guidelines
                            .focus && (
                            <View
                              style={
                                styles.guidelineItem
                              }
                            >
                              <FontAwesome5
                                name="dumbbell"
                                size={14}
                                color="#ffffff"
                              />

                              <Text
                                style={
                                  styles.guidelineText
                                }
                              >
                                Focus:{" "}
                                {
                                  workoutPlan
                                    .workout_guidelines
                                    .focus
                                }
                              </Text>
                            </View>
                          )}

                          {workoutPlan
                            .workout_guidelines
                            .rest_between_sets && (
                            <View
                              style={
                                styles.guidelineItem
                              }
                            >
                              <Ionicons
                                name="time"
                                size={14}
                                color="#ffffff"
                              />

                              <Text
                                style={
                                  styles.guidelineText
                                }
                              >
                                Rest:{" "}
                                {
                                  workoutPlan
                                    .workout_guidelines
                                    .rest_between_sets
                                }
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : isRestDay ? (
                  <View style={styles.restCard}>
                    <LinearGradient
                      colors={[
                        "#000000",
                        "#1A1A1A",
                      ]}
                      style={styles.restGradient}
                    >
                      <Ionicons
                        name="bed"
                        size={40}
                        color={
                          darkColors.textSecondary
                        }
                      />

                      <Text
                        style={styles.restTitle}
                      >
                        Rest Day
                      </Text>

                      <Text
                        style={styles.restText}
                      >
                        Time for recovery
                      </Text>

                      {Array.isArray(
                        workoutPlan?.recovery
                          ?.active_recovery
                      ) &&
                        workoutPlan.recovery.active_recovery.map(
                          (
                            activity,
                            index
                          ) => (
                            <Text
                              key={index}
                              style={
                                styles.recoveryActivity
                              }
                            >
                              • {activity}
                            </Text>
                          )
                        )}
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.restCard}>
                    <LinearGradient
                      colors={[
                        "#000000",
                        "#1A1A1A",
                      ]}
                      style={styles.restGradient}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={40}
                        color={
                          darkColors.textSecondary
                        }
                      />

                      <Text
                        style={styles.restTitle}
                      >
                        No Workout Today
                      </Text>

                      <Text
                        style={styles.restText}
                      >
                        Check your weekly plan
                      </Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            )}

          {/* Recovery Metrics */}
          {workoutPlan && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Recovery Metrics
              </Text>

              <LinearGradient
                colors={["#000000", "#1A1A1A"]}
                style={styles.recoveryGradient}
              >
                {recoveryMetrics.map(
                  (metric, index) => (
                    <View
                      key={index}
                      style={styles.recoveryMetric}
                    >
                      <LinearGradient
                        colors={[
                          "#000000",
                          "#1A1A1A",
                        ]}
                        style={styles.metricIcon}
                      >
                        <Ionicons
                          name={metric.icon}
                          size={20}
                          color="#fff"
                        />
                      </LinearGradient>

                      <View>
                        <Text
                          style={
                            styles.metricValue
                          }
                        >
                          {metric.value}
                        </Text>

                        <Text
                          style={
                            styles.metricLabel
                          }
                        >
                          {metric.label}
                        </Text>
                      </View>
                    </View>
                  )
                )}
              </LinearGradient>
            </View>
          )}

          {/* Nutrition */}
          {workoutPlan?.nutrition && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Nutrition
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      "Nutrition"
                    )
                  }
                >
                  <Text
                    style={styles.seeAllText}
                  >
                    Details
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.nutritionCard}
                onPress={() =>
                  navigation.navigate(
                    "Nutrition"
                  )
                }
              >
                <LinearGradient
                  colors={[
                    "#000000",
                    "#1A1A1A",
                  ]}
                  style={
                    styles.nutritionGradient
                  }
                >
                  <View
                    style={
                      styles.nutritionHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.nutritionCalories
                        }
                      >
                        {
                          workoutPlan.nutrition
                            .daily_calories
                        }{" "}
                        kcal
                      </Text>

                      <Text
                        style={
                          styles.nutritionLabel
                        }
                      >
                        Daily Goal
                      </Text>
                    </View>

                    <LinearGradient
                      colors={[
                        "#F34E3A",
                        "#F17C3B",
                      ]}
                      style={
                        styles.nutritionIcon
                      }
                    >
                      <Ionicons
                        name="nutrition"
                        size={24}
                        color="#fff"
                      />
                    </LinearGradient>
                  </View>

                  <View
                    style={
                      styles.macrosContainer
                    }
                  >
                    <View
                      style={styles.macroItem}
                    >
                      <Text
                        style={
                          styles.macroValue
                        }
                      >
                        {
                          workoutPlan.nutrition
                            .protein_g
                        }
                        g
                      </Text>

                      <Text
                        style={
                          styles.macroLabel
                        }
                      >
                        Protein
                      </Text>
                    </View>

                    <View
                      style={styles.macroItem}
                    >
                      <Text
                        style={
                          styles.macroValue
                        }
                      >
                        {
                          workoutPlan.nutrition
                            .carbs_g
                        }
                        g
                      </Text>

                      <Text
                        style={
                          styles.macroLabel
                        }
                      >
                        Carbs
                      </Text>
                    </View>

                    <View
                      style={styles.macroItem}
                    >
                      <Text
                        style={
                          styles.macroValue
                        }
                      >
                        {
                          workoutPlan.nutrition
                            .fat_g
                        }
                        g
                      </Text>

                      <Text
                        style={
                          styles.macroLabel
                        }
                      >
                        Fat
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Weekly Plan */}
          {!loading &&
            workoutPlan?.weekly_split && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Weekly Plan
                  </Text>

                  <Text
                    style={styles.planDuration}
                  >
                    {
                      workoutPlan.weekly_split.filter(
                        (day) =>
                          !day
                            ?.toLowerCase()
                            .includes("rest")
                      ).length
                    }{" "}
                    days/week
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.weekScroll
                  }
                >
                  {workoutPlan.weekly_split.map(
                    (day, index) => {
                      const isRest =
                        day
                          ?.toLowerCase()
                          .includes("rest");

                      const dayKey =
                        day
                          ?.split(":")[0]
                          ?.trim();

                      const exercises =
                        workoutPlan
                          .daily_workouts?.[
                          dayKey
                        ] || [];

                      const isToday =
                        index === todayShifted;

                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dayCard,
                            isToday &&
                              styles.todayCard,
                          ]}
                          onPress={() =>
                            !isRest &&
                            exercises.length >
                              0 &&
                            navigation.navigate(
                              "WorkoutDetails",
                              {
                                day: dayKey,
                                exercises,
                              }
                            )
                          }
                        >
                          <LinearGradient
                            colors={
                              isToday
                                ? [
                                    "#F34E3A",
                                    "#F17C3B",
                                  ]
                                : [
                                    "#000000",
                                    "#1A1A1A",
                                  ]
                            }
                            style={
                              styles.dayGradient
                            }
                          >
                            <Text
                              style={[
                                styles.dayName,
                                isToday &&
                                  styles.todayText,
                              ]}
                            >
                              {dayKey}
                            </Text>

                            {isRest ? (
                              <Ionicons
                                name="bed"
                                size={20}
                                color={
                                  isToday
                                    ? "#fff"
                                    : darkColors.textSecondary
                                }
                              />
                            ) : (
                              <FontAwesome5
                                name="dumbbell"
                                size={16}
                                color={
                                  isToday
                                    ? "#fff"
                                    : darkColors.textSecondary
                                }
                              />
                            )}

                            <Text
                              style={[
                                styles.dayStatus,
                                isToday &&
                                  styles.todayText,
                              ]}
                            >
                              {isRest
                                ? "Rest"
                                : `${exercises.length} ex`}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>
            )}

          {/* Loading */}
          {loading && (
            <ActivityIndicator
              size="large"
              color={darkColors.primary}
              style={{
                marginVertical: 30,
              }}
            />
          )}
        </ScrollView>

        {/* Expired Plan Overlay */}
        {planExpired && (
          <View style={styles.overlayContainer}>
            <View style={styles.overlayBlur} />

            <View style={styles.expiredCard}>
              <Ionicons
                name="alert-circle"
                size={46}
                color={Colors.primary}
                style={{
                  marginBottom: 10,
                }}
              />

              <Text
                style={styles.expiredTitle}
              >
                Your Plan Has Ended
              </Text>

              <Text
                style={styles.expiredMessage}
              >
                Your weekly fitness plan is complete.
                Create your new plan to continue your
                progress.
              </Text>

              <TouchableOpacity
                style={styles.newPlanBtn}
                onPress={() =>
                  navigation.navigate(
                    "WorkoutGenerating",
                    {
                      regenerate: true,
                    }
                  )
                }
              >
                <LinearGradient
                  colors={[
                    darkColors.primary,
                    darkColors.primaryLight,
                  ]}
                  style={
                    styles.newPlanGradient
                  }
                >
                  <Text
                    style={styles.newPlanText}
                  >
                    Create New Plan
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkColors.background,
  },

  scrollContainer: {
    paddingVertical: 20,
    width: "90%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  greetingText: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Regular,
  },

  userName: {
    color: darkColors.textPrimary,
    fontSize: 24,
    fontFamily: Fonts.Montserrat_Bold,
    marginTop: 4,
  },

  notesText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Regular,
    marginTop: 8,
    fontStyle: "italic",
  },

  profileContainer: {
    position: "relative",
  },

  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: darkColors.primary,
  },

  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: darkColors.success,
    borderWidth: 2,
    borderColor: darkColors.background,
  },

  /* Regenerate CTA */

  regenerateSection: {
    marginBottom: 24,
  },

  regenerateCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: darkColors.border,
  },

  regenerateContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  regenerateIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor:
      "rgba(243, 78, 58, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  regenerateTextContainer: {
    flex: 1,
  },

  regenerateTitle: {
    color: darkColors.textPrimary,
    fontSize: 15,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 5,
  },

  regenerateSubtitle: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Regular,
    lineHeight: 18,
  },

  regenerateButton: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },

  regenerateButtonGradient: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  regenerateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Bold,
    marginLeft: 8,
  },

  /* Stats */

  statsGradient: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 20,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    color: darkColors.textPrimary,
    fontSize: 20,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 4,
  },

  statLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Medium,
  },

  statDivider: {
    width: 1,
    backgroundColor: darkColors.border,
    marginHorizontal: 10,
  },

  /* Quick Actions */

  actionsContainer: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 16,
  },

  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  actionButton: {
    alignItems: "center",
    flex: 1,
  },

  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#6D6D6D",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  actionLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Medium,
    textAlign: "center",
  },

  /* Sections */

  section: {
    marginTop: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },

  seeAllText: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
  },

  /* Workout */

  workoutCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#6D6D6D",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },

  workoutGradient: {
    padding: 20,
    borderRadius: 20,
  },

  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  workoutDay: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
    marginBottom: 4,
  },

  workoutName: {
    color: darkColors.textPrimary,
    fontSize: 20,
    fontFamily: Fonts.Montserrat_Bold,
  },

  startButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  workoutExercises: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Regular,
    marginBottom: 12,
  },

  exercisePreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  exerciseTag: {
    backgroundColor:
      "rgba(137, 120, 118, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      "rgba(115, 109, 108, 0.3)",
  },

  exerciseTagText: {
    color: darkColors.textPrimary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Medium,
    marginBottom: 2,
  },

  exerciseDetails: {
    color: darkColors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.Montserrat_Regular,
  },

  guidelinesContainer: {
    marginTop: 8,
  },

  guidelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  guidelineText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Regular,
    marginLeft: 6,
    flex: 1,
  },

  /* Rest */

  restCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#6D6D6D",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  restGradient: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  restTitle: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontFamily: Fonts.Montserrat_Bold,
    marginTop: 12,
    marginBottom: 4,
  },

  restText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Regular,
  },

  recoveryActivity: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Regular,
  },

  /* Recovery */

  recoveryGradient: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 20,
  },

  recoveryMetric: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#6D6D6D",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  metricValue: {
    color: darkColors.textPrimary,
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 2,
  },

  metricLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Medium,
  },

  /* Nutrition */

  nutritionCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#6D6D6D",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },

  nutritionGradient: {
    padding: 20,
    borderRadius: 20,
  },

  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  nutritionCalories: {
    color: darkColors.textPrimary,
    fontSize: 24,
    fontFamily: Fonts.Montserrat_Bold,
  },

  nutritionLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Regular,
  },

  nutritionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  macroItem: {
    alignItems: "center",
  },

  macroValue: {
    color: darkColors.textPrimary,
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 4,
  },

  macroLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Medium,
  },

  /* Weekly Plan */

  planDuration: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
  },

  weekScroll: {
    paddingRight: 20,
  },

  dayCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    minWidth: 80,
    shadowColor: "#6D6D6D",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  dayGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 100,
    justifyContent: "center",
  },

  todayCard: {
    shadowColor: "#F34E3A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  dayName: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 8,
  },

  todayText: {
    color: "#fff",
  },

  dayStatus: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.Montserrat_Medium,
    marginTop: 4,
  },

  /* Expired Overlay */

  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  overlayBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
  },

  expiredCard: {
    width: "85%",
    backgroundColor: "#111",
    padding: 24,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  expiredTitle: {
    color: "white",
    fontSize: 20,
    fontFamily: Fonts.Montserrat_Bold,
    marginBottom: 6,
    textAlign: "center",
  },

  expiredMessage: {
    color: "gray",
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Regular,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },

  newPlanBtn: {
    width: "100%",
  },

  newPlanGradient: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  newPlanText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Bold,
  },
});