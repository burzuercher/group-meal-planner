import {
  createGroup,
  getGroupByCode,
  joinGroup,
  getGroupById,
  updateMemberInfo,
  updateGroupName,
  removeMemberFromGroup,
} from '../../services/groupService';
import { GroupMember } from '../../types';

// Mock generateGroupCode to return predictable values
jest.mock('../../utils/generateCode', () => ({
  generateGroupCode: jest.fn(() => 'ABC123'),
}));

describe('Feature: Group Management', () => {
  let testMember: GroupMember;

  beforeEach(() => {
    // Reset mock firestore data before each test
    const { __resetMockFirestore } = jest.requireMock('firebase/firestore');
    __resetMockFirestore();

    // Create test member
    testMember = {
      name: 'John Doe',
      partySize: { adults: 2, children: 1 },
      joinedAt: new Date('2025-10-25T12:00:00Z'),
    };
  });

  describe('Feature: Create a new group', () => {
    describe('Given: Valid group name and creator', () => {
      describe('When: Creating the group', () => {
        it('Then: Should create group with unique code', async () => {
          const result = await createGroup('Test Group', testMember);

          expect(result.group).toBeDefined();
          expect(result.group.name).toBe('Test Group');
          expect(result.code).toBe('ABC123');
          expect(result.group.members).toHaveLength(1);
          expect(result.group.members[0].name).toBe('John Doe');
        });

        it('And: Should include creator as first member', async () => {
          const result = await createGroup('Test Group', testMember);

          expect(result.group.members[0]).toMatchObject({
            name: testMember.name,
            partySize: testMember.partySize,
          });
        });

        it('And: Should have createdAt timestamp', async () => {
          const result = await createGroup('Test Group', testMember);

          expect(result.group.createdAt).toBeInstanceOf(Date);
        });
      });
    });

    describe('Given: Code collision occurs', () => {
      describe('When: Creating group with duplicate code', () => {
        it('Then: Should generate new code until unique', async () => {
          // Create first group
          await createGroup('First Group', testMember);

          // Mock generateGroupCode to return different codes on subsequent calls
          const generateCode = require('../../utils/generateCode').generateGroupCode;
          generateCode
            .mockReturnValueOnce('ABC123') // First attempt (collision)
            .mockReturnValueOnce('XYZ789'); // Second attempt (unique)

          // Create second group
          const result = await createGroup('Second Group', testMember);

          expect(result.code).toBe('XYZ789');
        });
      });
    });
  });

  describe('Feature: Find group by code', () => {
    describe('Given: Group exists with code ABC123', () => {
      beforeEach(async () => {
        await createGroup('Existing Group', testMember);
      });

      describe('When: Searching for group by code', () => {
        it('Then: Should return the group', async () => {
          const group = await getGroupByCode('ABC123');

          expect(group).not.toBeNull();
          expect(group?.name).toBe('Existing Group');
          expect(group?.code).toBe('ABC123');
        });

        it('And: Should be case insensitive', async () => {
          const groupLower = await getGroupByCode('abc123');
          const groupUpper = await getGroupByCode('ABC123');

          expect(groupLower?.code).toBe(groupUpper?.code);
        });
      });
    });

    describe('Given: Group does not exist', () => {
      describe('When: Searching for non-existent code', () => {
        it('Then: Should return null', async () => {
          const group = await getGroupByCode('ZZZ999');

          expect(group).toBeNull();
        });
      });
    });
  });

  describe('Feature: Join existing group', () => {
    let existingGroup: any;
    let newMember: GroupMember;

    beforeEach(async () => {
      const result = await createGroup('Test Group', testMember);
      existingGroup = result.group;

      newMember = {
        name: 'Jane Smith',
        partySize: { adults: 1, children: 0 },
        joinedAt: new Date('2025-10-26T12:00:00Z'),
      };
    });

    describe('Given: Valid code and new member', () => {
      describe('When: Joining the group', () => {
        it('Then: Should add member to group', async () => {
          const updatedGroup = await joinGroup('ABC123', newMember);

          expect(updatedGroup.members).toHaveLength(2);
          expect(updatedGroup.members[1].name).toBe('Jane Smith');
        });

        it('And: Should preserve existing members', async () => {
          const updatedGroup = await joinGroup('ABC123', newMember);

          expect(updatedGroup.members[0].name).toBe('John Doe');
        });
      });
    });

    describe('Given: Member already in group', () => {
      describe('When: Joining again', () => {
        it('Then: Should not duplicate member', async () => {
          const updatedGroup = await joinGroup('ABC123', testMember);

          expect(updatedGroup.members).toHaveLength(1);
          expect(updatedGroup.members[0].name).toBe('John Doe');
        });
      });
    });

    describe('Given: Invalid code', () => {
      describe('When: Attempting to join non-existent group', () => {
        it('Then: Should throw Group not found error', async () => {
          await expect(joinGroup('ZZZ999', newMember)).rejects.toThrow(
            'Group not found'
          );
        });
      });
    });
  });

  describe('Feature: Get group by ID', () => {
    let groupId: string;

    beforeEach(async () => {
      const result = await createGroup('Test Group', testMember);
      groupId = result.group.id;
    });

    describe('Given: Valid group ID', () => {
      describe('When: Fetching group', () => {
        it('Then: Should return group details', async () => {
          const group = await getGroupById(groupId);

          expect(group).not.toBeNull();
          expect(group?.id).toBe(groupId);
          expect(group?.name).toBe('Test Group');
        });
      });
    });

    describe('Given: Invalid group ID', () => {
      describe('When: Fetching non-existent group', () => {
        it('Then: Should return null', async () => {
          const group = await getGroupById('non-existent-id');

          expect(group).toBeNull();
        });
      });
    });
  });

  describe('Feature: Update member information', () => {
    let groupId: string;

    beforeEach(async () => {
      const result = await createGroup('Test Group', testMember);
      groupId = result.group.id;
    });

    describe('Given: Member exists in group', () => {
      describe('When: Updating party size', () => {
        it('Then: Should update member party size', async () => {
          await updateMemberInfo(groupId, 'John Doe', {
            partySize: { adults: 3, children: 2 },
          });

          const group = await getGroupById(groupId);
          const member = group?.members.find((m) => m.name === 'John Doe');

          expect(member?.partySize).toEqual({ adults: 3, children: 2 });
        });
      });

      describe('When: Updating profile image', () => {
        it('Then: Should update member profile image URI', async () => {
          await updateMemberInfo(groupId, 'John Doe', {
            profileImageUri: 'https://example.com/image.jpg',
          });

          const group = await getGroupById(groupId);
          const member = group?.members.find((m) => m.name === 'John Doe');

          expect(member?.profileImageUri).toBe('https://example.com/image.jpg');
        });
      });
    });

    describe('Given: Invalid group ID', () => {
      describe('When: Attempting to update member', () => {
        it('Then: Should throw an error', async () => {
          await expect(
            updateMemberInfo('invalid-id', 'John Doe', {
              partySize: { adults: 3, children: 2 },
            })
          ).rejects.toThrow();
        });
      });
    });
  });

  describe('Feature: Update group name', () => {
    let groupId: string;

    beforeEach(async () => {
      const result = await createGroup('Test Group', testMember);
      groupId = result.group.id;
    });

    describe('Given: Valid new group name', () => {
      describe('When: Updating group name', () => {
        it('Then: Should update the name', async () => {
          await updateGroupName(groupId, 'New Group Name');

          const group = await getGroupById(groupId);
          expect(group?.name).toBe('New Group Name');
        });

        it('And: Should trim whitespace', async () => {
          await updateGroupName(groupId, '  Trimmed Name  ');

          const group = await getGroupById(groupId);
          expect(group?.name).toBe('Trimmed Name');
        });
      });
    });

    describe('Given: Invalid group name', () => {
      describe('When: Name is too short', () => {
        it('Then: Should throw validation error', async () => {
          await expect(updateGroupName(groupId, 'A')).rejects.toThrow(
            'Group name must be at least 2 characters'
          );
        });
      });

      describe('When: Name is empty', () => {
        it('Then: Should throw validation error', async () => {
          await expect(updateGroupName(groupId, '  ')).rejects.toThrow(
            'Group name must be at least 2 characters'
          );
        });
      });
    });
  });

  describe('Feature: Remove member from group', () => {
    let groupId: string;

    beforeEach(async () => {
      const result = await createGroup('Test Group', testMember);
      groupId = result.group.id;

      // Add second member
      await joinGroup('ABC123', {
        name: 'Jane Smith',
        partySize: { adults: 1, children: 0 },
        joinedAt: new Date(),
      });
    });

    describe('Given: Member exists in group', () => {
      describe('When: Removing member', () => {
        it('Then: Should remove member from group', async () => {
          await removeMemberFromGroup(groupId, 'Jane Smith');

          const group = await getGroupById(groupId);
          expect(group?.members).toHaveLength(1);
          expect(group?.members[0].name).toBe('John Doe');
        });

        it('And: Should not affect other members', async () => {
          await removeMemberFromGroup(groupId, 'Jane Smith');

          const group = await getGroupById(groupId);
          const johnExists = group?.members.some((m) => m.name === 'John Doe');
          expect(johnExists).toBe(true);
        });
      });
    });

    describe('Given: Member does not exist', () => {
      describe('When: Attempting to remove non-existent member', () => {
        it('Then: Should throw Member not found error', async () => {
          await expect(
            removeMemberFromGroup(groupId, 'Non Existent')
          ).rejects.toThrow('Member not found in group');
        });
      });
    });

    describe('Given: Invalid group ID', () => {
      describe('When: Attempting to remove member', () => {
        it('Then: Should throw Group not found error', async () => {
          await expect(
            removeMemberFromGroup('invalid-id', 'John Doe')
          ).rejects.toThrow('Group not found');
        });
      });
    });
  });
});
