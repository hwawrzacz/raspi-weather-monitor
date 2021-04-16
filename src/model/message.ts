import { MessageType } from './message-type';

export interface Message<T> {
  type: MessageType;
  success?: boolean;
  value?: T;
  error?: string;
}
