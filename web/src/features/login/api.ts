import { postJson, postPhoto } from '../../shared/api/client';
import type { Credentials, Profile } from '../../shared/api/client';
export const validateCredentials = (details: Credentials, signal: AbortSignal) => postJson<{ valid: true }>('/login/credentials', details, signal);
export const verifyFace = (details: Credentials, photo: Blob, signal: AbortSignal) => postPhoto<Profile>('/login/verify-face', details, photo, signal);
