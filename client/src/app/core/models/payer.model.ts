
export interface ClientPayer {
  payerId: number;
  officeId: string;
  payerName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: string;
  createdOn: string;
  updatedOn: string | null;
  isPrimary: boolean | null;
}

export interface ClientPayersResponse {
  success: boolean;
  message: string | null;
  data: ClientPayer[] | null;
  errors: unknown;
}
