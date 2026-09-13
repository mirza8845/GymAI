import { StyleSheet, Text, TouchableOpacity, View, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, Image } from "react-native";
import React, { useState } from "react";
import { useNavigation, useTheme } from "@react-navigation/native";
import Button from "../../CommonComponent/Button";
import Heading from "../../CommonComponent/Heading";
import CommonInput from "../../CommonComponent/CommonInput";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { Colors, Fonts } from "../../constants/theme";
import { RFPercentage } from "react-native-responsive-fontsize";
import * as yup from "yup";
import { Formik } from "formik";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";


const SignUp = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  let validationSchema = yup.object({
    name: yup.string().trim().required("Username is required"),
    email: yup.string().trim().email("Invalid email").required("Email is required"),
    password: yup.string().min(6, "Password must be at least 6 characters long").required("Password is required"),
  });

  const handleSignUp = async (values) => {
    if (values.name && values.email && values.password) {
      setLoading(true);
      try {
        const userCredential = await auth().createUserWithEmailAndPassword(values.email.trim().toLowerCase(), values.password);
        const user = userCredential.user;

        const userData = {
          name: values.name,
          email: values.email.trim().toLowerCase(),
          uid: user.uid,
          profile: null,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };

        await firestore().collection("Users").doc(user.uid).set(userData);
        await AsyncStorage.setItem("email", values.email);
        await AsyncStorage.removeItem("password");

        Toast.show({
          type: "success",
          text1: "Sign Up",
          text2: "User registered successfully",
        });
        navigation.reset({ index: 0, routes: [{ name: "Decider" }] });
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Sign Up Failed",
          text2: error.message || "Something went wrong",
        });
      } finally {
        setLoading(false);
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill all required fields",
      });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: Colors.background }]} keyboardShouldPersistTaps="handled">
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

            <Formik
              initialValues={{
                name: "",
                email: "",
                password: "",
              }}
              validationSchema={validationSchema}
              onSubmit={(values) => handleSignUp(values)}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                  <View style={styles.inputView}>
                    <CommonInput img={require("../../assets/images/user.png")} placeholder="Username" value={values.name} onChangeText={handleChange("name")} handleBlur={handleBlur("name")} />
                    {touched.name && errors.name && (
                      <View style={{ width: "90%" }}>
                        <Text style={{ color: Colors.primary, fontFamily: Fonts.Montserrat_Regular, fontSize: RFPercentage(1.6), top: 2 }}>{errors.name}</Text>
                      </View>
                    )}

                    <CommonInput img={require("../../assets/images/mail.png")} placeholder="Email" value={values.email} onChangeText={handleChange("email")} handleBlur={handleBlur("email")} />
                    {touched.email && errors.email && (
                      <View style={{ width: "90%" }}>
                        <Text style={{ color: Colors.primary, fontFamily: Fonts.Montserrat_Regular, fontSize: RFPercentage(1.6), top: 2 }}>{errors.email}</Text>
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
                        <Text style={{ color: Colors.primary, fontFamily: Fonts.Montserrat_Regular, fontSize: RFPercentage(1.6), top: 2 }}>{errors.password}</Text>
                      </View>
                    )}

                    <View style={{ marginTop: RFPercentage(8), width:"100%" }}>
                      <Button title="Sign Up" onPress={handleSubmit} loader={loading} disbaled={loading} />
                    </View>
                  </View>
                </>
              )}
            </Formik>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("login")}>
            <Text style={[styles.signupBtn, { color: colors.text }]}>
              Already have an account?<Text style={{ color: Colors.primary, fontFamily: Fonts.Montserrat_SemiBold }}> Log in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  innerContainer: {
    alignItems: "center",
    marginTop: RFPercentage(12),
    justifyContent: "center",
  },
  inputView: {
    width: "90%",
    marginTop: RFPercentage(7),
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  forgotWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: RFPercentage(4),
  },
  forgotAndSignUpText: {
    fontSize: RFPercentage(1.5),
    width: "70%",
    fontFamily: Fonts.Regular,
    textAlign: "center",
  },
  signupBtn: {
    textAlign: "center",
    fontSize: RFPercentage(1.8),
    fontFamily: Fonts.Montserrat_Regular,
    marginTop: RFPercentage(2.5),
  },
});
