import { localDateKey } from "../../utils/workoutData";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { RFPercentage } from "react-native-responsive-fontsize";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import LinearGradient from "react-native-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { setWorkoutPlan } from "../../redux/Actions";
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

const PullPushDay = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { day, label, exercises: routeExercises = [] } = route.params || {};
  const dispatch = useDispatch();
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);
  const exercises = workoutPlan?.daily_workouts?.[day] || routeExercises;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const handleRemoveExercise = async (indexToRemove) => {
    try {
      const uid = auth().currentUser.uid;
      const docRef = firestore().collection("workouts").doc(uid);
      const doc = await docRef.get();
      if (!doc.exists) throw new Error("Workout plan not found");

      const currentPlan = doc.data().plan;
      const currentExercises = currentPlan.daily_workouts?.[day];
      if (!currentExercises) throw new Error("No exercises found for this day");

      const updatedExercises = currentExercises.filter(
        (_, idx) => idx !== indexToRemove,
      );

      await docRef.update({
        [`plan.daily_workouts.${day}`]: updatedExercises,
      });

      const updatedPlan = {
        ...workoutPlan,
        daily_workouts: {
          ...workoutPlan.daily_workouts,
          [day]: updatedExercises,
        },
      };
      dispatch(setWorkoutPlan(updatedPlan));

      Toast.show({
        type: "success",
        text1: "Exercise removed",
        text2: "Exercise removed successfully!",
      });
      setShowDeleteModal(false);
      setExerciseToDelete(null);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });
    }
  };

  const confirmDeleteExercise = (index) => {
    setExerciseToDelete(index);
    setShowDeleteModal(true);
  };

  const handleFinishWorkout = async () => {
    try {
      const uid = auth().currentUser.uid;
      const docRef = firestore().collection("workouts").doc(uid);
      const doc = await docRef.get();
      if (!doc.exists) throw new Error("Workout plan not found");

      const currentPlan = doc.data().plan;

      const today = localDateKey();
      const workoutData = {
        planId: currentPlan?.planId || null,
        planVersion: currentPlan?.schemaVersion || 1,
        weekNumber: doc.data()?.weekNumber || 1,
        day: day,
        exercises: exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          target: ex.target,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          sets: ex.workoutDetails?.sets || 3,
          reps: 0,
          targetReps: ex.workoutDetails?.reps || "8-12",
          weightUsed: 0,
          completed: true,
          skipped: false,
          setData: [],
          notes: "",
        })),
        totalExercises: exercises.length,
        date: today,
        completionStatus: "completed",
        completionPercentage: 100,
      };

      await WorkoutHistoryService.logCompletedWorkout(uid, workoutData);

      Toast.show({
        type: "success",
        text1: `${label || day} workout`,
        text2: "Workout marked as completed!",
      });
      setShowFinishModal(false);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error completing workout",
        text2: error.message,
      });
    }
  };

  const confirmFinishWorkout = () => {
    setShowFinishModal(true);
  };

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

  const renderExerciseItem = (exercise, index) => (
    <LinearGradient
      key={exercise.id || index}
      colors={["#1C1C1E", "#2C2C2E"]}
      style={styles.exerciseCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Exercise GIF */}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("WorkoutDetails", {
            exercise,
            day,
            exercises,
            warmup: workoutPlan?.warmup,
            cooldown: workoutPlan?.cooldown,
          })
        }
        style={styles.exerciseTouchable}
      >
        {exercise.gifUrl ? (
          <Image
            source={{ uri: exercise.gifUrl }}
            style={styles.exerciseImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons
              name={getEquipmentIcon(exercise.equipment)}
              size={30}
              color={darkColors.textSecondary}
            />
          </View>
        )}

        {/* Exercise Info */}
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName} numberOfLines={2}>
              {exercise.name}
            </Text>
            <View style={styles.setsRepsBadge}>
              <Text style={styles.setsRepsText}>
                {exercise.workoutDetails?.sets || 3}×
                {exercise.workoutDetails?.reps || "8-12"}
              </Text>
            </View>
          </View>

          <View style={styles.exerciseMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name={getEquipmentIcon(exercise.equipment)}
                size={14}
                color={darkColors.textSecondary}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {exercise.equipment}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name="body"
                size={14}
                color={darkColors.textSecondary}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {exercise.target}
              </Text>
            </View>
          </View>

          {exercise.secondaryMuscles &&
            exercise.secondaryMuscles.length > 0 && (
              <View style={styles.secondaryMuscles}>
                <Text style={styles.secondaryLabel}>Secondary: </Text>
                <Text style={styles.secondaryText} numberOfLines={1}>
                  {exercise.secondaryMuscles.slice(0, 2).join(", ")}
                  {exercise.secondaryMuscles.length > 2 && "..."}
                </Text>
              </View>
            )}

          {exercise.workoutDetails?.notes && (
            <Text style={styles.exerciseNotes} numberOfLines={1}>
              <Ionicons
                name="information-circle"
                size={12}
                color={darkColors.warning}
              />{" "}
              {exercise.workoutDetails.notes}
            </Text>
          )}

          <View style={styles.exerciseFooter}>
            <Text style={styles.tapForDetails}>Tap for details →</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Remove Button */}
      {/* <TouchableOpacity 
        onPress={() => confirmDeleteExercise(index)} 
        style={styles.removeBtn}
      >
        <AntDesign name="delete" size={20} color={darkColors.error} />
      </TouchableOpacity> */}
    </LinearGradient>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" color="#fff" size={RFPercentage(3)} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{label || day}</Text>
          <Text style={styles.headerSubtitle}>
            {exercises?.length || 0} exercises •
            {exercises?.reduce(
              (acc, ex) => acc + (ex.workoutDetails?.sets || 3),
              0,
            ) || 0}{" "}
            sets
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="dumbbell" size={20} color="#fff" />
            <Text style={styles.sectionTitle}>Exercises</Text>
            <Text style={styles.exerciseCount}>({exercises?.length || 0})</Text>
          </View>

          {exercises?.length > 0 ? (
            exercises.map((exercise, index) =>
              renderExerciseItem(exercise, index),
            )
          ) : (
            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.emptyCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons
                name="dumbbell"
                size={50}
                color={darkColors.textSecondary}
              />
              <Text style={styles.emptyText}>No exercises for this day</Text>
              <Text style={styles.emptySubtext}>
                Add exercises to get started with your workout
              </Text>
            </LinearGradient>
          )}
        </View>
      </ScrollView>
      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.addButton]}
          onPress={() => navigation.navigate("AddExercise", { day })}
        >
          <AntDesign name="plus" size={20} color="#fff" />
          <Text style={styles.buttonText}>Add Exercise</Text>
        </TouchableOpacity>

        {exercises?.length > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, styles.finishButton]}
            onPress={confirmFinishWorkout}
          >
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
            <Text style={styles.buttonText}>Finish Workout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={50}
              color={darkColors.error}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Remove Exercise</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove this exercise from your workout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setExerciseToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => handleRemoveExercise(exerciseToDelete)}
              >
                <Text style={styles.deleteButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Finish Workout Confirmation Modal */}
      <Modal
        visible={showFinishModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <MaterialCommunityIcons
              name="trophy"
              size={50}
              color={darkColors.success}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Finish Workout</Text>
            <Text style={styles.modalMessage}>
              Mark this workout as completed? You'll be able to track your
              progress.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFinishModal(false)}
              >
                <Text style={styles.cancelButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.finishModalButton]}
                onPress={handleFinishWorkout}
              >
                <Text style={styles.finishButtonText}>Finish Workout</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
};

