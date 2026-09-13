import { validExerciseDetails } from "../../utils/workoutData";
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { RFPercentage } from "react-native-responsive-fontsize";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import LinearGradient from "react-native-linear-gradient";
import { UserContext } from "../../utils/userContext";
import { callValidateWorkoutPlan } from "../../services/workoutApi";

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

const ManualWorkout = () => {
  const navigation = useNavigation();
  const { userData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Workout Plan Structure
  const [workoutPlan, setWorkoutPlan] = useState({
    // Basic Info
    goal: userData?.goal || "Build Muscle",
    weeklyWorkoutDays: 3,
    
    // Weekly Split
    weekly_split: ["Day 1: Upper Body", "Day 2: Lower Body", "Day 3: Full Body"],
    
    // Daily Workouts
    daily_workouts: {
      "Day 1": [],
      "Day 2": [],
      "Day 3": [],
      "Day 4": [],
      "Day 5": [],
      "Day 6": [],
      "Day 7": [],
    },
    
    // Workout Guidelines
    workout_guidelines: {
      focus: "Muscle Growth",
      intensity: "Leave 2-3 reps in reserve",
      rest_between_sets: "60 seconds",
      rest_between_exercises: "60-90 seconds",
      progression: "Increase weight by 2.5-5% when you can complete all reps",
      form: "Quality over quantity - maintain strict form",
      frequency: "3 days per week",
      warmup: "Always warm up for 5-10 minutes",
      cooldown: "Stretch for 5 minutes post-workout",
    },
    
    // Warmup
    warmup: [
      { name: "Jumping Jacks", duration: "2 min", type: "cardio" },
      { name: "Arm Circles", duration: "1 min", type: "mobility" },
      { name: "Bodyweight Squats", duration: "1 min", type: "activation" },
    ],
    
    // Cooldown
    cooldown: [
      { name: "Full Body Stretch", duration: "5 min", type: "stretching" },
      { name: "Deep Breathing", duration: "2 min", type: "recovery" },
    ],
    
    // Nutrition
    nutrition: {
      daily_calories: 2200,
      protein_g: 150,
      carbs_g: 250,
      fat_g: 70,
      meal_timing: "3 main meals + 2 snacks",
      hydration: "2L water daily",
      focus: "Calorie surplus for muscle growth",
    },
    
    // Recovery
    recovery: {
      sleep: {
        target_hours: 7,
        tips: ["Consistent sleep schedule", "Avoid screens 1 hour before bed"],
      },
      hydration: {
        target_liters: 2,
        tips: ["Drink 500ml upon waking", "Sip water throughout workouts"],
      },
      active_recovery: ["20min walk", "Light yoga", "Foam rolling"],
      rest_days: "Essential for muscle repair and growth",
    },
    
    // User Profile
    userProfile: {
      name: userData?.fullName || "User",
      age: userData?.age || 25,
      gender: userData?.gender || "Not specified",
      height: userData?.height || "175 cm",
      weight: userData?.weight || "70 kg",
      goal: userData?.goal || "Build Muscle",
      experience: userData?.gymExperience || "Beginner",
      equipment: userData?.availableEquipment || "Full Gym",
      weekly_workouts: userData?.weeklyWorkoutCommitment || "3",
    },
  });

  const [activeDay, setActiveDay] = useState("Day 1");
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: "",
    equipment: "body weight",
    bodyPart: "chest",
    target: "pectorals",
    sets: "3",
    reps: "8-12",
    restSeconds: "60",
    notes: "",
  });

  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Available options for dropdowns
  const bodyParts = [
    "chest", "back", "shoulders", "upper arms", "lower arms", 
    "upper legs", "lower legs", "waist", "cardio", "neck"
  ];

  const equipmentOptions = [
    "body weight", "dumbbell", "barbell", "cable", "machine", 
    "kettlebell", "band", "medicine ball", "stability ball", "smith machine"
  ];

  const goalOptions = [
    "Build Muscle", "Lose Weight", "Strength", "Endurance", "Toning", "Maintain"
  ];

  const workoutDaysOptions = [1, 2, 3, 4, 5, 6, 7];

  const workoutDayLabels = [
    "Day 1: Upper Body",
    "Day 2: Lower Body", 
    "Day 3: Full Body",
    "Day 4: Upper Body",
    "Day 5: Lower Body",
    "Day 6: Full Body",
    "Day 7: Rest"
  ];

  useEffect(() => {
    // Initialize with user's preferences
    if (userData) {
      setWorkoutPlan(prev => ({
        ...prev,
        goal: userData.goal || "Build Muscle",
        weeklyWorkoutDays: parseInt(userData.weeklyWorkoutCommitment) || 3,
        weekly_split: generateWeeklySplit(parseInt(userData.weeklyWorkoutCommitment) || 3),
        userProfile: {
          ...prev.userProfile,
          name: userData.fullName || "User",
          age: userData.age || 25,
          gender: userData.gender || "Not specified",
          height: userData.height || "175 cm",
          weight: userData.weight || "70 kg",
          goal: userData.goal || "Build Muscle",
          experience: userData.gymExperience || "Beginner",
          equipment: userData.availableEquipment || "Full Gym",
          weekly_workouts: userData.weeklyWorkoutCommitment || "3",
        },
      }));
    }
  }, [userData]);

  const generateWeeklySplit = (days) => {
    const splits = {
      1: ["Day 1: Full Body"],
      2: ["Day 1: Upper Body", "Day 2: Lower Body"],
      3: ["Day 1: Push", "Day 2: Pull", "Day 3: Legs"],
      4: ["Day 1: Push", "Day 2: Pull", "Day 3: Legs", "Day 4: Full Body"],
      5: ["Day 1: Chest & Triceps", "Day 2: Back & Biceps", "Day 3: Legs", "Day 4: Shoulders", "Day 5: Full Body"],
      6: ["Day 1: Push", "Day 2: Pull", "Day 3: Legs", "Day 4: Push", "Day 5: Pull", "Day 6: Legs"],
      7: ["Day 1: Chest", "Day 2: Back", "Day 3: Legs", "Day 4: Shoulders", "Day 5: Arms", "Day 6: Cardio", "Day 7: Rest"],
    };
    return splits[days] || splits[3];
  };

  const handleAddExercise = () => {
    if (!validExerciseDetails(newExercise)) { Toast.show({type:'error',text1:'Check sets, reps and rest time',text2:'Use positive sets/reps and a rest time between 0 and 3600 seconds.'}); return; }
    if (!newExercise.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Info",
        text2: "Please enter exercise name",
      });
      return;
    }

    const exercise = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newExercise.name,
      equipment: newExercise.equipment,
      bodyPart: newExercise.bodyPart,
      target: newExercise.target,
      workoutDetails: {
        sets: parseInt(newExercise.sets) || 3,
        reps: newExercise.reps || "8-12",
        restSeconds: parseInt(newExercise.restSeconds) || 60,
        notes: newExercise.notes,
      },
      instructions: ["Perform with proper form and control"],
      secondaryMuscles: [],
    };

    setWorkoutPlan(prev => ({
      ...prev,
      daily_workouts: {
        ...prev.daily_workouts,
        [activeDay]: [...prev.daily_workouts[activeDay], exercise],
      },
    }));

    setNewExercise({
      name: "",
      equipment: "body weight",
      bodyPart: "chest",
      target: "pectorals",
      sets: "3",
      reps: "8-12",
      restSeconds: "60",
      notes: "",
    });

    setShowAddExerciseModal(false);
    
    Toast.show({
      type: "success",
      text1: "Exercise Added",
      text2: `${newExercise.name} added to ${activeDay}`,
    });
  };

  const handleRemoveExercise = (day, index) => {
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setWorkoutPlan(prev => ({
              ...prev,
              daily_workouts: {
                ...prev.daily_workouts,
                [day]: prev.daily_workouts[day].filter((_, i) => i !== index),
              },
            }));
            
            Toast.show({
              type: "success",
              text1: "Exercise Removed",
              text2: "Exercise removed from workout",
            });
          },
        },
      ]
    );
  };

  const handleUpdateWeeklyDays = (days) => {
    setWorkoutPlan(prev => ({
      ...prev,
      weeklyWorkoutDays: days,
      weekly_split: generateWeeklySplit(days),
      workout_guidelines: {
        ...prev.workout_guidelines,
        frequency: `${days} days per week`,
      },
    }));
  };

  const handleSaveWorkout = async () => {
    if (saving) return;
    // Validation
    const totalExercises = workoutPlan.weekly_split.flatMap(label => workoutPlan.daily_workouts[label.split(":")[0].trim()] || [])
      .length;
    
    if (totalExercises === 0) {
      Toast.show({
        type: "error",
        text1: "No Exercises",
        text2: "Please add at least one exercise to your workout",
      });
      return;
    }

    setSaving(true);
    // Safety check (Step 4): manually-typed exercises never went through the
    // generated-plan engine's equipment/injury filtering, so before saving
    // we ask the backend to check any exercise that matches a known catalog
    // entry by name against the user's saved equipment and reported
    // limitations in the dedicated workout server.
    // This is fail-open by design: if the check itself can't be reached
    // (offline, etc.) we warn but still allow the save, since this is an
    // additive safety layer on top of existing behavior, not a hard
    // dependency the manual-workout flow didn't previously have.
    try {
      const validation = await callValidateWorkoutPlan(workoutPlan.daily_workouts);
      const { valid, errors } = validation || {};
      if (valid === false && Array.isArray(errors) && errors.length > 0) {
        setSaving(false);
        Toast.show({
          type: "error",
          text1: "Please review this workout",
          text2:
            errors.length === 1
              ? errors[0]
              : `${errors[0]} (+${errors.length - 1} more)`,
        });
        return;
      }
    } catch (validationError) {
      console.warn("Manual workout safety check failed, allowing save:", validationError);
    }

    try {
      setSaving(true);

      const uid = auth().currentUser.uid;
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);

      // Create final plan structure
      const finalPlan = {
        ...workoutPlan,
        goal: workoutPlan.goal,
        generatedAt: new Date().toISOString(),
        source: "Manual Creation",
        planId: `manual-${Date.now()}`,
        weekNumber: 1,
        daily_workouts: Object.fromEntries(workoutPlan.weekly_split.map(label => { const key=label.split(":")[0].trim(); return [key,workoutPlan.daily_workouts[key] || []]; })),
      };

      // Remove weeklyWorkoutDays from final plan
      delete finalPlan.weeklyWorkoutDays;

      await firestore()
        .collection("workouts")
        .doc(uid)
        .set({
          weekStart: firestore.Timestamp.fromDate(weekStart),
          nextPlanDue: null,
          plan: finalPlan,
          createdAt: firestore.FieldValue.serverTimestamp(),
          source: "Manual",
        });

      Toast.show({
        type: "success",
        text1: "Workout Plan Saved!",
        text2: "Your manual workout plan is ready",
      });

      // Navigate to main app
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" }],
        });
      }, 1500);

    } catch (error) {
      console.error("Error saving workout:", error);
      Toast.show({
        type: "error",
        text1: "Save Failed",
        text2: error.message || "Failed to save workout plan",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderDayCard = (day, index) => {
    const dayNumber = index + 1;
    const isActive = activeDay === `Day ${dayNumber}`;
    const exercisesCount = workoutPlan.daily_workouts[`Day ${dayNumber}`]?.length || 0;
    const isRestDay = workoutPlan.weekly_split[index]?.includes("Rest") || false;
    const isIncluded = dayNumber <= workoutPlan.weeklyWorkoutDays;

    if (!isIncluded) return null;

    return (
      <TouchableOpacity
        key={day}
        style={[styles.dayCard, isActive && styles.activeDayCard]}
        onPress={() => setActiveDay(`Day ${dayNumber}`)}
      >
        <LinearGradient
          colors={
            isActive
              ? [darkColors.primary, darkColors.primaryLight]
              : ["#1C1C1E", "#2C2C2E"]
          }
          style={styles.dayGradient}
        >
          <Text style={[styles.dayName, isActive && styles.activeDayText]}>
            Day {dayNumber}
          </Text>
          {isRestDay ? (
            <Ionicons
              name="bed"
              size={20}
              color={isActive ? "#fff" : darkColors.textSecondary}
            />
          ) : (
            <MaterialCommunityIcons
              name="dumbbell"
              size={18}
              color={isActive ? "#fff" : darkColors.textSecondary}
            />
          )}
          <Text style={[styles.dayExercises, isActive && styles.activeDayText]}>
            {isRestDay ? "Rest" : `${exercisesCount} ex`}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderExerciseItem = (exercise, index, day) => (
    <LinearGradient
      key={`${exercise.id}-${index}`}
      colors={["#1C1C1E", "#2C2C2E"]}
      style={styles.exerciseItem}
    >
      <View style={styles.exerciseInfo}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <TouchableOpacity
            onPress={() => handleRemoveExercise(day, index)}
            style={styles.removeButton}
          >
            <AntDesign name="delete" size={16} color={darkColors.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.exerciseDetails}>
          <View style={styles.detailBadge}>
            <MaterialCommunityIcons
              name={getEquipmentIcon(exercise.equipment)}
              size={12}
              color={darkColors.textSecondary}
            />
            <Text style={styles.detailText}>{exercise.equipment}</Text>
          </View>
          
          <View style={styles.detailBadge}>
            <Ionicons name="body" size={12} color={darkColors.textSecondary} />
            <Text style={styles.detailText}>{exercise.target}</Text>
          </View>
          
          <View style={styles.detailBadge}>
            <MaterialCommunityIcons
              name="repeat"
              size={12}
              color={darkColors.textSecondary}
            />
            <Text style={styles.detailText}>
              {exercise.workoutDetails?.sets || 3}×{exercise.workoutDetails?.reps || "8-12"}
            </Text>
          </View>
        </View>
        
        {exercise.workoutDetails?.notes && (
          <Text style={styles.exerciseNotes}>
            💡 {exercise.workoutDetails.notes}
          </Text>
        )}
      </View>
    </LinearGradient>
  );

  const getEquipmentIcon = (equipment) => {
    const eq = equipment.toLowerCase();
    if (eq.includes("barbell")) return "dumbbell";
    if (eq.includes("dumbbell")) return "dumbbell";
    if (eq.includes("machine") || eq.includes("leverage")) return "cog";
    if (eq.includes("cable")) return "link";
    if (eq.includes("body weight") || eq.includes("bodyweight")) return "user";
    if (eq.includes("smith")) return "weight-hanging";
    if (eq.includes("kettlebell")) return "weight";
    if (eq.includes("band") || eq.includes("resistance")) return "resistor";
    if (eq.includes("ball")) return "soccer";
    return "dumbbell";
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" color="#fff" size={RFPercentage(3)} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Create Manual Workout</Text>
            <Text style={styles.headerSubtitle}>
              Build your personalized workout plan
            </Text>
          </View>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={22} color={darkColors.primary} />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.infoCard}
          >
            {/* Goal */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Goal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {goalOptions.map((goal) => (
                    <TouchableOpacity
                      key={goal}
                      style={[
                        styles.chip,
                        workoutPlan.goal === goal && styles.chipActive,
                      ]}
                      onPress={() => setWorkoutPlan(prev => ({ ...prev, goal }))}
                    >
                      <Text style={[
                        styles.chipText,
                        workoutPlan.goal === goal && styles.chipTextActive,
                      ]}>
                        {goal}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Workout Days */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Workout Days Per Week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {workoutDaysOptions.map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.chip,
                        workoutPlan.weeklyWorkoutDays === days && styles.chipActive,
                      ]}
                      onPress={() => handleUpdateWeeklyDays(days)}
                    >
                      <Text style={[
                        styles.chipText,
                        workoutPlan.weeklyWorkoutDays === days && styles.chipTextActive,
                      ]}>
                        {days} {days === 1 ? 'day' : 'days'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Weekly Split Preview */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Weekly Split</Text>
              <View style={styles.splitPreview}>
                {workoutPlan.weekly_split.map((day, index) => (
                  <Text key={index} style={styles.splitDay}>
                    • {day}
                  </Text>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Workout Days Navigation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar" size={22} color={darkColors.primary} />
            <Text style={styles.sectionTitle}>Workout Days</Text>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.daysScroll}
            contentContainerStyle={styles.daysContainer}
          >
            {Array.from({ length: 7 }, (_, i) => renderDayCard(`Day ${i + 1}`, i))}
          </ScrollView>
        </View>

        {/* Active Day Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="dumbbell" size={22} color={darkColors.primary} />
            <Text style={styles.sectionTitle}>{activeDay} Exercises</Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowAddExerciseModal(true)}
            >
              <AntDesign name="plus" size={16} color="#fff" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
          
          {workoutPlan.daily_workouts[activeDay]?.length > 0 ? (
            <View style={styles.exercisesList}>
              {workoutPlan.daily_workouts[activeDay].map((exercise, index) =>
                renderExerciseItem(exercise, index, activeDay)
              )}
            </View>
          ) : (
            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.emptyExercisesCard}
            >
              <MaterialCommunityIcons
                name="dumbbell"
                size={40}
                color={darkColors.textSecondary}
              />
              <Text style={styles.emptyExercisesText}>
                No exercises added yet
              </Text>
              <Text style={styles.emptyExercisesSubtext}>
                Tap "Add Exercise" to start building your workout
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Workout Guidelines */}
        <TouchableOpacity
          style={styles.section}
          onPress={() => setShowGuidelinesModal(true)}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={22} color={darkColors.primary} />
            <Text style={styles.sectionTitle}>Workout Guidelines</Text>
            <AntDesign name="right" size={16} color={darkColors.textSecondary} />
          </View>
          
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.guidelinesCard}
          >
            <Text style={styles.guidelineItem}>
              • Focus: {workoutPlan.workout_guidelines.focus}
            </Text>
            <Text style={styles.guidelineItem}>
              • Rest: {workoutPlan.workout_guidelines.rest_between_sets}
            </Text>
            <Text style={styles.guidelineItem}>
              • Frequency: {workoutPlan.workout_guidelines.frequency}
            </Text>
            <Text style={styles.editHint}>Tap to edit guidelines →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Nutrition */}
        <TouchableOpacity
          style={styles.section}
          onPress={() => setShowNutritionModal(true)}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant" size={22} color={darkColors.primary} />
            <Text style={styles.sectionTitle}>Nutrition</Text>
            <AntDesign name="right" size={16} color={darkColors.textSecondary} />
          </View>
          
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.nutritionCard}
          >
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionCalories}>
                {workoutPlan.nutrition.daily_calories} kcal
              </Text>
              <Text style={styles.nutritionFocus}>
                {workoutPlan.nutrition.focus}
              </Text>
            </View>
            
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{workoutPlan.nutrition.protein_g}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{workoutPlan.nutrition.carbs_g}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{workoutPlan.nutrition.fat_g}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            <Text style={styles.editHint}>Tap to edit nutrition →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recovery */}
        <TouchableOpacity
          style={styles.section}
          onPress={() => setShowRecoveryModal(true)}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="bed" size={22} color={darkColors.primary} />
            <Text style={styles.sectionTitle}>Recovery</Text>
            <AntDesign name="right" size={16} color={darkColors.textSecondary} />
          </View>
          
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.recoveryCard}
          >
            <Text style={styles.recoveryItem}>
              💤 Sleep: {workoutPlan.recovery.sleep.target_hours} hours
            </Text>
            <Text style={styles.recoveryItem}>
              💧 Hydration: {workoutPlan.recovery.hydration.target_liters}L daily
            </Text>
            <Text style={styles.recoveryItem}>
              🚶‍♂️ Active Recovery: {workoutPlan.recovery.active_recovery.join(", ")}
            </Text>
            <Text style={styles.editHint}>Tap to edit recovery →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveWorkout}
          disabled={saving}
        >
          <LinearGradient
            colors={[darkColors.primary, darkColors.primaryLight]}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Workout Plan</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddExerciseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise to {activeDay}</Text>
              <TouchableOpacity
                onPress={() => setShowAddExerciseModal(false)}
                style={styles.modalCloseButton}
              >
                <AntDesign name="close" size={20} color={darkColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Exercise Name */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Exercise Name*</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newExercise.name}
                  onChangeText={(text) => setNewExercise(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Bench Press, Squats..."
                  placeholderTextColor={darkColors.textMuted}
                />
              </View>

              {/* Body Part */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Body Part</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.modalChipContainer}>
                    {bodyParts.map((part) => (
                      <TouchableOpacity
                        key={part}
                        style={[
                          styles.modalChip,
                          newExercise.bodyPart === part && styles.modalChipActive,
                        ]}
                        onPress={() => setNewExercise(prev => ({ ...prev, bodyPart: part }))}
                      >
                        <Text style={[
                          styles.modalChipText,
                          newExercise.bodyPart === part && styles.modalChipTextActive,
                        ]}>
                          {part}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Equipment */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Equipment</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.modalChipContainer}>
                    {equipmentOptions.map((equip) => (
                      <TouchableOpacity
                        key={equip}
                        style={[
                          styles.modalChip,
                          newExercise.equipment === equip && styles.modalChipActive,
                        ]}
                        onPress={() => setNewExercise(prev => ({ ...prev, equipment: equip }))}
                      >
                        <Text style={[
                          styles.modalChipText,
                          newExercise.equipment === equip && styles.modalChipTextActive,
                        ]}>
                          {equip}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Target Muscle */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Target Muscle</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newExercise.target}
                  onChangeText={(text) => setNewExercise(prev => ({ ...prev, target: text }))}
                  placeholder="e.g., Pectorals, Quads..."
                  placeholderTextColor={darkColors.textMuted}
                />
              </View>

              {/* Sets, Reps, Rest */}
              <View style={styles.rowInputs}>
                <View style={styles.rowInput}>
                  <Text style={styles.modalInputLabel}>Sets</Text>
                  <TextInput
                    style={styles.rowModalInput}
                    value={newExercise.sets}
                    onChangeText={(text) => setNewExercise(prev => ({ ...prev, sets: text }))}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>

                <View style={styles.rowInput}>
                  <Text style={styles.modalInputLabel}>Reps</Text>
                  <TextInput
                    style={styles.rowModalInput}
                    value={newExercise.reps}
                    onChangeText={(text) => setNewExercise(prev => ({ ...prev, reps: text }))}
                    placeholder="8-12"
                  />
                </View>

                <View style={styles.rowInput}>
                  <Text style={styles.modalInputLabel}>Rest (s)</Text>
                  <TextInput
                    style={styles.rowModalInput}
                    value={newExercise.restSeconds}
                    onChangeText={(text) => setNewExercise(prev => ({ ...prev, restSeconds: text }))}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Notes */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80 }]}
                  value={newExercise.notes}
                  onChangeText={(text) => setNewExercise(prev => ({ ...prev, notes: text }))}
                  placeholder="e.g., Focus on form, go heavy..."
                  placeholderTextColor={darkColors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={handleAddExercise}
              disabled={!newExercise.name.trim()}
            >
              <LinearGradient
                colors={[darkColors.primary, darkColors.primaryLight]}
                style={styles.modalAddButtonGradient}
              >
                <AntDesign name="plus" size={16} color="#fff" />
                <Text style={styles.modalAddButtonText}>Add to {activeDay}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* Guidelines Modal */}
      <Modal
        visible={showGuidelinesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGuidelinesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workout Guidelines</Text>
              <TouchableOpacity
                onPress={() => setShowGuidelinesModal(false)}
                style={styles.modalCloseButton}
              >
                <AntDesign name="close" size={20} color={darkColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(workoutPlan.workout_guidelines).map(([key, value]) => (
                <View key={key} style={styles.guidelineInputContainer}>
                  <Text style={styles.guidelineInputLabel}>
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60 }]}
                    value={value}
                    onChangeText={(text) => setWorkoutPlan(prev => ({
                      ...prev,
                      workout_guidelines: { ...prev.workout_guidelines, [key]: text }
                    }))}
                    placeholderTextColor={darkColors.textMuted}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowGuidelinesModal(false)}
            >
              <LinearGradient
                colors={[darkColors.primary, darkColors.primaryLight]}
                style={styles.modalSaveButtonGradient}
              >
                <Text style={styles.modalSaveButtonText}>Save Guidelines</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* Nutrition Modal */}
      <Modal
        visible={showNutritionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNutritionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nutrition Settings</Text>
              <TouchableOpacity
                onPress={() => setShowNutritionModal(false)}
                style={styles.modalCloseButton}
              >
                <AntDesign name="close" size={20} color={darkColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Daily Calories (kcal)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.nutrition.daily_calories.toString()}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    nutrition: { ...prev.nutrition, daily_calories: parseInt(text) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.rowInput}>
                  <Text style={styles.modalInputLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.rowModalInput}
                    value={workoutPlan.nutrition.protein_g.toString()}
                    onChangeText={(text) => setWorkoutPlan(prev => ({
                      ...prev,
                      nutrition: { ...prev.nutrition, protein_g: parseInt(text) || 0 }
                    }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.rowInput}>
                  <Text style={styles.modalInputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.rowModalInput}
                    value={workoutPlan.nutrition.carbs_g.toString()}
                    onChangeText={(text) => setWorkoutPlan(prev => ({
                      ...prev,
                      nutrition: { ...prev.nutrition, carbs_g: parseInt(text) || 0 }
                    }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.rowInput}>
                  <Text style={styles.modalInputLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.rowModalInput}
                    value={workoutPlan.nutrition.fat_g.toString()}
                    onChangeText={(text) => setWorkoutPlan(prev => ({
                      ...prev,
                      nutrition: { ...prev.nutrition, fat_g: parseInt(text) || 0 }
                    }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Meal Timing</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.nutrition.meal_timing}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    nutrition: { ...prev.nutrition, meal_timing: text }
                  }))}
                  placeholder="e.g., 3 main meals + 2 snacks"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Hydration</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.nutrition.hydration}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    nutrition: { ...prev.nutrition, hydration: text }
                  }))}
                  placeholder="e.g., 2L water daily"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Focus</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.nutrition.focus}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    nutrition: { ...prev.nutrition, focus: text }
                  }))}
                  placeholder="e.g., Calorie surplus for muscle growth"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowNutritionModal(false)}
            >
              <LinearGradient
                colors={[darkColors.primary, darkColors.primaryLight]}
                style={styles.modalSaveButtonGradient}
              >
                <Text style={styles.modalSaveButtonText}>Save Nutrition</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* Recovery Modal */}
      <Modal
        visible={showRecoveryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRecoveryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recovery Settings</Text>
              <TouchableOpacity
                onPress={() => setShowRecoveryModal(false)}
                style={styles.modalCloseButton}
              >
                <AntDesign name="close" size={20} color={darkColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Sleep Target (hours)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.recovery.sleep.target_hours.toString()}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    recovery: {
                      ...prev.recovery,
                      sleep: { ...prev.recovery.sleep, target_hours: parseInt(text) || 7 }
                    }
                  }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Sleep Tips (comma separated)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.recovery.sleep.tips.join(', ')}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    recovery: {
                      ...prev.recovery,
                      sleep: { ...prev.recovery.sleep, tips: text.split(', ') }
                    }
                  }))}
                  placeholder="Consistent sleep schedule, Avoid screens..."
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Hydration Target (liters)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.recovery.hydration.target_liters.toString()}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    recovery: {
                      ...prev.recovery,
                      hydration: { ...prev.recovery.hydration, target_liters: parseInt(text) || 2 }
                    }
                  }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Hydration Tips (comma separated)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.recovery.hydration.tips.join(', ')}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    recovery: {
                      ...prev.recovery,
                      hydration: { ...prev.recovery.hydration, tips: text.split(', ') }
                    }
                  }))}
                  placeholder="Drink 500ml upon waking, Sip water..."
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Active Recovery (comma separated)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={workoutPlan.recovery.active_recovery.join(', ')}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    recovery: { ...prev.recovery, active_recovery: text.split(', ') }
                  }))}
                  placeholder="20min walk, Light yoga, Foam rolling"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Rest Days Message</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  value={workoutPlan.recovery.rest_days}
                  onChangeText={(text) => setWorkoutPlan(prev => ({
                    ...prev,
                    recovery: { ...prev.recovery, rest_days: text }
                  }))}
                  placeholder="Essential for muscle repair and growth"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowRecoveryModal(false)}
            >
              <LinearGradient
                colors={[darkColors.primary, darkColors.primaryLight]}
                style={styles.modalSaveButtonGradient}
              >
                <Text style={styles.modalSaveButtonText}>Save Recovery</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: RFPercentage(3),
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    marginLeft: 10,
    flex: 1,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: darkColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addExerciseText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    marginLeft: 6,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: darkColors.surfaceElevated,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  chipActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  chipText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  chipTextActive: {
    color: "#fff",
  },
  splitPreview: {
    marginTop: 8,
  },
  splitDay: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    marginBottom: 4,
  },
  daysScroll: {
    marginBottom: 20,
  },
  daysContainer: {
    paddingRight: 20,
  },
  dayCard: {
    width: 80,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  activeDayCard: {
    borderColor: darkColors.primary,
    shadowColor: darkColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  dayGradient: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  dayName: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
  },
  activeDayText: {
    color: "#fff",
  },
  dayExercises: {
    color: darkColors.textSecondary,
    fontSize: 11,
    fontFamily: "Montserrat-Medium",
    marginTop: 4,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  exerciseInfo: {
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
    fontFamily: "Montserrat-Bold",
    flex: 1,
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  exerciseDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  detailText: {
    color: darkColors.textSecondary,
    fontSize: 10,
    fontFamily: "Montserrat-Medium",
  },
  exerciseNotes: {
    color: darkColors.primary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    fontStyle: "italic",
    marginTop: 8,
  },
  emptyExercisesCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  emptyExercisesText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyExercisesSubtext: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
  },
  guidelinesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  guidelineItem: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    marginBottom: 6,
    lineHeight: 18,
  },
  nutritionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  nutritionRow: {
    marginBottom: 16,
  },
  nutritionCalories: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  nutritionFocus: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
  },
  macrosContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  macroLabel: {
    color: darkColors.textSecondary,
    fontSize: 11,
    fontFamily: "Montserrat-Medium",
  },
  macroDivider: {
    width: 1,
    backgroundColor: darkColors.border,
  },
  recoveryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  recoveryItem: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    marginBottom: 6,
    lineHeight: 18,
  },
  editHint: {
    color: darkColors.primary,
    fontSize: 11,
    fontFamily: "Montserrat-Medium",
    marginTop: 12,
    fontStyle: "italic",
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  bottomSpacer: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalInputLabel: {
    color: darkColors.textPrimary,
    fontSize: 12,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalInput: {
    backgroundColor: darkColors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
  },
  modalChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: darkColors.surfaceElevated,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  modalChipActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  modalChipText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  modalChipTextActive: {
    color: "#fff",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  rowInput: {
    flex: 1,
  },
  rowModalInput: {
    backgroundColor: darkColors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
  },
  modalAddButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalAddButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  modalAddButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  guidelineInputContainer: {
    marginBottom: 16,
  },
  guidelineInputLabel: {
    color: darkColors.textPrimary,
    fontSize: 11,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 8,
    opacity: 0.8,
  },
  modalSaveButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalSaveButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
});

export default ManualWorkout;