import { VerificationDocType } from '@prisma/client';

/** All document slots assistants must complete for full verification. */
export const REQUIRED_VERIFICATION_TYPES: VerificationDocType[] = [
  VerificationDocType.profile_photo,
  VerificationDocType.full_address,
  VerificationDocType.aadhaar,
  VerificationDocType.pan,
  VerificationDocType.selfie,
  VerificationDocType.bank_details,
  VerificationDocType.security_photo_1,
  VerificationDocType.security_photo_2,
  VerificationDocType.security_photo_3,
  VerificationDocType.security_photo_4,
  VerificationDocType.security_photo_5,
];

export const VERIFICATION_TYPE_LABELS: Record<VerificationDocType, string> = {
  [VerificationDocType.profile_photo]: 'Profile photo',
  [VerificationDocType.full_address]: 'Full address',
  [VerificationDocType.aadhaar]: 'Aadhaar card',
  [VerificationDocType.pan]: 'PAN card',
  [VerificationDocType.selfie]: 'Selfie verification',
  [VerificationDocType.bank_details]: 'Bank details',
  [VerificationDocType.security_photo_1]: 'Security photo 1',
  [VerificationDocType.security_photo_2]: 'Security photo 2',
  [VerificationDocType.security_photo_3]: 'Security photo 3',
  [VerificationDocType.security_photo_4]: 'Security photo 4',
  [VerificationDocType.security_photo_5]: 'Security photo 5',
};
