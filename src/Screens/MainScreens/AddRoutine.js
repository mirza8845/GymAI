import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { Fonts } from "../../constants/theme";
import AntDesign from "react-native-vector-icons/AntDesign";
import { RFPercentage } from "react-native-responsive-fontsize";

const AddRoutineScreen = ({ navigation }) => {
  const [routineName, setRoutineName] = useState("");
  const [weeklySplit, setWeeklySplit] = useState(Array(7).fill(""));

  const handleDayChange = (index, value) => {
    const updatedSplit = [...weeklySplit];
    updatedSplit[index] = value;
    setWeeklySplit(updatedSplit);
  };

  const persistRoutine = async () => {
    const uid = auth().currentUser?.uid;

    if (!uid || !routineName.trim()) {
      Toast.show({ type: "error", text1: "Routine name is required." });
      return;
    }

    if (weeklySplit.some((day) => !day.trim())) {
      Toast.show({ type: "error", text1: "All 7 days must be filled in." });
      return;
    }

    try {
      const routineData = {
        name: routineName.trim(),
        weekly_split: weeklySplit.map((label,index) => `Day ${index+1}: ${label.trim()}`),
        planId: `manual-${Date.now()}`,
        weekNumber: 1,
        daily_workouts: Object.fromEntries(weeklySplit.map((_,index) => [`Day ${index+1}`,[]])),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      const weekStart = new Date(); weekStart.setHours(0,0,0,0);
      await firestore().collection("workouts").doc(uid).set({ plan: routineData, weekStart: firestore.Timestamp.fromDate(weekStart), nextPlanDue: null, source: "Manual", weekNumber: 1 });

      Toast.show({ type: "success", text1: "Routine created successfully!" });
      navigation.goBack();
    } catch (err) {
      console.error("Save Routine Error:", err);
      Toast.show({
        type: "error",
        text1: "Error saving routine",
        text2: err.message,
      });
    }
  };

  const handleSaveRoutine = () => Alert.alert('Replace current routine?', 'This will replace your current plan. Your completed workout history will be kept.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Create routine', onPress: persistRoutine },
  ]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: "absolute", left: 20, top: 20, zIndex: 999 }}>
          <AntDesign name="arrowleft" color={"white"} size={RFPercentage(4)} />
        </TouchableOpacity>
        <Text style={styles.header}>Create New Routine</Text>

        <TextInput style={styles.input} placeholder="Routine Name (e.g. Push Pull Legs)" placeholderTextColor="#aaa" value={routineName} onChangeText={setRoutineName} />

        {weeklySplit.map((day, index) => (
          <TextInput
            key={index}
            style={styles.input}
            placeholder={`Day ${index + 1} (e.g. Push / Rest)`}
            placeholderTextColor="#aaa"
            value={day}
            onChangeText={(value) => handleDayChange(index, value)}
          />
        ))}

        <TouchableOpacity onPress={handleSaveRoutine} style={styles.saveButton}>
          <Text style={styles.saveText}>Save Routine</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddRoutineScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    padding: 16,
    paddingBottom: 50,
  },
  header: {
    fontSize: 22,
    fontFamily: Fonts.Bold,
    color: "white",
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
  saveButton: {
    backgroundColor: "#DDFF94",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
  },
});
