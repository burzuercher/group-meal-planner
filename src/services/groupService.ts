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
import { Group } from '../types';
import { generateGroupCode } from '../utils/generateCode';

const GROUPS_COLLECTION = 'groups';

/**
 * Creates a new group in Firestore
 */
export async function createGroup(
  groupName: string,
  creatorName: string
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
      members: [creatorName],
      createdAt: new Date(),
    };

    await setDoc(groupRef, {
      ...groupData,
      createdAt: Timestamp.fromDate(groupData.createdAt),
    });

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

    return {
      id: groupDoc.id,
      name: data.name,
      code: data.code,
      members: data.members,
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
  memberName: string
): Promise<Group> {
  try {
    const group = await getGroupByCode(code);

    if (!group) {
      throw new Error('Group not found');
    }

    // Check if member is already in the group
    if (group.members.includes(memberName)) {
      return group;
    }

    // Add member to group
    const groupRef = doc(db, GROUPS_COLLECTION, group.id);
    await updateDoc(groupRef, {
      members: arrayUnion(memberName),
    });

    return {
      ...group,
      members: [...group.members, memberName],
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
    return {
      id: groupDoc.id,
      name: data.name,
      code: data.code,
      members: data.members,
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error('Error getting group by ID:', error);
    throw new Error('Failed to get group');
  }
}
