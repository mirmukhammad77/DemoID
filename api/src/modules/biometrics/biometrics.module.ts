import { Module } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { DeepFaceClient } from './clients/deepface.client';

@Module({ providers: [DeepFaceClient, BiometricsService], exports: [BiometricsService] })
export class BiometricsModule {}
