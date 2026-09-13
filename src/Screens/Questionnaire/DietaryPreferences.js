import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import Heading from "../../CommonComponent/Heading";
import { useNavigation, useTheme } from "@react-navigation/native";
import Paragraph from "../../CommonComponent/Paragraph";
import DoubleButton from "../../CommonComponent/DoubleButton";
import Button from "../../CommonComponent/Button";
import { Colors, Fonts } from "../../constants/theme";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import Toast from "react-native-toast-message";
import { UserContext } from "../../utils/userContext";
import AntDesign from "react-native-vector-icons/AntDesign";
import { RFPercentage } from "react-native-responsive-fontsize";

const dietaryOptions = ["Vegetarian", "Vegan", "Gluten-Free", "Keto", "Paleo", "No preferences"];
const allergyOptions = ["Nuts", "Dairy", "Shellfish", "Eggs", "No allergies"];

const DietaryPreferences = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserContext);

  const [selectedDietary, setSelectedDietary] = useState([]);
  const [selectedAllergies, setSelectedAllergies] = useState([]);

  useEffect(() => {
    if (userData?.dietaryPreferences) setSelectedDietary(userData.dietaryPreferences);
    if (userData?.foodAllergies) setSelectedAllergies(userData.foodAllergies);
  }, [userData]);

  const toggleSelection = (item, selectedList, setSelectedList) => {
    const none = item === 'No preferences' || item === 'No allergies';
    if (selectedList.includes(item)) setSelectedList(selectedList.filter(value => value !== item));
    else setSelectedList(none ? [item] : [...selectedList.filter(value => !['No preferences','No allergies'].includes(value)), item]);
  };

  const handleContinue = async () => {
    if (!selectedDietary.length || !selectedAllergies.length) {
      Toast.show({
        type: "info",
        text1: "Please Select",
        text2: "Select your diet preferences.",
      });
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "User not authenticated.",
      });
      return;
    }

    try {
      await firestore().collection("Users").doc(currentUser.uid).update({
        dietaryPreferences: selectedDietary,
        foodAllergies: selectedAllergies,
      });

      setUserData((prev) => ({
        ...prev,
        dietaryPreferences: selectedDietary,
        foodAllergies: selectedAllergies,
      }));

      navigation.navigate("diets");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save dietary preferences.",
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.goBack()} style={{ position: "absolute", left: 0 }}>
          <AntDesign name="arrowleft" color={"white"} size={RFPercentage(3.1)} />
        </TouchableOpacity>
        <Heading title="Dietary Preferences" />
      </View>

      <View style={{ marginTop: 70, marginBottom: 60 }}>
        <Text style={[styles.paragraph, { color: colors.text }]}>What are your dietary preferences?</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            {dietaryOptions.slice(0, 3).map((item) => (
              <DoubleButton key={item} title={item} selected={selectedDietary.includes(item)} onPress={() => toggleSelection(item, selectedDietary, setSelectedDietary)} />
            ))}
          </View>
          <View>
            {dietaryOptions.slice(3).map((item) => (
              <DoubleButton key={item} title={item} selected={selectedDietary.includes(item)} onPress={() => toggleSelection(item, selectedDietary, setSelectedDietary)} />
            ))}
          </View>
        </View>
      </View>

      <View style={{}}>
        <Text style={{ fontSize: 20, marginBottom: 10, color: "white", fontFamily: Fonts.Montserrat_Bold }}>Allergies</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>Do you have any food allergies we should know about?</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 80 }}>
          <View>
            {allergyOptions.slice(0, 3).map((item) => (
              <DoubleButton key={item} title={item} selected={selectedAllergies.includes(item)} onPress={() => toggleSelection(item, selectedAllergies, setSelectedAllergies)} />
            ))}
          </View>
          <View>
            {allergyOptions.slice(3).map((item) => (
              <DoubleButton key={item} title={item} selected={selectedAllergies.includes(item)} onPress={() => toggleSelection(item, selectedAllergies, setSelectedAllergies)} />
            ))}
          </View>
        </View>
      </View>

      <Button title="Continue" onPress={handleContinue} />
    </View>
  );
};

export default DietaryPreferences;

const styles = StyleSheet.create({
  container: {
    paddingTop: RFPercentage(10),
    paddingHorizontal: RFPercentage(3),
    flex:1
  },
  paragraph: {
    fontSize: 16,
    fontFamily: Fonts.Montserrat_Regular,
    paddingVertical: 8,
  },
});
