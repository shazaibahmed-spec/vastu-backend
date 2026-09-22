import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('architect@vastu.ai');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Lead Architect');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = t('auth.emailInvalid');
    }

    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.passwordLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      if (isRegistering) {
        await register(email.trim(), password, name.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      const rawMsg =
        err.response?.data?.message || err.message || 'Authentication failed.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join('. ') : String(rawMsg);

      if (msg.toLowerCase().includes('already exists')) {
        setErrors({
          email: t('auth.userExists'),
        });
      } else if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('password') ||
        msg.toLowerCase().includes('credential')
      ) {
        setErrors({
          general: t('auth.invalidCredentials'),
        });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegistering((prev) => {
      const next = !prev;
      if (next) {
        // When switching to Create Account: prefill a unique demo email so Sign Up succeeds immediately
        if (email === 'architect@vastu.ai') {
          setEmail(`architect.${Date.now().toString().slice(-4)}@vastu.ai`);
        }
        if (!name) {
          setName('Lead Architect');
        }
      } else {
        // When switching back to Sign In: restore standard seeded demo credentials
        if (email.includes('architect.')) {
          setEmail('architect@vastu.ai');
        }
      }
      return next;
    });
    setErrors({});
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={isRegistering ? t('auth.createAccount') : t('auth.signIn')}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={true}
        >
          <View style={styles.formCard}>
            {/* General Server Error Banner */}
            {errors.general ? (
              <View style={styles.generalErrorBox}>
                <AlertCircle
                  size={16}
                  color="#F87171"
                  style={styles.generalErrorIcon}
                />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* Full Name (Only on Registration - Optional) */}
            {isRegistering && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{t('auth.fullName')}</Text>
                  <Text style={styles.optionalTag}>{t('common.optional')}</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name)
                      setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder={t('auth.namePlaceholder')}
                  placeholderTextColor="#64748B"
                  autoCapitalize="words"
                />
                {errors.name ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={12} color="#F87171" />
                    <Text style={styles.errorText}>{errors.name}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.emailAddress')}</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  if (errors.general)
                    setErrors((prev) => ({ ...prev, general: undefined }));
                }}
                placeholder="name@example.com"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              {errors.email ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color="#F87171" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  if (errors.general)
                    setErrors((prev) => ({ ...prev, general: undefined }));
                }}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor="#64748B"
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.password ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color="#F87171" />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title={isRegistering ? t('auth.signUp') : t('auth.signIn')}
              onPress={handleSubmit}
              isLoading={loading}
              style={styles.submitBtn}
            />


            {/* Toggle Sign In / Sign Up */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleMode}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {isRegistering
                  ? t('auth.alreadyHaveAccount')
                  : t('auth.dontHaveAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  generalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  generalErrorIcon: {
    marginRight: 8,
  },
  generalErrorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  optionalTag: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(11, 19, 43, 0.8)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  submitBtn: {
    marginTop: 8,
  },
  switchRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
});
