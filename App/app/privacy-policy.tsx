import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Sehat AI Privacy Policy</Text>
        <Text style={[styles.meta, { color: colors.icon }]}>Last updated: April 19, 2026</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Overview</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Sehat AI provides AI-assisted analysis of chest X-ray images for TB and pneumonia screening.
          This Privacy Policy explains what information we collect, how we use it, and your choices.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Information We Collect</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Account information: email, username, password hash (stored on backend), and profile details
          such as phone, age, gender, symptoms, and medicines if you provide them.
        </Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Medical and scan data: uploaded X-ray files, prediction results, confidence scores,
          processing time, selected model, timestamps, scan history, and generated PDF reports.
        </Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Technical data: app logs required for performance, troubleshooting, and security.
          Guest predictions may run without login, but account-linked history requires authentication.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. How We Use Your Information</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We use your information to create and maintain your account, perform AI predictions,
          generate reports, show scan history, support reminders and notifications,
          improve system reliability, and protect against abuse.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Legal Basis and Consent</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          By using Sehat AI and uploading health-related data, you consent to processing described
          in this policy. Where required by law, you may withdraw consent by stopping use of the app
          and requesting account deletion.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Data Sharing</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We do not sell your personal data. We may share limited data with service providers
          that host infrastructure (for example, cloud hosting and database services) only as needed
          to operate the app. We may disclose information if required by law or to protect users.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Data Storage and Security</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We use transport encryption (HTTPS), token-based authentication, and access controls.
          No system can guarantee absolute security, but we apply reasonable safeguards to protect data.
          You are responsible for keeping your login credentials secure.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Data Retention</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We retain account and scan history data while your account is active and as needed
          for operational, legal, and audit purposes. If you request deletion, we will remove data
          subject to legal obligations and backup retention windows.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Your Rights</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Depending on applicable law, you may request access, correction, export, or deletion
          of your personal data. You may also opt out of optional notifications in Settings.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Children and Sensitive Use</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Sehat AI is intended for users who can provide valid consent. If you are using the app
          for a minor, you must have proper legal authority. Do not upload data you are not allowed
          to share.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Medical Disclaimer</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Sehat AI provides AI-assisted screening support only and is not a substitute for
          professional medical advice, diagnosis, or treatment.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Changes to This Policy</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We may update this Privacy Policy from time to time. Material updates will be reflected
          in the last updated date shown on this page.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>12. Contact</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          For privacy questions or data requests, contact support@sehatai.com.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
});
