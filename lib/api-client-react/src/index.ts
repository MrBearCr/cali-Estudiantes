export * from "./firebase-api";
export * from "./generated/api.schemas";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export const getGetCurrentUserQueryKey = () => ["currentUser"];
export function useGetCurrentUser() {
  return { data: null, isLoading: false };
}
