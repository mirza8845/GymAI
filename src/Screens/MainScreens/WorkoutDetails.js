import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { RFPercentage } from "react-native-responsive-fontsize";
import LinearGradient from "react-native-linear-gradient";
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

const WorkoutDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { exercise, day, exercises, warmup, cooldown } = route.params || {};
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);

  /** -------- helpers ---------- */
  const SectionCard = ({ title, children, icon }) => (
    <LinearGradient
      colors={["#1C1C1E", "#2C2C2E"]}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardHeader}>
        {icon && <View style={styles.cardIcon}>{icon}</View>}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </LinearGradient>
  );

  const renderInstructions = () => {
    if (!exercise?.instructions || !Array.isArray(exercise.instructions))
      return null;

    return (
      <SectionCard
        title="Step-by-Step Instructions"
        icon={<Ionicons name="list" size={18} color={darkColors.primary} />}
      >
        {exercise.instructions.map((instruction, idx) => {
          const cleanInstruction = instruction.replace(/^Step:\d+\s*/, "");
          return (
            <View key={idx} style={styles.instructionRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{cleanInstruction}</Text>
            </View>
          );
        })}
      </SectionCard>
    );
  };

  const renderWorkoutDetails = () => {
    if (!exercise?.workoutDetails) return null;

    return (
      <SectionCard
        title="Workout Details"
        icon={
          <FontAwesome5 name="dumbbell" size={16} color={darkColors.primary} />
        }
      >
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons name="repeat" size={16} color={darkColors.primary} />
            </View>
            <View>
              <Text style={styles.detailValue}>
                {exercise.workoutDetails.sets || 3}
              </Text>
              <Text style={styles.detailLabel}>Sets</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <FontAwesome5
                name="redo-alt"
                size={14}
                color={darkColors.primary}
              />
            </View>
            <View>
              <Text style={styles.detailValue}>
                {exercise.workoutDetails.reps || "8-12"}
              </Text>
              <Text style={styles.detailLabel}>Reps</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons name="time" size={16} color={darkColors.primary} />
            </View>
            <View>
              <Text style={styles.detailValue}>
                {exercise.workoutDetails.restSeconds || 60}s
              </Text>
              <Text style={styles.detailLabel}>Rest</Text>
            </View>
          </View>
        </View>

        {exercise.workoutDetails.notes && (
          <View style={styles.notesContainer}>
            <Ionicons
              name="information-circle"
              size={16}
              color={darkColors.warning}
            />
            <Text style={styles.notesText}>
              {exercise.workoutDetails.notes}
            </Text>
          </View>
        )}
      </SectionCard>
    );
  };

  const renderMuscleInfo = () => {
    return (
      <SectionCard
        title="Muscle Information"
        icon={<Ionicons name="body" size={18} color={darkColors.primary} />}
      >
        <View style={styles.muscleSection}>
          <View style={styles.muscleRow}>
            <FontAwesome5 name="target" size={14} color={darkColors.primary} />
            <Text style={styles.muscleLabel}>Primary Target:</Text>
            <Text style={styles.primaryMuscle}>
              {exercise?.target || "Not specified"}
            </Text>
          </View>

          {exercise?.secondaryMuscles &&
            exercise.secondaryMuscles.length > 0 && (
              <View style={styles.muscleRow}>
                <Ionicons
                  name="fitness"
                  size={14}
                  color={darkColors.textSecondary}
                />
                <Text style={styles.muscleLabel}>Secondary Muscles:</Text>
                <Text style={styles.secondaryMuscles}>
                  {exercise.secondaryMuscles.join(", ")}
                </Text>
              </View>
            )}

          {exercise?.bodyPart && (
            <View style={styles.muscleRow}>
              <FontAwesome5
                name="user"
                size={14}
                color={darkColors.textSecondary}
              />
              <Text style={styles.muscleLabel}>Body Part:</Text>
              <Text style={styles.bodyPart}>{exercise.bodyPart}</Text>
            </View>
          )}
        </View>
      </SectionCard>
    );
  };

  const renderFormTips = () => {
    const tips = [];

    if (exercise?.target) {
      tips.push(
        `Focus on contracting your ${exercise.target} throughout the movement`,
      );
    }

    if (exercise?.secondaryMuscles && exercise.secondaryMuscles.length > 0) {
      tips.push(`Engage ${exercise.secondaryMuscles.join(", ")} for stability`);
    }

    if (exercise?.equipment) {
      tips.push(`Ensure proper setup of ${exercise.equipment}`);
    }

    // Add general form tips
    tips.push("Maintain proper breathing - exhale during exertion");
    tips.push("Keep core engaged throughout the movement");
    tips.push("Control the movement - avoid using momentum");
    tips.push("Maintain proper posture and alignment");

    return (
      <SectionCard
        title="Form Tips"
        icon={<Ionicons name="bulb" size={18} color={darkColors.warning} />}
      >
        {tips.map((tip, idx) => (
          <View key={idx} style={styles.tipRow}>
            <View style={styles.tipBullet} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </SectionCard>
    );
  };

  const handleStartExercise = () => {
    const exerciseIndex = exercises.findIndex((ex) => ex.id === exercise.id);

    navigation.navigate("StartSingleExerciseScreen", {
      exercise,
      day,
      warmup,
      cooldown,
      exerciseIndex,
      totalExercises: exercises.length,
      allExercises: exercises,
      planId: workoutPlan?.planId || null,
      planVersion: workoutPlan?.schemaVersion || 1,
      weekNumber: workoutPlan?.weekNumber || 1,
    });
  };

  const handleStartFullWorkout = () => {
    navigation.navigate("StartFullWorkoutScreen", {
      exercise: null,
      day,
      warmup,
      cooldown,
      allExercises: exercises,
      planId: workoutPlan?.planId || null,
      planVersion: workoutPlan?.schemaVersion || 1,
      weekNumber: workoutPlan?.weekNumber || 1,
    });
  };

  // Generate equipment icon
  const getEquipmentIcon = (equipment) => {
    if (!equipment) return "dumbbell";
    const eq = equipment.toLowerCase();
    if (eq.includes("barbell")) return "dumbbell";
    if (eq.includes("dumbbell")) return "dumbbell";
    if (eq.includes("machine") || eq.includes("leverage")) return "cog";
    if (eq.includes("cable")) return "link";
    if (eq.includes("body weight") || eq.includes("bodyweight")) return "user";
    if (eq.includes("smith")) return "weight-hanging";
    return "dumbbell";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with GIF */}
        <View style={styles.heroWrapper}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <AntDesign name="arrowleft" size={RFPercentage(3)} color="#fff" />
          </TouchableOpacity>

          {exercise?.gifUrl ? (
            <Image
              source={{ uri: exercise.gifUrl }}
              style={styles.heroImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <FontAwesome5
                name={getEquipmentIcon(exercise?.equipment)}
                size={40}
                color={darkColors.textSecondary}
              />
              <Text style={styles.placeholderText}>Exercise Visual</Text>
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.8)", "transparent", "rgba(0,0,0,0.8)"]}
            style={styles.heroOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          <View style={styles.heroContent}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleContainer}>
                <Text style={styles.exerciseName} numberOfLines={2}>
                  {exercise?.name || "Exercise"}
                </Text>
                <View style={styles.equipmentBadge}>
                  <FontAwesome5
                    name={getEquipmentIcon(exercise?.equipment)}
                    size={12}
                    color={darkColors.primary}
                  />
                  <Text style={styles.equipmentText}>
                    {exercise?.equipment || "Bodyweight"}
                  </Text>
                </View>
              </View>

              {day && (
                <View style={styles.dayBadge}>
                  <Ionicons
                    name="calendar"
                    size={14}
                    color={darkColors.textSecondary}
                  />
                  <Text style={styles.dayText}>{day}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Workout Details */}
        {renderWorkoutDetails()}

        {/* Muscle Information */}
        {renderMuscleInfo()}

        {/* Instructions */}
        {renderInstructions()}

        {/* Form Tips */}
        {renderFormTips()}

        {/* Start Buttons */}
        <View style={styles.buttonContainer}>
          {exercise && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startExerciseButton]}
              onPress={handleStartExercise}
            >
              <AntDesign name="play" size={20} color="#fff" />
              <Text style={styles.buttonText}>Start This Exercise</Text>
            </TouchableOpacity>
          )}

          {exercises && exercises.length > 1 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startWorkoutButton]}
              onPress={handleStartFullWorkout}
            >
              <Ionicons name="barbell" size={20} color="#fff" />
              <Text style={styles.buttonText}>Start Full Workout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default WorkoutDetails;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scroll: {
    paddingBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  heroWrapper: {
    height: RFPercentage(35),
    width: "100%",
    position: "relative",
  },
  heroImg: {
    height: "100%",
    width: "100%",
  },
  heroPlaceholder: {
    height: "100%",
    width: "100%",
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginTop: 12,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  exerciseTitleContainer: {
    flex: 1,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Montserrat-Bold",
    lineHeight: 28,
    marginBottom: 8,
  },
  equipmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 78, 58, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  equipmentText: {
    color: darkColors.primary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  dayBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  dayText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginLeft: 4,
  },
  card: {
    marginTop: 16,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(243, 78, 58, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    color: "#fff",
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(243, 78, 58, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  detailValue: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    marginBottom: 2,
  },
  detailLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  detailDivider: {
    width: 1,
    backgroundColor: darkColors.border,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: darkColors.warning,
  },
  notesText: {
    color: darkColors.warning,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
    fontStyle: "italic",
  },
  muscleSection: {
    marginTop: 4,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  muscleLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 8,
    marginRight: 6,
    minWidth: 120,
  },
  primaryMuscle: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    flex: 1,
  },
  secondaryMuscles: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    flex: 1,
  },
  bodyPart: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    flex: 1,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: darkColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
  },
  instructionText: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    lineHeight: 20,
    flex: 1,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: darkColors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  tipText: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    lineHeight: 20,
    flex: 1,
  },
  buttonContainer: {
    width: "90%",
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  startExerciseButton: {
    backgroundColor: darkColors.primary,
  },
  startWorkoutButton: {
    backgroundColor: darkColors.success,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
});
