import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Loading, PartySizeInput, Avatar } from '../../components';
import { colors, spacing, borderRadius, elevation } from '../../theme';
import { useAppStore } from '../../store';
import { createGroup, joinGroup } from '../../services/groupService';
import { uploadProfileImage } from '../../services/storageService';
import { GroupMember } from '../../types';

type OnboardingStep = 'welcome' | 'name' | 'profile' | 'group';
type GroupMode = 'create' | 'join';

export default function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [groupMode, setGroupMode] = useState<GroupMode>('create');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setUserProfile, addGroup } = useAppStore();

  const handleNameNext = () => {
    if (name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }
    setError('');
    setStep('profile');
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to set a profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleProfileNext = () => {
    if (adults < 1) {
      setError('You must have at least 1 adult');
      return;
    }
    setError('');
    setStep('group');
  };

  const handleCreateGroup = async () => {
    if (groupName.trim().length < 2) {
      setError('Please enter a group name (at least 2 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload profile image if provided (optional - continues without if it fails)
      let uploadedImageUri: string | undefined;
      if (profileImageUri) {
        try {
          const userId = `${name.trim()}_${Date.now()}`;
          uploadedImageUri = await uploadProfileImage(userId, profileImageUri);
        } catch (uploadError) {
          console.warn('Failed to upload profile image, continuing without it:', uploadError);
          // Continue without profile image - it's optional
        }
      }

      // Create group member object (only include profileImageUri if it exists)
      const memberData: GroupMember = {
        name: name.trim(),
        ...(uploadedImageUri && { profileImageUri: uploadedImageUri }),
        partySize: { adults, children },
        joinedAt: new Date(),
      } as GroupMember;

      const { group, code } = await createGroup(groupName.trim(), memberData);

      // Save user profile (only include profileImageUri if it exists)
      await setUserProfile({
        name: name.trim(),
        ...(uploadedImageUri && { profileImageUri: uploadedImageUri }),
        partySize: { adults, children },
        joinedGroups: [
          {
            groupId: group.id,
            groupName: group.name,
            code: code,
            joinedAt: new Date(),
          },
        ],
      });

      // Group will be set as current group automatically via addGroup
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Please try again.');
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (groupCode.trim().length !== 6) {
      setError('Please enter a valid 6-character group code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload profile image if provided (optional - continues without if it fails)
      let uploadedImageUri: string | undefined;
      if (profileImageUri) {
        try {
          const userId = `${name.trim()}_${Date.now()}`;
          uploadedImageUri = await uploadProfileImage(userId, profileImageUri);
        } catch (uploadError) {
          console.warn('Failed to upload profile image, continuing without it:', uploadError);
          // Continue without profile image - it's optional
        }
      }

      // Create group member object (only include profileImageUri if it exists)
      const memberData: GroupMember = {
        name: name.trim(),
        ...(uploadedImageUri && { profileImageUri: uploadedImageUri }),
        partySize: { adults, children },
        joinedAt: new Date(),
      } as GroupMember;

      const group = await joinGroup(groupCode.trim().toUpperCase(), memberData);

      // Save user profile (only include profileImageUri if it exists)
      await setUserProfile({
        name: name.trim(),
        ...(uploadedImageUri && { profileImageUri: uploadedImageUri }),
        partySize: { adults, children },
        joinedGroups: [
          {
            groupId: group.id,
            groupName: group.name,
            code: group.code,
            joinedAt: new Date(),
          },
        ],
      });
    } catch (err) {
      console.error('Error joining group:', err);
      if (err instanceof Error && err.message === 'Group not found') {
        setError('Group not found. Please check the code and try again.');
      } else {
        setError('Failed to join group. Please try again.');
      }
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Setting up your group..." />;
  }

  // Welcome Step
  if (step === 'welcome') {
    return (
      <Screen>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text variant="displayLarge" style={styles.title}>
              Welcome to
            </Text>
            <Text variant="displayLarge" style={styles.appName}>
              LifeGroup Food
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Plan and coordinate weekly shared meals with your group
            </Text>

            <View style={styles.featureList}>
              <FeatureItem icon="📅" text="Plan meals with a calendar view" />
              <FeatureItem icon="🍽️" text="Propose and reserve menu items" />
              <FeatureItem icon="🛒" text="Auto-generated shopping lists" />
              <FeatureItem icon="👥" text="Easy group coordination" />
            </View>
          </View>

          <Button
            mode="contained"
            onPress={() => setStep('name')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Get Started
          </Button>
        </View>
      </Screen>
    );
  }

  // Name Step
  if (step === 'name') {
    return (
      <Screen scroll>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text variant="displayMedium" style={styles.title}>
              What's your name?
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              This is how other group members will see you
            </Text>

            <TextInput
              mode="outlined"
              label="Your Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              error={!!error}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => setStep('welcome')}
              style={styles.buttonSecondary}
            >
              Back
            </Button>
            <Button
              mode="contained"
              onPress={handleNameNext}
              style={styles.buttonPrimary}
              contentStyle={styles.buttonContent}
            >
              Next
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  // Profile Step
  if (step === 'profile') {
    return (
      <Screen scroll>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text variant="displayMedium" style={styles.title}>
              Set Up Your Profile
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Add a photo and tell us about your party size
            </Text>

            {/* Profile Image */}
            <View style={styles.profileSection}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.avatarContainer}
              >
                {profileImageUri ? (
                  <Avatar
                    imageUri={profileImageUri}
                    name={name}
                    size={100}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Avatar name={name} size={100} />
                    <View style={styles.cameraIconContainer}>
                      <IconButton
                        icon="camera"
                        size={20}
                        iconColor={colors.text.onPrimary}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <Text variant="bodySmall" style={styles.photoHint}>
                Tap to {profileImageUri ? 'change' : 'add'} photo (optional)
              </Text>
            </View>

            {/* Party Size */}
            <View style={styles.partySizeSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Default Party Size
              </Text>
              <Text variant="bodySmall" style={styles.sectionHint}>
                How many people are typically in your group? You can adjust this for each meal.
              </Text>
              <View style={styles.partySizeContainer}>
                <PartySizeInput
                  adults={adults}
                  children={children}
                  onAdultsChange={setAdults}
                  onChildrenChange={setChildren}
                />
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => setStep('name')}
              style={styles.buttonSecondary}
            >
              Back
            </Button>
            <Button
              mode="contained"
              onPress={handleProfileNext}
              style={styles.buttonPrimary}
              contentStyle={styles.buttonContent}
            >
              Next
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  // Group Step
  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="displayMedium" style={styles.title}>
            Join or Create a Group
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Groups help you coordinate meals with friends or family
          </Text>

          <SegmentedButtons
            value={groupMode}
            onValueChange={(value) => {
              setGroupMode(value as GroupMode);
              setError('');
            }}
            buttons={[
              { value: 'create', label: 'Create New' },
              { value: 'join', label: 'Join Existing' },
            ]}
            style={styles.segmentedButtons}
          />

          {groupMode === 'create' ? (
            <View style={styles.formContainer}>
              <TextInput
                mode="outlined"
                label="Group Name"
                value={groupName}
                onChangeText={(text) => {
                  setGroupName(text);
                  setError('');
                }}
                placeholder="e.g., Smith Family, Bible Study Group"
                style={styles.input}
                autoCapitalize="words"
                autoFocus
                error={!!error}
              />
              <Text variant="bodySmall" style={styles.hint}>
                You'll receive a shareable code to invite others
              </Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <TextInput
                mode="outlined"
                label="Group Code"
                value={groupCode}
                onChangeText={(text) => {
                  setGroupCode(text.toUpperCase());
                  setError('');
                }}
                placeholder="ABC123"
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                autoFocus
                error={!!error}
              />
              <Text variant="bodySmall" style={styles.hint}>
                Enter the 6-character code shared by your group
              </Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => setStep('name')}
            style={styles.buttonSecondary}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={groupMode === 'create' ? handleCreateGroup : handleJoinGroup}
            style={styles.buttonPrimary}
            contentStyle={styles.buttonContent}
            disabled={loading}
          >
            {groupMode === 'create' ? 'Create Group' : 'Join Group'}
          </Button>
        </View>
      </View>
    </Screen>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text variant="bodyMedium" style={styles.featureText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  appName: {
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureList: {
    marginTop: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
    color: colors.text.primary,
  },
  input: {
    marginTop: spacing.lg,
  },
  hint: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  segmentedButtons: {
    marginTop: spacing.lg,
  },
  formContainer: {
    marginTop: spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  button: {
    marginTop: spacing.xl,
  },
  buttonPrimary: {
    flex: 1,
  },
  buttonSecondary: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    marginBottom: spacing.sm,
  },
  avatarPlaceholder: {
    position: 'relative',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  photoHint: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  partySizeSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  partySizeContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...elevation.level1,
  },
});
