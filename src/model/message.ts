import { MessageType } from './message-type';

export interface Message {
  type: MessageType;
  success?: boolean;
  response?: string;
  error?: string;
}
