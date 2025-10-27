import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { Group, GroupMember } from '../types';
import { generateGroupCode } from '../utils/generateCode';

const GROUPS_COLLECTION = 'groups';

/**
 * Helper: Migrates old string[] members to GroupMember[]
 * For backward compatibility with existing data
 */
function migrateMembers(members: any): GroupMember[] {
  if (!members || members.length === 0) {
    return [];
  }

  // Check if already in new format
  if (typeof members[0] === 'object' && 'name' in members[0]) {
    return members as GroupMember[];
  }

  // Migrate old string[] format
  return (members as string[]).map((name) => ({
    name,
    partySize: { adults: 1, children: 0 }, // Default for legacy users
    joinedAt: new Date(),
  }));
}

/**
 * Creates a new group in Firestore
 */
export async function createGroup(
  groupName: string,
  creator: GroupMember
): Promise<{ group: Group; code: string }> {
  try {
    // Generate unique code
    let code = generateGroupCode();
    let isUnique = false;

    // Keep generating until we get a unique code
    while (!isUnique) {
      const existingGroup = await getGroupByCode(code);
      if (!existingGroup) {
        isUnique = true;
      } else {
        code = generateGroupCode();
      }
    }

    // Create group document
    const groupRef = doc(collection(db, GROUPS_COLLECTION));
    const groupData: Omit<Group, 'id'> = {
      name: groupName,
      code,
      members: [creator],
      memberIds: [creator.userId], // Add memberIds array for security rules
      createdAt: new Date(),
    };

    // Convert dates to Firestore Timestamps
    const firestoreData = {
      name: groupData.name,
      code: groupData.code,
      members: groupData.members.map((member) => ({
        ...member,
        joinedAt: Timestamp.fromDate(member.joinedAt),
      })),
      memberIds: groupData.memberIds,
      createdAt: Timestamp.fromDate(groupData.createdAt),
    };

    await setDoc(groupRef, firestoreData);

    const group: Group = {
      id: groupRef.id,
      ...groupData,
    };

    return { group, code };
  } catch (error) {
    console.error('Error creating group:', error);
    throw new Error('Failed to create group');
  }
}

/**
 * Finds a group by its shareable code
 */
export async function getGroupByCode(code: string): Promise<Group | null> {
  try {
    const groupsRef = collection(db, GROUPS_COLLECTION);
    const q = query(groupsRef, where('code', '==', code.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const groupDoc = querySnapshot.docs[0];
    const data = groupDoc.data();

    // Migrate members and convert Firestore Timestamps back to Dates
    const members = migrateMembers(data.members).map((member) => ({
      ...member,
      joinedAt:
        member.joinedAt instanceof Date
          ? member.joinedAt
          : (member.joinedAt as any).toDate(),
    }));

    return {
      id: groupDoc.id,
      name: data.name,
      code: data.code,
      members,
      memberIds: data.memberIds || members.map((m: GroupMember) => m.userId), // Fallback for legacy data
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error('Error getting group by code:', error);
    throw new Error('Failed to find group');
  }
}

/**
 * Joins an existing group
 */
export async function joinGroup(
  code: string,
  member: GroupMember
): Promise<Group> {
  try {
    const group = await getGroupByCode(code);

    if (!group) {
      throw new Error('Group not found');
    }

    // Check if member is already in the group by userId
    const existingMember = group.members.find((m) => m.userId === member.userId);
    if (existingMember) {
      return group;
    }

    // Add member to group
    const groupRef = doc(db, GROUPS_COLLECTION, group.id);
    const memberData = {
      ...member,
      joinedAt: Timestamp.fromDate(member.joinedAt),
    };

    await updateDoc(groupRef, {
      members: arrayUnion(memberData),
      memberIds: arrayUnion(member.userId), // Add userId to memberIds array
    });

    return {
      ...group,
      members: [...group.members, member],
      memberIds: [...group.memberIds, member.userId],
    };
  } catch (error) {
    console.error('Error joining group:', error);
    if (error instanceof Error && error.message === 'Group not found') {
      throw error;
    }
    throw new Error('Failed to join group');
  }
}

/**
 * Gets a group by its ID
 */
export async function getGroupById(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      return null;
    }

    const data = groupDoc.data();

    // Migrate members and convert Firestore Timestamps back to Dates
    const members = migrateMembers(data.members).map((member) => ({
      ...member,
      joinedAt:
        member.joinedAt instanceof Date
          ? member.joinedAt
          : (member.joinedAt as any).toDate(),
    }));

    return {
      id: groupDoc.id,
      name: data.name,
      code: data.code,
      members,
      memberIds: data.memberIds || members.map((m: GroupMember) => m.userId), // Fallback for legacy data
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error('Error getting group by ID:', error);
    throw new Error('Failed to get group');
  }
}

/**
 * Updates a member's profile information in a group
 * Used when user edits their profile image or party size
 */
export async function updateMemberInfo(
  groupId: string,
  memberName: string,
  updates: Partial<Pick<GroupMember, 'profileImageUri' | 'partySize'>>
): Promise<void> {
  try {
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Find the member and update their info
    const updatedMembers = group.members.map((member) => {
      if (member.name === memberName) {
        return { ...member, ...updates };
      }
      return member;
    });

    // Convert dates for Firestore
    const firestoreMembers = updatedMembers.map((member) => ({
      ...member,
      joinedAt: Timestamp.fromDate(member.joinedAt),
    }));

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: firestoreMembers,
    });
  } catch (error) {
    console.error('Error updating member info:', error);
    throw new Error('Failed to update member info');
  }
}

/**
 * Updates a group's name
 */
export async function updateGroupName(
  groupId: string,
  newName: string
): Promise<void> {
  try {
    if (!newName.trim() || newName.trim().length < 2) {
      throw new Error('Group name must be at least 2 characters');
    }

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      name: newName.trim(),
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    if (error instanceof Error && error.message.includes('must be at least')) {
      throw error;
    }
    throw new Error('Failed to update group name');
  }
}

/**
 * Removes a member from a group
 */
export async function removeMemberFromGroup(
  groupId: string,
  memberName: string
): Promise<void> {
  try {
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Filter out the member to remove
    const updatedMembers = group.members.filter(
      (member) => member.name !== memberName
    );

    if (updatedMembers.length === group.members.length) {
      throw new Error('Member not found in group');
    }

    // Get the updated memberIds array
    const updatedMemberIds = updatedMembers.map((member) => member.userId);

    // Convert dates for Firestore
    const firestoreMembers = updatedMembers.map((member) => ({
      ...member,
      joinedAt: Timestamp.fromDate(member.joinedAt),
    }));

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: firestoreMembers,
      memberIds: updatedMemberIds,
    });
  } catch (error) {
    console.error('Error removing member from group:', error);
    if (error instanceof Error && (error.message.includes('not found'))) {
      throw error;
    }
    throw new Error('Failed to remove member from group');
  }
}