export default PullPushDay;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scrollContainer: {
    width: "90%",
    alignSelf: "center",
    // paddingTop: RFPercentage(6),
    paddingBottom: RFPercentage(10),
  },
  headerContainer: {
    flexDirection: "row",
    // alignItems: "center",
    marginBottom: 20,
    width: "90%",
    alignSelf: "center",
    marginTop: RFPercentage(9),
  },
  backButton: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    top: 5,
  },
  headerContent: {
    flex: 1,
    // alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Montserrat-SemiBold",
    textAlign: "center",
    // marginBottom: 4,
  },
  headerSubtitle: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    textAlign: "center",
  },
  headerSpacer: {
    width: RFPercentage(3),
  },
  guidelinesCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  guidelinesTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 10,
  },
  guidelinesContent: {
    marginLeft: 6,
  },
  guidelineItem: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    marginBottom: 6,
    lineHeight: 18,
  },
  exercisesSection: {
    width: "100%",
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 10,
  },
  exerciseCount: {
    color: darkColors.textSecondary,
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  exerciseCard: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
    overflow: "hidden",
    position: "relative",
  },
  exerciseTouchable: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-start",
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 16,
    backgroundColor: "#333",
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    flex: 1,
    marginRight: 10,
    lineHeight: 20,
  },
  setsRepsBadge: {
    backgroundColor: darkColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  setsRepsText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 4,
  },
  metaText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginLeft: 4,
    maxWidth: 100,
  },
  secondaryMuscles: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  secondaryLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  secondaryText: {
    color: darkColors.textPrimary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    flex: 1,
  },
  exerciseNotes: {
    color: darkColors.warning,
    fontSize: 11,
    fontFamily: "Montserrat-Regular",
    marginBottom: 8,
    fontStyle: "italic",
  },
  exerciseFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  tapForDetails: {
    color: darkColors.primary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    fontStyle: "italic",
  },
  removeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  emptyText: {
    fontSize: 16,
    color: "#fff",
    marginTop: 16,
    fontFamily: "Montserrat-Medium",
    textAlign: "center",
  },
  emptySubtext: {
    color: darkColors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    gap: 12,
    paddingHorizontal:RFPercentage(2),
    height:RFPercentage(12),
    backgroundColor:'black',
    alignItems:"center"
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    gap: 8,
  },
  addButton: {
    backgroundColor: darkColors.primary,
  },
  finishButton: {
    backgroundColor: darkColors.success,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  finishModalButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  deleteButtonText: {
    color: darkColors.error,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  finishButtonText: {
    color: darkColors.success,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
});
