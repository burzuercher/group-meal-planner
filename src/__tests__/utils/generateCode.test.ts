import { generateGroupCode } from '../../utils/generateCode';

describe('Feature: Generate unique group codes', () => {
  describe('Given: No prior context', () => {
    describe('When: Generating a new group code', () => {
      it('Then: Should return a 6-character code', () => {
        const code = generateGroupCode();
        expect(code).toHaveLength(6);
      });

      it('Then: Should start with 3 uppercase letters', () => {
        const code = generateGroupCode();
        const firstThree = code.substring(0, 3);
        expect(firstThree).toMatch(/^[A-Z]{3}$/);
      });

      it('Then: Should end with 3 numbers', () => {
        const code = generateGroupCode();
        const lastThree = code.substring(3, 6);
        expect(lastThree).toMatch(/^[0-9]{3}$/);
      });

      it('Then: Should match the pattern ABC123', () => {
        const code = generateGroupCode();
        expect(code).toMatch(/^[A-Z]{3}[0-9]{3}$/);
      });
    });

    describe('When: Generating multiple codes', () => {
      it('Then: Each code should be valid', () => {
        const codes = Array.from({ length: 10 }, () => generateGroupCode());

        codes.forEach((code) => {
          expect(code).toHaveLength(6);
          expect(code).toMatch(/^[A-Z]{3}[0-9]{3}$/);
        });
      });

      it('Then: Codes should be different (highly likely)', () => {
        const codes = Array.from({ length: 100 }, () => generateGroupCode());
        const uniqueCodes = new Set(codes);

        // With random generation, we expect most codes to be unique
        // (exact uniqueness isn't guaranteed due to randomness, but collision is unlikely)
        expect(uniqueCodes.size).toBeGreaterThan(90);
      });
    });
  });
});
