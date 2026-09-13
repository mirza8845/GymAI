import { StyleSheet, Text, TouchableOpacity, View, KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar } from "react-native";
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

const Login = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const validationSchema = yup.object({
    email: yup.string().trim().email("Invalid email").required("Email is required"),
    password: yup.string().required("Password is required"),
  });

  const handleSignIn = async (values) => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(values.email.trim().toLowerCase(), values.password);
      await AsyncStorage.setItem("email", values.email.toLowerCase());
      await AsyncStorage.removeItem("password");
      Toast.show({
        type: "success",
        text1: "Sign In",
        text2: "Logged in successfully!",
      });
      navigation.reset({ index: 0, routes: [{ name: "Decider" }] });
    } catch (error) {
      console.log("Sign In Error:", error);
      Toast.show({
        type: "error",
        text1: "Sign In Failed",
        text2: error.code === "auth/network-request-failed" ? "Check your internet connection and try again." : error.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : "Email or password is incorrect.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#141516" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "#141516" }} keyboardShouldPersistTaps="handled">
        <StatusBar translucent={true} backgroundColor={"transparent"} barStyle={"light-content"} />
        <View style={[styles.container, { backgroundColor: "#141516" }]}>
          <Image
            source={require("../../assets/images/gym2.png")}
            resizeMode="contain"
            style={{ width: RFPercentage(10), height: RFPercentage(10), position: "absolute", left: RFPercentage(-2), top: RFPercentage(20) }}
          />
          <Image
            source={require("../../assets/images/gym1.png")}
            resizeMode="contain"
            style={{ width: RFPercentage(10), height: RFPercentage(10), position: "absolute", right: RFPercentage(-2), top: RFPercentage(32) }}
          />

          <View style={styles.innerContainer}>
            <Image source={require("../../assets/images/gymLogo.png")} resizeMode="contain" style={{ width: RFPercentage(14), height: RFPercentage(14) }} />
            <View style={{}}>
              <Text style={{ fontFamily: Fonts.Lora_Bold, color: "white", fontSize: 28, textAlign: "center" }}>
                Gym<Text style={{ color: "#F34E3A" }}>AI</Text>
              </Text>
              <Text style={{ color: "#656565", fontFamily: Fonts.Montserrat_Italic, fontSize: 16, textAlign: "center" }}>Be an Inspiration</Text>
            </View>

            <Formik initialValues={{ email: "", password: "" }} validationSchema={validationSchema} onSubmit={handleSignIn}>
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                  <View style={styles.inputView}>
                    <CommonInput img={require("../../assets/images/mail.png")} placeholder="Email" value={values.email} onChangeText={handleChange("email")} handleBlur={handleBlur("email")} />

                    {touched.email && errors.email && (
                      <View style={{ width: "90%" }}>
                        <Text style={styles.errorText}>{errors.email}</Text>
                      </View>
                    )}
                    <CommonInput
                      img={require("../../assets/images/lock.png")}
                      placeholder="Password"
                      secureTextEntry={true}
                      value={values.password}
                      onChangeText={handleChange("password")}
                      handleBlur={handleBlur("password")}
                    />
                    {touched.password && errors.password && (
                      <View style={{ width: "90%" }}>
                        <Text style={styles.errorText}>{errors.password}</Text>
                      </View>
                    )}
                    <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate("ForgetPassword")} style={styles.forgotWrapper}>
                      <Text style={[styles.forgotAndSignUpText]}>Forgot Password?</Text>
                    </TouchableOpacity>
                    <View style={{ marginTop: RFPercentage(10), width:"100%" }}>
                      <Button title="Log In" onPress={handleSubmit} loader={loading} disbaled={loading} />
                    </View>
                  </View>
                </>
              )}
            </Formik>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("signup")}>
            <Text style={[styles.signupBtn, { color: colors.text }]}>
              Don’t have an account?<Text style={{ color: Colors.primary, fontFamily: Fonts.Montserrat_SemiBold }}> Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: RFPercentage(12),
  },
  inputView: {
    width: "90%",
    marginTop: RFPercentage(7),
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 6,
    width: "90%",
  },
  forgotAndSignUpText: {
    fontSize: RFPercentage(1.7),
    fontFamily: Fonts.Montserrat_SemiBold,
    textAlign: "right",
    color: Colors.white,
  },

  signupBtn: {
    textAlign: "center",
    fontSize: RFPercentage(1.8),
    fontFamily: Fonts.Montserrat_Regular,
    marginTop: RFPercentage(2.5),
  },
  errorText: {
    fontSize: 13,
    top: 3,
    fontFamily: Fonts.Montserrat_Regular,
    color: Colors.primary,
    textAlign: "left",
  },
});
