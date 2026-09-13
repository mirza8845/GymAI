import React from "react";
import { View, Text, TextInput, StyleSheet, Image } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Fonts } from "../constants/theme";
import { RFPercentage } from "react-native-responsive-fontsize";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

const CommonInput = ({ img, icon, placeholder, value, onChangeText, secureTextEntry = false, handleBlur, editable = true, keyboardType, ...inputProps }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.inputContainer}>
      {icon ? (
        <>
          <FontAwesome5 name={icon} size={20} color="#555555" />
        </>
      ) : (
        <>
          <Image source={img} resizeMode="contain" style={{ width: RFPercentage(2.5), height: RFPercentage(2.5) }} />
        </>
      )}
      <TextInput
        {...inputProps}
        keyboardType={keyboardType || (placeholder?.toLowerCase().includes("email") ? "email-address" : "default")}
        autoCapitalize={secureTextEntry || placeholder?.toLowerCase().includes("email") ? "none" : "sentences"}
        autoCorrect={!secureTextEntry && !placeholder?.toLowerCase().includes("email")}
        accessibilityLabel={placeholder}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#555555"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        onBlur={handleBlur}
        editable={editable}
      />
    </View>
  );
};

export default CommonInput;

const styles = StyleSheet.create({
  inputContainer: {
    marginTop: RFPercentage(1.8),
    borderRadius: RFPercentage(100),
    backgroundColor: "#080808",
    paddingHorizontal: RFPercentage(3),
    width: "100%",
    height: RFPercentage(6.8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    fontFamily: Fonts.Medium,
  },
  input: {
    color: "white",
    fontFamily: Fonts.Montserrat_Regular,
    fontSize: RFPercentage(1.8),
    width: "90%",
    height: RFPercentage(6.8),
    paddingLeft: RFPercentage(2),
  },
});
