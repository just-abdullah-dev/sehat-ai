import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';

export default function TermsOfServiceScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Sehat AI Terms of Service</Text>
        <Text style={[styles.meta, { color: colors.icon }]}>Last updated: April 19, 2026</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          By creating an account or using Sehat AI, you agree to these Terms of Service.
          If you do not agree, do not use the app.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Service Description</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Sehat AI is an AI-assisted mobile platform for TB and pneumonia screening from chest X-rays.
          Features include upload, prediction, scan history, profile management, and report generation.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Eligibility and Accounts</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          You must provide accurate registration information and keep your credentials secure.
          You are responsible for all activity under your account.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Acceptable Use</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          You agree not to misuse the service, attempt unauthorized access, upload malicious files,
          violate laws, or use another person's medical data without authorization.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Medical Disclaimer</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Sehat AI does not provide medical treatment and is not a replacement for licensed
          healthcare professionals. Always seek qualified medical advice for diagnosis and treatment.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Predictions and Accuracy</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          AI predictions are probabilistic and may be incorrect. Confidence scores indicate model
          confidence, not guaranteed clinical certainty. You accept that outputs are for support use.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Privacy and Data Handling</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          Your use of Sehat AI is also governed by the Privacy Policy. By using the service,
          you consent to collection and processing of data as described there.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Intellectual Property</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          The app, branding, code, and related content are owned by the Sehat AI project team
          and licensors. You may not copy, reverse engineer, resell, or redistribute without permission.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Third-Party Services</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          The app may depend on external platforms and hosting providers. We are not responsible
          for downtime or failures caused by third-party services beyond reasonable control.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Suspension and Termination</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We may suspend or terminate access for misuse, legal reasons, security issues,
          or violation of these terms. You may stop using the service at any time.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Limitation of Liability</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          To the maximum extent allowed by law, Sehat AI is provided on an "as is" basis.
          We are not liable for indirect, incidental, or consequential damages from use of the service.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>12. Changes to Terms</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          We may update these terms to reflect legal, technical, or product changes.
          Continued use after updates means you accept the revised terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>13. Governing Law</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          These terms are governed by applicable laws of Pakistan, unless local mandatory consumer
          protection laws in your jurisdiction require otherwise.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>14. Contact</Text>
        <Text style={[styles.body, { color: colors.icon }]}> 
          For questions about these terms, contact support@sehatai.com.
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
