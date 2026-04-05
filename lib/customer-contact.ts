export type CustomerContact = {
  name: string;
  phone: string;
};

export function normalizeCustomerName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function normalizeCustomerPhone(input: string): string {
  return input.replace(/[^\d]/g, "").slice(-10);
}

export function validateCustomerContact(input: CustomerContact): string | null {
  const name = normalizeCustomerName(input.name);
  const phone = normalizeCustomerPhone(input.phone);
  if (!name) return "Customer name is required.";
  if (name.length < 2) return "Customer name must be at least 2 characters.";
  if (phone.length !== 10) return "Customer phone must be a valid 10-digit number.";
  return null;
}
