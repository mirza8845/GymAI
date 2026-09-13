import { StyleSheet, Text, Image, View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import React, { useState } from "react";
import { useNavigation, useTheme } from "@react-navigation/native";
import Button from "../../CommonComponent/Button";
import Heading from "../../CommonComponent/Heading";
import CommonInput from "../../CommonComponent/CommonInput";
import auth from "@react-native-firebase/auth";
import { Colors, Fonts } from "../../constants/theme";
import { RFPercentage } from "react-native-responsive-fontsize";
import * as yup from "yup";
import { Formik } from "formik";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ForgetPassword = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const validationSchema = yup.object({
    email: yup.string().email("Invalid email").required("Email is required"),
  });

  const handleNext = async (values) => {
    if (values.email) {
      setLoading(true);
      try {
        await auth().sendPasswordResetEmail(values.email.trim().toLowerCase());
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Reset password link sent to your email.",
        });
        navigation.goBack();
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Error in sending link",
        });
      } finally {
        setLoading(false);
      }
    } else {
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 50}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
          <Image
            source={require("../../assets/images/gym2.png")}
            resizeMode="contain"
            style={{ width: RFPercentage(10), height: RFPercentage(10), position: "absolute", left: RFPercentage(-2), top: RFPercentage(20) }}
          />
          <Image
            source={require("../../assets/images/gym1.png")}
            resizeMode="contain"
            style={{ width: RFPercentage(10), height: RFPercentage(10), position: "absolute", right: RFPercentage(-2), top: RFPercentage(40) }}
          />
          <View style={styles.innerContainer}>
            <View style={{ marginTop: RFPercentage(13) }}>
              <Heading title="Reset Password" />
              <Text style={{ color: "white", fontFamily: Fonts.Montserrat_SemiBold, textAlign: "center", marginTop: 10 }}>Enter your email to receive a password reset link.</Text>
            </View>

            <Formik initialValues={{ email: "" }} validationSchema={validationSchema} onSubmit={handleNext}>
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                  <View style={styles.inputView}>
                    <CommonInput img={require("../../assets/images/mail.png")} placeholder="Enter email" value={values.email} onChangeText={handleChange("email")} handleBlur={handleBlur("email")} />
                    {touched.email && errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    <View style={{ marginTop: RFPercentage(7.5) }}>
                      <Button title="Send Link" onPress={handleSubmit} loader={loading} disbaled={loading} />
                    </View>
                  </View>
                </>
              )}
            </Formik>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgetPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "space-between",
  },
  innerContainer: {
    justifyContent: "center",
    alignItems: "center",
    width:'90%',
    alignSelf:'center'
  },
  inputView: {
    width: "100%",
    marginTop: RFPercentage(7.5),
    alignSelf: "center",
  },
  inputTitle: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
  },
  inputText: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "white",
    color: "black",
  },
  forgotWrapper: {
    alignItems: "flex-end",
    marginTop: 6,
    // marginBottom: 20,
  },
  forgotAndSignUpText: {
    fontSize: RFPercentage(1.7),
    fontFamily: Fonts.Medium,
  },
  loginBtn: {
    width: "60%",
    borderRadius: 20,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#383838",
    borderColor: "white",
    borderWidth: 1,
    alignSelf: "center",
    marginTop: RFPercentage(3),
  },
  loginText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.Medium,
  },
  signupBtn: {
    textAlign: "center",
    fontSize: RFPercentage(1.6),
    fontFamily: Fonts.Regular,
    marginTop: RFPercentage(2),
  },
  errorText: {
    fontSize: 13,
    top: 3,
    fontFamily: Fonts.Regular,
    color: "red",
  },
});
