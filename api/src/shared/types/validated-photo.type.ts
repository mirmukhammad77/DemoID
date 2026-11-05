export interface ValidatedPhoto {
  bytes: Buffer;
  contentType: 'image/jpeg' | 'image/png';
}
