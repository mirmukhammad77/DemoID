import { postJson, postPhoto } from '../../shared/api/client';
import type { RegistrationDetails } from '../../shared/api/client';
export const validateRegistration = (details: RegistrationDetails, signal: AbortSignal) => postJson<{ valid: true }>('/registration/validate', details, signal);
export const completeRegistration = (details: RegistrationDetails, photo: Blob, signal: AbortSignal) => postPhoto<{ message: string }>('/registration/complete', details, photo, signal);
