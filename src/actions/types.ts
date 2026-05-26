export interface Action {
  id: string;
  label: string;
  cta: () => void;
  disabled?: boolean;
  tooltip?: string;
}
