import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { APP_CONFIG } from '../../config/appConfig';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { sendTestNotification } = useNotification();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            setLoading(true);
            const result = await logout();
            setLoading(false);
            
            if (!result.success) {
              Alert.alert('Error', result.message || 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    const result = await sendTestNotification();
    
    if (!result.success) {
      Alert.alert('Error', result.message || 'Failed to send test notification');
    }
  };

  const toggleNotifications = (value) => {
    setNotificationsEnabled(value);
    // In a real app, you would update user preferences in the backend
  };

  const handleWhatsAppSupport = async () => {
    const phoneNumber = '919755824884'; // WhatsApp support number
    const message = 'Hi, I need help with JyotishCall app.'; // Optional pre-filled message
    
    try {
      // Try WhatsApp first
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp if app is not installed
        const webWhatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'WhatsApp Support',
        `Unable to open WhatsApp. Please contact support at: +91 9755824884`,
        [
          {
            text: 'Copy Number',
            onPress: () => {
              // Note: Clipboard functionality would require @react-native-clipboard/clipboard
              Alert.alert('Support Number', '+91 9755824884\n(WhatsApp Only)');
            }
          },
          { text: 'OK' }
        ]
      );
    }
  };

  const menuItems = [
    // {
    //   icon: 'person-outline',
    //   title: 'Edit Profile',
    //   onPress: () => Alert.alert('Edit Profile', 'This feature is coming soon!'),
    // },
    // {
    //   icon: 'notifications-outline',
    //   title: 'Notifications',
    //   onPress: null,
    //   toggle: true,
    //   value: notificationsEnabled,
    //   onToggle: toggleNotifications,
    // },
    {
      icon: 'logo-whatsapp',
      title: 'WhatsApp Support',
      subtitle: '+91 9755824884 (WhatsApp Only)',
      onPress: handleWhatsAppSupport,
      whatsapp: true,
    },
    // {
    //   icon: 'help-circle-outline',
    //   title: 'Help & Support',
    //   onPress: () => Alert.alert('Help & Support', 'This feature is coming soon!'),
    // },
    // {
    //   icon: 'document-text-outline',
    //   title: 'Terms & Conditions',
    //   onPress: () => Alert.alert('Terms & Conditions', 'This feature is coming soon!'),
    // },
    // {
    //   icon: 'shield-outline',
    //   title: 'Privacy Policy',
    //   onPress: () => Alert.alert('Privacy Policy', 'This feature is coming soon!'),
    // },
    // {
    //   icon: 'notifications-outline',
    //   title: 'Test Notification',
    //   onPress: handleTestNotification,
    // },
    {
      icon: 'log-out-outline',
      title: 'Logout',
      onPress: handleLogout,
      danger: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.contentWrapper}>
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editImageButton}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userPhone}>{user?.phoneNumber || ''}</Text>
        
        
      </View>
      
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            disabled={item.toggle || loading}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons
                name={item.icon}
                size={24}
                color={item.danger ? colors.error : item.whatsapp ? colors.success : colors.textPrimary}
              />
              <View style={styles.menuItemTextContainer}>
                <Text
                  style={[
                    styles.menuItemTitle,
                    item.danger && styles.menuItemTitleDanger,
                    item.whatsapp && styles.menuItemTitleWhatsApp,
                  ]}
                >
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={styles.menuItemSubtitle}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
            </View>
            
            {item.toggle ? (
              <Switch
                value={item.value}
                onValueChange={item.onToggle}
                trackColor={{ false: colors.surfaceTertiary, true: colors.secondary }}
                thumbColor="#fff"
              />
            ) : (
              <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.versionText}>Version {APP_CONFIG.getCurrentVersion()}</Text>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500, // Responsive max width for tablets
    alignSelf: 'center',
    width: '100%',
  },
  headerBar: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.lg,
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.secondary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  userPhone: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  menuItemTitle: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  menuItemTitleDanger: {
    color: colors.error,
  },
  menuItemTitleWhatsApp: {
    color: colors.success,
    fontWeight: '600',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  versionText: {
    textAlign: 'center',
    marginVertical: 20,
    color: colors.textMuted,
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;
