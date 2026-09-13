import React, { useState } from "react";
import { exerciseDetails, validExerciseDetails } from "../../utils/workoutData";
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { RFPercentage } from "react-native-responsive-fontsize";
import AntDesign from "react-native-vector-icons/AntDesign";
import { Colors, Fonts } from "../../constants/theme";
import LinearGradient from "react-native-linear-gradient";
import { setWorkoutPlan } from "../../redux/Actions";
import { useDispatch, useSelector } from "react-redux";

const EditRoutineScreen = ({ route, navigation }) => {
  const { dayKey, dayLabel, exercises = [] } = route.params || {};
  const [editedExercises, setEditedExercises] = useState(() => exercises.map(ex => ({ ...ex, workoutDetails: { ...exerciseDetails(ex) } })));
  const [showAll, setShowAll] = useState(false); // Toggle for showing more
  const dispatch = useDispatch();
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);

  const updateExerciseField = (index, field, value) => {
    setEditedExercises(previous => previous.map((exercise, i) => i !== index ? exercise :
      ['sets','reps','restSeconds'].includes(field)
        ? { ...exercise, workoutDetails: { ...exercise.workoutDetails, [field]: value } }
        : { ...exercise, [field]: value }));
  };

  const handleSave = async () => {
    if (!dayKey || editedExercises.some(ex => !ex.name?.trim() || !validExerciseDetails(ex.workoutDetails))) {
      Toast.show({type:'error',text1:'Check each exercise',text2:'Enter a name, positive sets/reps and valid rest time.'}); return;
    }
    const savedExercises = editedExercises.map(ex => ({...ex,name:ex.name.trim(),workoutDetails:{...ex.workoutDetails,sets:Number(ex.workoutDetails.sets)}}));
    try {
      const uid = auth().currentUser.uid;

      await firestore()
        .collection("workouts")
        .doc(uid)
        .update({ [`plan.daily_workouts.${dayKey}`]: savedExercises });

      // Update local Redux state
      const updatedPlan = {
        ...workoutPlan,
        daily_workouts: {
          ...workoutPlan?.daily_workouts,
          [dayKey]: savedExercises,
        },
      };
      dispatch(setWorkoutPlan(updatedPlan));

      Toast.show({
        type: "success",
        text1: `${dayLabel} updated!`,
        text2: "Work routine successfully updated!",
      });

      navigation.goBack();
    } catch (err) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: "Error saving routine",
        text2: err.message,
      });
    }
  };

  
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: RFPercentage(6) }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <View style={{}}>
          <AntDesign name="arrowleft" color="white" size={RFPercentage(2.8)} />
        </View>
      </TouchableOpacity>

      <Text style={styles.header}>{dayLabel}</Text>

      {(showAll ? editedExercises : editedExercises.slice(0, 1)).map((exercise, index) => (
        <LinearGradient key={index} colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.02)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exerciseCard}>
          <Text style={styles.exerciseTitle}>{`Exercise ${index + 1}: ${exercise.name}`}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={exercise.name} onChangeText={(text) => updateExerciseField(index, "name", text)} placeholder="Exercise Name" placeholderTextColor="#888" />

          <Text style={styles.label}>Sets</Text>
          <TextInput
            style={styles.input}
            value={String(exercise.workoutDetails.sets)}
            onChangeText={(text) => updateExerciseField(index, "sets", text)}
            placeholder="Sets"
            placeholderTextColor="#888"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Reps</Text>
          <TextInput style={styles.input} value={String(exercise.workoutDetails.reps)} onChangeText={(text) => updateExerciseField(index, "reps", text)} placeholder="Reps" placeholderTextColor="#888" />

          <Text style={styles.label}>Equipment</Text>
          <TextInput style={styles.input} value={exercise.equipment} onChangeText={(text) => updateExerciseField(index, "equipment", text)} placeholder="Equipment" placeholderTextColor="#888" />
        </LinearGradient>
      ))}

      {/* +N more button */}
      {!showAll && editedExercises.length > 1 && (
        <TouchableOpacity onPress={() => setShowAll(true)} style={styles.showMoreBtn}>
          <Text style={styles.showMoreText}>+{editedExercises.length - 1} more</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
        <LinearGradient colors={[Colors.primary, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientButton}>
          <Text style={styles.saveText}>Save Routine</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditRoutineScreen;

const styles = StyleSheet.create({
  container: {
    padding: RFPercentage(2),
    backgroundColor: "#000",
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: 16,
    top: 50,
    zIndex: 10,
  },
  backButtonBg: {
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 50,
  },
  header: {
    color: "#fff",
    fontSize: RFPercentage(2.5),
    fontFamily: Fonts.Montserrat_Bold,
    marginTop: RFPercentage(6),
    marginBottom: RFPercentage(3),
    textAlign: "center",
  },
  exerciseCard: {
    borderRadius: 16,
    padding: RFPercentage(2),
    marginBottom: RFPercentage(3),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  exerciseTitle: {
    color: "#fff",
    fontSize: RFPercentage(2),
    marginBottom: RFPercentage(1.5),
    fontFamily: Fonts.Montserrat_SemiBold,
  },
  label: {
    color: "#aaa",
    fontSize: RFPercentage(1.8),
    marginBottom: 6,
    fontFamily: Fonts.Montserrat_Medium,
  },
  input: {
    backgroundColor: "#333",
    borderColor: "#444",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    color: "#fff",
    fontFamily: Fonts.Montserrat_Medium,
    marginBottom: 14,
  },
  showMoreBtn: {
    marginBottom: RFPercentage(2),
    width: 100,
    left: 10,
  },
  showMoreText: {
    color: Colors.primary,
    fontSize: RFPercentage(1.8),
    fontFamily: Fonts.Montserrat_Medium,
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: RFPercentage(1),
  },
  gradientButton: {
    paddingVertical: RFPercentage(1.6),
    paddingHorizontal: RFPercentage(4),
    alignItems: "center",
    borderRadius: 100,
  },
  saveText: {
    fontSize: RFPercentage(2),
    fontFamily: Fonts.Montserrat_SemiBold,
    color: "white", // darker text on light gradient
  },
});
