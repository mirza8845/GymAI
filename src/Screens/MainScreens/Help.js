import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { RFPercentage } from "react-native-responsive-fontsize";

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

const HelpScreen = () => {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  // Modal states
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Form states for feature suggestion
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [featureCategory, setFeatureCategory] = useState("");
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

  // Form states for feedback
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // States for message modal
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState("whatsapp"); // 'whatsapp' or 'sms'

  const helperPhoneNumber = "+923047428845";

  const faqs = [
    {
      id: 1,
      question: "How do I create a workout plan?",
      answer:
        "Navigate to the 'Generate Plan' section from the home screen. Answer the questionnaire about your fitness goals, experience level, available equipment, and schedule preferences. The app will generate a personalized workout plan based on your inputs.",
    },
    {
      id: 2,
      question: "Can I edit exercises in my workout plan?",
      answer:
        "Yes! Go to 'My Plan' and tap on any workout day. You can remove exercises, add new ones, or edit existing exercises by tapping the edit button next to each exercise.",
    },
    {
      id: 3,
      question: "How does the hydration tracker work?",
      answer:
        "The hydration tracker allows you to log your daily water intake. Simply tap the water buttons to add amounts, or use manual input. Set your daily target in settings, and track your progress throughout the day.",
    },
    {
      id: 4,
      question: "What should I do if I miss a workout day?",
      answer:
        "Don't worry! You can either skip the missed day and continue with the schedule, or you can adjust your weekly plan in the 'My Plan' section. The app is flexible to accommodate your schedule changes.",
    },
    {
      id: 5,
      question: "How do I track my workout progress?",
      answer:
        "After completing each workout, the app automatically logs your progress. You can view your workout history, statistics, and progress charts in the 'Progress' section of the app.",
    },
    {
      id: 6,
      question: "Can I change my fitness goals mid-plan?",
      answer:
        "Yes, you can regenerate your workout plan at any time by going to 'Generate Plan' again. Your new plan will be based on your updated goals and preferences.",
    },
  ];

  const contactMethods = [
    {
      title: "Email Support",
      description: "Get help via email",
      icon: <Ionicons name="mail" size={24} color="#3b82f6" />,
      action: () => Linking.openURL("mailto:jazzy.tech007@gmail.com").catch(() => Alert.alert("Email unavailable", "Set up an email app and try again.")),
      color: "#3b82f6",
    },
    {
      title: "Text Message",
      description: "Send SMS to our helper",
      icon: <Ionicons name="chatbox" size={24} color={darkColors.success} />,
      action: () => setShowMessageModal(true),
      color: darkColors.success,
    },
    {
      title: "WhatsApp",
      description: "Message on WhatsApp",
      icon: <Ionicons name="logo-whatsapp" size={24} color="#25D366" />,
      action: () => sendWhatsAppMessage(""),
      color: "#25D366",
    },
    {
      title: "Phone Support",
      description: "Call us for immediate help",
      icon: <Ionicons name="call" size={24} color={darkColors.primary} />,
      action: () => Linking.openURL("tel:" + helperPhoneNumber).catch(() => Alert.alert("Phone unavailable", "This device cannot start a phone call.")),
      color: darkColors.primary,
    },
  ];

  const sendWhatsAppMessage = (customMessage = "") => {
    const message = customMessage.trim() || "Hello, I need help with the GymAI app.";
    const url = `whatsapp://send?phone=${helperPhoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      // If WhatsApp is not installed, open web version
      const webUrl = `https://api.whatsapp.com/send?phone=${helperPhoneNumber}&text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl).catch((err) => {
        Alert.alert("Error", "Could not open WhatsApp. Please make sure WhatsApp is installed.");
        console.log("Error opening WhatsApp:", err);
      });
    });
  };

  const sendSMS = (customMessage = "") => {
    const message = customMessage.trim() || "Hello, I need help with the GymAI app.";
    const url = `sms:${helperPhoneNumber}?body=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch((err) => {
      Alert.alert("Error", "Could not open SMS app.");
      console.log("Error opening SMS:", err);
    });
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      Alert.alert("Empty Message", "Please enter your message before sending.");
      return;
    }

    setIsSendingMessage(true);

    if (selectedMessageType === "whatsapp") {
      sendWhatsAppMessage(messageText);
    } else {
      sendSMS(messageText);
    }

    // Simulate sending delay
    setTimeout(() => {
      setIsSendingMessage(false);
      setShowMessageModal(false);
      setMessageText("");
      Alert.alert(
        "Message draft opened",
        `Review and send your message in ${selectedMessageType.toUpperCase()}.`,
        [{ text: "OK" }]
      );
    }, 1000);
  };

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const renderFAQItem = (faq) => (
    <TouchableOpacity
      key={faq.id}
      style={styles.faqItem}
      onPress={() => toggleFAQ(faq.id)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{faq.question}</Text>
        <Ionicons
          name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"}
          size={20}
          color={darkColors.textSecondary}
        />
      </View>

      {expandedFAQ === faq.id && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const featureCategories = [
    "Workout Features",
    "Nutrition Tracking",
    "Social Features",
    "UI/UX Improvements",
    "Analytics & Reports",
    "Integration",
    "Other",
  ];

  const feedbackTypes = [
    { id: "bug", label: "Bug Report", icon: "bug" },
    { id: "suggestion", label: "Suggestion", icon: "bulb" },
    { id: "question", label: "Question", icon: "help-circle" },
    { id: "compliment", label: "Compliment", icon: "heart" },
  ];

  const sendFeatureSuggestion = async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in both title and description.",
      );
      return;
    }

    setIsSubmittingFeature(true);

    try {
      const subject = `[Feature Request] ${featureTitle}`;
      const body = `
Feature Category: ${featureCategory || "Not specified"}

Description:
${featureDescription}

Submitted from GymAI App
      `;

      const mailtoLink = `mailto:jazzy.tech007@gmail.com?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;

      await Linking.openURL(mailtoLink);

      // Clear form
      setFeatureTitle("");
      setFeatureDescription("");
      setFeatureCategory("");
      setShowFeatureModal(false);

      Alert.alert(
        "Success!",
        "Your email draft is ready. Review and send it in your email app.",
        [{ text: "OK" }],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to send feature suggestion. Please try again.",
      );
      console.error("Error sending feature suggestion:", error);
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      Alert.alert("Missing Information", "Please enter your feedback message.");
      return;
    }

    setIsSubmittingFeedback(true);

    try {
      const selectedType =
        feedbackTypes.find((type) => type.id === feedbackType)?.label ||
        feedbackType;
      const subject = `[App Feedback] ${selectedType} ${
        rating > 0 ? `(${rating}/5)` : ""
      }`;
      const body = `
Feedback Type: ${selectedType}
Rating: ${rating}/5 stars

Message:
${feedbackMessage}

Submitted from GymAI App
      `;

      const mailtoLink = `mailto:jazzy.tech007@gmail.com?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;

      await Linking.openURL(mailtoLink);

      // Clear form
      setFeedbackType("suggestion");
      setFeedbackMessage("");
      setRating(0);
      setShowFeedbackModal(false);

      Alert.alert(
        "Thank You!",
        "Your email draft is ready. Review and send it in your email app.",
        [{ text: "OK" }],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to send feedback. Please try again.");
      console.error("Error sending feedback:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={28}
              color={star <= rating ? "#FFD700" : darkColors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMessageModal = () => (
    <Modal
      visible={showMessageModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMessageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={["#1C1C1E", "#2C2C2E"]}
          style={styles.modalContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Message to Helper</Text>
            <TouchableOpacity
              onPress={() => setShowMessageModal(false)}
              disabled={isSendingMessage}
            >
              <Ionicons
                name="close"
                size={24}
                color={darkColors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalDescription}>
              Choose how you want to send your message to our helper:
            </Text>

            {/* Message Type Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message Type</Text>
              <View style={styles.messageTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.messageTypeButton,
                    selectedMessageType === "whatsapp" && styles.messageTypeButtonActive,
                  ]}
                  onPress={() => setSelectedMessageType("whatsapp")}
                  disabled={isSendingMessage}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={20}
                    color={selectedMessageType === "whatsapp" ? "#fff" : "#25D366"}
                  />
                  <Text
                    style={[
                      styles.messageTypeText,
                      selectedMessageType === "whatsapp" && styles.messageTypeTextActive,
                    ]}
                  >
                    WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.messageTypeButton,
                    selectedMessageType === "sms" && styles.messageTypeButtonActive,
                  ]}
                  onPress={() => setSelectedMessageType("sms")}
                  disabled={isSendingMessage}
                >
                  <Ionicons
                    name="chatbox"
                    size={20}
                    color={selectedMessageType === "sms" ? "#fff" : darkColors.success}
                  />
                  <Text
                    style={[
                      styles.messageTypeText,
                      selectedMessageType === "sms" && styles.messageTypeTextActive,
                    ]}
                  >
                    Text Message
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone Number Display */}
            <View style={styles.phoneNumberContainer}>
              <Text style={styles.phoneNumberLabel}>Helper's Number:</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL("tel:" + helperPhoneNumber)}
              >
                <Text style={styles.phoneNumber}>{helperPhoneNumber}</Text>
              </TouchableOpacity>
            </View>

            {/* Message Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Message*</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Type your message here..."
                placeholderTextColor={darkColors.textMuted}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
                editable={!isSendingMessage}
              />
              <Text style={styles.charCount}>
                {messageText.length}/1000
              </Text>
            </View>

            <View style={styles.messageTips}>
              <Text style={styles.messageTipsTitle}>Tips:</Text>
              <Text style={styles.messageTipsText}>
                • Be specific about your issue or question
              </Text>
              <Text style={styles.messageTipsText}>
                • Include relevant details like screen names or error messages
              </Text>
              <Text style={styles.messageTipsText}>
                • Our helper typically responds within 1-2 hours
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowMessageModal(false)}
              disabled={isSendingMessage}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                selectedMessageType === "whatsapp" ? styles.whatsappButton : styles.smsButton,
              ]}
              onPress={handleSendMessage}
              disabled={isSendingMessage || !messageText.trim()}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={selectedMessageType === "whatsapp" ? "logo-whatsapp" : "send"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.submitButtonText}>
                    Send 
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  const renderFeatureModal = () => (
    <Modal
      visible={showFeatureModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFeatureModal(false)}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={["#1C1C1E", "#2C2C2E"]}
          style={styles.modalContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Suggest a Feature</Text>
            <TouchableOpacity
              onPress={() => setShowFeatureModal(false)}
              disabled={isSubmittingFeature}
            >
              <Ionicons
                name="close"
                size={24}
                color={darkColors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalDescription}>
              Have an idea to make FitTrack Pro better? Share it with us!
            </Text>

            {/* Feature Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Feature Title*</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief title for your feature"
                placeholderTextColor={darkColors.textMuted}
                value={featureTitle}
                onChangeText={setFeatureTitle}
                maxLength={100}
                editable={!isSubmittingFeature}
              />
              <Text style={styles.charCount}>{featureTitle.length}/100</Text>
            </View>

            {/* Category Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {featureCategories.map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryChip,
                      featureCategory === category && styles.categoryChipActive,
                    ]}
                    onPress={() => setFeatureCategory(category)}
                    disabled={isSubmittingFeature}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        featureCategory === category &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Detailed Description*</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe your feature idea in detail..."
                placeholderTextColor={darkColors.textMuted}
                value={featureDescription}
                onChangeText={setFeatureDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
                editable={!isSubmittingFeature}
              />
              <Text style={styles.charCount}>
                {featureDescription.length}/500
              </Text>
            </View>

            <Text style={styles.modalNote}>
              * Your suggestion will be sent to our development team for review.
            </Text>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowFeatureModal(false)}
              disabled={isSubmittingFeature}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={sendFeatureSuggestion}
              disabled={isSubmittingFeature}
            >
              {isSubmittingFeature ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  const renderFeedbackModal = () => (
    <Modal
      visible={showFeedbackModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFeedbackModal(false)}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={["#1C1C1E", "#2C2C2E"]}
          style={styles.modalContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Feedback</Text>
            <TouchableOpacity
              onPress={() => setShowFeedbackModal(false)}
              disabled={isSubmittingFeedback}
            >
              <Ionicons
                name="close"
                size={24}
                color={darkColors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalDescription}>
              We value your feedback! Help us improve your experience.
            </Text>

            {/* Feedback Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type of Feedback</Text>
              <View style={styles.feedbackTypeGrid}>
                {feedbackTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.feedbackTypeButton,
                      feedbackType === type.id &&
                        styles.feedbackTypeButtonActive,
                    ]}
                    onPress={() => setFeedbackType(type.id)}
                    disabled={isSubmittingFeedback}
                  >
                    <Ionicons
                      name={type.icon}
                      size={20}
                      color={
                        feedbackType === type.id
                          ? "#fff"
                          : darkColors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.feedbackTypeText,
                        feedbackType === type.id &&
                          styles.feedbackTypeTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rating (Optional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Rating (Optional)</Text>
              {renderStarRating()}
              <Text style={styles.ratingText}>
                {rating === 0 ? "Tap to rate" : `${rating} out of 5 stars`}
              </Text>
            </View>

            {/* Message */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Message*</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Share your thoughts, suggestions, or issues..."
                placeholderTextColor={darkColors.textMuted}
                value={feedbackMessage}
                onChangeText={setFeedbackMessage}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={1000}
                editable={!isSubmittingFeedback}
              />
              <Text style={styles.charCount}>
                {feedbackMessage.length}/1000
              </Text>
            </View>

            <Text style={styles.modalNote}>
              * Your feedback will be sent directly to our support team.
            </Text>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowFeedbackModal(false)}
              disabled={isSubmittingFeedback}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={sendFeedback}
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <Text style={styles.sectionSubtitle}>
            Get help through your preferred method
          </Text>

          <View style={styles.contactGrid}>
            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCard}
                onPress={method.action}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[`${method.color}20`, `${method.color}10`]}
                  style={[
                    styles.contactGradient,
                    { borderColor: `${method.color}` + "50" },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View
                    style={[
                      styles.contactIcon,
                      { backgroundColor: `${method.color}20` },
                    ]}
                  >
                    {method.icon}
                  </View>
                  <View style={{ marginLeft: RFPercentage(2) }}>
                    <Text style={styles.contactTitle}>{method.title}</Text>
                    <Text style={styles.contactDescription}>
                      {method.description}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequently Asked Questions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          <View style={styles.faqsContainer}>
            {faqs.map((faq) => renderFAQItem(faq))}
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <LinearGradient
            colors={["#212126ff", "#111114ff"]}
            style={styles.feedbackCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.feedbackContent}>
              <Ionicons
                name="chatbubble-ellipses"
                size={40}
                color={darkColors.primary}
              />
              <Text style={styles.feedbackTitle}>Help Us Improve</Text>
              <Text style={styles.feedbackDescription}>
                Your feedback helps us make FitTrack Pro better for everyone
              </Text>

              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => setShowFeedbackModal(true)}
                >
                  <Text style={styles.feedbackButtonText}>Submit Feedback</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.feedbackButton, styles.suggestFeatureButton]}
                  onPress={() => setShowFeatureModal(true)}
                >
                  <Text style={styles.suggestFeatureText}>
                    Suggest a Feature
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {renderMessageModal()}
      {renderFeatureModal()}
      {renderFeedbackModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
    marginTop: RFPercentage(6),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Regular",
    padding: 0,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  contactGrid: {
    gap: 12,
  },
  contactCard: {
    width: "100%",
  },
  contactGradient: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginBottom: 2,
  },
  contactDescription: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(243, 78, 58, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  categoryTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
    flex: 1,
  },
  topicsList: {
    width: "50%",
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  topicText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    marginLeft: 6,
    flex: 1,
  },
  faqsContainer: {
    backgroundColor: "#0b0a0aff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1c1a1aff",
    overflow: "hidden",
  },
  faqItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1c1cff",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  faqAnswer: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    lineHeight: 20,
  },
  troubleshootingCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  troubleshootingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  troubleshootingTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    marginLeft: 12,
  },
  troubleshootingList: {
    gap: 12,
  },
  troubleshootingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  troubleshootingText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginLeft: 12,
    flex: 1,
  },
  feedbackCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  feedbackContent: {
    alignItems: "center",
  },
  feedbackTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  feedbackDescription: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  feedbackButton: {
    flex: 1,
    backgroundColor: darkColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  suggestFeatureButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  suggestFeatureText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Montserrat-Bold",
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalDescription: {
    color: darkColors.textSecondary,
    fontSize: 15,
    fontFamily: "Montserrat-Regular",
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat-Regular",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    color: darkColors.textMuted,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    textAlign: "right",
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: "row",
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  categoryChipText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  feedbackTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  feedbackTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
    gap: 8,
    minWidth: 120,
  },
  feedbackTypeButtonActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  feedbackTypeText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  feedbackTypeTextActive: {
    color: "#fff",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    marginTop: 8,
  },
  modalNote: {
    color: darkColors.textMuted,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    fontStyle: "italic",
    marginTop: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: darkColors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
  },
  submitButton: {
    backgroundColor: darkColors.primary,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },

  // Message Modal Specific Styles
  messageTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  messageTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: darkColors.border,
    gap: 8,
  },
  messageTypeButtonActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  messageTypeText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  messageTypeTextActive: {
    color: "#fff",
  },
  phoneNumberContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  phoneNumberLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    marginBottom: 4,
  },
  phoneNumber: {
    color: darkColors.primary,
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    textDecorationLine: "underline",
  },
  messageTips: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginTop: 10,
  },
  messageTipsTitle: {
    color: darkColors.success,
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
  },
  messageTipsText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    marginBottom: 4,
    lineHeight: 20,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
  },
  smsButton: {
    backgroundColor: darkColors.success,
  },
});

export default HelpScreen;