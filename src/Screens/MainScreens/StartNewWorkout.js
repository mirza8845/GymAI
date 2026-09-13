import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { Fonts } from "../../constants/theme";
import AntDesign from "react-native-vector-icons/AntDesign";
import { RFPercentage } from "react-native-responsive-fontsize";

const StartWorkoutScreen = ({ navigation }) => {
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: "", reps: "", weight: "", notes: "" }]);

  const handleAddExercise = () => {
    setExercises([...exercises, { name: "", sets: "", reps: "", weight: "", notes: "" }]);
  };

  const handleRemoveExercise = (indexToRemove) => {
    if (exercises.length === 1) {
      Toast.show({ type: "error", text1: "You need at least one exercise" });
      return;
    }
    const updated = exercises.filter((_, idx) => idx !== indexToRemove);
    setExercises(updated);
  };

  const handleChange = (idx, field, value) => {
    const updated = [...exercises];
    updated[idx][field] = value;
    setExercises(updated);
  };

  const handleSaveWorkout = async () => {
    const uid = auth().currentUser?.uid;

    if (!uid || !workoutTitle.trim()) {
      Toast.show({ type: "error", text1: "Missing Title", text2: "Please enter workout title" });
      return;
    }

    if (exercises.length === 0 || exercises.some(ex => !ex.name.trim() || !/^\d+$/.test(ex.sets) || Number(ex.sets)<1 || !ex.reps.trim() || (ex.weight.trim() && (!Number.isFinite(Number(ex.weight)) || Number(ex.weight)<0)))) {
      Toast.show({ type: "error", text1: "Add workout", text2: "Enter an exercise name, positive sets, reps and a valid weight." });
      return;
    }

    try {
      await firestore().collection("custom_workouts").doc(uid).collection("sessions").add({
        title: workoutTitle.trim(),
        exercises,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Toast.show({ type: "success", text1: "Workout saved!" });
      navigation.goBack();
    } catch (err) {
      console.error("Save Error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to save workout",
        text2: err.message,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: "absolute", left: 20, top: 20, zIndex: 999 }}>
          <AntDesign name="arrowleft" color={"white"} size={RFPercentage(4)} />
        </TouchableOpacity>
        <Text style={styles.header}>Start New Workout</Text>

        <TextInput style={styles.input} placeholder="Workout Title (e.g. Leg Day)" placeholderTextColor="#aaa" value={workoutTitle} onChangeText={setWorkoutTitle} />

        {exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseHeaderRow}>
              <Text style={styles.exerciseHeader}>Exercise {index + 1}</Text>
              {exercises.length > 1 && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveExercise(index)}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput style={styles.input} placeholder="Exercise Name" placeholderTextColor="#aaa" value={exercise.name} onChangeText={(txt) => handleChange(index, "name", txt)} />
            <TextInput style={styles.input} placeholder="Sets" placeholderTextColor="#aaa" keyboardType="numeric" value={exercise.sets} onChangeText={(txt) => handleChange(index, "sets", txt)} />
            <TextInput style={styles.input} placeholder="Reps" placeholderTextColor="#aaa" value={exercise.reps} onChangeText={(txt) => handleChange(index, "reps", txt)} />
            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={exercise.weight}
              onChangeText={(txt) => handleChange(index, "weight", txt)}
            />
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Notes (optional)"
              placeholderTextColor="#aaa"
              multiline
              value={exercise.notes}
              onChangeText={(txt) => handleChange(index, "notes", txt)}
            />
          </View>
        ))}

        <TouchableOpacity onPress={handleAddExercise} style={styles.addExerciseBtn}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSaveWorkout} style={styles.saveButton}>
          <Text style={styles.saveText}>Save Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StartWorkoutScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  container: { padding: 16, paddingBottom: 50 },
  header: {
    color: "white",
    fontSize: 22,
    fontFamily: Fonts.Bold,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#222",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    fontFamily: Fonts.Medium,
    marginBottom: 10,
  },
  exerciseCard: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  exerciseHeader: {
    fontSize: 16,
    color: "#fff",
    fontFamily: Fonts.SemiBold,
  },
  removeBtn: {
    backgroundColor: "grey",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  removeBtnText: {
    color: "#fff",
    fontFamily: Fonts.Medium,
    fontSize: 12,
  },
  addExerciseBtn: {
    alignItems: "center",
    marginBottom: 20,
  },
  addExerciseText: {
    color: "#DDFF94",
    fontSize: 16,
    fontFamily: Fonts.Bold,
  },
  saveButton: {
    backgroundColor: "#DDFF94",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
  },
});
