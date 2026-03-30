import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsInt()
  @IsNotEmpty()
  novelId: number;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsInt()
  @IsOptional()
  sessionId?: number;
}
