import type { Workplace } from './workplace.interface';
export interface ProfileContent {
  readonly first: string;
  readonly last: string;
  readonly role: string;
  readonly workplace: Workplace;
  readonly github: string;
  readonly telegram: string;
  readonly email: string;
}
